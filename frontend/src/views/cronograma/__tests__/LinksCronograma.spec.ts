import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'

import {
  SESSAO_EXEMPLO,
  corpoDaChamada,
  montarView,
  prepararAplicacao,
  respostaJson,
  respostaProblema,
  respostaVazia,
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'
import { cronogramaExemplo, itemCronograma } from '@/__tests__/auxiliaresCronograma'
import { TOKEN_CRONOGRAMA, linksExemplo } from '@/__tests__/auxiliaresCronogramaPublico'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_LINKS_CRONOGRAMA } from '@/textos/cronogramaPublico'
import type { SessaoDto } from '@/tipos/api'
import type { LinksCronogramaDto } from '@/tipos/cronogramaPublico'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_CRONOGRAMA = `${ROTA_EVENTO}/cronograma`
const ROTA_LINKS = `${ROTA_CRONOGRAMA}/links`
const CAMINHO = `/eventos/${ID_EVENTO}/cronograma`

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

function rotear(fetchSimulado: Mock<typeof fetch>, sessao: SessaoDto, ...rotas: Rota[]) {
  fetchSimulado.mockImplementation(async (entrada, init) => {
    const url = String(entrada)
    if (url === '/api/autenticacao/renovar') {
      return respostaJson(sessao)
    }
    for (const rota of rotas) {
      const resposta = rota(url, init)
      if (resposta) {
        return resposta
      }
    }
    return respostaProblema(404, { title: 'Recurso não encontrado.' })
  })
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined
let janela: { opener: unknown; location: { href: string }; close: Mock }
let area: string[]

beforeEach(() => {
  notificacoes.sucesso.mockClear()
  notificacoes.erro.mockClear()
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
  janela = { opener: {}, location: { href: 'about:blank' }, close: vi.fn() }
  vi.spyOn(window, 'open').mockImplementation(() => janela as unknown as Window)
  area = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(async (texto: string) => void area.push(texto)) },
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
  vi.restoreAllMocks()
})

async function abrir(sessao: SessaoDto, links: () => Response, ...extras: Rota[]) {
  rotear(
    fetchSimulado,
    sessao,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'Bruno', data: '2027-05-15' }))),
    quando('GET', ROTA_CRONOGRAMA, () => respostaJson(cronogramaExemplo([itemCronograma()]))),
    quando('GET', ROTA_LINKS, links),
    ...extras,
  )
  const montagem = await prepararAplicacao(CAMINHO)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

async function clicar(seletor: string) {
  document.body.querySelector<HTMLElement>(seletor)!.click()
  await flushPromises()
}

function linha(chave: string): HTMLElement {
  return document.body.querySelector<HTMLElement>(`[data-destino="${chave}"]`)!
}

async function clicarNaLinha(chave: string, teste: string) {
  linha(chave).querySelector<HTMLElement>(`[data-teste="${teste}"]`)!.click()
  await flushPromises()
}

describe('Links do cronograma — assessoria', { timeout: 20_000 }, () => {
  it('[COMPONENTE] abre o painel com validade, grupos e situação de cada destino', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(linksExemplo()))

    await clicar('[data-teste="abrir-links-cronograma"]')

    const painel = document.body.querySelector('[data-teste="painel-links-cronograma"]')!
    expect(painel.textContent).toContain(TEXTOS_LINKS_CRONOGRAMA.titulo)
    expect(document.body.querySelector('[data-teste="links-validade"]')!.textContent).toContain('Os links valem até 22 de maio de 2027.')
    expect(Array.from(painel.querySelectorAll('h3')).map((titulo) => titulo.textContent?.trim())).toEqual(['Equipe', 'Fornecedores', 'Responsáveis'])
    expect(linha('geral').textContent).toContain('Link ativo')
    expect(linha('fornecedor:v-buffet').textContent).toContain('Buffet · 2 itens')
    expect(linha('fornecedor:v-buffet').textContent).toContain('Sem link')
    expect(linha('responsavel:Fernanda').textContent).toContain('Link indisponível')
  })

  it('[E2E] enviar pelo WhatsApp gera o link do fornecedor e abre wa.me com o telefone', async () => {
    let lista: LinksCronogramaDto = linksExemplo()
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(lista),
      quando('POST', ROTA_LINKS, () => {
        lista = linksExemplo()
        return respostaJson({ id: 'l-buffet', token: TOKEN_CRONOGRAMA, geradoEm: '2027-03-10T12:00:00Z' })
      }),
    )
    await clicar('[data-teste="abrir-links-cronograma"]')

    await clicarNaLinha('fornecedor:v-buffet', 'link-whatsapp')

    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(corpoDaChamada(chamadas(fetchSimulado, 'POST', ROTA_LINKS)[0]!)).toEqual({ tipo: 'Fornecedor', fornecedorEventoId: 'v-buffet' })
    expect(janela.opener).toBeNull()
    expect(janela.location.href).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/)
    const mensagem = decodeURIComponent(janela.location.href.split('text=')[1]!)
    expect(mensagem).toContain('seus horários no evento de Ana & Bruno')
    expect(mensagem).toContain(`/cronograma/${TOKEN_CRONOGRAMA}`)
  })

  it('[COMPONENTE] copiar link e copiar mensagem usam o token existente sem gerar outro', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(linksExemplo()))
    await clicar('[data-teste="abrir-links-cronograma"]')

    await clicarNaLinha('geral', 'link-copiar')

    expect(area[0]).toBe(`${window.location.origin}/cronograma/${TOKEN_CRONOGRAMA}`)
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_LINKS_CRONOGRAMA.toastCopiado)
    expect(chamadas(fetchSimulado, 'POST', ROTA_LINKS)).toHaveLength(0)
  })

  it('[COMPONENTE] gerar novo link pede confirmação e regenera', async () => {
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(linksExemplo()),
      quando('POST', `${ROTA_LINKS}/l-geral/regenerar`, () => respostaJson({ id: 'l-geral', token: TOKEN_CRONOGRAMA, geradoEm: '2027-03-11T12:00:00Z' })),
    )
    await clicar('[data-teste="abrir-links-cronograma"]')

    await clicarNaLinha('geral', 'menu-acoes')
    const item = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((elemento) =>
      elemento.textContent?.includes(TEXTOS_LINKS_CRONOGRAMA.regenerar),
    )
    const alvo = item!.querySelector<HTMLElement>('a, div') ?? item!
    alvo.click()
    await flushPromises()

    const dialogo = document.body.querySelector('[data-teste="confirmacao-link-cronograma"]')
    expect(document.body.textContent).toContain('Gerar novo link para Equipe completa?')
    expect(dialogo).not.toBeNull()
    const candidatos = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).filter(
      (botao) => botao.textContent?.trim() === TEXTOS_LINKS_CRONOGRAMA.regenerar,
    )
    const confirmar = candidatos[candidatos.length - 1]
    confirmar!.click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', `${ROTA_LINKS}/l-geral/regenerar`)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_LINKS_CRONOGRAMA.toastRegenerado)
  })

  it('[COMPONENTE] arquivado mostra a faixa e só deixa desativar', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(linksExemplo({ arquivado: true })), quando('DELETE', `${ROTA_LINKS}/l-geral`, () => respostaVazia()))
    await clicar('[data-teste="abrir-links-cronograma"]')

    expect(document.body.querySelector('[data-teste="links-arquivado"]')!.textContent).toContain(TEXTOS_LINKS_CRONOGRAMA.arquivado)
    expect(document.body.querySelector('[data-teste="link-whatsapp"]')).toBeNull()
    expect(document.body.querySelector('[data-teste="link-gerar"]')).toBeNull()
    expect(linha('geral').querySelector('[data-teste="menu-acoes"]')).not.toBeNull()
  })

  it('[COMPONENTE] falha 422 ao gerar mostra a mensagem do servidor', async () => {
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(linksExemplo()),
      quando('POST', ROTA_LINKS, () => respostaProblema(422, { title: 'Regra', detail: 'Escolha um fornecedor deste evento que não esteja cancelado.' })),
    )
    await clicar('[data-teste="abrir-links-cronograma"]')

    await clicarNaLinha('fornecedor:v-buffet', 'link-gerar')

    expect(notificacoes.erro).toHaveBeenCalledWith('Escolha um fornecedor deste evento que não esteja cancelado.')
  })

  it('[COMPONENTE] erro ao carregar oferece tentar novamente', async () => {
    let tentativas = 0
    await abrir(SESSAO_EXEMPLO, () => {
      tentativas += 1
      return tentativas === 1 ? respostaProblema(500, {}) : respostaJson(linksExemplo())
    })
    await clicar('[data-teste="abrir-links-cronograma"]')
    expect(document.body.textContent).toContain(TEXTOS_LINKS_CRONOGRAMA.erroTitulo)

    const tentar = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find((botao) => botao.textContent?.includes('Tentar'))
    tentar!.click()
    await flushPromises()

    expect(linha('geral')).not.toBeNull()
  })
})

describe('Links do cronograma — anfitriões', () => {
  it('[SEGURANÇA] anfitriões não veem a ação nem consulta os links', async () => {
    await abrir(SESSAO_ANFITRIAO, () => respostaJson(linksExemplo()))

    expect(document.body.querySelector('[data-teste="abrir-links-cronograma"]')).toBeNull()
    expect(chamadas(fetchSimulado, 'GET', ROTA_LINKS)).toHaveLength(0)
  })
})
