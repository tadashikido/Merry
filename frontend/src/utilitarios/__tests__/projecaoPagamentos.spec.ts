import { describe, expect, it } from 'vitest'

import type { ParcelaDto } from '@/tipos/financeiro'
import { projetarPagamentosPorMes } from '@/utilitarios/financeiro'
import { formatarMesAno } from '@/utilitarios/formatacao'

type ParcelaProjecao = Pick<ParcelaDto, 'valor' | 'vencimento' | 'situacao'>

function parcela(vencimento: string, valor: number, situacao: ParcelaDto['situacao'] = 'Pendente'): ParcelaProjecao {
  return { vencimento, valor, situacao }
}

describe('projetarPagamentosPorMes', () => {
  it('[UNITÁRIO] agrupa por mês em ordem, soma em centavos e marca o mês do evento', () => {
    const projecao = projetarPagamentosPorMes(
      [parcela('2026-11-10', 0.1), parcela('2026-10-20', 1000), parcela('2026-11-25', 0.2), parcela('2027-05-02', 500)],
      '2027-05-15',
    )

    expect(projecao.meses).toEqual([
      { chave: '2026-10', centavos: 100000, quantidade: 1, doEvento: false },
      { chave: '2026-11', centavos: 30, quantidade: 2, doEvento: false },
      { chave: '2027-05', centavos: 50000, quantidade: 1, doEvento: true },
    ])
    expect(projecao.totalCentavos).toBe(150030)
    expect(projecao.maiorCentavos).toBe(100000)
  })

  it('[UNITÁRIO] ignora vencidas, pagas e datas inválidas', () => {
    const projecao = projetarPagamentosPorMes(
      [parcela('2026-09-01', 300, 'Vencida'), parcela('2026-08-01', 200, 'Paga'), parcela('data-ruim', 50), parcela('2026-10-01', 100)],
      '2027-05-15',
    )

    expect(projecao.meses.map((mes) => mes.chave)).toEqual(['2026-10'])
    expect(projecao.totalCentavos).toBe(10000)
  })

  it('[UNITÁRIO] separa o que vence até a data do evento (inclusive) do que fica para depois', () => {
    const projecao = projetarPagamentosPorMes(
      [parcela('2027-05-15', 100), parcela('2027-05-16', 40), parcela('2027-06-01', 60)],
      '2027-05-15',
    )

    expect(projecao.ateEventoCentavos).toBe(10000)
    expect(projecao.depoisCentavos).toBe(10000)
  })

  it('[UNITÁRIO] sem data de evento não calcula até/depois nem marca mês', () => {
    const projecao = projetarPagamentosPorMes([parcela('2027-05-15', 100)], null)

    expect(projecao.ateEventoCentavos).toBeNull()
    expect(projecao.depoisCentavos).toBe(0)
    expect(projecao.meses[0]!.doEvento).toBe(false)
  })

  it('[UNITÁRIO] mostra até 6 meses e resume o restante', () => {
    const parcelas = Array.from({ length: 8 }, (_, indice) => parcela(`2027-${String(indice + 1).padStart(2, '0')}-10`, 100 * (indice + 1)))

    const projecao = projetarPagamentosPorMes(parcelas, '2027-12-01')

    expect(projecao.meses).toHaveLength(6)
    expect(projecao.restante).toEqual({ meses: 2, centavos: 150000 })
    expect(projecao.totalCentavos).toBe(360000)
  })

  it('[UNITÁRIO] estende a lista até o mês do evento, com teto de 12 meses', () => {
    const parcelas = Array.from({ length: 10 }, (_, indice) => parcela(`2027-${String(indice + 1).padStart(2, '0')}-10`, 100))

    const ateOitavo = projetarPagamentosPorMes(parcelas, '2027-08-20')
    expect(ateOitavo.meses).toHaveLength(8)
    expect(ateOitavo.meses[ateOitavo.meses.length - 1]).toMatchObject({ chave: '2027-08', doEvento: true })
    expect(ateOitavo.restante).toEqual({ meses: 2, centavos: 20000 })

    const longe = Array.from({ length: 14 }, (_, indice) => parcela(`${2027 + Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}-10`, 100))
    expect(projetarPagamentosPorMes(longe, '2028-02-10').meses).toHaveLength(12)
  })

  it('[UNITÁRIO] lista vazia devolve projeção vazia', () => {
    const projecao = projetarPagamentosPorMes([], '2027-05-15')

    expect(projecao.meses).toEqual([])
    expect(projecao.totalCentavos).toBe(0)
    expect(projecao.ateEventoCentavos).toBe(0)
  })
})

describe('formatarMesAno', () => {
  it('[UNITÁRIO] formata o mês por extenso com inicial maiúscula, sem depender do fuso', () => {
    expect(formatarMesAno('2026-10')).toBe('Outubro de 2026')
    expect(formatarMesAno('2027-01')).toBe('Janeiro de 2027')
  })

  it('[UNITÁRIO] valor inválido vira traço', () => {
    expect(formatarMesAno('2026-13')).toBe(formatarMesAno(null))
    expect(formatarMesAno('')).toBe(formatarMesAno(undefined))
  })
})
