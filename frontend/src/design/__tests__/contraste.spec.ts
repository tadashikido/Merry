import { describe, expect, it } from 'vitest'

import { MINIMO_CONTRASTE, PARES_CONTRASTE, atendeContraste, luminanciaRelativa, razaoContraste } from '@/design/contraste'
import { cores, coresMarca, paletas } from '@/design/tokens'

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
    expect(razaoContraste(cores.texto, cores.superficie)).toBeCloseTo(9.56, 1)
    expect(razaoContraste(cores.texto, cores.fundo)).toBeCloseTo(9.05, 1)
  })

  it('[UNITÁRIO] documenta a exceção de acessibilidade: a borda de controle e o hairline não servem para campos, a borda de campo sim', () => {
    expect(razaoContraste(cores.bordaControle, cores.superficie)).toBeLessThan(MINIMO_CONTRASTE.componente)
    expect(razaoContraste(coresMarca.hairline, cores.superficie)).toBeLessThan(MINIMO_CONTRASTE.componente)
    expect(razaoContraste(cores.bordaCampo, cores.superficie)).toBeGreaterThanOrEqual(MINIMO_CONTRASTE.componente)
  })

  it('[UNITÁRIO] usa os valores oficiais do design system Nossia', () => {
    expect(coresMarca).toEqual({
      terracota: '#A84D2E',
      terracotaEscuro: '#8F472E',
      terracotaClaro: '#E1A38A',
      rosaQueimado: '#CFA599',
      verdeAlecrim: '#656D56',
      ink: '#6E3524',
      inkMuted: '#7A5A4E',
      surface: '#FFFFFF',
      surfaceRosado: '#F8EFEA',
      hairline: '#EAD9CF',
      onTerracota: '#FFFFFF',
    })
    expect(cores).toMatchObject({
      primaria: coresMarca.terracota,
      primariaEscura: coresMarca.terracotaEscuro,
      primariaSuave: coresMarca.surfaceRosado,
      texto: coresMarca.ink,
      textoApoio: coresMarca.inkMuted,
      superficie: coresMarca.surface,
      borda: coresMarca.hairline,
      sucesso: coresMarca.verdeAlecrim,
      fundoCasal: coresMarca.surfaceRosado,
      navegacao: coresMarca.surface,
    })
  })

  it('[UNITÁRIO] distingue o erro da terracota pela luminosidade', () => {
    const diferenca = Math.abs(luminanciaRelativa(cores.erro) - luminanciaRelativa(cores.primaria))
    expect(diferenca).toBeGreaterThan(0.05)
    expect(razaoContraste(cores.superficie, cores.erro)).toBeGreaterThan(razaoContraste(cores.superficie, cores.primaria) + 1.5)
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
