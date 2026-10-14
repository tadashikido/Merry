import { describe, expect, it } from 'vitest'

import {
  formatarData,
  formatarDataCalendarioCurta,
  formatarDataExtenso,
  formatarDataHora,
  formatarHora,
  formatarMoeda,
} from '@/utilitarios/formatacao'

describe('formatação pt-BR', () => {
  const instante = '2026-09-28T18:30:00Z'

  it('[UNITÁRIO] formata data no padrão dd/mm/aaaa', () => {
    expect(formatarData(instante)).toBe('28/09/2026')
  })

  it('[UNITÁRIO] formata hora em 24 h no fuso de São Paulo', () => {
    expect(formatarHora(instante)).toBe('15:30')
  })

  it('[UNITÁRIO] formata data e hora juntas', () => {
    expect(formatarDataHora(instante)).toBe('28/09/2026 às 15:30')
  })

  it('[UNITÁRIO] formata data por extenso', () => {
    expect(formatarDataExtenso('2026-12-12T19:30:00Z')).toBe('12 de dezembro de 2026')
  })

  it('[UNITÁRIO] respeita a virada do dia no fuso de São Paulo', () => {
    expect(formatarDataHora('2026-09-29T02:00:00Z')).toBe('28/09/2026 às 23:00')
  })

  it('[UNITÁRIO] aceita Date e timestamp numérico', () => {
    const data = new Date(instante)
    expect(formatarData(data)).toBe('28/09/2026')
    expect(formatarData(data.getTime())).toBe('28/09/2026')
  })

  it('[UNITÁRIO] formata moeda em reais', () => {
    expect(formatarMoeda(1234.5)).toBe('R$ 1.234,50')
    expect(formatarMoeda(0)).toBe('R$ 0,00')
    expect(formatarMoeda(1000000)).toBe('R$ 1.000.000,00')
  })

  it('[UNITÁRIO] formata valor negativo de moeda', () => {
    expect(formatarMoeda(-50)).toBe('-R$ 50,00')
  })

  it.each([null, undefined, '', 'data-invalida'])('[UNITÁRIO] exibe travessão para data ausente ou inválida: %s', (valor) => {
    expect(formatarData(valor)).toBe('—')
    expect(formatarHora(valor)).toBe('—')
    expect(formatarDataHora(valor)).toBe('—')
    expect(formatarDataExtenso(valor)).toBe('—')
  })

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])('[UNITÁRIO] exibe travessão para moeda inválida: %s', (valor) => {
    expect(formatarMoeda(valor)).toBe('—')
  })

  it.each([
    ['2026-12-12', '12 dez 2026'],
    ['2027-05-03', '03 mai 2027'],
    ['2026-09-30', '30 set 2026'],
  ])('[UNITÁRIO] formata data de calendário curta da navegação do casamento: %s', (valor, esperado) => {
    expect(formatarDataCalendarioCurta(valor)).toBe(esperado)
  })

  it.each([null, undefined, '', '2026-02-30', '12/12/2026'])('[UNITÁRIO] data curta inválida vira travessão: %s', (valor) => {
    expect(formatarDataCalendarioCurta(valor)).toBe('—')
  })
})
