import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import { dimensoes, espacamento, raio, ritmo, sombra, tipografia } from '@/design/tokens'
import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import { TEXTOS_FORNECEDORES_EVENTO } from '@/textos/fornecedoresEvento'
import { TEXTOS_AUTENTICACAO_LAYOUT, TEXTOS_PAINEL } from '@/textos/autenticacao'
import { NOME_PRODUTO } from '@/textos/rotulos'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, object]] }
const lerEstilo = (nome: string) => readFileSync(resolve(__dirname, '../../estilos', nome), 'utf-8')
const cssFontes = lerEstilo('fontes.css')
const cssLayout = lerEstilo('layout.css')
const cssBase = lerEstilo('base.css')
const cssComponentes = lerEstilo('componentes.css')
const mainTs = readFileSync(resolve(__dirname, '../../main.ts'), 'utf-8')
const faviconSvg = readFileSync(resolve(__dirname, '../../../public/favicon.svg'), 'utf-8')
const indexHtml = readFileSync(resolve(__dirname, '../../../index.html'), 'utf-8')
const pacote = JSON.parse(readFileSync(resolve(__dirname, '../../../package.json'), 'utf-8')) as { dependencies: Record<string, string> }

describe('fundação Celebri: tokens', () => {
  it('[UNITÁRIO] o ritmo usa os passos da fundação sobre a escala de espaçamento', () => {
    expect(ritmo).toEqual({
      secao: espacamento[16],
      bloco: espacamento[10],
      cartao: espacamento[6],
      grupo: espacamento[4],
      campo: espacamento[2],
    })
    expect([ritmo.secao, ritmo.bloco, ritmo.cartao, ritmo.grupo, ritmo.campo]).toEqual(['4rem', '2.5rem', '1.5rem', '1rem', '0.5rem'])
  })

  it('[UNITÁRIO] define as larguras de página e os raios da fundação', () => {
    expect(dimensoes.larguraAmpla).toBe('96rem')
    expect(dimensoes.larguraFormulario).toBe('48rem')
    expect(dimensoes.larguraLeitura).toBe('38rem')
    expect('larguraConteudo' in dimensoes).toBe(false)
    expect(raio).toMatchObject({
      campo: '12px',
      controle: '12px',
      aba: '10px',
      trilhoAbas: '14px',
      tile: '14px',
      painel: '20px',
      cartaoAmplo: '22px',
      folha: '28px',
      total: '999px',
    })
    expect(sombra.cartao).toBe('0 1px 2px rgba(14, 26, 51, 0.04), 0 8px 24px rgba(14, 26, 51, 0.05)')
    expect(dimensoes.larguraRail).toBe('4.75rem')
    expect(dimensoes.alturaBotao).toBe('3rem')
    expect(dimensoes.alturaAcaoLinha).toBe(dimensoes.alvoToque)
  })

  it('[UNITÁRIO] usa Fraunces nos títulos e no editorial e Plus Jakarta Sans na interface, com a escala do DS v2', () => {
    expect(tipografia.familias.display).toMatch(/^'Fraunces Variable'/)
    expect(tipografia.familias.serif).toMatch(/^'Fraunces Variable'/)
    expect(tipografia.familias.interface).toMatch(/^'Plus Jakarta Sans Variable'/)
    expect(JSON.stringify(tipografia.familias)).not.toMatch(/Jost|Cormorant|Lora/)
    expect(tipografia.pesos.leve).toBe(400)
    expect(tipografia.tamanhos).toMatchObject({ display: '3.5rem', pagina: '2.75rem', tituloGrande: '2.25rem', corpo: '0.9375rem', rotulo: '0.75rem' })
    expect(tipografia.entrelinhas).toMatchObject({ display: 1.05, corpo: 1.6 })
    expect(tipografia.espacamentoLetras).toMatchObject({ rotulo: '0.16em', display: '-0.02em' })
  })
})

describe('fundação Celebri: primitivas de layout', () => {
  it.each(['.pilha', '.pilha--secao', '.pilha--bloco', '.pilha--cartao', '.pilha--grupo', '.pilha--campo', '.grade', '.grade--indicadores', '.pagina-ampla', '.pagina-formulario', '.pagina-leitura', '.cartao', '.cabecalho-secao', '.texto-tagline', '.texto-rotulo', '.texto-destaque', '.texto-corrido', '.texto-legenda'])(
    '[UNITÁRIO] declara a primitiva %s',
    (classe) => {
      expect(cssLayout).toMatch(new RegExp(`${classe.replace('.', '\\.')}\\s*[,{]`))
    },
  )

  it('[UNITÁRIO] as primitivas usam só variáveis de token, sem cor, fonte ou medida literal de espaço', () => {
    expect(cssLayout).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(cssLayout).not.toMatch(/font-family:\s*['"]/)
    expect(cssLayout).not.toMatch(/(?:gap|padding|margin)[^;]*\d+px/)
    expect(cssLayout).toContain('var(--p-ritmo-secao)')
    expect(cssLayout).toContain('var(--p-dimensao-largura-ampla)')
  })

  it('[UNITÁRIO] as larguras de página são centralizadas', () => {
    expect(cssLayout).toMatch(/\.pagina-ampla,\s*\.pagina-formulario,\s*\.pagina-leitura\s*\{[^}]*margin-inline:\s*auto/)
  })

  it('[UNITÁRIO] componentes.css só usa variáveis de token e cobre todos os tons e fases', () => {
    expect(cssComponentes).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    for (const tom of ['rose', 'orquidea', 'tangerina', 'champanhe', 'jade', 'neutro']) {
      expect(cssComponentes).toContain(`.tom-tipo--${tom} {`)
      expect(cssComponentes).toContain(`--tom-profunda: var(--p-cor-tom-${tom}-tinta-profunda);`)
    }
    for (const fase of ['planejamento', 'reta-final', 'realizado', 'atrasado']) {
      expect(cssComponentes).toContain(`.fase--${fase} {`)
    }
    expect(cssComponentes).toContain('.botao-destaque')
    expect(cssComponentes).toContain('.botao-acao-linha')
    expect(cssComponentes).not.toMatch(/@media[^{]*width/)
    expect(mainTs).toContain("import './estilos/componentes.css'")
  })

  it('[UNITÁRIO] os títulos não usam peso pesado', () => {
    expect(cssBase).toMatch(/h1\s*\{[^}]*--p-fonte-peso-leve/)
    expect(cssBase).not.toMatch(/h2,\s*h3,\s*h4\s*\{[^}]*seminegrito/)
  })
})

describe('fundação Celebri: fontes e página', () => {
  it('[SEGURANÇA] as fontes vêm só dos pacotes locais de Fraunces e Plus Jakarta Sans, sem CDN', () => {
    const familias = [...cssFontes.matchAll(/font-family:\s*'([^']+)'/g)].map((par) => par[1])
    expect(new Set(familias)).toEqual(new Set(['Fraunces Variable', 'Plus Jakarta Sans Variable']))
    expect(cssFontes).not.toMatch(/https?:\/\//)
    expect(cssFontes.match(/url\('@fontsource-variable\/(fraunces|plus-jakarta-sans)\//g)).toHaveLength(3)
    expect(cssFontes).toContain('fraunces-latin-opsz-italic.woff2')
    expect(cssFontes.match(/font-display:\s*swap/g)).toHaveLength(3)
    expect(cssFontes).not.toMatch(/jost|cormorant|lora/i)
  })

  it('[SEGURANÇA] as dependências de fonte são as do DS v2, com versão fixada, e as do DS v1 saíram', () => {
    expect(pacote.dependencies['@fontsource-variable/fraunces']).toMatch(/^~\d+\.\d+\.\d+$/)
    expect(pacote.dependencies['@fontsource-variable/plus-jakarta-sans']).toMatch(/^~\d+\.\d+\.\d+$/)
    expect(Object.keys(pacote.dependencies).some((nome) => /jost|cormorant|lora|hanken/.test(nome))).toBe(false)
  })

  it('[SEGURANÇA] o index.html usa o nome Celebri e não carrega nada de fora da origem', () => {
    expect(indexHtml).toContain('<title>Celebri</title>')
    expect(indexHtml).toContain('<meta name="theme-color" content="#FFFFFF">')
    expect(indexHtml).not.toMatch(/Nossia/i)
    expect(indexHtml).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml">')
    expect(faviconSvg).not.toMatch(/<script|href=|https?:\/\/(?!www\.w3\.org)/i)
    expect(faviconSvg).toContain('#E3B964')
    expect(indexHtml).not.toMatch(/(?:href|src)="https?:\/\//)
    expect(indexHtml).not.toMatch(/Enlace/)
  })
})

describe('fundação Celebri: marca e textos', () => {
  it('[UNITÁRIO] o nome do produto é Celebri em todos os títulos compostos', () => {
    expect(NOME_PRODUTO).toBe('Celebri')
    expect(TEXTOS_PAINEL.primeiroAcessoTitulo).toBe('Boas-vindas ao Celebri.')
    expect(TEXTOS_CONVIDADOS.tituloDocumento('Ana & Bruno')).toBe('Convidados · Ana & Bruno · Celebri')
    expect(TEXTOS_FORNECEDORES_EVENTO.tituloDocumento('Ana & Bruno')).toBe('Fornecedores · Ana & Bruno · Celebri')
    expect(TEXTOS_AUTENTICACAO_LAYOUT.frase).toBe('Eventos que conectam.')
  })

  it('[COMPONENTE] a entrada mostra o logotipo provisório Celebri em destaque sobre o painel escuro e na barra do celular, sem imagem do Nossia', () => {
    const wrapper = mount(LayoutAutenticacao, { props: { titulo: 'Entrar' }, global })

    const destaque = wrapper.get('.layout-autenticacao__logo')
    expect(destaque.classes()).toEqual(expect.arrayContaining(['marca--destaque', 'marca--fundo-escuro']))
    expect(destaque.text()).toBe('Celebri')
    expect(wrapper.get('header [data-teste="marca-produto"] .marca__nome').text()).toBe('Celebri')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.html()).not.toMatch(/nossia/i)
    wrapper.findAll('svg').forEach((svg) => expect(svg.attributes('aria-hidden')).toBe('true'))
  })

  it('[COMPONENTE] o painel de marca lista os tipos de evento do vocabulário e o complemento só aparece quando informado', () => {
    const wrapper = mount(LayoutAutenticacao, { props: { titulo: 'Entrar' }, global })

    expect(wrapper.get('header [data-teste="tipos-atendidos"]').text()).toBe(
      TEXTOS_AUTENTICACAO_LAYOUT.tipos('casamentos, festas de 15 anos, aniversários e comemorações'),
    )
    expect(wrapper.find('.layout-autenticacao__complemento').exists()).toBe(false)

    const comComplemento = mount(LayoutAutenticacao, {
      props: { titulo: 'Entrar' },
      slots: { complemento: '<p data-teste="extra">Orientação</p>' },
      global,
    })
    const complemento = comComplemento.get('.layout-autenticacao__complemento')
    expect(complemento.get('[data-teste="extra"]').text()).toBe('Orientação')
    expect(comComplemento.get('main').find('[data-teste="extra"]').exists()).toBe(false)
  })

  it('[COMPONENTE] em modo demonstração não repete o cabeçalho de marca', () => {
    const wrapper = mount(LayoutAutenticacao, { props: { titulo: 'Entrar', demonstracao: true }, global })

    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.find('.layout-autenticacao__logo').exists()).toBe(false)
    expect(wrapper.get('[data-teste="lacre"] .marca__simbolo').attributes('aria-hidden')).toBe('true')
  })
})
