import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'

import {
  SESSAO_EXEMPLO,
  montarView,
  prepararAplicacao,
  respostaJson,
  respostaProblema,
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'
import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import { TEXTOS_ENVIO_CONVITE } from '@/textos/rsvp'
import type { SessaoDto } from '@/tipos/api'
import type { ConviteDto, ListaConvitesDto } from '@/tipos/convidados'
import { ID_EVENTO, RaizRotas, eventoCompleto, quando, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-convidados')

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_CONVITES = `${ROTA_EVENTO}/convites`
const NOME_LONGO = 'Família Albuquerque de Vasconcellos e Orleans e Bragança Figueiredo Junqueira'

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

function convite(dados: Partial<ConviteDto> = {}): ConviteDto {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    nome: NOME_LONGO,
    grupo: 'Família da noiva',
    limiteAcompanhantes: 1,
    statusEnvio: 'NaoEnviado',
    convidados: [
      { id: 'p1', nome: 'Carla Souza', telefone: '11987654321', email: 'carla@exemplo.com', faixaEtaria: 'Adulto', resposta: 'Confirmado', acompanhante: false, possuiRestricao: false },
    ],
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: null,
    ...dados,
  }
}

function lista(dados: Partial<ListaConvitesDto> = {}): ListaConvitesDto {
  return {
    convites: [convite()],
    totais: {
      convites: 1,
      pessoas: 1,
      adultos: 1,
      criancas: 0,
      acompanhantesPermitidos: 1,
      confirmados: { adultos: 1, criancas: 0, total: 1 },
      pendentes: { adultos: 0, criancas: 0, total: 0 },
      recusados: { adultos: 0, criancas: 0, total: 0 },
    },
    convidadosEstimados: 150,
    eventoArquivado: false,
    ...dados,
  }
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
  vi.unstubAllGlobals()
})

async function abrir(sessao: SessaoDto = SESSAO_EXEMPLO, rotaConvites: Rota = quando('GET', ROTA_CONVITES, () => respostaJson(lista()))) {
  rotear(fetchSimulado, sessao, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())), rotaConvites)
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/convidados`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

function lerFonte(caminho: string): string {
  return readFileSync(resolve(__dirname, caminho), 'utf-8')
}

function estiloDaView(): string {
  const fonte = lerFonte('../ConvidadosView.vue')
  return fonte.slice(fonte.indexOf('<style scoped>'))
}

describe('ConvidadosView — reestruturação da fundação', { timeout: 20_000 }, () => {
  it('[COMPONENTE] cabeçalho fica só com as ações de escrita e os atalhos vão para a faixa de visão geral', async () => {
    const tela = await abrir()

    const cabecalho = tela.get('header.cabecalho-pagina')
    expect(cabecalho.find('[data-teste="adicionar-convite"]').exists()).toBe(true)
    expect(cabecalho.find('[data-teste="importar-planilha"]').exists()).toBe(true)
    expect(cabecalho.find('[data-teste="abrir-confirmacoes"]').exists()).toBe(false)
    expect(cabecalho.find('[data-teste="abrir-mesas"]').exists()).toBe(false)

    const visao = tela.get('.convidados__visao')
    expect(visao.find('[data-teste="resumo-contagem"]').exists()).toBe(true)
    const atalhos = visao.get('[data-teste="atalhos-convidados"]')
    expect(atalhos.element.tagName).toBe('NAV')
    expect(atalhos.attributes('aria-label')).toBe(TEXTOS_CONVIDADOS.atalhosRotulo)
    expect(atalhos.find('[data-teste="abrir-confirmacoes"]').exists()).toBe(true)
    expect(atalhos.find('[data-teste="abrir-mesas"]').exists()).toBe(true)
    expect(atalhos.find('[data-teste="abrir-restricoes"]').exists()).toBe(true)
  })

  it('[SEGURANÇA] perfil anfitrião não vê o atalho de restrições alimentares', async () => {
    const tela = await abrir(SESSAO_ANFITRIAO)

    const atalhos = tela.get('[data-teste="atalhos-convidados"]')
    expect(atalhos.find('[data-teste="abrir-mesas"]').exists()).toBe(true)
    expect(atalhos.find('[data-teste="abrir-restricoes"]').exists()).toBe(false)
  })

  it('[COMPONENTE] falha de rede esconde atalhos e a faixa de visão geral', async () => {
    const tela = await abrir(SESSAO_EXEMPLO, quando('GET', ROTA_CONVITES, () => respostaProblema(500)))

    expect(tela.text()).toContain(TEXTOS_CONVIDADOS.erroCarregar)
    expect(tela.find('[data-teste="atalhos-convidados"]').exists()).toBe(false)
    expect(tela.find('.convidados__visao').exists()).toBe(false)
  })

  it('[COMPONENTE] lista vazia mantém atalhos sem resumo de contagem', async () => {
    const tela = await abrir(
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CONVITES, () => respostaJson(lista({ convites: [], totais: { ...lista().totais, convites: 0, pessoas: 0 } }))),
    )

    expect(tela.find('[data-teste="resumo-contagem"]').exists()).toBe(false)
    expect(tela.find('[data-teste="atalhos-convidados"]').exists()).toBe(true)
  })

  it('[COMPONENTE] ações da linha: WhatsApp com rótulo curto e editar/excluir/menu só com ícone e nome acessível', async () => {
    const tela = await abrir()

    const whatsapp = tela.get('[data-teste="enviar-whatsapp"]')
    expect(whatsapp.text()).toBe(TEXTOS_ENVIO_CONVITE.enviarWhatsAppCurto)
    expect(whatsapp.attributes('aria-label')).toBe(TEXTOS_ENVIO_CONVITE.acaoComNome(TEXTOS_ENVIO_CONVITE.enviarWhatsApp, NOME_LONGO))

    const editar = tela.get('[data-teste="editar-convite"]')
    expect(editar.text()).toBe('')
    expect(editar.attributes('aria-label')).toBe(TEXTOS_CONVIDADOS.acaoComNome(TEXTOS_CONVIDADOS.editar, NOME_LONGO))
    expect(editar.attributes('title')).toBe(TEXTOS_CONVIDADOS.editar)

    const excluir = tela.get('[data-teste="excluir-convite"]')
    expect(excluir.text()).toBe('')
    expect(excluir.attributes('aria-label')).toBe(TEXTOS_CONVIDADOS.acaoComNome(TEXTOS_CONVIDADOS.excluir, NOME_LONGO))

    const menu = tela.get('[data-teste="menu-acoes"]')
    expect(menu.text()).toBe('')
    expect(menu.attributes('aria-label')).toBe(TEXTOS_ENVIO_CONVITE.acaoComNome(TEXTOS_ENVIO_CONVITE.maisAcoes, NOME_LONGO))
  })

  it('[SEGURANÇA] telefone e e-mail não aparecem na listagem nem no título da aba', async () => {
    const tela = await abrir()

    expect(tela.text()).not.toContain('98765')
    expect(tela.text()).not.toContain('carla@exemplo.com')
    expect(tela.html()).not.toContain('carla@exemplo.com')
    expect(document.title).not.toContain('98765')
    expect(document.title).not.toContain('@')
  })

  it('[UNITÁRIO] colunas reservam largura e o nome do convite mantém a quebra de linha', () => {
    const fonte = lerFonte('../ConvidadosView.vue')
    expect(fonte).toContain("{ campo: 'nome', titulo: TEXTOS_CONVIDADOS.colunaConvite, principal: true, largura: '32%' }")
    expect(fonte).toContain("largura: '14%'")
    expect(fonte).toContain("largura: '9rem'")
    expect(fonte).toContain("ocultarNoTablet: true, largura: '8rem'")

    const estilo = estiloDaView()
    expect(estilo).toMatch(/\.convidados__nome-convite \{[^}]*overflow-wrap: anywhere;/)
    const estiloPilulas = lerFonte('../../../componentes/base/FiltroPilulas.vue')
    expect(estiloPilulas).toMatch(/\.filtro-pilulas \{[^}]*flex-wrap: wrap;/)
    expect(estilo).not.toContain('.listagem__acoes-linha')
    expect(estilo).not.toContain('.p-button-label')
    expect(estilo).not.toContain('hyphens')
    expect(estilo).not.toContain('nowrap')
  })

  it('[REGRESSÃO] modo compacto da tabela segue a largura do conteúdo, não a viewport, para caber com a navegação lateral', () => {
    const estilo = estiloDaView()
    expect(estilo).toMatch(/\.convidados \{\s*container: convidados \/ inline-size;\s*\}/)
    expect(estilo).not.toMatch(/@media/)
    expect(estilo).not.toMatch(/:deep\(\.listagem__/)

    const fonte = lerFonte('../ConvidadosView.vue')
    expect(fonte).toMatch(/<ListagemDados[^>]*ocultar-secundarias-abaixo="larga"[^>]*acoes-somente-icone-abaixo="larga"/)
    expect(fonte).toMatch(/<div class="convidados pilha pilha--bloco">[\s\S]*class="convidados__lista/)
  })

  it('[COMPONENTE] resposta de cada pessoa e envio do convite aparecem como ponto + rótulo', async () => {
    const tela = await abrir()

    const respostas = tela.findAll('[data-teste="resposta-pessoa"]')
    const envios = tela.findAll('[data-teste="status-envio"]')
    expect(respostas.length).toBeGreaterThan(0)
    expect(envios.length).toBeGreaterThan(0)
    for (const selo of [...respostas, ...envios]) {
      expect(selo.attributes('data-ponto')).toBe('true')
      expect(selo.text().length).toBeGreaterThan(0)
    }
  })

  it('[COMPONENTE] filtro de resposta em pílulas com aria-pressed e o atalho de pendentes marca quando está ativo', async () => {
    const pendente = convite({
      id: '44444444-4444-4444-8444-444444444444',
      statusEnvio: 'Enviado',
      convidados: [{ id: 'p2', nome: 'Rui Prado', telefone: null, email: null, faixaEtaria: 'Adulto', resposta: 'Pendente', acompanhante: false, possuiRestricao: false }],
    })
    const tela = await abrir(
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CONVITES, () =>
        respostaJson(
          lista({
            convites: [convite(), pendente],
            totais: { ...lista().totais, convites: 2, pessoas: 2, adultos: 2, pendentes: { adultos: 1, criancas: 0, total: 1 } },
          }),
        ),
      ),
    )

    const pilulas = tela.findAll('[data-teste="filtro-resposta"] button')
    expect(pilulas.length).toBeGreaterThan(1)
    expect(pilulas[0]!.attributes('aria-pressed')).toBe('true')
    const atalho = tela.get('[data-teste="ver-pendentes"]')
    expect(atalho.attributes('aria-pressed')).toBe('false')
    await atalho.trigger('click')
    await flushPromises()
    expect(tela.get('[data-teste="ver-pendentes"]').attributes('aria-pressed')).toBe('true')
    const ativa = tela.findAll('[data-teste="filtro-resposta"] button').filter((botao) => botao.attributes('aria-pressed') === 'true')
    expect(ativa).toHaveLength(1)
    expect(ativa[0]!.text()).not.toBe(pilulas[0]!.text())
  })

  it('[UNITÁRIO] acompanhamento usa as cores de fase nas etapas e a cor de título nos números', () => {
    const fonte = lerFonte('../../../componentes/convidados/AcompanhamentoConvites.vue')
    const estilo = fonte.slice(fonte.indexOf('<style scoped>'))

    expect(estilo).toMatch(/--aguardando \{\s*background: var\(--p-cor-fase-reta-final-ponto\)/)
    expect(estilo).toMatch(/--respondidos \{\s*background: var\(--p-cor-fase-realizado-ponto\)/)
    expect(estilo).toMatch(/__numero \{[^}]*color: var\(--p-cor-titulo\)/)
    expect(estilo).not.toContain('color-mix')
    expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })

  it('[UNITÁRIO] estilos só usam tokens de ritmo, sem px soltos nem margens negativas', () => {
    const estilo = estiloDaView()
    const declaracoesDeEspaco = estilo.match(/(gap|margin[a-z-]*|padding[a-z-]*):[^;]+;/g) ?? []
    expect(declaracoesDeEspaco.length).toBeGreaterThan(0)
    for (const declaracao of declaracoesDeEspaco) {
      expect(declaracao).toMatch(/^(gap|margin[a-z-]*|padding[a-z-]*): (0|var\(--p-(ritmo|espaco)-[a-z0-9-]+\)( var\(--p-(ritmo|espaco)-[a-z0-9-]+\)| 0)*);$/)
    }
    expect(estilo).not.toMatch(/-\s*var\(--p-/)
    expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
    expect(estilo).not.toMatch(/box-shadow|gradient/)
    expect(estilo).not.toContain('--p-espaco-6')
  })
})
