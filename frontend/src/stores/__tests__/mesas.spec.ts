import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { mapaExemplo, mesaExemplo, MESA_PADRINHOS } from '@/__tests__/auxiliaresMesas'
import { caminhoMesas, useMesasStore } from '@/stores/mesas'

const EVENTO = '11111111-1111-4111-8111-111111111111'
const OUTRO = '22222222-2222-4222-8222-222222222222'

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function urlDaChamada(indice: number): string {
  return String(fetchSimulado.mock.calls[indice]![0])
}

describe('useMesasStore', () => {
  it('[UNITÁRIO] monta as rotas da API de mesas', () => {
    expect(caminhoMesas(EVENTO)).toBe(`/api/eventos/${EVENTO}/mesas`)
    expect(caminhoMesas(EVENTO, 'm1', 'pessoas')).toBe(`/api/eventos/${EVENTO}/mesas/m1/pessoas`)
    expect(caminhoMesas(EVENTO, 'avisos-saida', 'dispensa')).toBe(`/api/eventos/${EVENTO}/mesas/avisos-saida/dispensa`)
  })

  it('[INTEGRAÇÃO] carrega o mapa do evento', async () => {
    fetchSimulado.mockResolvedValue(respostaJson(mapaExemplo()))
    const store = useMesasStore()

    await store.carregar(EVENTO)

    expect(store.mapa?.mesas).toHaveLength(3)
    expect(store.eventoId).toBe(EVENTO)
    expect(store.carregando).toBe(false)
    expect(store.falha).toBeNull()
  })

  it('[INTEGRAÇÃO] 404, 403 e erro de rede viram falhas tipadas', async () => {
    const store = useMesasStore()
    fetchSimulado.mockResolvedValueOnce(respostaProblema(404))
    await store.carregar(EVENTO)
    expect(store.falha?.tipo).toBe('naoEncontrado')
    expect(store.mapa).toBeNull()

    fetchSimulado.mockResolvedValueOnce(respostaProblema(403))
    await store.carregar(EVENTO)
    expect(store.falha?.tipo).toBe('semPermissao')

    fetchSimulado.mockRejectedValueOnce(new TypeError('rede'))
    await store.carregar(EVENTO)
    expect(store.falha?.tipo).toBe('conexao')
  })

  it('[INTEGRAÇÃO] descarta resposta atrasada de outro evento', async () => {
    let liberar: (resposta: Response) => void = () => undefined
    fetchSimulado.mockImplementationOnce(() => new Promise<Response>((resolver) => (liberar = resolver)))
    fetchSimulado.mockResolvedValueOnce(respostaJson(mapaExemplo({ mesas: [] })))
    const store = useMesasStore()

    const primeira = store.carregar(OUTRO)
    await store.carregar(EVENTO)
    liberar(respostaJson(mapaExemplo()))
    await primeira

    expect(store.eventoId).toBe(EVENTO)
    expect(store.mapa?.mesas).toHaveLength(0)
  })

  it('[INTEGRAÇÃO] sentar envia os IDs e aplica o mapa devolvido sem novo GET', async () => {
    const novo = mapaExemplo({ mesas: [mesaExemplo({ ocupacao: 2 })] })
    fetchSimulado.mockResolvedValueOnce(respostaJson(mapaExemplo())).mockResolvedValueOnce(respostaJson(novo))
    const store = useMesasStore()
    await store.carregar(EVENTO)

    const resultado = await store.sentar(EVENTO, MESA_PADRINHOS, ['p-carla', 'p-pedro'])

    expect(resultado.ok).toBe(true)
    expect(urlDaChamada(1)).toBe(`/api/eventos/${EVENTO}/mesas/${MESA_PADRINHOS}/pessoas`)
    expect(fetchSimulado.mock.calls[1]![1]?.method).toBe('POST')
    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual({ convidadosIds: ['p-carla', 'p-pedro'] })
    expect(store.mapa?.mesas[0]?.ocupacao).toBe(2)
    expect(fetchSimulado).toHaveBeenCalledTimes(2)
  })

  it('[INTEGRAÇÃO] capacidade excedida (422) devolve a mensagem e recarrega o mapa', async () => {
    fetchSimulado
      .mockResolvedValueOnce(respostaProblema(422, { detail: 'A Mesa 2 · Padrinhos tem 3 lugares e 1 livre. Escolha até 1 pessoa ou outra mesa.' }))
      .mockResolvedValueOnce(respostaJson(mapaExemplo()))
    const store = useMesasStore()

    const resultado = await store.sentar(EVENTO, MESA_PADRINHOS, ['p-carla', 'p-pedro'])

    expect(resultado.ok).toBe(false)
    expect(!resultado.ok && resultado.falha.tipo).toBe('regra')
    expect(!resultado.ok && resultado.falha.mensagem).toContain('1 livre')
    expect(urlDaChamada(1)).toBe(`/api/eventos/${EVENTO}/mesas`)
    expect(store.mapa).not.toBeNull()
  })

  it('[INTEGRAÇÃO] conflito (409) recarrega o mapa', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(409, { title: 'O registro foi alterado por outra operação.' })).mockResolvedValueOnce(respostaJson(mapaExemplo()))
    const store = useMesasStore()

    const resultado = await store.retirar(EVENTO, ['p-rui'])

    expect(!resultado.ok && resultado.falha.tipo).toBe('conflito')
    expect(fetchSimulado).toHaveBeenCalledTimes(2)
    expect(urlDaChamada(0)).toBe(`/api/eventos/${EVENTO}/mesas/retirada`)
  })

  it('[INTEGRAÇÃO] erro de rede na atribuição não recarrega nem perde o mapa', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(mapaExemplo())).mockRejectedValueOnce(new TypeError('rede'))
    const store = useMesasStore()
    await store.carregar(EVENTO)

    const resultado = await store.dispensarAvisos(EVENTO, ['p-bia'])

    expect(!resultado.ok && resultado.falha.tipo).toBe('conexao')
    expect(store.mapa?.mesas).toHaveLength(3)
    expect(urlDaChamada(1)).toBe(`/api/eventos/${EVENTO}/mesas/avisos-saida/dispensa`)
  })

  it('[INTEGRAÇÃO] criar, atualizar e remover mesa recarregam o mapa', async () => {
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(mesaExemplo(), 201))
      .mockResolvedValueOnce(respostaJson(mapaExemplo()))
      .mockResolvedValueOnce(respostaJson(mesaExemplo({ capacidade: 10 })))
      .mockResolvedValueOnce(respostaJson(mapaExemplo()))
      .mockResolvedValueOnce(respostaVazia())
      .mockResolvedValueOnce(respostaJson(mapaExemplo({ mesas: [] })))
    const store = useMesasStore()
    const dados = { numero: 2, nome: 'Padrinhos', capacidade: 8, especial: false }

    expect((await store.criarMesa(EVENTO, dados)).ok).toBe(true)
    expect((await store.atualizarMesa(EVENTO, MESA_PADRINHOS, { ...dados, capacidade: 10 })).ok).toBe(true)
    expect((await store.removerMesa(EVENTO, MESA_PADRINHOS)).ok).toBe(true)

    expect(fetchSimulado.mock.calls.map(([, init]) => init?.method ?? 'GET')).toEqual(['POST', 'GET', 'PUT', 'GET', 'DELETE', 'GET'])
    expect(store.mapa?.mesas).toHaveLength(0)
  })

  it('[INTEGRAÇÃO] erro de validação ao criar não recarrega e devolve erros por campo', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(422, { detail: 'Já existe uma mesa com este número neste evento.', campo: 'numero' }))
    const store = useMesasStore()

    const resultado = await store.criarMesa(EVENTO, { numero: 2, nome: null, capacidade: 8, especial: false })

    expect(!resultado.ok && resultado.falha.errosCampos.numero).toBe('Já existe uma mesa com este número neste evento.')
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('[UNITÁRIO] limpar zera o estado', async () => {
    fetchSimulado.mockResolvedValue(respostaJson(mapaExemplo()))
    const store = useMesasStore()
    await store.carregar(EVENTO)

    store.limpar()

    expect(store.mapa).toBeNull()
    expect(store.eventoId).toBeNull()
  })
})
