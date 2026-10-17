import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import ListaRepetivel from '@/componentes/base/ListaRepetivel.vue'
import SeloConfirmacao from '@/componentes/base/SeloConfirmacao.vue'
import LayoutPublico from '@/layouts/LayoutPublico.vue'
import { TEXTOS_LISTA_ACOMPANHANTES, TEXTOS_RSVP } from '@/textos/rsvp'
import type { RsvpPublicoDto } from '@/tipos/rsvp'
import { RaizRotas, quando, rotearFetch } from '@/views/casamentos/__tests__/auxiliaresCasamentos'

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'
const ROTA_CONSULTA = '/api/rsvp/consulta'
const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, { unstyled: boolean }]] }

function dados(extra: Partial<RsvpPublicoDto> = {}): RsvpPublicoDto {
  return {
    casamento: {
      nomePrimeiraPessoa: 'Ana Beatriz',
      nomeSegundaPessoa: 'Bruno',
      data: '2027-05-22',
      horario: '16:30',
      localCerimonia: 'Igreja São José',
      localRecepcao: 'Espaço Jardim',
    },
    nomeConvite: 'Família Souza',
    limiteAcompanhantes: 1,
    dataLimiteResposta: '2027-05-12',
    podeResponder: true,
    respondidoEm: null,
    pessoas: [
      { id: 'p1', nome: 'Célia Souza', faixaEtaria: 'Adulto', resposta: 'Pendente', possuiRestricao: false },
      { id: 'p2', nome: 'Antônio Souza', faixaEtaria: 'Adulto', resposta: 'Pendente', possuiRestricao: false },
    ],
    acompanhantes: [],
    privacidade: { versaoTermo: '2026-09-29', diasRetencao: 30 },
    ...extra,
  }
}

function fonte(caminho: string): string {
  return readFileSync(resolve(__dirname, caminho), 'utf-8')
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  fetchSimulado = simularFetch()
  simularMatchMedia(true)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

async function abrir(token = TOKEN) {
  const montagem = await prepararAplicacao(`/rsvp/${token}`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

describe('RsvpView — estrutura Nossia', { timeout: 20_000 }, () => {
  it('[COMPONENTE] com convite carregado usa a folha ampla e põe o convite antes do formulário', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())))

    await abrir()

    expect(wrapper!.find('.layout-publico--convite.layout-publico--amplo').exists()).toBe(true)
    const colunas = wrapper!.get('.rsvp__grade').element.children
    expect(colunas).toHaveLength(2)
    expect(colunas[0]!.querySelector('[data-teste="cabecalho-convite"]')).not.toBeNull()
    expect(colunas[1]!.querySelector('[data-teste="rsvp-formulario"]')).not.toBeNull()
  })

  it('[COMPONENTE] títulos de seção usam o rótulo do Nossia e o prazo vira legenda', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())))

    await abrir()

    const titulo = wrapper!.get('#rsvp-titulo-pessoas')
    expect(titulo.text()).toBe(TEXTOS_RSVP.quemVai)
    expect(titulo.classes()).toContain('texto-rotulo')
    expect(wrapper!.get('.rsvp__convite .texto-legenda').text()).toBe('Responda até 12 de maio')
    expect(wrapper!.get('.rsvp__nome-convite').text()).toBe('Família Souza')
  })

  it('[COMPONENTE] acompanhantes mantêm rótulo de seção e o rótulo de faixa etária', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())))

    await abrir()
    await wrapper!.get('[data-teste="rsvp-todos-vao"]').trigger('click')
    await flushPromises()
    await wrapper!.get('[data-teste="adicionar-item"]').trigger('click')
    await flushPromises()

    expect(wrapper!.get('#rsvp-titulo-acompanhantes').classes()).toContain('texto-rotulo')
    expect(wrapper!.get('[data-teste="rsvp-rotulo-faixa-acompanhante"]').text()).toBe(TEXTOS_RSVP.faixaAcompanhante)
    expect(wrapper!.get('[data-teste="rsvp-faixa-acompanhante"]').attributes('aria-labelledby')).toBe('rsvp-faixa-acompanhante-0-rotulo')
  })

  it('[COMPONENTE] link inválido mostra o erro na folha estreita', async () => {
    await abrir('curto')

    expect(wrapper!.text()).toContain(TEXTOS_RSVP.linkInativoTitulo)
    expect(wrapper!.find('.layout-publico--amplo').exists()).toBe(false)
    expect(wrapper!.find('.rsvp').exists()).toBe(false)
  })

  it('[COMPONENTE] falha de rede ao abrir mantém a folha estreita e oferece tentar de novo', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaProblema(500)))

    await abrir()

    expect(wrapper!.text()).toContain(TEXTOS_RSVP.erroCarregarTitulo)
    expect(wrapper!.find('.layout-publico--amplo').exists()).toBe(false)
  })

  it('[COMPONENTE] resumo usa o lacre de confirmação', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () =>
        respostaJson(
          dados({
            respondidoEm: '2026-10-01T12:00:00Z',
            pessoas: dados().pessoas.map((pessoa) => ({ ...pessoa, resposta: 'Confirmado' as const })),
          }),
        ),
      ),
    )

    await abrir()

    expect(wrapper!.find('[data-teste="rsvp-resumo"] .lacre-icone .ie-concluir').exists()).toBe(true)
    expect(wrapper!.get('.selo-confirmacao__titulo').text()).toBe(TEXTOS_RSVP.suaResposta)
  })
})

describe('LayoutPublico — largura ampla', () => {
  it('[COMPONENTE] só fica amplo quando pedido', () => {
    const padrao = mount(LayoutPublico, { props: { variante: 'convite' }, slots: { default: '<p>Convite</p>' } })
    const amplo = mount(LayoutPublico, { props: { variante: 'convite', amplo: true }, slots: { default: '<p>Convite</p>' } })

    expect(padrao.classes()).not.toContain('layout-publico--amplo')
    expect(amplo.classes()).toContain('layout-publico--amplo')
    expect(amplo.classes()).toContain('layout-publico--convite')
  })
})

describe('ListaRepetivel — cabeçalho do bloco', () => {
  it('[COMPONENTE] legenda e Remover ficam no próprio fieldset, antes do conteúdo', () => {
    wrapper = mount(ListaRepetivel, {
      props: { itens: ['a'], chave: (item: unknown) => String(item), textos: TEXTOS_LISTA_ACOMPANHANTES, minimo: 0, maximo: 2 },
      slots: { default: '<input data-teste="campo" />' },
      global,
    })

    const filhos = Array.from(wrapper.get('fieldset').element.children).map((filho) => filho.className)
    expect(filhos[0]).toContain('lista-repetivel__legenda')
    expect(filhos[1]).toContain('lista-repetivel__remover')
    expect(filhos[2]).toContain('lista-repetivel__conteudo')
    expect(wrapper.get('[data-teste="remover-item"]').attributes('aria-label')).toBe('Remover: Acompanhante 1')
  })
})

describe('SeloConfirmacao — lacre', () => {
  it('[COMPONENTE] usa o LacreIcone decorativo e mantém o título focável', () => {
    wrapper = mount(SeloConfirmacao, { props: { titulo: 'Resposta enviada' }, global })

    expect(wrapper.get('.lacre-icone').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.lacre-icone .ie').classes()).toContain('ie-concluir')
    expect(wrapper.get('h2').attributes('tabindex')).toBe('-1')
  })
})

describe('Estilos — ritmo e sem margem negativa', () => {
  const arquivos = {
    rsvp: fonte('../RsvpView.vue'),
    layout: fonte('../../../layouts/LayoutPublico.vue'),
    lista: fonte('../../../componentes/base/ListaRepetivel.vue'),
    selo: fonte('../../../componentes/base/SeloConfirmacao.vue'),
  }

  it('[UNITÁRIO] não usam a escala antiga de espaço nem margem negativa', () => {
    for (const conteudo of Object.values(arquivos)) {
      expect(conteudo).not.toMatch(/--p-espaco-/)
      expect(conteudo).not.toMatch(/calc\(-1/)
    }
  })

  it('[UNITÁRIO] ajustes por largura usam @container na tela e na lista', () => {
    expect(arquivos.rsvp).toMatch(/@container rsvp \(min-width: 56rem\)/)
    expect(arquivos.rsvp).not.toMatch(/@media/)
    expect(arquivos.lista).toMatch(/@container lista-repetivel/)
    expect(arquivos.lista).not.toMatch(/@media/)
  })

  it('[UNITÁRIO] títulos sem peso médio/negrito e raios por token', () => {
    expect(arquivos.rsvp).toMatch(/\.rsvp__nome-convite \{[^}]*--p-fonte-peso-leve/)
    expect(arquivos.selo).toMatch(/--p-fonte-peso-leve/)
    expect(arquivos.rsvp).not.toMatch(/border-radius: \d+px/)
  })
})
