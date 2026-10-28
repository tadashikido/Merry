import { describe, expect, it } from 'vitest'

import {
  contarPorFase,
  contarPorTipo,
  descreverCarteiraPorTipo,
  filtrarEventos,
  partesCarteiraPorTipo,
  resumirCarteira,
} from '@/utilitarios/carteiraEventos'
import { resumoEvento } from '@/views/eventos/__tests__/auxiliaresEventos'

describe('carteiraEventos', () => {
  it('[UNITÁRIO] resume a carteira por janela de dias, ignora arquivados e conta realizados ainda ativos', () => {
    const resumo = resumirCarteira([
      resumoEvento({ tipo: 'Casamento', diasRestantes: 0 }),
      resumoEvento({ tipo: 'Casamento', diasRestantes: 7 }),
      resumoEvento({ tipo: 'QuinzeAnos', diasRestantes: 8 }),
      resumoEvento({ tipo: 'Aniversario', diasRestantes: 30 }),
      resumoEvento({ tipo: 'Comemoracao', diasRestantes: 31 }),
      resumoEvento({ tipo: 'Aniversario', diasRestantes: -1, fase: 'Realizado' }),
      resumoEvento({ tipo: 'Casamento', diasRestantes: 3, arquivado: true }),
      resumoEvento({ tipo: 'Casamento', diasRestantes: -40, arquivado: true }),
    ])

    expect(resumo).toEqual({
      pelaFrente: 5,
      proximos7Dias: 2,
      proximos30Dias: 4,
      realizados: 1,
      porTipo: [
        { tipo: 'Casamento', quantidade: 2 },
        { tipo: 'QuinzeAnos', quantidade: 1 },
        { tipo: 'Aniversario', quantidade: 1 },
        { tipo: 'Comemoracao', quantidade: 1 },
      ],
    })
  })

  it('[UNITÁRIO] lista vazia resulta em zeros e sem tipos', () => {
    expect(resumirCarteira([])).toEqual({ pelaFrente: 0, proximos7Dias: 0, proximos30Dias: 0, realizados: 0, porTipo: [] })
  })

  it('[UNITÁRIO] descreve a carteira por tipo com singular, plural e "e" antes do último', () => {
    expect(descreverCarteiraPorTipo([{ tipo: 'Casamento', quantidade: 1 }])).toBe('1 casamento')
    expect(descreverCarteiraPorTipo([{ tipo: 'QuinzeAnos', quantidade: 2 }])).toBe('2 festas de 15 anos')
    expect(
      descreverCarteiraPorTipo([
        { tipo: 'Casamento', quantidade: 3 },
        { tipo: 'QuinzeAnos', quantidade: 1 },
        { tipo: 'Aniversario', quantidade: 2 },
        { tipo: 'Comemoracao', quantidade: 1 },
      ]),
    ).toBe('3 casamentos, 1 festa de 15 anos, 2 aniversários e 1 comemoração')
    expect(descreverCarteiraPorTipo([{ tipo: 'Comemoracao', quantidade: 2 }, { tipo: 'Aniversario', quantidade: 1 }])).toBe(
      '2 comemorações e 1 aniversário',
    )
    expect(descreverCarteiraPorTipo([])).toBe('')
  })

  it('[UNITÁRIO] conta por tipo e por fase todos os itens recebidos, na ordem do domínio e só o que existe', () => {
    const eventos = [
      resumoEvento({ tipo: 'Aniversario', fase: 'Realizado', diasRestantes: -2 }),
      resumoEvento({ tipo: 'Casamento', fase: 'RetaFinal' }),
      resumoEvento({ tipo: 'Aniversario', fase: 'Planejamento', arquivado: true }),
    ]

    expect(contarPorTipo(eventos)).toEqual([
      { tipo: 'Casamento', quantidade: 1 },
      { tipo: 'Aniversario', quantidade: 2 },
    ])
    expect(contarPorFase(eventos)).toEqual([
      { fase: 'Planejamento', quantidade: 1 },
      { fase: 'RetaFinal', quantidade: 1 },
      { fase: 'Realizado', quantidade: 1 },
    ])
    expect(contarPorTipo([])).toEqual([])
  })

  it('[UNITÁRIO] filtra por tipo e fase combinados, e nulo não restringe', () => {
    const casamentoReta = resumoEvento({ id: 'a', tipo: 'Casamento', fase: 'RetaFinal' })
    const quinzeReta = resumoEvento({ id: 'b', tipo: 'QuinzeAnos', fase: 'RetaFinal' })
    const casamentoPlanejamento = resumoEvento({ id: 'c', tipo: 'Casamento', fase: 'Planejamento' })
    const eventos = [casamentoReta, quinzeReta, casamentoPlanejamento]

    expect(filtrarEventos(eventos, { tipo: null, fase: null })).toEqual(eventos)
    expect(filtrarEventos(eventos, { tipo: 'Casamento', fase: null })).toEqual([casamentoReta, casamentoPlanejamento])
    expect(filtrarEventos(eventos, { tipo: null, fase: 'RetaFinal' })).toEqual([casamentoReta, quinzeReta])
    expect(filtrarEventos(eventos, { tipo: 'QuinzeAnos', fase: 'Planejamento' })).toEqual([])
  })

  it('[UNITÁRIO] partes da carteira por tipo trazem texto e separador que recompõem a frase', () => {
    const porTipo = [
      { tipo: 'Casamento' as const, quantidade: 2 },
      { tipo: 'QuinzeAnos' as const, quantidade: 1 },
      { tipo: 'Aniversario' as const, quantidade: 1 },
    ]

    const partes = partesCarteiraPorTipo(porTipo)

    expect(partes.map((parte) => parte.texto)).toEqual(['2 casamentos', '1 festa de 15 anos', '1 aniversário'])
    expect(partes.map((parte) => parte.separador)).toEqual([', ', ' e ', ''])
    expect(partes.map((parte) => `${parte.texto}${parte.separador}`).join('')).toBe(descreverCarteiraPorTipo(porTipo))
  })

  it('[UNITÁRIO] carteira de um só tipo não tem separador', () => {
    expect(partesCarteiraPorTipo([{ tipo: 'Comemoracao', quantidade: 3 }])).toEqual([
      { tipo: 'Comemoracao', quantidade: 3, texto: '3 comemorações', separador: '' },
    ])
  })
})
