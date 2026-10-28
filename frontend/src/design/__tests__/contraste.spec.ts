import { describe, expect, it } from 'vitest'

import { MINIMO_CONTRASTE, PARES_CONTRASTE, atendeContraste, luminanciaRelativa, razaoContraste } from '@/design/contraste'
import { centelha, cores, coresMarca, fases, neutros, paletas, tonsCelebracao } from '@/design/tokens'

describe('contraste', () => {
  it('[UNITÁRIO] calcula luminância relativa dos extremos', () => {
    expect(luminanciaRelativa('#000000')).toBe(0)
    expect(luminanciaRelativa('#FFFFFF')).toBeCloseTo(1, 5)
  })

  it('[UNITÁRIO] calcula razão 21:1 entre preto e branco independentemente da ordem', () => {
    expect(razaoContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(razaoContraste('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
  })

  it('[UNITÁRIO] confere a razão de referência da tinta sobre a névoa e do branco sobre o meia-noite', () => {
    expect(razaoContraste(cores.texto, cores.superficie)).toBeCloseTo(15.49, 1)
    expect(razaoContraste(cores.superficie, cores.primaria)).toBeCloseTo(15.21, 1)
    expect(razaoContraste(cores.texto, cores.fundo)).toBeCloseTo(14.2, 1)
  })

  it('[UNITÁRIO] documenta a exceção de acessibilidade: borda prata e borda suave do mockup não servem para campos, a borda de campo sim', () => {
    expect(razaoContraste(cores.borda, cores.superficie)).toBeLessThan(MINIMO_CONTRASTE.componente)
    expect(razaoContraste(cores.bordaSuave, cores.superficie)).toBeLessThan(MINIMO_CONTRASTE.componente)
    expect(razaoContraste(cores.bordaCampo, cores.superficie)).toBeGreaterThanOrEqual(MINIMO_CONTRASTE.componente)
    expect(razaoContraste(cores.bordaCampo, cores.fundo)).toBeGreaterThanOrEqual(MINIMO_CONTRASTE.componente)
  })

  it('[UNITÁRIO] documenta que a centelha clara não serve como texto sobre claro; a centelha de texto só para “&” grande', () => {
    expect(razaoContraste(centelha.sobreClaro, cores.superficie)).toBeLessThan(MINIMO_CONTRASTE.textoGrande)
    expect(razaoContraste(centelha.texto, cores.superficie)).toBeGreaterThanOrEqual(MINIMO_CONTRASTE.textoGrande)
    expect(razaoContraste(centelha.texto, cores.fundo)).toBeGreaterThanOrEqual(MINIMO_CONTRASTE.textoGrande)
  })

  it('[UNITÁRIO] usa os valores oficiais do DS v2: meia-noite #14244A, rail #0E1A33, centelha e neutros', () => {
    expect(paletas.meiaNoite[800]).toBe('#14244A')
    expect(coresMarca).toEqual({
      meiaNoite: '#14244A',
      meiaNoiteProfundo: '#0E1A33',
      meiaNoiteMedio: '#2D4373',
      centelha: '#E3B964',
      centelhaClara: '#C99A3A',
      nevoa: '#F4F5F7',
      branco: '#FFFFFF',
      prata: '#E4E7EC',
      grafite: '#5E6779',
      tinta: '#1E2433',
    })
    expect(cores).toMatchObject({
      primaria: coresMarca.meiaNoite,
      titulo: coresMarca.meiaNoite,
      texto: coresMarca.tinta,
      textoApoio: coresMarca.grafite,
      fundo: coresMarca.nevoa,
      superficie: coresMarca.branco,
      borda: coresMarca.prata,
      rail: coresMarca.meiaNoiteProfundo,
      railAtivo: coresMarca.centelha,
      railIcone: '#9FB0D3',
      divisoria: '#EEF0F3',
      bordaSuave: '#D5DAE1',
      trilho: '#ECEEF2',
      superficieSutil: '#F7F8FA',
    })
  })

  it('[UNITÁRIO] a escala meia-noite e a neutra vão do mais claro ao mais escuro', () => {
    const passos = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
    expect(Object.keys(paletas.meiaNoite).map(Number)).toEqual([...passos])
    const luminancias = passos.map((passo) => luminanciaRelativa(paletas.meiaNoite[passo]))
    luminancias.slice(1).forEach((valor, indice) => expect(valor).toBeLessThan(luminancias[indice]!))
    const passosNeutros = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
    const neutras = passosNeutros.map((passo) => luminanciaRelativa(paletas.neutro[passo]))
    neutras.slice(1).forEach((valor, indice) => expect(valor).toBeLessThan(neutras[indice]!))
  })

  it('[UNITÁRIO] cores semânticas e de operação não têm hex solto: vêm das paletas, da centelha, dos neutros ou dos tons', () => {
    const permitidas = new Set<string>([
      ...Object.values(paletas).flatMap((paleta) => Object.values(paleta)),
      ...Object.values(centelha),
      ...Object.values(neutros),
      ...Object.values(tonsCelebracao).flatMap((tom) => Object.values(tom)),
    ])
    const soltas = Object.entries(cores).filter(([chave, valor]) => chave !== 'veu' && !permitidas.has(valor))
    expect(soltas).toEqual([])
    expect(Object.keys(paletas)).toEqual(['meiaNoite', 'neutro', 'sucesso', 'alerta', 'erro'])
  })

  it('[UNITÁRIO] distingue o erro e o sucesso da primária pela luminosidade; a informação segue a fase de planejamento', () => {
    for (const cor of [cores.erro, cores.sucesso]) {
      expect(Math.abs(luminanciaRelativa(cor) - luminanciaRelativa(cores.primaria))).toBeGreaterThan(0.05)
    }
    expect(razaoContraste(cores.superficie, cores.primaria)).toBeGreaterThan(razaoContraste(cores.superficie, cores.erro) + 1.5)
    expect(cores.informacao).toBe(fases.planejamento.texto)
    expect(cores.informacaoSuave).toBe(fases.planejamento.fundo)
  })

  it('[UNITÁRIO] a tinta profunda e a data de cada tipo atingem AA sobre o fundo do tipo', () => {
    for (const tom of Object.values(tonsCelebracao)) {
      expect(razaoContraste(tom.tintaProfunda, tom.fundo)).toBeGreaterThanOrEqual(MINIMO_CONTRASTE.texto)
      expect(razaoContraste(tom.data, tom.fundo)).toBeGreaterThanOrEqual(MINIMO_CONTRASTE.texto)
      expect(razaoContraste(tom.tinta, tom.fundo)).toBeGreaterThanOrEqual(MINIMO_CONTRASTE.texto)
    }
    expect(tonsCelebracao.rose).toMatchObject({ tintaProfunda: '#3A1512', data: '#7A3530' })
    expect(tonsCelebracao.orquidea.tintaProfunda).toBe('#24103A')
    expect(tonsCelebracao.tangerina.tintaProfunda).toBe('#3D1A04')
    expect(tonsCelebracao.champanhe.tintaProfunda).toBe('#2E2105')
    expect(tonsCelebracao.jade.tintaProfunda).toBe('#0F332D')
    expect(razaoContraste(tonsCelebracao.jade.tintaProfunda, '#D8EEEA')).toBeGreaterThan(11)
  })

  it('[UNITÁRIO] o tom neutro é meia-noite e não repete nenhuma cor do rosé de Casamento', () => {
    expect(tonsCelebracao.neutro.fundo).toBe(paletas.meiaNoite[100])
    expect(tonsCelebracao.neutro.tintaProfunda).toBe(paletas.meiaNoite[900])
    const rose = new Set(Object.values(tonsCelebracao.rose))
    Object.values(tonsCelebracao.neutro).forEach((valor) => expect(rose.has(valor)).toBe(false))
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
      'Rail: ícone ativo sobre centelha',
      'Botão destaque',
      'Lateral escura: rótulo em centelha',
      'Tom rose: nome em tinta profunda sobre fundo',
      'Tom jade: data sobre fundo',
      'Tom neutro: tinta sobre fundo',
      'Fase retaFinal: rótulo sobre fundo',
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
