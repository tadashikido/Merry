import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'
import Select from 'primevue/select'

import { SESSAO_EXEMPLO, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import type { SessaoDto } from '@/tipos/api'
import type { ListaConvitesDto } from '@/tipos/convidados'
import { ID_EVENTO, ID_OUTRO, RaizRotas, eventoCompleto, chamadas, resumoEvento } from './auxiliaresEventos'

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => ({ sucesso: vi.fn(), erro: vi.fn() }),
  DURACAO_TOAST_SUCESSO: 4000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_ATIVOS = '/api/eventos?situacao=Ativos'

const SESSAO_ANFITRIAO: SessaoDto = {
  tokenAcesso: 'token-anfitriao',
  expiraEm: '2026-09-28T12:15:00Z',
  usuario: {
    id: 'u-anfitriao',
    nome: 'Lívia Moraes',
    email: 'livia@exemplo.com',
    papel: 'Anfitriao',
    organizacao: { id: 'o1', nome: 'Albuquerque Assessoria' },
    eventoId: ID_EVENTO,
  },
}

const LISTA_VAZIA: ListaConvitesDto = {
  convites: [],
  totais: {
    convites: 0,
    pessoas: 0,
    adultos: 0,
    criancas: 0,
    acompanhantesPermitidos: 0,
    confirmados: { adultos: 0, criancas: 0, total: 0 },
    pendentes: { adultos: 0, criancas: 0, total: 0 },
    recusados: { adultos: 0, criancas: 0, total: 0 },
  },
  convidadosEstimados: 150,
  eventoArquivado: false,
}

const OUTRO = { id: ID_OUTRO, nomePrimeiraPessoa: 'Carla', nomeSegundaPessoa: 'Diego' }

function rotear(fetchSimulado: Mock<typeof fetch>, sessao: SessaoDto, ativos: Response | null) {
  fetchSimulado.mockImplementation(async (entrada, init) => {
    const url = String(entrada)
    const metodo = init?.method ?? 'GET'
    if (url === '/api/autenticacao/renovar') {
      return respostaJson(sessao)
    }
    if (metodo !== 'GET') {
      return respostaProblema(404)
    }
    if (url === ROTA_ATIVOS && ativos) {
      return ativos.clone()
    }
    if (url === `/api/eventos/${ID_EVENTO}`) {
      return respostaJson(eventoCompleto())
    }
    if (url === `/api/eventos/${ID_OUTRO}`) {
      return respostaJson(eventoCompleto(OUTRO))
    }
    if (/\/convites\/totais$/.test(url)) {
      return respostaJson(LISTA_VAZIA.totais)
    }
    if (/\/convites(\?.*)?$/.test(url)) {
      return respostaJson(LISTA_VAZIA)
    }
    return respostaProblema(404, { title: 'Recurso não encontrado.' })
  })
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  fetchSimulado = simularFetch()
  simularMatchMedia(false)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
  window.history.replaceState(null, '', '/')
})

async function abrir(caminho: string) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return { montagem, wrapper }
}

function textoTrilha(alvo: VueWrapper): string[] {
  return alvo.findAll('[data-teste="trilha"] li').map((item) => item.text().replace(/^\/\s*/, '').trim())
}

describe('Navegação entre eventos', () => {
  it('[INTEGRAÇÃO] assessoria troca de evento pelo seletor mantendo o módulo de convidados', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, respostaJson([resumoEvento(), resumoEvento({ ...OUTRO, diasRestantes: 90 })]))
    const { montagem, wrapper: pagina } = await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(chamadas(fetchSimulado, 'GET', ROTA_ATIVOS)).toHaveLength(1)
    const seletor = pagina.get('[data-teste="workspace-evento"] [data-teste="seletor-evento"]')
    expect(seletor.text()).toContain('Ana Beatriz')

    pagina.get('[data-teste="workspace-evento"]').findComponent(Select).vm.$emit('update:modelValue', ID_OUTRO)
    await flushPromises()

    expect(montagem.roteador.currentRoute.value.name).toBe('evento-convidados')
    expect(montagem.roteador.currentRoute.value.params.id).toBe(ID_OUTRO)
    await vi.waitFor(() => expect(pagina.get('[data-teste="workspace-evento"] [data-teste="seletor-evento"]').text()).toContain('Carla'))
    expect(chamadas(fetchSimulado, 'GET', ROTA_ATIVOS)).toHaveLength(1)
  }, 20_000)

  it('[INTEGRAÇÃO] trilha da assessoria é gerada a partir da rota e dos nomes dos anfitriões', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, respostaJson([resumoEvento()]))
    const { wrapper: pagina } = await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(textoTrilha(pagina)).toEqual(['Eventos', 'Ana Beatriz & Bruno', 'Convidados'])
    expect(pagina.get('[data-teste="trilha"] [aria-current="page"]').text()).toBe('Convidados')
    expect(pagina.findAll('[data-teste="trilha"] [aria-hidden="true"]')).toHaveLength(2)
    expect(pagina.find('[data-teste="seletor-evento"]').exists()).toBe(false)
  }, 20_000)

  it('[INTEGRAÇÃO] sub-rota de módulo leva à página principal do módulo no outro evento', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, respostaJson([resumoEvento(), resumoEvento(OUTRO)]))
    const { montagem, wrapper: pagina } = await abrir(`/eventos/${ID_EVENTO}/convidados/novo`)

    expect(textoTrilha(pagina)).toEqual(['Eventos', 'Ana Beatriz & Bruno', 'Convidados', 'Novo convite'])
    pagina.get('[data-teste="workspace-evento"]').findComponent(Select).vm.$emit('update:modelValue', ID_OUTRO)
    await flushPromises()

    expect(montagem.roteador.currentRoute.value.fullPath).toBe(`/eventos/${ID_OUTRO}/convidados`)
  }, 20_000)

  it('[INTEGRAÇÃO] falha ao carregar os ativos mantém o cabeçalho estático sem quebrar a página', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, respostaProblema(500))
    const { wrapper: pagina } = await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(pagina.find('[data-teste="seletor-evento"]').exists()).toBe(false)
    expect(pagina.get('[data-teste="navegacao-evento-cabecalho"]').text()).toContain('Ana Beatriz')
    expect(textoTrilha(pagina)).toContain('Convidados')
  }, 20_000)

  it('[SEGURANÇA] anfitriões não veem o seletor, não requisita a lista e a trilha omite "Eventos"', async () => {
    rotear(fetchSimulado, SESSAO_ANFITRIAO, respostaJson([resumoEvento(), resumoEvento(OUTRO)]))
    const { wrapper: pagina } = await abrir(`/eventos/${ID_EVENTO}/convidados`)

    expect(pagina.find('[data-teste="seletor-evento"]').exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', ROTA_ATIVOS)).toHaveLength(0)
    expect(textoTrilha(pagina)).toEqual(['Ana Beatriz & Bruno', 'Convidados'])
  }, 20_000)

  it('[SEGURANÇA] anfitriões na visão geral do próprio evento não tem trilha', async () => {
    rotear(fetchSimulado, SESSAO_ANFITRIAO, null)
    const { wrapper: pagina } = await abrir(`/eventos/${ID_EVENTO}`)

    expect(pagina.find('[data-teste="trilha"]').exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', ROTA_ATIVOS)).toHaveLength(0)
  }, 20_000)
})
