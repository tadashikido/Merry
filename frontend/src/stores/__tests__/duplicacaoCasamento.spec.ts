import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useCasamentosStore } from '@/stores/casamentos'
import { caminhoDuplicacao, useDuplicacaoCasamentoStore } from '@/stores/duplicacaoCasamento'
import type { DuplicarCasamentoRequest } from '@/tipos/duplicacaoCasamento'
import { casamentoCompleto, resumoCasamento } from '@/views/casamentos/__tests__/auxiliaresCasamentos'

const ORIGEM = '11111111-1111-4111-8111-111111111111'
const NOVO = '33333333-3333-4333-8333-333333333333'

const REQUEST: DuplicarCasamentoRequest = {
  nomePrimeiraPessoa: 'Carla',
  nomeSegundaPessoa: 'Diego',
  data: '2028-05-13',
  horario: null,
  localCerimonia: null,
  localRecepcao: null,
  copiarTarefas: true,
  copiarFornecedores: false,
  copiarCronograma: true,
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

describe('useDuplicacaoCasamentoStore', () => {
  it('[UNITÁRIO] monta as rotas codificando o identificador da origem', () => {
    expect(caminhoDuplicacao(ORIGEM)).toBe(`/api/casamentos/${ORIGEM}/duplicacao`)
    expect(caminhoDuplicacao('a/b', 'previa')).toBe('/api/casamentos/a%2Fb/duplicacao/previa')
  })

  it('[UNITÁRIO] pede a prévia com a data quando informada e sem ela quando vazia', async () => {
    fetchSimulado.mockImplementation(async () =>
      respostaJson({ origem: resumoCasamento(), tarefas: 3, tarefasDoChecklist: 2, tarefasNascemAtrasadas: 0, tarefasCanceladasIgnoradas: 0, fornecedores: 1, fornecedoresIgnorados: 0 }),
    )
    const store = useDuplicacaoCasamentoStore()

    const comData = await store.previa(ORIGEM, '2028-05-13')
    await store.previa(ORIGEM, null)

    expect(comData.ok && comData.valor.tarefas).toBe(3)
    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(`/api/casamentos/${ORIGEM}/duplicacao/previa?data=2028-05-13`)
    expect(String(fetchSimulado.mock.calls[1]![0])).toBe(`/api/casamentos/${ORIGEM}/duplicacao/previa`)
  })

  it('[UNITÁRIO] duplica enviando o request e atualiza o casamento atual', async () => {
    fetchSimulado.mockResolvedValueOnce(
      respostaJson({ casamento: casamentoCompleto({ id: NOVO, nomePrimeiraPessoa: 'Carla' }), tarefasCopiadas: 3, fornecedoresCopiados: 0 }, 201),
    )
    const store = useDuplicacaoCasamentoStore()

    const resultado = await store.duplicar(ORIGEM, REQUEST)

    expect(resultado.ok).toBe(true)
    const [url, init] = fetchSimulado.mock.calls[0]!
    expect(String(url)).toBe(`/api/casamentos/${ORIGEM}/duplicacao`)
    expect(init?.method).toBe('POST')
    expect(corpoDaChamada(fetchSimulado.mock.calls[0]!)).toEqual(REQUEST)
    expect(useCasamentosStore().atual?.id).toBe(NOVO)
  })

  it('[UNITÁRIO] traduz erros de campo, permissão e rede sem alterar o casamento atual', async () => {
    fetchSimulado
      .mockResolvedValueOnce(respostaProblema(400, { errors: { NomePrimeiraPessoa: ['Preencha este campo.'] } }))
      .mockResolvedValueOnce(respostaProblema(403))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const store = useDuplicacaoCasamentoStore()

    const validacao = await store.duplicar(ORIGEM, REQUEST)
    const permissao = await store.duplicar(ORIGEM, REQUEST)
    const rede = await store.duplicar(ORIGEM, REQUEST)

    expect(validacao.ok ? null : validacao.falha.errosCampos.nomePrimeiraPessoa).toBe('Preencha este campo.')
    expect(permissao.ok ? null : permissao.falha.tipo).toBe('semPermissao')
    expect(rede.ok ? null : rede.falha.tipo).toBe('conexao')
    expect(useCasamentosStore().atual).toBeNull()
  })

  it('[UNITÁRIO] lista origens ativas e arquivadas pela data mais recente', async () => {
    fetchSimulado.mockImplementation(async (entrada) =>
      String(entrada).endsWith('Ativos')
        ? respostaJson([resumoCasamento({ id: 'a', data: '2027-05-15' })])
        : respostaJson([resumoCasamento({ id: 'b', data: '2028-01-10', arquivado: true }), resumoCasamento({ id: 'c', data: '2025-02-01', arquivado: true })]),
    )

    const resultado = await useDuplicacaoCasamentoStore().listarOrigens()

    expect(resultado.ok && resultado.valor.map((casamento) => casamento.id)).toEqual(['b', 'a', 'c'])
  })
})
