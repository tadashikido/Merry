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
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import { TEXTOS_ENVIO_CONVITE } from '@/textos/rsvp'
import type { SessaoDto } from '@/tipos/api'
import type { ConviteDto, ListaConvitesDto } from '@/tipos/convidados'
import { ID_CASAMENTO, RaizRotas, casamentoCompleto, quando, type Rota } from '../../casamentos/__tests__/auxiliaresCasamentos'

const ROTA_CASAMENTO = `/api/casamentos/${ID_CASAMENTO}`
const ROTA_CONVITES = `${ROTA_CASAMENTO}/convites`
const NOME_LONGO = 'Família Albuquerque de Vasconcellos e Orleans e Bragança Figueiredo Junqueira'

const SESSAO_CASAL: SessaoDto = {
  tokenAcesso: 'token-casal',
  expiraEm: '2026-09-28T12:15:00Z',
  usuario: {
    id: 'u-casal',
    nome: 'Lívia Moraes',
    email: 'livia@exemplo.com',
    papel: 'Casal',
    organizacao: { id: 'o1', nome: 'Albuquerque Assessoria' },
    casamentoId: ID_CASAMENTO,
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
    casamentoArquivado: false,
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
  rotear(fetchSimulado, sessao, quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())), rotaConvites)
  const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}/convidados`)
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

describe('ConvidadosView — reestruturação Nossia', { timeout: 20_000 }, () => {
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

  it('[SEGURANÇA] perfil casal não vê o atalho de restrições alimentares', async () => {
    const tela = await abrir(SESSAO_CASAL)

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
    expect(estilo).toMatch(/\.convidados__lista :deep\(\.p-selectbutton\) \{[^}]*flex-wrap: wrap;/)
    expect(estilo).toMatch(/@container convidados \(max-width: 63\.99rem\) \{[^@]*\.convidados__lista :deep\(\.listagem__tabela \.convidados__whatsapp \.p-button-label\) \{\s*display: none;/)
    expect(estilo).toMatch(/\.listagem__acoes-linha\) \{\s*display: grid;\s*grid-template-columns: repeat\(2, auto\);/)
    expect(estilo).not.toContain('hyphens')
    expect(estilo).not.toContain('nowrap')
  })

  it('[REGRESSÃO] modo compacto da tabela segue a largura do conteúdo, não a viewport, para caber com a navegação lateral', () => {
    const estilo = estiloDaView()
    expect(estilo).toMatch(/\.convidados \{\s*container: convidados \/ inline-size;\s*\}/)
    expect(estilo).not.toMatch(/@media/)
    expect(estilo).toMatch(/@container convidados \(max-width: 63\.99rem\) \{\s*\.convidados__lista :deep\(\.listagem__tabela \.listagem__coluna--secundaria\) \{\s*display: none;/)
    expect(estilo).toMatch(/@container convidados \(max-width: 63\.99rem\) \{[^@]*\.listagem__acoes-linha\) \{\s*display: grid;/)

    const fonte = lerFonte('../ConvidadosView.vue')
    expect(fonte).toMatch(/<div class="convidados pilha pilha--bloco">[\s\S]*class="convidados__lista/)
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
