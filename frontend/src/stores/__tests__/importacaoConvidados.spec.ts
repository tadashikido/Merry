import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

import { SESSAO_EXEMPLO, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { previaExemplo } from '@/__tests__/auxiliaresImportacao'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useConvidadosStore } from '@/stores/convidados'
import { TEMPO_LIMITE_IMPORTACAO_MS, rotaImportacao, useImportacaoConvidadosStore } from '@/stores/importacaoConvidados'

const ID = '11111111-1111-4111-8111-111111111111'

let fetchSimulado: ReturnType<typeof simularFetch>

function arquivo(nome = 'lista.csv', conteudo = 'Nome\nAna'): File {
  return new File([conteudo], nome, { type: 'text/csv' })
}

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
})

describe('useImportacaoConvidadosStore', () => {
  it('[UNITÁRIO] monta as rotas de prévia e de importação', () => {
    expect(rotaImportacao(ID, true)).toBe(`/api/casamentos/${ID}/convites/importacao/pre-visualizacao`)
    expect(rotaImportacao(ID)).toBe(`/api/casamentos/${ID}/convites/importacao`)
  })

  it('[UNITÁRIO] pré-visualiza enviando o arquivo em multipart e guarda a prévia', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(previaExemplo()))
    const store = useImportacaoConvidadosStore()
    const planilha = arquivo()

    const resultado = await store.preVisualizar(ID, planilha)

    expect(resultado.ok).toBe(true)
    expect(store.previa?.resumo.convitesValidos).toBe(2)
    expect(store.arquivo).toBe(planilha)
    expect(store.enviando).toBe(false)
    const [url, init] = fetchSimulado.mock.calls[0]!
    expect(url).toBe(rotaImportacao(ID, true))
    expect(init?.method).toBe('POST')
    const corpo = init?.body as FormData
    expect(corpo).toBeInstanceOf(FormData)
    expect((corpo.get('arquivo') as File).name).toBe('lista.csv')
  })

  it('[UNITÁRIO] importa reenviando o mesmo arquivo com a conferência da prévia e invalida os totais', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(previaExemplo())).mockResolvedValueOnce(respostaJson({ convitesCriados: 2, pessoasCriadas: 3 }))
    const store = useImportacaoConvidadosStore()
    const convidados = useConvidadosStore()
    convidados.casamentoIdTotais = ID
    const planilha = arquivo()
    await store.preVisualizar(ID, planilha)

    const resultado = await store.importar(true)

    expect(resultado).toEqual({ ok: true, valor: { convitesCriados: 2, pessoasCriadas: 3 } })
    const corpo = fetchSimulado.mock.calls[1]![1]!.body as FormData
    expect(corpo.get('arquivo')).toBeInstanceOf(File)
    expect(corpo.get('somenteValidos')).toBe('true')
    expect(corpo.get('convitesEsperados')).toBe('2')
    expect(corpo.get('pessoasEsperadas')).toBe('3')
    expect(store.resultado).toEqual({ convitesCriados: 2, pessoasCriadas: 3 })
    expect(store.previa).toBeNull()
    expect(store.arquivo).toBeNull()
    expect(convidados.casamentoIdTotais).toBeNull()
  })

  it('[UNITÁRIO] importar sem prévia não chama a API', async () => {
    const store = useImportacaoConvidadosStore()

    const resultado = await store.importar(false)

    expect(resultado.ok).toBe(false)
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('[UNITÁRIO] 422 na prévia vira falha de regra com a mensagem do servidor e descarta o arquivo', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(422, { detail: 'Não encontramos a coluna Nome na primeira linha.' }))
    const store = useImportacaoConvidadosStore()

    const resultado = await store.preVisualizar(ID, arquivo())

    expect(resultado).toEqual({ ok: false, falha: { tipo: 'regra', mensagem: 'Não encontramos a coluna Nome na primeira linha.', errosCampos: {} } })
    expect(store.arquivo).toBeNull()
    expect(store.previa).toBeNull()
  })

  it('[UNITÁRIO] 413 vira falha de regra com a mensagem de tamanho', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(413, { detail: 'O arquivo passa de 2 MB.' }))
    const store = useImportacaoConvidadosStore()

    const resultado = await store.preVisualizar(ID, arquivo())

    expect(resultado.ok).toBe(false)
    expect(store.falha).toEqual({ tipo: 'regra', mensagem: 'O arquivo passa de 2 MB.', errosCampos: {} })
  })

  it('[UNITÁRIO] falha de rede na importação mantém a prévia e o arquivo para tentar de novo', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(previaExemplo())).mockRejectedValueOnce(new TypeError('offline'))
    const store = useImportacaoConvidadosStore()
    await store.preVisualizar(ID, arquivo())

    const resultado = await store.importar(false)

    expect(resultado.ok).toBe(false)
    expect(store.falha?.tipo).toBe('conexao')
    expect(store.previa).not.toBeNull()
    expect(store.arquivo).not.toBeNull()
    expect(store.importando).toBe(false)
  })

  it('[UNITÁRIO] descarta resposta atrasada de um arquivo substituído', async () => {
    let liberar: (resposta: Response) => void = () => undefined
    fetchSimulado
      .mockImplementationOnce(() => new Promise<Response>((resolver) => { liberar = resolver }))
      .mockResolvedValueOnce(respostaJson(previaExemplo({ colunasIgnoradas: ['Mesa'] })))
    const store = useImportacaoConvidadosStore()

    const primeira = store.preVisualizar(ID, arquivo('antiga.csv'))
    await store.preVisualizar(ID, arquivo('nova.csv'))
    liberar(respostaJson(previaExemplo()))
    await primeira

    expect(store.arquivo?.name).toBe('nova.csv')
    expect(store.previa?.colunasIgnoradas).toEqual(['Mesa'])
  })

  it('[SEGURANÇA] limpa prévia e arquivo ao trocar de organização', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(previaExemplo()))
    const autenticacao = useAutenticacaoStore()
    autenticacao.usuario = SESSAO_EXEMPLO.usuario
    const store = useImportacaoConvidadosStore()
    await store.preVisualizar(ID, arquivo())

    autenticacao.usuario = { ...SESSAO_EXEMPLO.usuario, organizacao: { id: 'o2', nome: 'Outra' } }
    await nextTick()

    expect(store.previa).toBeNull()
    expect(store.arquivo).toBeNull()
    expect(store.casamentoId).toBeNull()
  })

  it('[UNITÁRIO] usa tempo limite estendido para planilhas', () => {
    expect(TEMPO_LIMITE_IMPORTACAO_MS).toBe(30_000)
  })
})
