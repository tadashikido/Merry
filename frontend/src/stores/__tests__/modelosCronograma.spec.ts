import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { cronogramaExemplo } from '@/__tests__/auxiliaresCronograma'
import {
  ID_ITEM_MODELO_CRONOGRAMA,
  ID_MODELO_CRONOGRAMA,
  aplicacaoModeloCronograma,
  itemModeloCronograma,
  modeloCronogramaCompleto,
  resumoModeloCronograma,
} from '@/__tests__/auxiliaresModelosCronograma'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useCronogramaStore } from '@/stores/cronograma'
import { ROTA_MODELOS_CRONOGRAMA, caminhoModeloCronograma, useModelosCronogramaStore } from '@/stores/modelosCronograma'
import type { SalvarItemModeloCronogramaRequest } from '@/tipos/modelosCronograma'

const ID_EVENTO = '11111111-1111-4111-8111-111111111111'

const ITEM: SalvarItemModeloCronogramaRequest = {
  minutosDesdeCerimonia: -60,
  duracaoMinutos: 30,
  atividade: 'Chegada da banda',
  referenciaLocal: 'Recepcao',
  local: null,
  responsavel: 'Banda',
  categoriaFornecedor: 'Musica',
  instrucoes: null,
}

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
})

function chamada(indice: number): { url: string; metodo: string } {
  const [entrada, init] = fetchSimulado.mock.calls[indice]!
  return { url: String(entrada), metodo: init?.method ?? 'GET' }
}

describe('useModelosCronogramaStore', () => {
  it('[UNITÁRIO] monta caminhos de modelo e item codificados', () => {
    expect(caminhoModeloCronograma()).toBe(ROTA_MODELOS_CRONOGRAMA)
    expect(caminhoModeloCronograma('a/b')).toBe(`${ROTA_MODELOS_CRONOGRAMA}/a%2Fb`)
    expect(caminhoModeloCronograma('m', '')).toBe(`${ROTA_MODELOS_CRONOGRAMA}/m/itens`)
    expect(caminhoModeloCronograma('m', 'i')).toBe(`${ROTA_MODELOS_CRONOGRAMA}/m/itens/i`)
  })

  it('[UNITÁRIO] lista e trata falha de permissão', async () => {
    const store = useModelosCronogramaStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson([resumoModeloCronograma()]))
    await store.listar()
    expect(store.lista).toHaveLength(1)

    fetchSimulado.mockResolvedValueOnce(respostaProblema(403, { title: 'Proibido' }))
    await store.listar()
    expect(store.lista).toBeNull()
    expect(store.falhaLista?.tipo).toBe('semPermissao')
  })

  it('[UNITÁRIO] cria, atualiza e remove modelo mantendo o estado coerente', async () => {
    const store = useModelosCronogramaStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(modeloCronogramaCompleto(), 201))
    const criado = await store.criar({ nome: 'Roteiro', descricao: null, horarioReferencia: '17:00' })
    expect(criado.ok).toBe(true)
    expect(store.atual?.id).toBe(ID_MODELO_CRONOGRAMA)
    expect(corpoDaChamada(fetchSimulado.mock.calls[0]!)).toEqual({ nome: 'Roteiro', descricao: null, horarioReferencia: '17:00' })

    fetchSimulado.mockResolvedValueOnce(respostaJson(modeloCronogramaCompleto({ nome: 'Novo' })))
    await store.atualizar(ID_MODELO_CRONOGRAMA, { nome: 'Novo', descricao: null })
    expect(store.atual?.nome).toBe('Novo')
    expect(chamada(1).metodo).toBe('PUT')

    store.lista = [resumoModeloCronograma()]
    fetchSimulado.mockResolvedValueOnce(respostaVazia())
    const removido = await store.remover(ID_MODELO_CRONOGRAMA)
    expect(removido.ok).toBe(true)
    expect(store.lista).toEqual([])
    expect(store.atual).toBeNull()
  })

  it('[UNITÁRIO] erro 422 com campo vira errosCampos na falha', async () => {
    const store = useModelosCronogramaStore()
    fetchSimulado.mockResolvedValueOnce(
      respostaProblema(422, { title: 'Regra', detail: 'Já existe um modelo de cronograma com esse nome.', campo: 'nome' }),
    )

    const resultado = await store.criar({ nome: 'Roteiro', descricao: null })

    expect(resultado).toMatchObject({
      ok: false,
      falha: { tipo: 'regra', errosCampos: { nome: 'Já existe um modelo de cronograma com esse nome.' } },
    })
  })

  it('[UNITÁRIO] salva o cronograma do evento como modelo', async () => {
    const store = useModelosCronogramaStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(modeloCronogramaCompleto({ sugerido: false }), 201))

    const resultado = await store.salvarDoEvento(ID_EVENTO, { nome: 'Roteiro da Ana', descricao: null })

    expect(resultado.ok).toBe(true)
    expect(chamada(0)).toEqual({ url: `/api/eventos/${ID_EVENTO}/cronograma/modelos`, metodo: 'POST' })
    expect(store.atual?.sugerido).toBe(false)
  })

  it('[UNITÁRIO] cria, atualiza e remove item e recarrega o modelo atual', async () => {
    const store = useModelosCronogramaStore()
    store.atual = modeloCronogramaCompleto()
    fetchSimulado.mockResolvedValueOnce(respostaJson(itemModeloCronograma(), 201))
    fetchSimulado.mockResolvedValueOnce(respostaJson(modeloCronogramaCompleto()))
    await store.criarItem(ID_MODELO_CRONOGRAMA, ITEM)
    expect(chamada(0)).toEqual({ url: `${ROTA_MODELOS_CRONOGRAMA}/${ID_MODELO_CRONOGRAMA}/itens`, metodo: 'POST' })
    expect(corpoDaChamada(fetchSimulado.mock.calls[0]!)).toEqual(ITEM)

    const semItem = modeloCronogramaCompleto()
    fetchSimulado.mockResolvedValueOnce(respostaVazia())
    fetchSimulado.mockResolvedValueOnce(
      respostaJson({ ...semItem, itens: semItem.itens.filter((item) => item.id !== ID_ITEM_MODELO_CRONOGRAMA) }),
    )
    const removido = await store.removerItem(ID_MODELO_CRONOGRAMA, ID_ITEM_MODELO_CRONOGRAMA)
    expect(removido.ok).toBe(true)
    expect(store.atual?.itens.some((item) => item.id === ID_ITEM_MODELO_CRONOGRAMA)).toBe(false)
  })

  it('[UNITÁRIO] falha de rede vira conexao', async () => {
    const store = useModelosCronogramaStore()
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const resultado = await store.obter(ID_MODELO_CRONOGRAMA)

    expect(resultado).toMatchObject({ ok: false, falha: { tipo: 'conexao' } })
  })
})

describe('useCronogramaStore — modelos', () => {
  it('[UNITÁRIO] prévia usa a query do modelo e não recarrega', async () => {
    const store = useCronogramaStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(aplicacaoModeloCronograma()))

    const resultado = await store.previa(ID_EVENTO, ID_MODELO_CRONOGRAMA)

    expect(resultado.ok).toBe(true)
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
    expect(chamada(0).url).toBe(`/api/eventos/${ID_EVENTO}/cronograma/previa?modeloId=${ID_MODELO_CRONOGRAMA}`)
  })

  it('[UNITÁRIO] aplicar e recalcular recarregam o cronograma carregado', async () => {
    const store = useCronogramaStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(cronogramaExemplo([])))
    await store.carregar(ID_EVENTO)

    fetchSimulado.mockResolvedValueOnce(respostaJson(aplicacaoModeloCronograma()))
    fetchSimulado.mockResolvedValueOnce(respostaJson(cronogramaExemplo([], { horariosDesatualizados: 3 })))
    const aplicado = await store.aplicar(ID_EVENTO, ID_MODELO_CRONOGRAMA)
    expect(aplicado.ok).toBe(true)
    expect(chamada(1)).toEqual({ url: `/api/eventos/${ID_EVENTO}/cronograma/aplicacoes`, metodo: 'POST' })
    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual({ modeloId: ID_MODELO_CRONOGRAMA })
    expect(store.cronograma?.horariosDesatualizados).toBe(3)

    fetchSimulado.mockResolvedValueOnce(respostaJson({ itens: 3 }))
    const consulta = await store.consultarRecalculo(ID_EVENTO)
    expect(consulta.ok && consulta.valor.itens).toBe(3)
    expect(chamada(3)).toEqual({ url: `/api/eventos/${ID_EVENTO}/cronograma/recalculo-horarios`, metodo: 'GET' })

    fetchSimulado.mockResolvedValueOnce(respostaJson({ itens: 3 }))
    fetchSimulado.mockResolvedValueOnce(respostaJson(cronogramaExemplo([], { horariosDesatualizados: 0 })))
    const recalculo = await store.recalcular(ID_EVENTO)
    expect(recalculo.ok).toBe(true)
    expect(chamada(4).metodo).toBe('POST')
    expect(store.cronograma?.horariosDesatualizados).toBe(0)
  })

  it('[UNITÁRIO] conflito na aplicação vira falha conflito sem recarregar', async () => {
    const store = useCronogramaStore()
    fetchSimulado.mockResolvedValueOnce(respostaProblema(409, { title: 'Conflito', detail: 'O cronograma mudou em outra tela.' }))

    const resultado = await store.aplicar(ID_EVENTO, ID_MODELO_CRONOGRAMA)

    expect(resultado).toMatchObject({ ok: false, falha: { tipo: 'conflito' } })
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })
})
