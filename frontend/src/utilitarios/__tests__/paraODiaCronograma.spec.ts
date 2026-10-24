import { describe, expect, it } from 'vitest'

import { itemPublico } from '@/__tests__/auxiliaresCronogramaPublico'
import { fraseMomentoDoCronograma, horariosPorDia, temConteudoParaODia } from '@/utilitarios/paraODiaCronograma'

const EVENTO = { tipo: 'Casamento' as const, horarioCerimonia: '20:00', localCerimonia: 'Capela', localRecepcao: null }

describe('fraseMomentoDoCronograma', () => {
  it('[UNITÁRIO] antes do dia informa o horário marcado com o nome do momento', () => {
    expect(fraseMomentoDoCronograma({ momento: 'a festa', horario: '20:00', fase: 'AntesDoDia', minutoAtual: 0 })).toBe('A festa começa às 20:00')
  })

  it('[UNITÁRIO] ao vivo conta os minutos, marca o começo e o depois', () => {
    const base = { momento: 'a cerimônia', horario: '20:00:00', fase: 'NoDia' as const }
    expect(fraseMomentoDoCronograma({ ...base, minutoAtual: 19 * 60 + 20 })).toBe('A cerimônia começa em 40 min, às 20:00')
    expect(fraseMomentoDoCronograma({ ...base, minutoAtual: 20 * 60 })).toBe('A cerimônia começa agora, às 20:00')
    expect(fraseMomentoDoCronograma({ ...base, minutoAtual: 21 * 60 })).toBe('A cerimônia começou às 20:00')
  })

  it('[UNITÁRIO] depois do dia diz que o momento começou', () => {
    expect(fraseMomentoDoCronograma({ momento: 'o evento', horario: '16:30', fase: 'DepoisDoDia', minutoAtual: 0 })).toBe('O evento começou às 16:30')
  })

  it('[UNITÁRIO] sem horário válido ou sem fase não monta frase', () => {
    expect(fraseMomentoDoCronograma({ momento: 'a festa', horario: null, fase: 'AntesDoDia', minutoAtual: 0 })).toBeNull()
    expect(fraseMomentoDoCronograma({ momento: 'a festa', horario: 'meio-dia', fase: 'AntesDoDia', minutoAtual: 0 })).toBeNull()
    expect(fraseMomentoDoCronograma({ momento: 'a festa', horario: '20:00', fase: null, minutoAtual: 0 })).toBeNull()
  })
})

describe('horariosPorDia', () => {
  it('[UNITÁRIO] resume quantidade e intervalo por dia na ordem do roteiro', () => {
    const itens = [
      itemPublico({ inicio: '21:30', termino: '02:00', terminaEmOutroDia: true }),
      itemPublico({ dia: 'Vespera', data: '2027-05-14', inicio: '19:00', termino: null }),
      itemPublico({ inicio: '14:00', termino: '15:30' }),
    ]
    expect(horariosPorDia(itens)).toEqual([
      { dia: 'Vespera', rotulo: 'Véspera', texto: '1 horário, às 19:00' },
      { dia: 'DiaDoEvento', rotulo: 'Dia do evento', texto: '2 horários, das 14:00 às 02:00 do dia seguinte' },
    ])
  })

  it('[UNITÁRIO] sem itens não há resumo', () => {
    expect(horariosPorDia([])).toEqual([])
  })
})

describe('temConteudoParaODia', () => {
  it('[UNITÁRIO] há conteúdo com itens, horário válido ou local', () => {
    expect(temConteudoParaODia(EVENTO, 0)).toBe(true)
    expect(temConteudoParaODia({ ...EVENTO, horarioCerimonia: null }, 0)).toBe(true)
    expect(temConteudoParaODia({ ...EVENTO, horarioCerimonia: null, localCerimonia: null }, 2)).toBe(true)
  })

  it('[UNITÁRIO] sem itens, horário e locais não há bloco', () => {
    expect(temConteudoParaODia({ ...EVENTO, horarioCerimonia: null, localCerimonia: '  ', localRecepcao: null }, 0)).toBe(false)
  })
})
