import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import { ErroApi, requisitar } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { LIMITE_PROXIMOS, interpretarFalhaCasamento, useCasamentosStore } from '@/stores/casamentos'
import type { CasamentoDto, CasamentoResumoDto, SalvarCasamentoRequest } from '@/tipos/casamentos'

vi.mock('@/servicos/clienteHttp', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/servicos/clienteHttp')>()
  return { ...original, requisitar: vi.fn() }
})

const requisitarSimulado = vi.mocked(requisitar)

function resumo(id: string, diasRestantes: number, arquivado = false): CasamentoResumoDto {
  return {
    id,
    nomePrimeiraPessoa: `Pessoa ${id}`,
    nomeSegundaPessoa: 'Bruno',
    data: '2027-05-15',
    horario: null,
    localCerimonia: null,
    convidadosEstimados: null,
    fase: 'Planejamento',
    diasRestantes,
    arquivado,
  }
}

function completo(id: string, arquivado = false): CasamentoDto {
  return {
    ...resumo(id, 10, arquivado),
    localRecepcao: null,
    observacoes: null,
    arquivadoEm: arquivado ? '2026-09-28T12:00:00Z' : null,
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    dataLimiteRsvp: null,
    dataLimiteRsvpEfetiva: '2027-05-05',
  }
}

const REQUEST: SalvarCasamentoRequest = {
  nomePrimeiraPessoa: 'Ana',
  nomeSegundaPessoa: 'Bruno',
  data: '2027-05-15',
  horario: '16:30',
  localCerimonia: null,
  localRecepcao: null,
  convidadosEstimados: 150,
  dataLimiteRsvp: null,
  observacoes: null,
}

describe('useCasamentosStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    requisitarSimulado.mockReset()
  })

  it('[UNITÁRIO] carrega ativos pelo endpoint com a situação na query', async () => {
    requisitarSimulado.mockResolvedValue([resumo('1', 5)])
    const store = useCasamentosStore()

    await store.carregar('Ativos')

    expect(requisitarSimulado).toHaveBeenCalledWith('/api/casamentos?situacao=Ativos')
    expect(store.itens).toHaveLength(1)
    expect(store.carregando).toBe(false)
    expect(store.carregado).toBe(true)
    expect(store.falha).toBeNull()
  })

  it('[UNITÁRIO] próximos: até 6, só com data de hoje em diante', async () => {
    requisitarSimulado.mockResolvedValue([
      resumo('1', 0),
      resumo('2', 1),
      resumo('3', 2),
      resumo('4', 3),
      resumo('5', 4),
      resumo('6', 5),
      resumo('7', 6),
      resumo('8', -1),
    ])
    const store = useCasamentosStore()

    await store.carregar('Ativos')

    expect(store.proximos).toHaveLength(LIMITE_PROXIMOS)
    expect(store.proximos.map((item) => item.id)).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it('[UNITÁRIO] próximos fica vazio quando a lista carregada é de arquivados', async () => {
    requisitarSimulado.mockResolvedValue([resumo('1', 5, true)])
    const store = useCasamentosStore()

    await store.carregar('Arquivados')

    expect(requisitarSimulado).toHaveBeenCalledWith('/api/casamentos?situacao=Arquivados')
    expect(store.proximos).toEqual([])
  })

  it('[UNITÁRIO] falha ao carregar limpa a lista e registra o tipo', async () => {
    requisitarSimulado.mockRejectedValue(new ErroApi('Sem conexão', 0, null))
    const store = useCasamentosStore()

    await store.carregar()

    expect(store.itens).toEqual([])
    expect(store.falha?.tipo).toBe('conexao')
    expect(store.carregando).toBe(false)
  })

  it('[UNITÁRIO] ignora resposta de uma situação que já foi trocada', async () => {
    let resolverAtivos: (valor: CasamentoResumoDto[]) => void = () => undefined
    requisitarSimulado
      .mockReturnValueOnce(new Promise((resolver) => (resolverAtivos = resolver)))
      .mockResolvedValueOnce([resumo('arq', 3, true)])
    const store = useCasamentosStore()

    const primeira = store.carregar('Ativos')
    await store.carregar('Arquivados')
    resolverAtivos([resumo('ativo', 3)])
    await primeira

    expect(store.situacao).toBe('Arquivados')
    expect(store.itens.map((item) => item.id)).toEqual(['arq'])
  })

  it('[UNITÁRIO] obter guarda o casamento atual; 404 vira falha naoEncontrado', async () => {
    requisitarSimulado.mockResolvedValueOnce(completo('abc')).mockRejectedValueOnce(new ErroApi('x', 404, { status: 404 }))
    const store = useCasamentosStore()

    await store.obter('abc')
    expect(requisitarSimulado).toHaveBeenLastCalledWith('/api/casamentos/abc')
    expect(store.atual?.id).toBe('abc')

    await store.obter('outro')
    expect(store.atual).toBeNull()
    expect(store.falhaAtual?.tipo).toBe('naoEncontrado')
  })

  it('[UNITÁRIO] obter do mesmo casamento em paralelo (view e layout) faz uma única requisição', async () => {
    let resolver: (valor: CasamentoDto) => void = () => undefined
    requisitarSimulado.mockReturnValueOnce(new Promise<CasamentoDto>((res) => (resolver = res)))
    const store = useCasamentosStore()

    const primeira = store.obter('abc')
    const segunda = store.obter('abc')
    resolver(completo('abc'))
    await Promise.all([primeira, segunda])

    expect(requisitarSimulado).toHaveBeenCalledTimes(1)
    expect(store.atual?.id).toBe('abc')
  })

  it('[UNITÁRIO] depois de terminar, obter de novo (tentar novamente) volta a consultar a API', async () => {
    requisitarSimulado.mockRejectedValueOnce(new ErroApi('x', 0, null)).mockResolvedValueOnce(completo('abc'))
    const store = useCasamentosStore()

    await store.obter('abc')
    expect(store.falhaAtual?.tipo).toBe('conexao')
    await store.obter('abc')

    expect(requisitarSimulado).toHaveBeenCalledTimes(2)
    expect(store.atual?.id).toBe('abc')
  })

  it('[UNITÁRIO] criar e atualizar enviam o corpo pelos verbos corretos', async () => {
    requisitarSimulado.mockResolvedValue(completo('novo'))
    const store = useCasamentosStore()

    const criado = await store.criar(REQUEST)
    await store.atualizar('novo', REQUEST)

    expect(criado).toEqual({ ok: true, valor: completo('novo') })
    expect(requisitarSimulado).toHaveBeenNthCalledWith(1, '/api/casamentos', { metodo: 'POST', corpo: REQUEST })
    expect(requisitarSimulado).toHaveBeenNthCalledWith(2, '/api/casamentos/novo', { metodo: 'PUT', corpo: REQUEST })
    expect(store.atual?.id).toBe('novo')
  })

  it('[UNITÁRIO] arquivar remove da lista de ativos; restaurar remove da lista de arquivados', async () => {
    requisitarSimulado.mockResolvedValueOnce([resumo('1', 5), resumo('2', 6)]).mockResolvedValueOnce(completo('1', true))
    const store = useCasamentosStore()
    await store.carregar('Ativos')

    const resultado = await store.arquivar('1')

    expect(resultado.ok).toBe(true)
    expect(requisitarSimulado).toHaveBeenLastCalledWith('/api/casamentos/1/arquivar', { metodo: 'POST' })
    expect(store.itens.map((item) => item.id)).toEqual(['2'])

    requisitarSimulado.mockResolvedValueOnce([resumo('3', 5, true)]).mockResolvedValueOnce(completo('3'))
    await store.carregar('Arquivados')
    await store.restaurar('3')

    expect(requisitarSimulado).toHaveBeenLastCalledWith('/api/casamentos/3/restaurar', { metodo: 'POST' })
    expect(store.itens).toEqual([])
  })

  it('[UNITÁRIO] atualização mantém o item na lista quando continua na mesma situação', async () => {
    requisitarSimulado.mockResolvedValueOnce([resumo('1', 5)]).mockResolvedValueOnce({ ...completo('1'), nomeSegundaPessoa: 'Bruna' })
    const store = useCasamentosStore()
    await store.carregar('Ativos')

    await store.atualizar('1', REQUEST)

    expect(store.itens[0]?.nomeSegundaPessoa).toBe('Bruna')
  })

  it('[UNITÁRIO] ação com falha devolve ok false sem lançar', async () => {
    requisitarSimulado.mockRejectedValue(new ErroApi('Proibido', 403, { status: 403 }))
    const store = useCasamentosStore()

    const resultado = await store.arquivar('1')

    expect(resultado).toEqual({ ok: false, falha: { tipo: 'semPermissao', mensagem: null, errosCampos: {} } })
  })

  it('[SEGURANÇA] limpa os casamentos quando a organização da sessão muda ou a sessão termina', async () => {
    requisitarSimulado.mockResolvedValue([resumo('1', 5)])
    const autenticacao = useAutenticacaoStore()
    autenticacao.usuario = { id: 'u1', nome: 'Renata', email: 'r@exemplo.com', papel: 'Dono', organizacao: { id: 'o1', nome: 'A' } }
    const store = useCasamentosStore()
    await store.carregar()
    expect(store.itens).toHaveLength(1)

    autenticacao.usuario = null
    await nextTick()

    expect(store.itens).toEqual([])
    expect(store.carregado).toBe(false)
  })
})

describe('interpretarFalhaCasamento', () => {
  it('[UNITÁRIO] 400 mapeia erros por campo em camelCase', () => {
    const falha = interpretarFalhaCasamento(
      new ErroApi('Inválido', 400, { status: 400, errors: { NomePrimeiraPessoa: ['Preencha este campo.'], '$.data': ['Formato'] } }),
    )

    expect(falha).toEqual({
      tipo: 'validacao',
      mensagem: null,
      errosCampos: { nomePrimeiraPessoa: 'Preencha este campo.', data: 'Formato' },
    })
  })

  it('[UNITÁRIO] 422 usa o detail como mensagem', () => {
    const falha = interpretarFalhaCasamento(
      new ErroApi('Regra', 422, { status: 422, detail: 'Este casamento está arquivado. Restaure para voltar a editar.' }),
    )

    expect(falha.tipo).toBe('regra')
    expect(falha.mensagem).toBe('Este casamento está arquivado. Restaure para voltar a editar.')
  })

  it.each([
    [0, 'conexao'],
    [403, 'semPermissao'],
    [404, 'naoEncontrado'],
    [500, 'inesperado'],
  ] as const)('[UNITÁRIO] status %i vira %s', (status, tipo) => {
    expect(interpretarFalhaCasamento(new ErroApi('x', status, null)).tipo).toBe(tipo)
  })

  it('[UNITÁRIO] erro que não é da API vira inesperado', () => {
    expect(interpretarFalhaCasamento(new Error('boom')).tipo).toBe('inesperado')
  })
})
