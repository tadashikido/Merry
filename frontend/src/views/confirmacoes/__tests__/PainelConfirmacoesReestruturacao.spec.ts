import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { painelExemplo } from '@/__tests__/auxiliaresConfirmacoes'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import ResumoContagem from '@/componentes/base/ResumoContagem.vue'
import type { ItemContagem } from '@/componentes/base/tipos'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_COBRANCA, TEXTOS_CONFIRMACOES, TEXTOS_PROXIMOS_PASSOS_CONFIRMACOES } from '@/textos/confirmacoes'
import type { ConvitePendenteDto } from '@/tipos/confirmacoes'
import type { RelatorioRestricoesAlimentaresDto } from '@/tipos/dadosSensiveis'
import { ID_EVENTO, RaizRotas, eventoCompleto, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('painel-confirmacoes')

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_PAINEL = `${ROTA_EVENTO}/painel-confirmacoes`
const ROTA_RESTRICOES = `${ROTA_EVENTO}/restricoes-alimentares`

const lerEstilo = (arquivo: string) => {
  const fonte = readFileSync(resolve(__dirname, arquivo), 'utf-8')
  return fonte.slice(fonte.indexOf('<style'))
}
const ESTILO_VIEW = lerEstilo('../PainelConfirmacoesView.vue')
const FONTE_VIEW_CONFIRMACOES = readFileSync(resolve(__dirname, '../PainelConfirmacoesView.vue'), 'utf-8')
const ESTILO_RESUMO = lerEstilo('../../../componentes/base/ResumoContagem.vue')

const relatorio: RelatorioRestricoesAlimentaresDto = {
  totalPessoas: 1,
  totalConfirmados: 1,
  porTipo: [{ tipo: 'Vegana', quantidade: 2 }],
  outrasRestricoes: 0,
  necessidadesEspeciais: 0,
  pessoas: [],
  diasRetencao: 30,
  dataExclusaoPrevista: '2027-06-21',
  dadosExcluidosEm: null,
  registrosIlegiveis: 0,
  podeRegistrar: true,
}

function pendenteCobravel(dados: Partial<ConvitePendenteDto> = {}): ConvitePendenteDto {
  return {
    conviteId: '55555555-5555-4555-8555-555555555555',
    nome: 'Família Albuquerque Vasconcelos de Mendonça e Silva',
    grupo: null,
    statusEnvio: 'Enviado',
    telefone: '11987654321',
    pessoasPendentes: ['Maria Albuquerque', 'José Albuquerque'],
    totalPessoas: 3,
    cobravel: true,
    ultimaCobrancaEm: null,
    quantidadeCobrancas: 0,
    ...dados,
  }
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
  vi.restoreAllMocks()
})

async function abrir(painel: () => Response) {
  rotearFetch(
    fetchSimulado,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: '2027-05-22', dataLimiteRsvpEfetiva: '2027-05-12' }))),
    quando('GET', ROTA_PAINEL, painel),
    quando('GET', ROTA_RESTRICOES, () => respostaJson(relatorio)),
  )
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/confirmacoes`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

describe('PainelConfirmacoesView — reestruturação da fundação', { timeout: 20_000 }, () => {
  it('[COMPONENTE] contagens de RSVP viram grade de indicadores com um cartão por contagem', async () => {
    await abrir(() => respostaJson(painelExemplo()))

    const resumo = wrapper!.get('[data-teste="resumo-contagem"]')
    expect(resumo.classes()).toContain('resumo-contagem--indicadores')
    expect(resumo.attributes('aria-label')).toBe(TEXTOS_CONFIRMACOES.pessoasRotulo)
    const lista = resumo.get('ul')
    expect(lista.classes()).toEqual(expect.arrayContaining(['grade', 'grade--indicadores']))
    const itens = lista.findAll('li')
    expect(itens).toHaveLength(4)
    for (const item of itens) {
      expect(item.classes()).toContain('cartao')
    }
    expect(resumo.get('.resumo-contagem__rodape').classes()).toContain('texto-legenda')
  })

  it('[COMPONENTE] caminho dos convites e resumo do buffet ficam juntos no bloco de detalhes, depois dos indicadores', async () => {
    await abrir(() => respostaJson(painelExemplo()))

    const detalhes = wrapper!.get('[data-teste="detalhes-confirmacoes"]')
    expect(detalhes.find('[data-teste="barra-progresso-envio"]').exists()).toBe(true)
    expect(detalhes.find('[data-teste="resumo-cardapio"]').exists()).toBe(true)
    expect(detalhes.find('[data-teste="ver-restricoes"]').exists()).toBe(true)

    const corpo = wrapper!.get('.confirmacoes').element
    const filhos = Array.from(corpo.children)
    const indicadores = wrapper!.get('[data-teste="resumo-contagem"]').element
    const corpoPendentes = wrapper!.get('.confirmacoes__corpo').element
    expect(filhos.indexOf(indicadores)).toBeLessThan(filhos.indexOf(detalhes.element))
    expect(filhos.indexOf(detalhes.element)).toBeLessThan(filhos.indexOf(corpoPendentes))
  })

  it('[COMPONENTE] bloco "Para fechar as confirmações" vem depois da lista de pendentes, no mesmo grid', async () => {
    await abrir(() => respostaJson(painelExemplo({ pendentes: [pendenteCobravel()] })))

    const corpo = wrapper!.get('.confirmacoes__corpo')
    const filhos = Array.from(corpo.element.children)
    expect(filhos.map((filho) => filho.className)).toEqual([
      expect.stringContaining('confirmacoes__pendentes'),
      expect.stringContaining('confirmacoes__passos'),
    ])
    const bloco = corpo.get('[data-teste="proximos-passos-confirmacoes"]')
    expect(bloco.get('h2').text()).toBe(TEXTOS_PROXIMOS_PASSOS_CONFIRMACOES.titulo)
    expect(bloco.get('[data-teste="passos-prazo-evento"]').text()).toBe(
      TEXTOS_PROXIMOS_PASSOS_CONFIRMACOES.prazoAntes(10, 'do casamento'),
    )
    expect(bloco.get('[data-teste="passo-semLembrete"]').text()).toContain(TEXTOS_PROXIMOS_PASSOS_CONFIRMACOES.semLembrete(1))
  })

  it('[COMPONENTE] tipo do evento muda a referência do prazo no bloco (festa de 15 anos)', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () =>
        respostaJson(eventoCompleto({ tipo: 'QuinzeAnos', nomeSegundaPessoa: null, data: '2027-05-22', dataLimiteRsvpEfetiva: '2027-05-12' })),
      ),
      quando('GET', ROTA_PAINEL, () => respostaJson(painelExemplo())),
      quando('GET', ROTA_RESTRICOES, () => respostaJson(relatorio)),
    )
    const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/confirmacoes`)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()

    expect(wrapper.get('[data-teste="passos-prazo-evento"]').text()).toContain('da festa de 15 anos')
    expect(wrapper.get('[data-teste="passos-mesas"]').text()).toContain('mesa da debutante')
  })

  it('[COMPONENTE] painel vazio explica o que aparece quando os convites saírem e não mostra o bloco', async () => {
    const vazio = painelExemplo({ pendentes: [] })
    await abrir(() => respostaJson({ ...vazio, convites: { ...vazio.convites, total: 0 } }))

    expect(wrapper!.get('[data-teste="painel-vazio"]').text()).toContain(TEXTOS_CONFIRMACOES.vazioTexto)
    expect(wrapper!.find('[data-teste="proximos-passos-confirmacoes"]').exists()).toBe(false)
  })

  it('[COMPONENTE] cobrança de pendentes fica no cabeçalho da seção, ao lado do título', async () => {
    await abrir(() => respostaJson(painelExemplo({ pendentes: [pendenteCobravel()] })))

    const cabecalho = wrapper!.get('.confirmacoes__pendentes .cabecalho-secao')
    expect(cabecalho.get('h2').text()).toContain(TEXTOS_CONFIRMACOES.pendentesTitulo)
    expect(cabecalho.get('h2').text()).toContain('(1)')
    const botao = cabecalho.get('[data-teste="abrir-cobranca"]')
    expect(botao.text()).toContain(TEXTOS_COBRANCA.acaoAbrir(1))
    expect(botao.attributes('aria-haspopup')).toBe('dialog')
  })

  it('[COMPONENTE] com prazo encerrado o aviso substitui o botão no cabeçalho da seção', async () => {
    await abrir(() =>
      respostaJson(painelExemplo({ prazo: { dataLimite: '2027-05-12', diasRestantes: -1, aceitaRespostas: false }, pendentes: [pendenteCobravel()] })),
    )

    const cabecalho = wrapper!.get('.confirmacoes__pendentes .cabecalho-secao')
    expect(cabecalho.find('[data-teste="abrir-cobranca"]').exists()).toBe(false)
    expect(cabecalho.get('[data-teste="cobranca-prazo-encerrado"]').text()).toBe(TEXTOS_COBRANCA.prazoEncerrado)
  })

  it('[COMPONENTE] botão de WhatsApp da linha mantém nome acessível com o convite', async () => {
    await abrir(() => respostaJson(painelExemplo({ pendentes: [pendenteCobravel()] })))

    const botao = wrapper!.get('[data-teste="enviar-whatsapp"]')
    expect(botao.attributes('aria-label')).toContain('Família Albuquerque Vasconcelos de Mendonça e Silva')
  })

  it('[SEGURANÇA] erro do servidor não mostra indicadores, detalhes nem pendentes', async () => {
    await abrir(() => respostaProblema(500, { title: 'Erro' }))

    expect(wrapper!.text()).toContain(TEXTOS_CONFIRMACOES.erroCarregar)
    expect(wrapper!.find('[data-teste="resumo-contagem"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="detalhes-confirmacoes"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="pendente"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] sem permissão não mostra dados nem oferece nova tentativa', async () => {
    await abrir(() => respostaProblema(403, { title: 'Proibido' }))

    expect(wrapper!.text()).toContain(TEXTOS_CONFIRMACOES.semAcesso)
    expect(wrapper!.find('[data-teste="detalhes-confirmacoes"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilos da view usam @container e ritmo, sem @media, largura de leitura nem valores soltos', () => {
    expect(ESTILO_VIEW).not.toMatch(/@media/)
    expect(ESTILO_VIEW).toContain('container: confirmacoes / inline-size')
    expect(ESTILO_VIEW).toContain('@container confirmacoes (max-width: 39.99rem)')
    expect(ESTILO_VIEW).toContain('@container confirmacoes (min-width: 48rem)')
    expect(ESTILO_VIEW).toContain('@container confirmacoes (min-width: 64rem)')
    expect(ESTILO_VIEW).toContain('container: confirmacoes-lista / inline-size')
    expect(ESTILO_VIEW).not.toContain(':deep(.listagem__')
    expect(FONTE_VIEW_CONFIRMACOES).toMatch(/<ListagemDados[^>]*acoes-somente-icone-abaixo="larga"/)
    expect(FONTE_VIEW_CONFIRMACOES).toMatch(/<MenuAcoes[^>]*compactavel/)
    expect(FONTE_VIEW_CONFIRMACOES).toContain(':title="TEXTOS_ENVIO_CONVITE.enviarWhatsApp"')
    expect(ESTILO_VIEW).not.toMatch(/sticky/)
    expect(ESTILO_VIEW).not.toMatch(/--p-espaco-/)
    expect(ESTILO_VIEW).not.toMatch(/(?:gap|margin|padding)[^;]*\d+px/)
    expect(ESTILO_VIEW).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(ESTILO_VIEW).not.toMatch(/box-shadow|gradient/)
  })

  it('[UNITÁRIO] variante de indicadores do ResumoContagem usa ritmo e não altera seletores da faixa', () => {
    expect(ESTILO_RESUMO).toContain('.resumo-contagem--indicadores .resumo-contagem__item.cartao:nth-child(n)')
    expect(ESTILO_RESUMO).toContain('padding: var(--p-ritmo-cartao)')
    expect(ESTILO_RESUMO).toContain('font-weight: var(--p-fonte-peso-leve)')
    expect(ESTILO_RESUMO).toContain('.resumo-contagem__item:nth-child(even) {')
  })
})

describe('ResumoContagem — variante', () => {
  const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, { unstyled: boolean }]] }
  const itens: ItemContagem[] = [
    { chave: 'pessoas', valor: 10, rotulo: 'pessoas' },
    { chave: 'confirmadas', valor: 4, rotulo: 'confirmadas', destaque: true },
  ]

  it('[COMPONENTE] sem variante mantém a faixa sem classes de grade nem cartão', () => {
    wrapper = mount(ResumoContagem, { props: { itens, rotulo: 'Totais' }, slots: { rodape: 'apoio' }, global })

    expect(wrapper.get('section').classes()).toContain('resumo-contagem--faixa')
    expect(wrapper.get('ul').classes()).not.toContain('grade')
    expect(wrapper.get('li').classes()).not.toContain('cartao')
    expect(wrapper.get('.resumo-contagem__rodape').classes()).not.toContain('texto-legenda')
  })

  it('[COMPONENTE] variante indicadores preserva destaque, data-teste e semântica de lista', () => {
    wrapper = mount(ResumoContagem, { props: { itens, rotulo: 'Totais', variante: 'indicadores' }, global })

    expect(wrapper.get('section').attributes('aria-label')).toBe('Totais')
    expect(wrapper.get('[data-teste="contagem-confirmadas"]').classes()).toEqual(
      expect.arrayContaining(['resumo-contagem__item--destaque', 'cartao', 'pilha', 'pilha--campo']),
    )
    expect(wrapper.find('.resumo-contagem__rodape').exists()).toBe(false)
  })
})
