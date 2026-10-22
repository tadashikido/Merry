import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { cronogramaExemplo, itemCronograma } from '@/__tests__/auxiliaresCronograma'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { caminhoCronograma, useCronogramaStore } from '@/stores/cronograma'
import type { SalvarItemCronogramaRequest } from '@/tipos/cronograma'

const ID = '11111111-1111-4111-8111-111111111111'

const DADOS: SalvarItemCronogramaRequest = {
  dia: 'DiaDoEvento',
  inicio: '16:30',
  duracaoMinutos: 45,
  atividade: 'Cerimônia',
  local: 'Capela São José',
  responsavel: 'Fernanda',
  fornecedorEventoId: null,
  instrucoes: null,
  notasInternas: null,
}

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
})

describe('useCronogramaStore', () => {
  it('[UNITÁRIO] monta o caminho codificando os identificadores', () => {
    expect(caminhoCronograma(ID)).toBe(`/api/eventos/${ID}/cronograma`)
    expect(caminhoCronograma(ID, 'a/b')).toBe(`/api/eventos/${ID}/cronograma/a%2Fb`)
  })

  it('[UNITÁRIO] carrega o cronograma do evento', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(cronogramaExemplo([itemCronograma()])))
    const store = useCronogramaStore()

    await store.carregar(ID)

    expect(store.cronograma?.itens).toHaveLength(1)
    expect(store.falha).toBeNull()
    expect(store.carregando).toBe(false)
    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(caminhoCronograma(ID))
  })

  it('[UNITÁRIO] falha de permissão ao carregar vira semPermissao', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(403, { title: 'Proibido' }))
    const store = useCronogramaStore()

    await store.carregar(ID)

    expect(store.cronograma).toBeNull()
    expect(store.falha?.tipo).toBe('semPermissao')
  })

  it('[UNITÁRIO] falha de conexão ao carregar vira conexao', async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const store = useCronogramaStore()

    await store.carregar(ID)

    expect(store.falha?.tipo).toBe('conexao')
  })

  it('[UNITÁRIO] criar envia POST e recarrega a lista com os conflitos do servidor', async () => {
    const criado = itemCronograma({ id: 'novo' })
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(cronogramaExemplo([])))
      .mockResolvedValueOnce(respostaJson(criado, 201))
      .mockResolvedValueOnce(respostaJson(cronogramaExemplo([criado])))
    const store = useCronogramaStore()
    await store.carregar(ID)

    const resultado = await store.criar(ID, DADOS)

    expect(resultado).toEqual({ ok: true, valor: criado })
    expect(fetchSimulado.mock.calls[1]![1]?.method).toBe('POST')
    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual(DADOS)
    expect(store.cronograma?.itens.map((item) => item.id)).toEqual(['novo'])
  })

  it('[UNITÁRIO] erro 422 com campo vira erro de campo', async () => {
    fetchSimulado.mockResolvedValueOnce(
      respostaProblema(422, { title: 'Regra', detail: 'Escolha um fornecedor deste evento.', campo: 'fornecedorEventoId' }),
    )
    const store = useCronogramaStore()

    const resultado = await store.criar(ID, DADOS)

    expect(resultado).toEqual({
      ok: false,
      falha: expect.objectContaining({
        tipo: 'regra',
        errosCampos: { fornecedorEventoId: 'Escolha um fornecedor deste evento.' },
      }),
    })
  })

  it('[UNITÁRIO] atualizar envia PUT para o item', async () => {
    const atualizado = itemCronograma({ atividade: 'Cortejo' })
    fetchSimulado.mockResolvedValueOnce(respostaJson(atualizado))
    const store = useCronogramaStore()

    const resultado = await store.atualizar(ID, 'i1', DADOS)

    expect(resultado).toEqual({ ok: true, valor: atualizado })
    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(caminhoCronograma(ID, 'i1'))
    expect(fetchSimulado.mock.calls[0]![1]?.method).toBe('PUT')
  })

  it('[UNITÁRIO] remover tira o item da lista imediatamente', async () => {
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(cronogramaExemplo([itemCronograma({ id: 'a' }), itemCronograma({ id: 'b' })])))
      .mockResolvedValueOnce(respostaVazia(204))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const store = useCronogramaStore()
    await store.carregar(ID)

    const resultado = await store.remover(ID, 'a')

    expect(resultado.ok).toBe(true)
    expect(store.cronograma?.itens.map((item) => item.id)).toEqual(['b'])
  })

  it('[UNITÁRIO] remover com falha devolve o tipo da falha', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(422, { title: 'Regra', detail: 'Este evento está arquivado.' }))
    const store = useCronogramaStore()

    const resultado = await store.remover(ID, 'a')

    expect(resultado.ok).toBe(false)
  })
})
