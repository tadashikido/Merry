import { describe, expect, it } from 'vitest'

import { ITENS_NO_DIA, itemPainel } from '@/__tests__/auxiliaresGrandeDia'
import { itemPublico } from '@/__tests__/auxiliaresCronogramaPublico'
import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'
import {
  distribuirPainel,
  horaLocalDoInstante,
  interpolarMomento,
  itensPainelDoGrandeDia,
  itensPainelPublicos,
  minutoAtualNoRoteiro,
  minutoDoItem,
  minutosAte,
} from '@/utilitarios/grandeDia'

describe('utilitários do Grande Dia', () => {
  it('[UNITÁRIO] interpola o horário do servidor pelo tempo decorrido, sem usar o fuso do aparelho', () => {
    const recebido = 1_000_000
    expect(interpolarMomento('2027-05-15T16:34:12', recebido, recebido)).toEqual({ data: '2027-05-15', hora: '16:34', minutoDoDia: 994 })
    expect(interpolarMomento('2027-05-15T16:34:12', recebido, recebido + 60_000)).toEqual({ data: '2027-05-15', hora: '16:35', minutoDoDia: 995 })
    expect(interpolarMomento('2027-05-15T23:59:30', recebido, recebido + 45_000)).toEqual({ data: '2027-05-16', hora: '00:00', minutoDoDia: 0 })
    expect(interpolarMomento('2027-05-15T16:34', recebido, recebido - 90_000)?.hora).toBe('16:34')
    expect(interpolarMomento('inválido', recebido, recebido)).toBeNull()
  })

  it('[UNITÁRIO] calcula o minuto atual relativo ao dia do evento', () => {
    expect(minutoAtualNoRoteiro({ data: '2027-05-15', hora: '16:34', minutoDoDia: 994 }, '2027-05-15')).toBe(994)
    expect(minutoAtualNoRoteiro({ data: '2027-05-16', hora: '01:00', minutoDoDia: 60 }, '2027-05-15')).toBe(1500)
    expect(minutoAtualNoRoteiro({ data: '2027-05-14', hora: '19:00', minutoDoDia: 1140 }, '2027-05-15')).toBe(-300)
  })

  it('[UNITÁRIO] posiciona itens por dia relativo e calcula quanto falta', () => {
    expect(minutoDoItem({ dia: 'Vespera', inicio: '19:00' })).toBe(-300)
    expect(minutoDoItem({ dia: 'DiaSeguinte', inicio: '01:00' })).toBe(1500)
    expect(minutosAte({ dia: 'DiaDoEvento', inicio: '17:15' }, 994)).toBe(41)
  })

  it('[UNITÁRIO] descreve quanto falta em minutos e horas', () => {
    expect(TEXTOS_GRANDE_DIA.emMinutos(41)).toBe('em 41 min')
    expect(TEXTOS_GRANDE_DIA.emMinutos(65)).toBe('em 1 h 05')
    expect(TEXTOS_GRANDE_DIA.emMinutos(120)).toBe('em 2 h')
    expect(TEXTOS_GRANDE_DIA.emMinutos(0)).toBe('começando agora')
    expect(TEXTOS_GRANDE_DIA.faltamDias(12)).toBe('Faltam 12 dias')
    expect(TEXTOS_GRANDE_DIA.faltamDias(1)).toBe('É amanhã')
  })

  it('[UNITÁRIO] distribui o painel: Agora principal é o de início mais recente', () => {
    const distribuicao = distribuirPainel(itensPainelDoGrandeDia(ITENS_NO_DIA, '16:30'))

    expect(distribuicao.principal?.atividade).toBe('Cerimônia')
    expect(distribuicao.principal?.cerimonia).toBe(true)
    expect(distribuicao.principal?.contato).toEqual({ nome: 'Coral Harmonia', telefone: '11987654321' })
    expect(distribuicao.tambemAgora.map((item) => item.atividade)).toEqual(['Maquiagem'])
    expect(distribuicao.proximo?.atividade).toBe('Fotos com a família')
    expect(distribuicao.depois.map((item) => item.atividade)).toEqual(['Recepção'])
    expect(distribuicao.semMarcar.map((item) => item.atividade)).toEqual(['Montagem do buffet'])
    expect(distribuicao.feitos.map((item) => item.atividade)).toEqual(['Buquê'])
  })

  it('[UNITÁRIO] sem item em andamento o principal é nulo', () => {
    const distribuicao = distribuirPainel([itemPainel({ situacao: 'Proximo' })])
    expect(distribuicao.principal).toBeNull()
    expect(distribuicao.tambemAgora).toEqual([])
    expect(distribuicao.proximo?.atividade).toBe('Cerimônia')
  })

  it('[SEGURANÇA] itens públicos nunca carregam contato', () => {
    const itens = itensPainelPublicos([itemPublico({ situacao: 'Agora' })], '16:30')
    expect(itens[0]!.contato).toBeNull()
    expect(itens[0]!.fornecedor).toBe('Buffet Sabor')
    expect(itens[0]!.chave).toBe('DiaDoEvento-14:00-0')
  })

  it('[UNITÁRIO] mostra a hora local do instante de conclusão', () => {
    expect(horaLocalDoInstante('2027-05-15T19:52:00Z')).toBe('16:52')
    expect(horaLocalDoInstante(null)).toBeNull()
    expect(horaLocalDoInstante('xx')).toBeNull()
  })
})
