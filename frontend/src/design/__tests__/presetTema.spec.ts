import { beforeAll, describe, expect, it } from 'vitest'
import { Theme } from '@primeuix/styled'

import { presetTema } from '@/design/presetTema'
import { cores, espacamento, paletas, raio, ritmo, tipografia } from '@/design/tokens'

function normalizar(css: string): string {
  return css.replace(/\s+/g, '').toLowerCase()
}

describe('presetTema', () => {
  let cssPrimitivo = ''
  let cssSemantico = ''
  let cssGlobal = ''

  beforeAll(() => {
    Theme.setTheme({ preset: presetTema, options: { darkModeSelector: false } })
    const comum = Theme.getCommon('', {})
    cssPrimitivo = normalizar(comum.primitive?.css ?? '')
    cssSemantico = normalizar(comum.semantic?.css ?? '')
    cssGlobal = normalizar(comum.global?.css ?? '')
  })

  it('[UNITÁRIO] usa o azul-marinho como paleta primária, com o tom da marca no 800', () => {
    expect(cssSemantico).toContain(`--p-primary-800:${paletas.marinho[800]}`.toLowerCase())
    expect(cssSemantico).toContain('--p-primary-800:#0b2542')
    expect(cssSemantico).toContain('--p-primary-color:var(--p-primary-800)')
    expect(cssSemantico).toContain('--p-primary-hover-color:var(--p-primary-700)')
    expect(cssSemantico).toContain('--p-primary-active-color:var(--p-primary-900)')
    expect(cssSemantico).toContain(`--p-primary-contrast-color:${cores.superficie}`.toLowerCase())
  })

  it('[UNITÁRIO] substitui as paletas semânticas do Aura pelas do style guide', () => {
    expect(cssPrimitivo).toContain(`--p-red-500:${paletas.erro[500]}`.toLowerCase())
    expect(cssPrimitivo).toContain(`--p-green-100:${paletas.sucesso[100]}`.toLowerCase())
    expect(cssPrimitivo).toContain(`--p-orange-700:${paletas.alerta[700]}`.toLowerCase())
    expect(cssPrimitivo).toContain(`--p-sky-600:${paletas.informacao[600]}`.toLowerCase())
  })

  it('[UNITÁRIO] aplica a paleta cinza fria nas superfícies e o marinho no texto', () => {
    expect(cssSemantico).toContain(`--p-surface-900:${paletas.cinza[900]}`.toLowerCase())
    expect(cssSemantico).toContain('--p-surface-0:#ffffff')
    expect(cssSemantico).toContain('--p-text-color:#0b2542')
    expect(cssSemantico).toContain(`--p-text-color:${cores.texto}`.toLowerCase())
    expect(cssSemantico).toContain(`--p-form-field-border-color:${cores.bordaCampo}`.toLowerCase())
    expect(cssSemantico).toContain(`--p-form-field-border-radius:${raio.campo}`)
  })

  it('[UNITÁRIO] expõe tokens próprios do Celebri como variáveis CSS via extend', () => {
    expect(cssGlobal).toContain(`--p-cor-fundo:${cores.fundo}`.toLowerCase())
    expect(cssGlobal).toContain(`--p-cor-navegacao:${cores.navegacao}`.toLowerCase())
    expect(cssGlobal).toContain(`--p-cor-acento-texto:${cores.acentoTexto}`.toLowerCase())
    expect(cssGlobal).toContain(`--p-espaco-4:${espacamento[4]}`)
    expect(cssGlobal).toContain(`--p-fonte-tamanho-display:${tipografia.tamanhos.display}`)
    expect(cssGlobal).toContain(`--p-fonte-peso-seminegrito:${tipografia.pesos.seminegrito}`)
    expect(cssGlobal).toContain('--p-dimensao-largura-rail:4.5rem')
    expect(cssGlobal).toContain('--p-dimensao-largura-navegacao-casamento:14.5rem')
    expect(cssGlobal).toContain('--p-raio-painel:12px')
    expect(cssGlobal).toContain('--p-raio-controle:12px')
    expect(cssGlobal).toContain('--p-raio-campo:4px')
    expect(cssGlobal).toContain(`--p-cor-primaria-suave:${cores.primariaSuave}`.toLowerCase())
    expect(cssGlobal).toContain(`--p-ritmo-secao:${ritmo.secao}`)
    expect(cssGlobal).toContain(`--p-ritmo-campo:${ritmo.campo}`)
    expect(cssGlobal).toContain('--p-dimensao-largura-ampla:96rem')
    expect(cssGlobal).toContain('--p-dimensao-largura-formulario:48rem')
    expect(cssGlobal).toContain(`--p-fonte-espacamento-letras-tagline:${tipografia.espacamentoLetras.tagline}`)
    expect(cssGlobal).toContain(`--p-fonte-peso-leve:${tipografia.pesos.leve}`)
    expect(cssGlobal).toContain(`--p-cor-texto-publico:${cores.textoPublico}`.toLowerCase())
    expect(cssGlobal).toContain(`--p-cor-operacao-fundo:${cores.operacaoFundo}`.toLowerCase())
    expect(cssGlobal).not.toMatch(/--p-cor-[a-z-]*quente/)
  })

  it('[UNITÁRIO] define anel de foco visível de 2 px em azul-marinho', () => {
    expect(cssSemantico).toContain('--p-focus-ring-width:2px')
    expect(cssSemantico).toContain(`--p-focus-ring-color:${cores.primaria}`.toLowerCase())
  })

  it('[UNITÁRIO] não carrega nenhuma fonte fora de Jost e Cormorant Garamond', () => {
    expect(cssGlobal).toContain('jostvariable')
    expect(cssGlobal).toContain('cormorantgaramondvariable')
    expect(cssGlobal).not.toContain('lora')
    expect(cssGlobal).not.toContain('hanken')
  })
})
