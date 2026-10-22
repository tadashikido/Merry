import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { ID_VINCULO, arquivoPdf, florista, listaVinculos, vinculoExemplo } from '@/__tests__/auxiliaresFornecedoresEvento'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { caminhoFornecedoresEvento, useFornecedoresEventoStore } from '@/stores/fornecedoresEvento'
import { TEXTOS_CONTRATO } from '@/textos/fornecedoresEvento'
import type { AtualizarFornecedorEventoRequest } from '@/tipos/fornecedoresEvento'

const EVENTO = '11111111-1111-4111-8111-111111111111'
const ROTA = `/api/eventos/${EVENTO}/fornecedores`

const DADOS: AtualizarFornecedorEventoRequest = {
  servico: 'Jantar para 200',
  valorOrcado: 18000,
  valorContratado: 18500,
  status: 'Contratado',
  notasInternas: null,
}

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
  vi.unstubAllGlobals()
})

describe('useFornecedoresEventoStore', () => {
  it('[UNITÁRIO] monta as rotas codificando os identificadores', () => {
    expect(caminhoFornecedoresEvento(EVENTO)).toBe(ROTA)
    expect(caminhoFornecedoresEvento('a/b', 'v/1', 'contrato')).toBe('/api/eventos/a%2Fb/fornecedores/v%2F1/contrato')
    expect(caminhoFornecedoresEvento(EVENTO, undefined, 'importacao')).toBe(`${ROTA}/importacao`)
  })

  it('[UNITÁRIO] carrega a lista e guarda falhas de permissão e conexão', async () => {
    const store = useFornecedoresEventoStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(listaVinculos([vinculoExemplo()])))
      .mockResolvedValueOnce(respostaProblema(403, { title: 'Proibido' }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await store.carregar(EVENTO)
    expect(store.lista?.vinculos).toHaveLength(1)
    await store.carregar(EVENTO)
    expect(store.lista).toBeNull()
    expect(store.falha?.tipo).toBe('semPermissao')
    await store.carregar(EVENTO)
    expect(store.falha?.tipo).toBe('conexao')
  })

  it('[UNITÁRIO] vincular envia o corpo, inclui o vínculo e recalcula o resumo sem novo GET', async () => {
    const store = useFornecedoresEventoStore()
    const novo = florista({ status: 'Contratado', valorContratado: 15000 })
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(listaVinculos([vinculoExemplo()])))
      .mockResolvedValueOnce(respostaJson(novo, 201))
    await store.carregar(EVENTO)

    const resultado = await store.vincular(EVENTO, { ...DADOS, fornecedorId: novo.fornecedor.id })

    expect(resultado.ok).toBe(true)
    const [url, init] = fetchSimulado.mock.calls[1]!
    expect(url).toBe(ROTA)
    expect(init?.method).toBe('POST')
    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual({ ...DADOS, fornecedorId: novo.fornecedor.id })
    expect(store.lista?.vinculos).toHaveLength(2)
    expect(store.lista?.resumo.totalContratado).toBe(15000)
    expect(store.lista?.resumo.totalOrcado).toBe(33800)
    expect(fetchSimulado).toHaveBeenCalledTimes(2)
  })

  it('[UNITÁRIO] 422 com campo vira erro do campo valorContratado', async () => {
    const store = useFornecedoresEventoStore()
    fetchSimulado.mockResolvedValueOnce(respostaProblema(422, { title: 'Regra', detail: 'Informe o valor contratado.', campo: 'valorContratado' }))

    const resultado = await store.atualizar(EVENTO, ID_VINCULO, { ...DADOS, valorContratado: null })

    expect(resultado.ok).toBe(false)
    expect(!resultado.ok && resultado.falha.errosCampos.valorContratado).toBe('Informe o valor contratado.')
  })

  it('[UNITÁRIO] remover tira da lista e do resumo', async () => {
    const store = useFornecedoresEventoStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(listaVinculos([vinculoExemplo(), florista()]))).mockResolvedValueOnce(respostaVazia())
    await store.carregar(EVENTO)

    const resultado = await store.remover(EVENTO, ID_VINCULO)

    expect(resultado.ok).toBe(true)
    expect(fetchSimulado.mock.calls[1]![1]?.method).toBe('DELETE')
    expect(store.lista?.vinculos.map((vinculo) => vinculo.fornecedor.nomeEmpresa)).toEqual(['Florista Jardim'])
    expect(store.lista?.resumo.totalOrcado).toBe(15800)
  })

  it('[SEGURANÇA] envia o contrato como multipart no campo arquivo, sem Content-Type manual', async () => {
    const store = useFornecedoresEventoStore()
    const comContrato = vinculoExemplo({ contrato: { nomeArquivo: 'contrato.pdf', tamanhoBytes: 17, enviadoEm: '2026-09-30T12:00:00Z' } })
    fetchSimulado.mockResolvedValueOnce(respostaJson(comContrato))

    const resultado = await store.enviarContrato(EVENTO, ID_VINCULO, arquivoPdf())

    expect(resultado.ok).toBe(true)
    const [url, init] = fetchSimulado.mock.calls[0]!
    expect(url).toBe(`${ROTA}/${ID_VINCULO}/contrato`)
    expect(init?.method).toBe('PUT')
    expect(init?.body).toBeInstanceOf(FormData)
    expect((init?.body as FormData).get('arquivo')).toBeInstanceOf(File)
    expect((init?.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('[UNITÁRIO] 413 e 429 no envio viram mensagens próprias', async () => {
    const store = useFornecedoresEventoStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaProblema(413, { title: 'Grande' }))
      .mockResolvedValueOnce(respostaProblema(429, { title: 'Muitas' }))

    const grande = await store.enviarContrato(EVENTO, ID_VINCULO, arquivoPdf())
    const limite = await store.enviarContrato(EVENTO, ID_VINCULO, arquivoPdf())

    expect(!grande.ok && grande.falha.mensagem).toBe(TEXTOS_CONTRATO.erroTamanho)
    expect(!limite.ok && limite.falha.mensagem).toBe(TEXTOS_CONTRATO.erroLimite)
  })

  it('[UNITÁRIO] remover contrato atualiza o vínculo na lista', async () => {
    const store = useFornecedoresEventoStore()
    const comContrato = vinculoExemplo({ contrato: { nomeArquivo: 'contrato.pdf', tamanhoBytes: 17, enviadoEm: '2026-09-30T12:00:00Z' } })
    fetchSimulado.mockResolvedValueOnce(respostaJson(listaVinculos([comContrato]))).mockResolvedValueOnce(respostaJson(vinculoExemplo()))
    await store.carregar(EVENTO)

    await store.removerContrato(EVENTO, ID_VINCULO)

    expect(fetchSimulado.mock.calls[1]![1]?.method).toBe('DELETE')
    expect(store.lista?.vinculos[0]!.contrato).toBeNull()
  })

  it('[SEGURANÇA] baixar contrato usa o endpoint autenticado e salva como arquivo com o nome do vínculo', async () => {
    const store = useFornecedoresEventoStore()
    const criar = vi.fn(() => 'blob:x')
    vi.stubGlobal('URL', { ...URL, createObjectURL: criar, revokeObjectURL: vi.fn() })
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    fetchSimulado.mockResolvedValueOnce(
      new Response('%PDF-1.4', { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
    )
    const vinculo = vinculoExemplo({ contrato: { nomeArquivo: 'contrato-buffet.pdf', tamanhoBytes: 8, enviadoEm: '2026-09-30T12:00:00Z' } })

    const resultado = await store.baixarContrato(EVENTO, vinculo)

    expect(resultado.ok).toBe(true)
    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(`${ROTA}/${ID_VINCULO}/contrato`)
    expect((clique.mock.contexts[0] as HTMLAnchorElement).download).toBe('contrato-buffet.pdf')
    clique.mockRestore()
  })

  it('[UNITÁRIO] importar recarrega a lista quando algo foi importado', async () => {
    const store = useFornecedoresEventoStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson({ importados: 2, ignorados: 1 }))
      .mockResolvedValueOnce(respostaJson(listaVinculos([vinculoExemplo(), florista()])))
      .mockResolvedValueOnce(respostaJson({ importados: 0, ignorados: 3 }))

    const primeiro = await store.importar(EVENTO, 'origem')
    expect(primeiro.ok && primeiro.valor).toEqual({ importados: 2, ignorados: 1 })
    expect(corpoDaChamada(fetchSimulado.mock.calls[0]!)).toEqual({ eventoOrigemId: 'origem' })
    expect(store.lista?.vinculos).toHaveLength(2)

    await store.importar(EVENTO, 'origem')
    expect(fetchSimulado).toHaveBeenCalledTimes(3)
  })

  it('[UNITÁRIO] eventos de origem juntam ativos e arquivados, sem o atual, mais recentes primeiro', async () => {
    const store = useFornecedoresEventoStore()
    fetchSimulado.mockImplementation(async (entrada) => {
      const url = String(entrada)
      if (url.endsWith('situacao=Ativos')) {
        return respostaJson([
          { id: EVENTO, nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'João', data: '2026-12-12', arquivado: false },
          { id: 'b', nomePrimeiraPessoa: 'Bia', nomeSegundaPessoa: 'Rafa', data: '2027-01-10', arquivado: false },
        ])
      }
      return respostaJson([{ id: 'c', nomePrimeiraPessoa: 'Clara', nomeSegundaPessoa: 'Davi', data: '2025-05-01', arquivado: true }])
    })

    const resultado = await store.listarEventosOrigem(EVENTO)

    expect(resultado.ok && resultado.valor.map((evento) => evento.id)).toEqual(['b', 'c'])
  })
})
