import { describe, expect, it } from 'vitest'

import { itemModeloCronograma } from '@/__tests__/auxiliaresModelosCronograma'
import { TEXTOS_MODELOS_CRONOGRAMA } from '@/textos/modelosCronograma'
import {
  agruparItensModeloPorDia,
  minutosDesdeCerimonia,
  opcaoLocalDoItem,
  posicaoDe,
  posicaoNaReferencia,
  regraDescricaoModeloCronograma,
  regraHorarioReferencia,
  regraNomeModeloCronograma,
} from '@/utilitarios/modelosCronograma'

describe('utilitários de modelos de cronograma', () => {
  it('[UNITÁRIO] posição absoluta considera véspera e dia seguinte', () => {
    expect(posicaoDe('Vespera', '19:00')).toBe(-300)
    expect(posicaoDe('DiaDoCasamento', '16:00')).toBe(960)
    expect(posicaoDe('DiaSeguinte', '01:00')).toBe(1500)
    expect(posicaoDe('DiaDoCasamento', '25:00')).toBeNull()
  })

  it('[UNITÁRIO] minutos desde a cerimônia usam o horário de referência', () => {
    expect(minutosDesdeCerimonia('DiaDoCasamento', '10:00', '16:00')).toBe(-360)
    expect(minutosDesdeCerimonia('Vespera', '19:00', '16:00')).toBe(-1260)
    expect(minutosDesdeCerimonia('DiaSeguinte', '01:00', '16:00')).toBe(540)
    expect(minutosDesdeCerimonia('DiaDoCasamento', '', '16:00')).toBeNull()
    expect(minutosDesdeCerimonia('DiaDoCasamento', '10:00', 'x')).toBeNull()
  })

  it('[UNITÁRIO] posição na referência devolve dia e horário e limita à janela', () => {
    expect(posicaoNaReferencia(-360, '16:00')).toEqual({ dia: 'DiaDoCasamento', inicio: '10:00' })
    expect(posicaoNaReferencia(-1260, '16:00')).toEqual({ dia: 'Vespera', inicio: '19:00' })
    expect(posicaoNaReferencia(540, '16:00')).toEqual({ dia: 'DiaSeguinte', inicio: '01:00' })
    expect(posicaoNaReferencia(2879, '23:00')).toEqual({ dia: 'DiaSeguinte', inicio: '23:59' })
    expect(posicaoNaReferencia(0, '')).toBeNull()
  })

  it('[UNITÁRIO] opção de local vem da referência ou "Outro"', () => {
    expect(opcaoLocalDoItem(itemModeloCronograma({ referenciaLocal: 'Recepcao', local: null }))).toBe('Recepcao')
    expect(opcaoLocalDoItem(itemModeloCronograma({ referenciaLocal: null, local: 'Hotel' }))).toBe('Outro')
  })

  it('[UNITÁRIO] agrupa itens por dia na ordem véspera, dia, dia seguinte, sem grupos vazios', () => {
    const grupos = agruparItensModeloPorDia([
      itemModeloCronograma({ id: 'b', dia: 'DiaSeguinte' }),
      itemModeloCronograma({ id: 'a', dia: 'Vespera' }),
    ])

    expect(grupos.map((grupo) => grupo.dia)).toEqual(['Vespera', 'DiaSeguinte'])
  })

  it('[UNITÁRIO] regras de nome, descrição e horário de referência', () => {
    expect(regraNomeModeloCronograma('A')).toBe(TEXTOS_MODELOS_CRONOGRAMA.erroNomeTamanho)
    expect(regraNomeModeloCronograma('  Roteiro  ')).toBeNull()
    expect(regraNomeModeloCronograma('')).toBeNull()
    expect(regraNomeModeloCronograma('a'.repeat(81))).toBe(TEXTOS_MODELOS_CRONOGRAMA.erroNomeTamanho)
    expect(regraDescricaoModeloCronograma('a'.repeat(501))).toBe(TEXTOS_MODELOS_CRONOGRAMA.erroDescricaoTamanho)
    expect(regraDescricaoModeloCronograma('ok')).toBeNull()
    expect(regraHorarioReferencia('16:00')).toBeNull()
    expect(regraHorarioReferencia('24:00')).toBe(TEXTOS_MODELOS_CRONOGRAMA.erroHorario)
    expect(regraHorarioReferencia('')).toBe(TEXTOS_MODELOS_CRONOGRAMA.erroHorario)
  })
})
