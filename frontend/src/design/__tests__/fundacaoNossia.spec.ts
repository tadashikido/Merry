import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import { dimensoes, espacamento, raio, ritmo, tipografia } from '@/design/tokens'
import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import { TEXTOS_FORNECEDORES_CASAMENTO } from '@/textos/fornecedoresCasamento'
import { TEXTOS_PAINEL } from '@/textos/autenticacao'
import { NOME_PRODUTO } from '@/textos/rotulos'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, object]] }
const lerEstilo = (nome: string) => readFileSync(resolve(__dirname, '../../estilos', nome), 'utf-8')
const cssFontes = lerEstilo('fontes.css')
const cssLayout = lerEstilo('layout.css')
const cssBase = lerEstilo('base.css')
const indexHtml = readFileSync(resolve(__dirname, '../../../index.html'), 'utf-8')
const pacote = JSON.parse(readFileSync(resolve(__dirname, '../../../package.json'), 'utf-8')) as { dependencies: Record<string, string> }

describe('fundação Nossia: tokens', () => {
  it('[UNITÁRIO] o ritmo usa os passos do Nossia sobre a escala de espaçamento', () => {
    expect(ritmo).toEqual({
      secao: espacamento[16],
      bloco: espacamento[10],
      cartao: espacamento[6],
      grupo: espacamento[4],
      campo: espacamento[2],
    })
    expect([ritmo.secao, ritmo.bloco, ritmo.cartao, ritmo.grupo, ritmo.campo]).toEqual(['4rem', '2.5rem', '1.5rem', '1rem', '0.5rem'])
  })

  it('[UNITÁRIO] define as larguras de página e os raios do Nossia', () => {
    expect(dimensoes.larguraAmpla).toBe('96rem')
    expect(dimensoes.larguraFormulario).toBe('48rem')
    expect(dimensoes.larguraLeitura).toBe('38rem')
    expect('larguraConteudo' in dimensoes).toBe(false)
    expect(raio).toMatchObject({ campo: '4px', controle: '12px', painel: '12px', folha: '28px', total: '999px' })
  })

  it('[UNITÁRIO] usa Jost nos títulos e na interface e Lora no texto editorial, com título em peso leve', () => {
    expect(tipografia.familias.display).toContain("'Jost Variable'")
    expect(tipografia.familias.interface).toContain("'Jost Variable'")
    expect(tipografia.familias.serif).toContain("'Lora Variable'")
    expect('editorial' in tipografia.familias).toBe(false)
    expect(tipografia.pesos.leve).toBe(300)
    expect(tipografia.espacamentoLetras).toEqual({ tagline: '0.3em', rotulo: '0.14em', display: '0.01em' })
  })
})

describe('fundação Nossia: primitivas de layout', () => {
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

  it('[UNITÁRIO] os títulos não usam peso pesado', () => {
    expect(cssBase).toMatch(/h1\s*\{[^}]*--p-fonte-peso-leve/)
    expect(cssBase).not.toMatch(/h2,\s*h3,\s*h4\s*\{[^}]*seminegrito/)
  })
})

describe('fundação Nossia: fontes e página', () => {
  it('[SEGURANÇA] as fontes vêm só dos pacotes locais de Jost e Lora, sem CDN', () => {
    const familias = [...cssFontes.matchAll(/font-family:\s*'([^']+)'/g)].map((par) => par[1])
    expect(new Set(familias)).toEqual(new Set(['Jost Variable', 'Lora Variable']))
    expect(cssFontes).not.toMatch(/https?:\/\//)
    expect(cssFontes.match(/url\('@fontsource-variable\/(jost|lora)\//g)).toHaveLength(3)
    expect(cssFontes.match(/font-display:\s*swap/g)).toHaveLength(3)
  })

  it('[SEGURANÇA] as dependências de fonte são as do Nossia, com versão fixada', () => {
    expect(pacote.dependencies['@fontsource-variable/jost']).toMatch(/^~\d+\.\d+\.\d+$/)
    expect(pacote.dependencies['@fontsource-variable/lora']).toMatch(/^~\d+\.\d+\.\d+$/)
    expect(Object.keys(pacote.dependencies).some((nome) => /cormorant|hanken/.test(nome))).toBe(false)
  })

  it('[SEGURANÇA] o index.html usa o nome Nossia e não carrega nada de fora da origem', () => {
    expect(indexHtml).toContain('<title>Nossia</title>')
    expect(indexHtml).not.toContain('favicon.svg')
    expect(indexHtml).not.toMatch(/(?:href|src)="https?:\/\//)
    expect(indexHtml).not.toMatch(/Enlace/)
  })
})

describe('fundação Nossia: marca e textos', () => {
  it('[UNITÁRIO] o nome do produto é Nossia em todos os títulos compostos', () => {
    expect(NOME_PRODUTO).toBe('Nossia')
    expect(TEXTOS_PAINEL.primeiroAcessoTitulo).toBe('Boas-vindas ao Nossia.')
    expect(TEXTOS_CONVIDADOS.tituloDocumento('Ana & Bruno')).toBe('Convidados · Ana & Bruno · Nossia')
    expect(TEXTOS_FORNECEDORES_CASAMENTO.tituloDocumento('Ana & Bruno')).toBe('Fornecedores · Ana & Bruno · Nossia')
  })

  it('[COMPONENTE] a entrada mostra o logo principal oficial com nome acessível e a marca horizontal para o celular', () => {
    const wrapper = mount(LayoutAutenticacao, { props: { titulo: 'Entrar' }, global })

    const logo = wrapper.get('img.layout-autenticacao__logo')
    expect(logo.attributes('src')).toContain('nossia-logo-principal')
    expect(logo.attributes('alt')).toBe('Nossia')
    expect(wrapper.get('header [data-teste="marca-produto"] img').attributes('alt')).toBe('Nossia')
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('[COMPONENTE] em modo demonstração não repete o cabeçalho de marca', () => {
    const wrapper = mount(LayoutAutenticacao, { props: { titulo: 'Entrar', demonstracao: true }, global })

    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.find('img.layout-autenticacao__logo').exists()).toBe(false)
    expect(wrapper.get('[data-teste="lacre"] img').attributes('alt')).toBe('')
  })
})
