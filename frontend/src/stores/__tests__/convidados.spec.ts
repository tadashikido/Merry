import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import { ErroApi, requisitar } from '@/servicos/clienteHttp'
import { SESSAO_EXEMPLO } from '@/__tests__/auxiliaresAutenticacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { interpretarFalhaConvidados, normalizarChaveCampo, rotaConvites, useConvidadosStore } from '@/stores/convidados'
import type { ConviteDto, ListaConvitesDto, SalvarConviteRequest, TotaisConvidadosDto } from '@/tipos/convidados'

vi.mock('@/servicos/clienteHttp', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/servicos/clienteHttp')>()
  return { ...original, requisitar: vi.fn() }
})

const requisitarSimulado = vi.mocked(requisitar)

const EVENTO = '11111111-1111-4111-8111-111111111111'
const OUTRO_EVENTO = '22222222-2222-4222-8222-222222222222'

const TOTAIS: TotaisConvidadosDto = {
  convites: 1,
  pessoas: 1,
  adultos: 1,
  criancas: 0,
  acompanhantesPermitidos: 0,
  confirmados: { adultos: 0, criancas: 0, total: 0 },
  pendentes: { adultos: 1, criancas: 0, total: 1 },
  recusados: { adultos: 0, criancas: 0, total: 0 },
}

const CONVITE: ConviteDto = {
  id: 'c1',
  nome: 'Família Souza',
  grupo: null,
  limiteAcompanhantes: 0,
  statusEnvio: 'NaoEnviado',
  convidados: [{ id: 'p1', nome: 'Carla', telefone: null, email: null, faixaEtaria: 'Adulto', resposta: 'Pendente', acompanhante: false, possuiRestricao: false }],
  criadoEm: '2026-09-28T12:00:00Z',
  atualizadoEm: '2026-09-28T12:00:00Z',
  respondidoEm: null,
}

const LISTA: ListaConvitesDto = { convites: [CONVITE], totais: TOTAIS, convidadosEstimados: 150, eventoArquivado: false }

const REQUEST: SalvarConviteRequest = {
  nome: 'Família Souza',
  grupo: null,
  limiteAcompanhantes: 0,
  convidados: [{ id: null, nome: 'Carla', telefone: null, email: null, faixaEtaria: 'Adulto', resposta: 'Pendente' }],
}

describe('useConvidadosStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    requisitarSimulado.mockReset()
  })

  it('[UNITÁRIO] monta rotas aninhadas no evento com ids codificados', () => {
    expect(rotaConvites(EVENTO)).toBe(`/api/eventos/${EVENTO}/convites`)
    expect(rotaConvites(EVENTO, 'a/b')).toBe(`/api/eventos/${EVENTO}/convites/a%2Fb`)
  })

  it('[UNITÁRIO] carrega a lista do evento', async () => {
    requisitarSimulado.mockResolvedValue(LISTA)
    const store = useConvidadosStore()

    await store.carregar(EVENTO)

    expect(requisitarSimulado).toHaveBeenCalledWith(`/api/eventos/${EVENTO}/convites`)
    expect(store.lista).toEqual(LISTA)
    expect(store.eventoId).toBe(EVENTO)
    expect(store.carregando).toBe(false)
  })

  it('[UNITÁRIO] descarta resposta atrasada de outro evento', async () => {
    let resolverPrimeira: (valor: ListaConvitesDto) => void = () => {}
    requisitarSimulado.mockImplementationOnce(() => new Promise((resolver) => (resolverPrimeira = resolver as typeof resolverPrimeira)))
    requisitarSimulado.mockResolvedValueOnce({ ...LISTA, convites: [] })
    const store = useConvidadosStore()

    const primeira = store.carregar(EVENTO)
    await store.carregar(OUTRO_EVENTO)
    resolverPrimeira(LISTA)
    await primeira

    expect(store.eventoId).toBe(OUTRO_EVENTO)
    expect(store.lista?.convites).toEqual([])
  })

  it('[UNITÁRIO] falha de rede vira falha de conexão, sem lista', async () => {
    requisitarSimulado.mockRejectedValue(new ErroApi('Não foi possível conectar à API.', 0, null))
    const store = useConvidadosStore()

    await store.carregar(EVENTO)

    expect(store.lista).toBeNull()
    expect(store.falha?.tipo).toBe('conexao')
  })

  it('[SEGURANÇA] 404 do evento de outra organização vira naoEncontrado', async () => {
    requisitarSimulado.mockRejectedValue(new ErroApi('Recurso não encontrado.', 404, null))
    const store = useConvidadosStore()

    await store.carregar(EVENTO)

    expect(store.falha?.tipo).toBe('naoEncontrado')
  })

  it('[UNITÁRIO] carrega totais pelo endpoint dedicado', async () => {
    requisitarSimulado.mockResolvedValue(TOTAIS)
    const store = useConvidadosStore()

    await store.carregarTotais(EVENTO)

    expect(requisitarSimulado).toHaveBeenCalledWith(`/api/eventos/${EVENTO}/convites/totais`)
    expect(store.totais).toEqual(TOTAIS)
    expect(store.eventoIdTotais).toBe(EVENTO)
  })

  it('[UNITÁRIO] criar envia POST, invalida os totais e não refaz a busca da lista', async () => {
    requisitarSimulado.mockResolvedValueOnce(LISTA).mockResolvedValueOnce(TOTAIS).mockResolvedValueOnce(CONVITE)
    const store = useConvidadosStore()
    await store.carregar(EVENTO)
    await store.carregarTotais(EVENTO)

    const resultado = await store.criar(EVENTO, REQUEST)

    expect(resultado).toEqual({ ok: true, valor: CONVITE })
    expect(requisitarSimulado).toHaveBeenCalledWith(`/api/eventos/${EVENTO}/convites`, { metodo: 'POST', corpo: REQUEST })
    expect(requisitarSimulado).toHaveBeenCalledTimes(3)
    expect(store.totais).toBeNull()
  })

  it('[UNITÁRIO] atualizar e remover usam PUT e DELETE no convite', async () => {
    requisitarSimulado.mockResolvedValue(CONVITE)
    const store = useConvidadosStore()

    await store.atualizar(EVENTO, 'c1', REQUEST)
    requisitarSimulado.mockResolvedValue(undefined)
    const remocao = await store.remover(EVENTO, 'c1')

    expect(requisitarSimulado).toHaveBeenCalledWith(`/api/eventos/${EVENTO}/convites/c1`, { metodo: 'PUT', corpo: REQUEST })
    expect(requisitarSimulado).toHaveBeenCalledWith(`/api/eventos/${EVENTO}/convites/c1`, { metodo: 'DELETE' })
    expect(remocao.ok).toBe(true)
  })

  it('[UNITÁRIO] 400 mapeia erros por campo, inclusive de cada pessoa, sem lançar', async () => {
    requisitarSimulado.mockRejectedValue(
      new ErroApi('Inválido', 400, { errors: { 'Convidados[1].Telefone': ['Informe o telefone com DDD.'], LimiteAcompanhantes: ['Informe de 0 a 10.'] } }),
    )
    const store = useConvidadosStore()

    const resultado = await store.criar(EVENTO, REQUEST)

    expect(resultado).toEqual({
      ok: false,
      falha: {
        tipo: 'validacao',
        mensagem: null,
        errosCampos: {
          'convidados[1].telefone': 'Informe o telefone com DDD.',
          limiteAcompanhantes: 'Informe de 0 a 10.',
        },
      },
    })
  })

  it('[UNITÁRIO] 422 traz a mensagem de regra; 403 vira semPermissao', async () => {
    requisitarSimulado.mockRejectedValueOnce(new ErroApi('Regra', 422, { detail: 'Este evento está arquivado.' }))
    requisitarSimulado.mockRejectedValueOnce(new ErroApi('Proibido', 403, null))
    const store = useConvidadosStore()

    const regra = await store.criar(EVENTO, REQUEST)
    const permissao = await store.remover(EVENTO, 'c1')

    expect(regra).toEqual({ ok: false, falha: { tipo: 'regra', mensagem: 'Este evento está arquivado.', errosCampos: {} } })
    expect(permissao.ok ? null : permissao.falha.tipo).toBe('semPermissao')
  })

  it('[UNITÁRIO] obter devolve resultado sem alterar a lista', async () => {
    requisitarSimulado.mockResolvedValueOnce(CONVITE).mockRejectedValueOnce(new ErroApi('Não encontrado', 404, null))
    const store = useConvidadosStore()

    expect(await store.obter(EVENTO, 'c1')).toEqual({ ok: true, valor: CONVITE })
    const falha = await store.obter(EVENTO, 'c2')
    expect(falha.ok ? null : falha.falha.tipo).toBe('naoEncontrado')
    expect(store.lista).toBeNull()
  })

  it('[SEGURANÇA] limpa os dados quando a organização da sessão muda', async () => {
    requisitarSimulado.mockResolvedValue(LISTA)
    const autenticacao = useAutenticacaoStore()
    autenticacao.usuario = SESSAO_EXEMPLO.usuario
    const store = useConvidadosStore()
    await store.carregar(EVENTO)

    autenticacao.usuario = null
    await nextTick()

    expect(store.lista).toBeNull()
    expect(store.eventoId).toBeNull()
  })

  it('[UNITÁRIO] normaliza chaves de erro do ASP.NET', () => {
    expect(normalizarChaveCampo('Convidados[0].Nome')).toBe('convidados[0].nome')
    expect(normalizarChaveCampo('$.convidados[0].faixaEtaria')).toBe('convidados[0].faixaEtaria')
    expect(interpretarFalhaConvidados(new Error('x')).tipo).toBe('inesperado')
  })
})
