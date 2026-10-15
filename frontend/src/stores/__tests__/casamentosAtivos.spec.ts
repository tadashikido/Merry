import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { ErroApi, requisitar } from '@/servicos/clienteHttp'
import { useCasamentosStore } from '@/stores/casamentos'
import type { CasamentoDto, CasamentoResumoDto } from '@/tipos/casamentos'

vi.mock('@/servicos/clienteHttp', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/servicos/clienteHttp')>()
  return { ...original, requisitar: vi.fn() }
})

const requisitarSimulado = vi.mocked(requisitar)

function resumo(id: string, arquivado = false): CasamentoResumoDto {
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

function completo(id: string, arquivado = false): CasamentoDto {
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
  return requisitarSimulado.mock.calls.filter(([url]) => url === '/api/casamentos?situacao=Ativos').length
}

describe('useCasamentosStore — ativos do seletor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    requisitarSimulado.mockReset()
  })

  it('[UNITÁRIO] carrega os ativos uma única vez, mesmo com chamadas simultâneas', async () => {
    requisitarSimulado.mockResolvedValue([resumo('a'), resumo('b')])
    const store = useCasamentosStore()

    await Promise.all([store.garantirAtivos(), store.garantirAtivos()])
    await store.garantirAtivos()

    expect(chamadasAtivos()).toBe(1)
    expect(store.ativos.map((casamento) => casamento.id)).toEqual(['a', 'b'])
    expect(store.ativosCarregados).toBe(true)
    expect(store.carregandoAtivos).toBe(false)
  })

  it('[UNITÁRIO] não altera a listagem da tela de casamentos ao carregar os ativos', async () => {
    requisitarSimulado.mockResolvedValueOnce([resumo('x', true)]).mockResolvedValueOnce([resumo('a')])
    const store = useCasamentosStore()
    await store.carregar('Arquivados')

    await store.garantirAtivos()

    expect(store.situacao).toBe('Arquivados')
    expect(store.itens.map((casamento) => casamento.id)).toEqual(['x'])
    expect(store.ativos.map((casamento) => casamento.id)).toEqual(['a'])
  })

  it('[UNITÁRIO] reaproveita a listagem de ativos já carregada pela tela de casamentos', async () => {
    requisitarSimulado.mockResolvedValue([resumo('a'), resumo('b')])
    const store = useCasamentosStore()
    await store.carregar('Ativos')

    await store.garantirAtivos()

    expect(chamadasAtivos()).toBe(1)
    expect(store.ativos).toHaveLength(2)
  })

  it('[UNITÁRIO] invalida os ativos após arquivar e recarrega na próxima garantia', async () => {
    requisitarSimulado.mockResolvedValueOnce([resumo('a'), resumo('b')])
    const store = useCasamentosStore()
    await store.garantirAtivos()

    requisitarSimulado.mockResolvedValueOnce(completo('a', true))
    const resultado = await store.arquivar('a')
    expect(resultado.ok).toBe(true)
    expect(store.ativosCarregados).toBe(false)

    requisitarSimulado.mockResolvedValueOnce([resumo('b')])
    await store.garantirAtivos()
    expect(store.ativos.map((casamento) => casamento.id)).toEqual(['b'])
  })

  it('[UNITÁRIO] falha de rede deixa a lista vazia e permite nova tentativa', async () => {
    requisitarSimulado.mockRejectedValueOnce(new ErroApi('Sem conexão.', 0, null))
    const store = useCasamentosStore()

    await store.garantirAtivos()
    expect(store.ativos).toEqual([])
    expect(store.ativosCarregados).toBe(false)

    requisitarSimulado.mockResolvedValueOnce([resumo('a')])
    await store.garantirAtivos()
    expect(store.ativos).toHaveLength(1)
  })

  it('[SEGURANÇA] limpar descarta os ativos e ignora resposta atrasada de outra sessão', async () => {
    let resolver: (valor: CasamentoResumoDto[]) => void = () => {}
    requisitarSimulado.mockReturnValueOnce(new Promise((resolve) => (resolver = resolve)))
    const store = useCasamentosStore()

    const pendente = store.garantirAtivos()
    store.limpar()
    resolver([resumo('de-outra-organizacao')])
    await pendente

    expect(store.ativos).toEqual([])
    expect(store.ativosCarregados).toBe(false)
  })

  it('[UNITÁRIO] descarta casamentos arquivados recebidos na lista de ativos', async () => {
    requisitarSimulado.mockResolvedValue([resumo('a'), resumo('z', true)])
    const store = useCasamentosStore()

    await store.garantirAtivos()

    expect(store.ativos.map((casamento) => casamento.id)).toEqual(['a'])
  })
})
