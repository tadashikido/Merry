import { beforeAll, describe, expect, it } from 'vitest'
import { Theme } from '@primeuix/styled'

import { presetTema } from '@/design/presetTema'
import { cores, espacamento, fases, paletas, raio, ritmo, tipografia, tonsCelebracao } from '@/design/tokens'

function normalizar(css: string): string {
  return css.replace(/\s+/g, '').toLowerCase()
}

describe('presetTema', () => {
  let cssPrimitivo = ''
  let cssSemantico = ''
  let cssGlobal = ''
  let cssBotao = ''

  beforeAll(() => {
    Theme.setTheme({ preset: presetTema, options: { darkModeSelector: false } })
    const comum = Theme.getCommon('', {})
    cssPrimitivo = normalizar(comum.primitive?.css ?? '')
    cssSemantico = normalizar(comum.semantic?.css ?? '')
    cssGlobal = normalizar(comum.global?.css ?? '')
    cssBotao = normalizar(Theme.getComponent('button', {})?.css ?? '')
  })

  it('[UNITÁRIO] usa o azul meia-noite como paleta primária, com o tom base #14244A no 800', () => {
    expect(cssSemantico).toContain(`--p-primary-800:${paletas.meiaNoite[800]}`.toLowerCase())
    expect(cssSemantico).toContain('--p-primary-800:#14244a')
    expect(cssSemantico).toContain('--p-primary-900:#0e1a33')
    expect(cssSemantico).toContain('--p-primary-color:var(--p-primary-800)')
    expect(cssSemantico).toContain('--p-primary-hover-color:var(--p-primary-700)')
    expect(cssSemantico).toContain('--p-primary-active-color:var(--p-primary-900)')
    expect(cssSemantico).toContain(`--p-primary-contrast-color:${cores.superficie}`.toLowerCase())
  })

  it('[UNITÁRIO] substitui as paletas semânticas do Aura pelas do DS v2', () => {
    expect(cssPrimitivo).toContain(`--p-red-500:${paletas.erro[500]}`.toLowerCase())
    expect(cssPrimitivo).toContain(`--p-green-100:${paletas.sucesso[100]}`.toLowerCase())
    expect(cssPrimitivo).toContain(`--p-orange-700:${paletas.alerta[700]}`.toLowerCase())
    expect(cssPrimitivo).toContain(`--p-sky-600:${paletas.meiaNoite[600]}`.toLowerCase())
  })

  it('[UNITÁRIO] aplica a escala neutra nas superfícies, a tinta no texto e a borda de campo acessível', () => {
    expect(cssSemantico).toContain(`--p-surface-900:${paletas.neutro[900]}`.toLowerCase())
    expect(cssSemantico).toContain('--p-surface-0:#ffffff')
    expect(cssSemantico).toContain('--p-surface-100:#f4f5f7')
    expect(cssSemantico).toContain('--p-text-color:#1e2433')
    expect(cssSemantico).toContain(`--p-form-field-border-color:${cores.bordaCampo}`.toLowerCase())
    expect(cssSemantico).toContain(`--p-form-field-border-radius:${raio.campo}`)
    expect(raio.campo).toBe('12px')
  })

  it('[UNITÁRIO] botões têm raio 12, rótulo 600 e secundário com borda meia-noite 200', () => {
    expect(cssBotao).toContain(`--p-button-border-radius:${raio.controle}`)
    expect(cssBotao).toContain(`--p-button-label-font-weight:${tipografia.pesos.seminegrito}`)
    expect(cssBotao).toContain(`--p-button-outlined-secondary-border-color:${cores.bordaControle}`.toLowerCase())
    expect(cssBotao).toContain(`--p-button-link-color:${cores.acentoTexto}`.toLowerCase())
  })

  it('[UNITÁRIO] expõe tokens próprios do Celebri como variáveis CSS via extend', () => {
    expect(cssGlobal).toContain(`--p-cor-fundo:${cores.fundo}`.toLowerCase())
    expect(cssGlobal).toContain('--p-cor-fundo:#f4f5f7')
    expect(cssGlobal).toContain(`--p-cor-rail:${cores.rail}`.toLowerCase())
    expect(cssGlobal).toContain('--p-cor-rail-ativo:#e3b964')
    expect(cssGlobal).toContain('--p-cor-rail-icone:#9fb0d3')
    expect(cssGlobal).toContain('--p-cor-titulo:#14244a')
    expect(cssGlobal).toContain(`--p-cor-acento-texto:${cores.acentoTexto}`.toLowerCase())
    expect(cssGlobal).toContain(`--p-espaco-4:${espacamento[4]}`)
    expect(cssGlobal).toContain(`--p-fonte-tamanho-display:${tipografia.tamanhos.display}`)
    expect(cssGlobal).toContain('--p-fonte-tamanho-pagina:2.75rem')
    expect(cssGlobal).toContain(`--p-fonte-peso-seminegrito:${tipografia.pesos.seminegrito}`)
    expect(cssGlobal).toContain('--p-dimensao-largura-rail:4.75rem')
    expect(cssGlobal).toContain('--p-dimensao-largura-navegacao-evento:15.5rem')
    expect(cssGlobal).toContain('--p-dimensao-altura-botao:3rem')
    expect(cssGlobal).toContain('--p-raio-painel:20px')
    expect(cssGlobal).toContain('--p-raio-cartao-amplo:22px')
    expect(cssGlobal).toContain('--p-raio-controle:12px')
    expect(cssGlobal).toContain('--p-raio-campo:12px')
    expect(cssGlobal).toContain(`--p-ritmo-secao:${ritmo.secao}`)
    expect(cssGlobal).toContain(`--p-ritmo-campo:${ritmo.campo}`)
    expect(cssGlobal).toContain('--p-dimensao-largura-ampla:96rem')
    expect(cssGlobal).toContain(`--p-cor-texto-publico:${cores.textoPublico}`.toLowerCase())
    expect(cssGlobal).toContain(`--p-cor-operacao-fundo:${cores.operacaoFundo}`.toLowerCase())
    expect(cssGlobal).toContain('--p-sombra-cartao:')
  })

  it('[UNITÁRIO] expõe cada tom de celebração e cada fase como variáveis --p-cor-tom-* e --p-cor-fase-*', () => {
    expect(cssGlobal).toContain(`--p-cor-tom-rose-fundo:${tonsCelebracao.rose.fundo}`.toLowerCase())
    expect(cssGlobal).toContain('--p-cor-tom-rose-tinta-profunda:#3a1512')
    expect(cssGlobal).toContain('--p-cor-tom-rose-data:#7a3530')
    expect(cssGlobal).toContain('--p-cor-tom-orquidea-tinta-profunda:#24103a')
    expect(cssGlobal).toContain('--p-cor-tom-jade-fundo:#d8eeea')
    expect(cssGlobal).toContain(`--p-cor-tom-neutro-fundo:${tonsCelebracao.neutro.fundo}`.toLowerCase())
    expect(cssGlobal).toContain(`--p-cor-fase-reta-final-ponto:${fases.retaFinal.ponto}`.toLowerCase())
    expect(cssGlobal).toContain(`--p-cor-fase-atrasado-texto:${fases.atrasado.texto}`.toLowerCase())
  })

  it('[UNITÁRIO] define anel de foco visível de 2 px em meia-noite', () => {
    expect(cssSemantico).toContain('--p-focus-ring-width:2px')
    expect(cssSemantico).toContain(`--p-focus-ring-color:${cores.primaria}`.toLowerCase())
  })

  it('[UNITÁRIO] não carrega nenhuma fonte fora de Fraunces e Plus Jakarta Sans', () => {
    expect(cssGlobal).toContain('frauncesvariable')
    expect(cssGlobal).toContain('plusjakartasansvariable')
    expect(cssGlobal).not.toContain('jost')
    expect(cssGlobal).not.toContain('cormorant')
  })
})
