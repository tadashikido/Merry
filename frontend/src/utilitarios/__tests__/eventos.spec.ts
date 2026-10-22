import { describe, expect, it } from 'vitest'

import { contemTexto, normalizarParaBusca } from '@/utilitarios/busca'
import { diferencaEmDias, ehDataCalendario, hojeEmSaoPaulo, lerDataCalendario, paraInstanteUtc } from '@/utilitarios/dataCalendario'
import {
  formatarDataCalendario,
  formatarDataCalendarioComDiaSemana,
  formatarDataCalendarioExtenso,
  formatarNomesAnfitrioes,
  formatarNumero,
} from '@/utilitarios/formatacao'
import {
  LIMITES_EVENTO,
  convidadosEstimados,
  dataEvento,
  horarioEvento,
  nomeAnfitrioes,
  textoOpcional,
} from '@/utilitarios/validacaoEvento'
import {
  MENSAGENS_VALIDACAO_EVENTO,
  descreverContagem,
  descreverContagemAcessivel,
  legendaContagemDestaque,
} from '@/textos/eventos'

describe('dataCalendario', () => {
  it('[UNITÁRIO] às 23h30 de São Paulo (02h30 UTC do dia seguinte) hoje ainda é o dia local', () => {
    expect(hojeEmSaoPaulo(new Date('2027-03-11T02:30:00Z'))).toBe('2027-03-10')
  })

  it('[UNITÁRIO] à meia-noite de São Paulo (03h UTC) o dia vira', () => {
    expect(hojeEmSaoPaulo(new Date('2027-03-11T03:00:00Z'))).toBe('2027-03-11')
  })

  it.each(['2027-02-30', '2027-13-01', '15/05/2027', '2027-5-15', '', null, undefined])(
    '[UNITÁRIO] rejeita data de calendário inválida %s',
    (valor) => {
      expect(lerDataCalendario(valor)).toBeNull()
      expect(ehDataCalendario(valor)).toBe(false)
    },
  )

  it('[UNITÁRIO] lê data válida, incluindo 29 de fevereiro em ano bissexto', () => {
    expect(lerDataCalendario('2028-02-29')).toEqual({ ano: 2028, mes: 2, dia: 29 })
    expect(paraInstanteUtc('2027-05-15')?.toISOString()).toBe('2027-05-15T00:00:00.000Z')
  })

  it('[UNITÁRIO] calcula diferença em dias de calendário', () => {
    expect(diferencaEmDias('2027-03-10', '2027-03-10')).toBe(0)
    expect(diferencaEmDias('2027-03-10', '2027-05-15')).toBe(66)
    expect(diferencaEmDias('2027-03-10', '2027-03-07')).toBe(-3)
    expect(diferencaEmDias('2027-03-10', 'invalida')).toBeNull()
  })
})

describe('formatação de data de calendário', () => {
  it('[UNITÁRIO] formata sem deslocar o dia por fuso', () => {
    expect(formatarDataCalendario('2027-05-15')).toBe('15/05/2027')
    expect(formatarDataCalendarioExtenso('2027-05-15')).toBe('15 de maio de 2027')
    expect(formatarDataCalendarioComDiaSemana('2027-05-15')).toBe('sábado, 15 de maio de 2027')
    expect(formatarDataCalendario('2027-01-01')).toBe('01/01/2027')
  })

  it('[UNITÁRIO] valor ausente ou inválido vira travessão', () => {
    expect(formatarDataCalendario(null)).toBe('—')
    expect(formatarDataCalendarioExtenso('2027-02-30')).toBe('—')
    expect(formatarDataCalendarioComDiaSemana('')).toBe('—')
  })

  it('[UNITÁRIO] formata nomes dos anfitriões e números', () => {
    expect(formatarNomesAnfitrioes(' Ana ', 'Bruno ')).toBe('Ana & Bruno')
    expect(formatarNumero(5000)).toBe('5.000')
    expect(formatarNumero(null)).toBe('—')
  })
})

describe('busca', () => {
  it('[UNITÁRIO] normaliza acentos e caixa', () => {
    expect(normalizarParaBusca('  ÁNA Beatriz ')).toBe('ana beatriz')
  })

  it('[UNITÁRIO] encontra termo em qualquer um dos valores, sem acento e caixa', () => {
    expect(contemTexto('ana', 'Ána Beatriz', 'Bruno')).toBe(true)
    expect(contemTexto('Ána', 'Carla', 'Luana')).toBe(true)
    expect(contemTexto('bru', 'Carla', 'BRUNO')).toBe(true)
    expect(contemTexto('diego', 'Carla', 'Bruno')).toBe(false)
    expect(contemTexto('   ', 'Carla', null)).toBe(true)
  })
})

describe('validação do evento', () => {
  it('[UNITÁRIO] nome dos anfitriões: vazio fica para a regra obrigatória; limites de 2 a 80', () => {
    expect(nomeAnfitrioes('')).toBeNull()
    expect(nomeAnfitrioes(' A ')).toBe(MENSAGENS_VALIDACAO_EVENTO.nomeTamanho)
    expect(nomeAnfitrioes('a'.repeat(81))).toBe(MENSAGENS_VALIDACAO_EVENTO.nomeTamanho)
    expect(nomeAnfitrioes('Ana')).toBeNull()
    expect(nomeAnfitrioes('a'.repeat(80))).toBeNull()
  })

  it('[UNITÁRIO] data: formato e faixa 2000–2100', () => {
    expect(dataEvento('')).toBeNull()
    expect(dataEvento('2027-05-15')).toBeNull()
    expect(dataEvento('2000-01-01')).toBeNull()
    expect(dataEvento('2100-12-31')).toBeNull()
    expect(dataEvento('1999-12-31')).toBe(MENSAGENS_VALIDACAO_EVENTO.dataFaixa)
    expect(dataEvento('2101-01-01')).toBe(MENSAGENS_VALIDACAO_EVENTO.dataFaixa)
    expect(dataEvento('2027-02-30')).toBe(MENSAGENS_VALIDACAO_EVENTO.dataInvalida)
  })

  it('[UNITÁRIO] horário 24 h opcional', () => {
    expect(horarioEvento('')).toBeNull()
    expect(horarioEvento('16:30')).toBeNull()
    expect(horarioEvento('23:59')).toBeNull()
    expect(horarioEvento('24:00')).toBe(MENSAGENS_VALIDACAO_EVENTO.horarioInvalido)
    expect(horarioEvento('9:30')).toBe(MENSAGENS_VALIDACAO_EVENTO.horarioInvalido)
  })

  it('[UNITÁRIO] convidados estimados inteiro de 1 a 5.000', () => {
    expect(convidadosEstimados('')).toBeNull()
    expect(convidadosEstimados('1')).toBeNull()
    expect(convidadosEstimados('5000')).toBeNull()
    expect(convidadosEstimados('0')).toBe(MENSAGENS_VALIDACAO_EVENTO.convidadosFaixa)
    expect(convidadosEstimados('5001')).toBe(MENSAGENS_VALIDACAO_EVENTO.convidadosFaixa)
    expect(convidadosEstimados('12.5')).toBe(MENSAGENS_VALIDACAO_EVENTO.convidadosFaixa)
    expect(convidadosEstimados('-3')).toBe(MENSAGENS_VALIDACAO_EVENTO.convidadosFaixa)
  })

  it('[UNITÁRIO] textos opcionais respeitam o limite com a mensagem certa', () => {
    expect(textoOpcional(LIMITES_EVENTO.local)('x'.repeat(200))).toBeNull()
    expect(textoOpcional(LIMITES_EVENTO.local)('x'.repeat(201))).toBe(MENSAGENS_VALIDACAO_EVENTO.localTamanho)
    expect(textoOpcional(LIMITES_EVENTO.observacoes)('x'.repeat(2001))).toBe(MENSAGENS_VALIDACAO_EVENTO.observacoesTamanho)
  })
})

describe('contagem regressiva', () => {
  it.each([
    [229, 'Faltam 229 dias'],
    [1500, 'Faltam 1.500 dias'],
    [1, 'Falta 1 dia'],
    [0, 'É hoje'],
    [-1, 'Foi ontem'],
    [-261, 'Foi há 261 dias'],
  ])('[UNITÁRIO] %i dias → "%s"', (dias, texto) => {
    expect(descreverContagem(dias)).toBe(texto)
  })

  it('[UNITÁRIO] legenda e texto acessível', () => {
    expect(legendaContagemDestaque(1)).toBe('dia para o evento')
    expect(legendaContagemDestaque(42)).toBe('dias para o evento')
    expect(descreverContagemAcessivel(42)).toBe('Faltam 42 dias para o evento')
    expect(descreverContagemAcessivel(0)).toBe('É hoje')
  })
})
