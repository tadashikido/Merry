import { beforeAll, describe, expect, it } from 'vitest'
import { Theme } from '@primeuix/styled'

import { presetTema } from '@/design/presetTema'
import { cores, espacamento, paletas, tipografia } from '@/design/tokens'

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

  it('[UNITÁRIO] usa o pinho como paleta primária', () => {
    expect(cssSemantico).toContain(`--p-primary-700:${paletas.pinho[700]}`.toLowerCase())
    expect(cssSemantico).toContain('--p-primary-color:var(--p-primary-700)')
  })

  it('[UNITÁRIO] substitui as paletas semânticas do Aura pelas do style guide', () => {
    expect(cssPrimitivo).toContain(`--p-red-500:${paletas.erro[500]}`.toLowerCase())
    expect(cssPrimitivo).toContain(`--p-green-100:${paletas.sucesso[100]}`.toLowerCase())
    expect(cssPrimitivo).toContain(`--p-orange-700:${paletas.alerta[700]}`.toLowerCase())
    expect(cssPrimitivo).toContain(`--p-sky-600:${paletas.informacao[600]}`.toLowerCase())
  })

  it('[UNITÁRIO] aplica a paleta cinza nas superfícies e o texto do canvas', () => {
    expect(cssSemantico).toContain(`--p-surface-900:${paletas.cinza[900]}`.toLowerCase())
    expect(cssSemantico).toContain('--p-text-color:var(--p-surface-900)')
  })

  it('[UNITÁRIO] expõe tokens próprios do Enlace como variáveis CSS via extend', () => {
    expect(cssGlobal).toContain(`--p-cor-fundo:${cores.fundo}`.toLowerCase())
    expect(cssGlobal).toContain(`--p-cor-navegacao:${cores.navegacao}`.toLowerCase())
    expect(cssGlobal).toContain(`--p-cor-champagne-texto:${cores.champagneTexto}`.toLowerCase())
    expect(cssGlobal).toContain(`--p-espaco-4:${espacamento[4]}`)
    expect(cssGlobal).toContain(`--p-fonte-tamanho-display:${tipografia.tamanhos.display}`)
    expect(cssGlobal).toContain(`--p-fonte-peso-seminegrito:${tipografia.pesos.seminegrito}`)
    expect(cssGlobal).toContain('--p-dimensao-largura-rail:4.5rem')
    expect(cssGlobal).toContain('--p-dimensao-largura-navegacao-casamento:14.5rem')
    expect(cssGlobal).toContain('--p-raio-painel:10px')
    expect(cssGlobal).toContain('--p-raio-controle:6px')
  })

  it('[UNITÁRIO] define anel de foco visível de 2 px em champagne', () => {
    expect(cssSemantico).toContain('--p-focus-ring-width:2px')
    expect(cssSemantico).toContain(`--p-focus-ring-color:${cores.champagne}`.toLowerCase())
  })

  it('[UNITÁRIO] não carrega nenhuma fonte fora das duas famílias do Enlace', () => {
    expect(cssGlobal).toContain('cormorantgaramondvariable')
    expect(cssGlobal).toContain('hankengroteskvariable')
    expect(cssGlobal).not.toContain('brygada')
  })
})
