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

  it('[UNITÁRIO] confere a razão de referência do marinho sobre o branco e do branco sobre o marinho', () => {
    expect(razaoContraste(cores.texto, cores.superficie)).toBeCloseTo(15.47, 1)
    expect(razaoContraste(cores.superficie, cores.primaria)).toBeCloseTo(15.47, 1)
    expect(razaoContraste(cores.texto, cores.fundo)).toBeCloseTo(15.47, 1)
  })

  it('[UNITÁRIO] documenta a exceção de acessibilidade: a borda de controle e o hairline não servem para campos, a borda de campo sim', () => {
    expect(razaoContraste(cores.bordaControle, cores.superficie)).toBeLessThan(MINIMO_CONTRASTE.componente)
    expect(razaoContraste(coresMarca.linha, cores.superficie)).toBeLessThan(MINIMO_CONTRASTE.componente)
    expect(razaoContraste(cores.bordaCampo, cores.superficie)).toBeGreaterThanOrEqual(MINIMO_CONTRASTE.componente)
  })

  it('[UNITÁRIO] usa os valores oficiais da identidade Celebri: branco predominante e azul-marinho #0B2542', () => {
    expect(paletas.marinho[800]).toBe('#0B2542')
    expect(coresMarca).toEqual({
      marinho: '#0B2542',
      marinhoMedio: '#294466',
      marinhoClaro: '#93AACB',
      branco: '#FFFFFF',
      tinta: '#0B2542',
      tintaApoio: '#596574',
      superficie: '#FFFFFF',
      superficieAzulada: '#F2F5F9',
      linha: '#D5DCE4',
      sobreMarinho: '#FFFFFF',
    })
    expect(cores).toMatchObject({
      primaria: coresMarca.marinho,
      texto: coresMarca.tinta,
      textoApoio: coresMarca.tintaApoio,
      fundo: coresMarca.branco,
      superficie: coresMarca.superficie,
      borda: coresMarca.linha,
      fundoCasal: coresMarca.superficieAzulada,
      navegacao: coresMarca.branco,
      navegacaoAtivo: coresMarca.marinho,
    })
  })

  it('[UNITÁRIO] a escala marinho vai do mais claro ao mais escuro, de 50 a 950', () => {
    const passos = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
    expect(Object.keys(paletas.marinho).map(Number)).toEqual([...passos])
    const luminancias = passos.map((passo) => luminanciaRelativa(paletas.marinho[passo]))
    luminancias.slice(1).forEach((valor, indice) => expect(valor).toBeLessThan(luminancias[indice]!))
  })

  it('[UNITÁRIO] cores semânticas e de operação não têm hex solto: todas vêm das paletas', () => {
    const daPaleta = new Set<string>(Object.values(paletas).flatMap((paleta) => Object.values(paleta)))
    const soltas = Object.entries(cores).filter(([chave, valor]) => chave !== 'veu' && !daPaleta.has(valor))
    expect(soltas).toEqual([])
    expect(Object.keys(paletas)).toEqual(['marinho', 'cinza', 'sucesso', 'alerta', 'erro', 'informacao'])
  })

  it('[UNITÁRIO] distingue o erro e a informação da primária pela luminosidade', () => {
    for (const cor of [cores.erro, cores.informacao, cores.sucesso]) {
      expect(Math.abs(luminanciaRelativa(cor) - luminanciaRelativa(cores.primaria))).toBeGreaterThan(0.05)
    }
    expect(razaoContraste(cores.superficie, cores.primaria)).toBeGreaterThan(razaoContraste(cores.superficie, cores.erro) + 1.5)
  })

  it('[UNITÁRIO] sucesso, alerta, erro e informação são distintos entre si', () => {
    const semanticas = [cores.sucesso, cores.alerta, cores.erro, cores.informacao, cores.primaria]
    expect(new Set(semanticas).size).toBe(semanticas.length)
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
      'Convite: apoio público sobre fundo do convite',
    ]) {
      expect(descricoes).toContain(esperado)
    }
  })
})
