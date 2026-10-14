import { describe, expect, it } from 'vitest'

import { MINIMO_CONTRASTE, PARES_CONTRASTE, atendeContraste, luminanciaRelativa, razaoContraste } from '@/design/contraste'
import { cores, paletas } from '@/design/tokens'

describe('contraste', () => {
  it('[UNITÁRIO] calcula luminância relativa dos extremos', () => {
    expect(luminanciaRelativa('#000000')).toBe(0)
    expect(luminanciaRelativa('#FFFFFF')).toBeCloseTo(1, 5)
  })

  it('[UNITÁRIO] calcula razão 21:1 entre preto e branco independentemente da ordem', () => {
    expect(razaoContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(razaoContraste('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
  })

  it('[UNITÁRIO] confere a razão de referência do texto sobre a superfície e sobre o fundo', () => {
    expect(razaoContraste(cores.texto, cores.superficie)).toBeCloseTo(16.61, 1)
    expect(razaoContraste(cores.texto, cores.fundo)).toBeCloseTo(15.1, 1)
  })

  it('[UNITÁRIO] documenta a exceção de acessibilidade: a borda de controle do canvas não serve para campos, a borda de campo sim', () => {
    expect(razaoContraste(cores.bordaControle, cores.superficie)).toBeLessThan(MINIMO_CONTRASTE.componente)
    expect(razaoContraste(cores.bordaCampo, cores.superficie)).toBeGreaterThanOrEqual(MINIMO_CONTRASTE.componente)
  })

  it('[UNITÁRIO] usa os valores oficiais do canvas Enlace', () => {
    expect(cores).toMatchObject({
      navegacao: '#16211E',
      primaria: '#22413A',
      salvia: '#E3EAE5',
      champagne: '#A8844C',
      champagneTexto: '#7F6231',
      fundo: '#F3F4F6',
      superficie: '#FFFFFF',
      borda: '#E3E6EA',
      bordaControle: '#D4D8DE',
      texto: '#1C1F1E',
      textoApoio: '#5E636B',
      sucesso: '#2E6B4E',
      alerta: '#94620F',
      erro: '#A23B30',
      informacao: '#2D5680',
      fundoConvite: '#F4F0E8',
    })
  })

  it.each(['#FFF', 'vermelho', '#GGGGGG', ''])('[UNITÁRIO] rejeita cor inválida %s', (cor) => {
    expect(() => luminanciaRelativa(cor)).toThrow('Cor inválida')
  })

  it('[UNITÁRIO] reprova combinação abaixo do mínimo', () => {
    expect(atendeContraste({ descricao: 'teste', frente: '#CFCBD4', fundo: '#FFFFFF', nivel: 'texto' })).toBe(false)
  })

  it.each(PARES_CONTRASTE.map((par) => [par.descricao, par] as const))(
    '[UNITÁRIO] %s atende WCAG AA',
    (_descricao, par) => {
      expect(razaoContraste(par.frente, par.fundo)).toBeGreaterThanOrEqual(MINIMO_CONTRASTE[par.nivel])
    },
  )

  it('[UNITÁRIO] toda cor de paleta é hexadecimal de 6 dígitos', () => {
    const valores = Object.values(paletas).flatMap((paleta) => Object.values(paleta))
    expect(valores.length).toBeGreaterThan(0)
    valores.forEach((valor) => expect(valor).toMatch(/^#[0-9A-F]{6}$/))
  })

  it('[UNITÁRIO] cobre os textos principais, secundários, botões e badges de todas as semânticas', () => {
    const descricoes = PARES_CONTRASTE.map((par) => par.descricao)
    for (const esperado of [
      'Texto principal sobre superfície',
      'Texto de apoio sobre fundo',
      'Botão primário',
      'Botão destrutivo',
      'Badge neutro',
      'Badge de sucesso',
      'Badge de alerta',
      'Badge de erro',
      'Badge informativo',
      'Rail: ícone inativo',
      'Toast: mensagem',
      'Toast: ação Desfazer',
      'Anel de foco sobre fundo',
      'Borda de campo sobre superfície',
      'Convite: apoio quente sobre fundo do convite',
    ]) {
      expect(descricoes).toContain(esperado)
    }
  })
})
