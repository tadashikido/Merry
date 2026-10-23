import { describe, expect, it } from 'vitest'

import { descreverCarteiraPorTipo, resumirCarteira } from '@/utilitarios/carteiraEventos'
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
})
