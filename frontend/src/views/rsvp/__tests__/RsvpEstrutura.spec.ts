import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import ListaRepetivel from '@/componentes/base/ListaRepetivel.vue'
import SeloConfirmacao from '@/componentes/base/SeloConfirmacao.vue'
import { tomDoTipo } from '@/textos/tiposEvento'
import LayoutPublico from '@/layouts/LayoutPublico.vue'
import { TEXTOS_LISTA_ACOMPANHANTES, TEXTOS_RSVP } from '@/textos/rsvp'
import type { RsvpPublicoDto } from '@/tipos/rsvp'
import { RaizRotas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('rsvp')

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'
const ROTA_CONSULTA = '/api/rsvp/consulta'
const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, { unstyled: boolean }]] }

function dados(extra: Partial<RsvpPublicoDto> = {}): RsvpPublicoDto {
  return {
    evento: {
      tipo: 'Casamento',
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

describe('RsvpView — estrutura da fundação', () => {
  it('[COMPONENTE] com convite carregado usa a folha ampla: convite, formulário e só depois o bloco Para o dia', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())))

    await abrir()

    expect(wrapper!.find('.layout-publico--convite.layout-publico--amplo').exists()).toBe(true)
    const colunas = wrapper!.get('.rsvp__grade').element.children
    expect(colunas).toHaveLength(3)
    expect(colunas[0]!.querySelector('[data-teste="cabecalho-convite"]')).not.toBeNull()
    expect(colunas[1]!.querySelector('[data-teste="rsvp-formulario"]')).not.toBeNull()
    expect(colunas[2]!.getAttribute('data-teste')).toBe('rsvp-para-o-dia')
    expect(colunas[2]!.classList.contains('rsvp__dia')).toBe(true)
  })

  it('[COMPONENTE] títulos de seção usam o rótulo da fundação e o prazo vira legenda', async () => {
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

  it('[COMPONENTE] resumo usa o tile de confirmação no tom do evento e respostas com ponto', async () => {
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

    const tile = wrapper!.get('[data-teste="rsvp-resumo"] [data-teste="tile-tipo"]')
    expect(tile.attributes('data-tom')).toBe(tomDoTipo('Casamento'))
    expect(tile.find('.ie-concluir').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="rsvp-resumo"] .lacre-icone').exists()).toBe(false)
    for (const resposta of wrapper!.findAll('.rsvp__resposta-resumo--vai')) {
      expect(resposta.get('.rsvp__ponto').attributes('aria-hidden')).toBe('true')
    }
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

describe('SeloConfirmacao — tile do DS', () => {
  it('[COMPONENTE] usa TileTipo decorativo no tom do tipo (neutro sem tipo) e mantém o título focável', () => {
    wrapper = mount(SeloConfirmacao, { props: { titulo: 'Resposta enviada', tipo: 'QuinzeAnos' }, global })

    expect(wrapper.get('[data-teste="tile-tipo"]').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('[data-teste="tile-tipo"]').attributes('data-tom')).toBe(tomDoTipo('QuinzeAnos'))
    expect(wrapper.get('[data-teste="tile-tipo"] .ie').classes()).toContain('ie-concluir')
    expect(wrapper.find('.lacre-icone').exists()).toBe(false)
    wrapper.unmount()
    wrapper = mount(SeloConfirmacao, { props: { titulo: 'Resposta enviada' }, global })
    expect(wrapper.get('[data-teste="tile-tipo"]').attributes('data-tom')).toBe('neutro')
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

  it('[UNITÁRIO] coluna do convite sem sticky; bloco Para o dia sob o convite no largo', () => {
    expect(arquivos.rsvp).not.toMatch(/sticky/)
    expect(arquivos.rsvp).toMatch(/\.rsvp__principal \{\s*grid-column: 2;\s*grid-row: 1 \/ span 2;/)
    expect(arquivos.rsvp).toMatch(/\.rsvp__dia \{\s*grid-column: 1;\s*grid-row: 2;/)
  })

  it('[UNITÁRIO] bloco Para o dia usa ritmo e @container, sem @media nem escala antiga', () => {
    const bloco = fonte('../../../componentes/rsvp/ParaODiaRsvp.vue')
    expect(bloco).toMatch(/container: para-o-dia \/ inline-size/)
    expect(bloco).toMatch(/@container para-o-dia \(min-width: 30rem\)/)
    expect(bloco).not.toMatch(/@media|--p-espaco-|sticky/)
  })

  it('[UNITÁRIO] títulos sem peso médio/negrito e raios por token', () => {
    expect(arquivos.rsvp).toMatch(/\.rsvp__nome-convite \{[^}]*--p-fonte-peso-leve/)
    expect(arquivos.selo).toMatch(/--p-fonte-peso-leve/)
    expect(arquivos.rsvp).not.toMatch(/border-radius: \d+px/)
  })
})

describe('RSVP no DS v2', () => {
  const ler = (relativo: string) => fonte(relativo).split('<style scoped>')[1] ?? ''

  it('[UNITÁRIO] cartão do convite no tom do tipo e rótulos de local no padrão DS', () => {
    const cabecalho = fonte('../../../componentes/base/CabecalhoConvite.vue')
    const estilo = ler('../../../componentes/base/CabecalhoConvite.vue')

    expect(cabecalho).toContain('classeTomDoTipo(tipo)')
    expect(estilo).toContain('border-top: var(--p-dimensao-filete-tipo) solid var(--tom-viva)')
    expect(estilo).toMatch(/__anfitriao \{[^}]*color: var\(--tom-profunda\)/)
    expect(estilo).toMatch(/__data-numerica \{[^}]*color: var\(--tom-data\)/)
    expect(estilo).toMatch(/__local dt \{[^}]*font-size: var\(--p-fonte-tamanho-rotulo\)/)
    expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,8}\b|@media/)
  })

  it('[UNITÁRIO] link indisponível usa a folha vazia do LayoutPublico e o selo não usa mais o LacreIcone', () => {
    const view = fonte('../RsvpView.vue')

    expect(view).toContain(':vazio="linkIndisponivel"')
    expect(view).toContain(':variante="linkIndisponivel ? \'padrao\' : \'convite\'"')
    expect(view).toMatch(/<TileTipo\s+tom="champanhe"\s+icone="link"/)
    expect(fonte('../../../componentes/base/SeloConfirmacao.vue')).not.toContain('LacreIcone')
  })
})
