import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { ErroApi, requisitar } from '@/servicos/clienteHttp'
import { useEventosStore } from '@/stores/eventos'
import type { EventoDto, EventoResumoDto } from '@/tipos/eventos'

vi.mock('@/servicos/clienteHttp', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/servicos/clienteHttp')>()
  return { ...original, requisitar: vi.fn() }
})

const requisitarSimulado = vi.mocked(requisitar)

function resumo(id: string, arquivado = false): EventoResumoDto {
  return {
    id,
    nomePrimeiraPessoa: `Pessoa ${id}`,
    nomeSegundaPessoa: 'Bruno',
    data: '2027-05-15',
    horario: null,
    localCerimonia: null,
    convidadosEstimados: null,
    fase: 'Planejamento',
    diasRestantes: 30,
    arquivado,
  }
}

function completo(id: string, arquivado = false): EventoDto {
  return {
    ...resumo(id, arquivado),
    localRecepcao: null,
    observacoes: null,
    arquivadoEm: null,
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    dataLimiteRsvp: null,
    dataLimiteRsvpEfetiva: '2027-05-05',
  }
}

function chamadasAtivos(): number {
  return requisitarSimulado.mock.calls.filter(([url]) => url === '/api/eventos?situacao=Ativos').length
}

describe('useEventosStore — ativos do seletor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    requisitarSimulado.mockReset()
  })

  it('[UNITÁRIO] carrega os ativos uma única vez, mesmo com chamadas simultâneas', async () => {
    requisitarSimulado.mockResolvedValue([resumo('a'), resumo('b')])
    const store = useEventosStore()

    await Promise.all([store.garantirAtivos(), store.garantirAtivos()])
    await store.garantirAtivos()

    expect(chamadasAtivos()).toBe(1)
    expect(store.ativos.map((evento) => evento.id)).toEqual(['a', 'b'])
    expect(store.ativosCarregados).toBe(true)
    expect(store.carregandoAtivos).toBe(false)
  })

  it('[UNITÁRIO] não altera a listagem da tela de eventos ao carregar os ativos', async () => {
    requisitarSimulado.mockResolvedValueOnce([resumo('x', true)]).mockResolvedValueOnce([resumo('a')])
    const store = useEventosStore()
    await store.carregar('Arquivados')

    await store.garantirAtivos()

    expect(store.situacao).toBe('Arquivados')
    expect(store.itens.map((evento) => evento.id)).toEqual(['x'])
    expect(store.ativos.map((evento) => evento.id)).toEqual(['a'])
  })

  it('[UNITÁRIO] reaproveita a listagem de ativos já carregada pela tela de eventos', async () => {
    requisitarSimulado.mockResolvedValue([resumo('a'), resumo('b')])
    const store = useEventosStore()
    await store.carregar('Ativos')

    await store.garantirAtivos()

    expect(chamadasAtivos()).toBe(1)
    expect(store.ativos).toHaveLength(2)
  })

  it('[UNITÁRIO] invalida os ativos após arquivar e recarrega na próxima garantia', async () => {
    requisitarSimulado.mockResolvedValueOnce([resumo('a'), resumo('b')])
    const store = useEventosStore()
    await store.garantirAtivos()

    requisitarSimulado.mockResolvedValueOnce(completo('a', true))
    const resultado = await store.arquivar('a')
    expect(resultado.ok).toBe(true)
    expect(store.ativosCarregados).toBe(false)

    requisitarSimulado.mockResolvedValueOnce([resumo('b')])
    await store.garantirAtivos()
    expect(store.ativos.map((evento) => evento.id)).toEqual(['b'])
  })

  it('[UNITÁRIO] falha de rede deixa a lista vazia e permite nova tentativa', async () => {
    requisitarSimulado.mockRejectedValueOnce(new ErroApi('Sem conexão.', 0, null))
    const store = useEventosStore()

    await store.garantirAtivos()
    expect(store.ativos).toEqual([])
    expect(store.ativosCarregados).toBe(false)

    requisitarSimulado.mockResolvedValueOnce([resumo('a')])
    await store.garantirAtivos()
    expect(store.ativos).toHaveLength(1)
  })

  it('[SEGURANÇA] limpar descarta os ativos e ignora resposta atrasada de outra sessão', async () => {
    let resolver: (valor: EventoResumoDto[]) => void = () => {}
    requisitarSimulado.mockReturnValueOnce(new Promise((resolve) => (resolver = resolve)))
    const store = useEventosStore()

    const pendente = store.garantirAtivos()
    store.limpar()
    resolver([resumo('de-outra-organizacao')])
    await pendente

    expect(store.ativos).toEqual([])
    expect(store.ativosCarregados).toBe(false)
  })

  it('[UNITÁRIO] descarta eventos arquivados recebidos na lista de ativos', async () => {
    requisitarSimulado.mockResolvedValue([resumo('a'), resumo('z', true)])
    const store = useEventosStore()

    await store.garantirAtivos()

    expect(store.ativos.map((evento) => evento.id)).toEqual(['a'])
  })
})
