import { describe, expect, it } from 'vitest'

import { VOCABULARIO_TIPO_EVENTO, vocabularioOuNeutro } from '@/textos/tiposEvento'
import { TIPOS_EVENTO } from '@/tipos/eventos'
import { somarDias } from '@/utilitarios/dataCalendario'
import {
  descreverDistancia,
  descreverFaltaParaEvento,
  descreverPrazoNoEvento,
  marcosDoPrazo,
  posicaoPrazoNoEvento,
} from '@/utilitarios/prazoTarefaEvento'

const EVENTO = { data: '2027-03-20', diasRestantes: 40, dataLimiteRsvpEfetiva: '2027-02-18' }

describe('somarDias', () => {
  it('[UNITÁRIO] soma e subtrai dias atravessando meses e anos', () => {
    expect(somarDias('2027-03-20', -40)).toBe('2027-02-08')
    expect(somarDias('2026-12-30', 3)).toBe('2027-01-02')
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('[UNITÁRIO] data inválida devolve nulo', () => {
    expect(somarDias('2027-02-30', 1)).toBeNull()
    expect(somarDias('', 1)).toBeNull()
  })
})

describe('posicaoPrazoNoEvento', () => {
  it('[UNITÁRIO] calcula dias antes do evento e dias a partir de hoje sem relógio do navegador', () => {
    expect(posicaoPrazoNoEvento('2027-03-01', EVENTO)).toEqual({ diasAntesDoEvento: 19, diasAteHoje: 21 })
    expect(posicaoPrazoNoEvento('2027-03-20', EVENTO)).toEqual({ diasAntesDoEvento: 0, diasAteHoje: 40 })
    expect(posicaoPrazoNoEvento('2027-03-23', EVENTO)).toEqual({ diasAntesDoEvento: -3, diasAteHoje: 43 })
    expect(posicaoPrazoNoEvento('2027-02-01', EVENTO)).toEqual({ diasAntesDoEvento: 47, diasAteHoje: -7 })
  })

  it('[UNITÁRIO] prazo vazio ou inválido devolve nulo', () => {
    expect(posicaoPrazoNoEvento('', EVENTO)).toBeNull()
    expect(posicaoPrazoNoEvento('2027-13-01', EVENTO)).toBeNull()
  })
})

describe('descreverPrazoNoEvento', () => {
  it('[UNITÁRIO] antes, no dia e depois variam pelo vocabulário dos 4 tipos', () => {
    const esperados = {
      Casamento: 'do casamento',
      QuinzeAnos: 'da festa de 15 anos',
      Aniversario: 'do aniversário',
      Comemoracao: 'da comemoração',
    }
    for (const tipo of TIPOS_EVENTO) {
      const vocabulario = VOCABULARIO_TIPO_EVENTO[tipo]
      expect(descreverPrazoNoEvento({ diasAntesDoEvento: 10, diasAteHoje: 30 }, vocabulario)).toBe(`10 dias antes ${esperados[tipo]}.`)
      expect(descreverPrazoNoEvento({ diasAntesDoEvento: 1, diasAteHoje: 39 }, vocabulario)).toBe(`1 dia antes ${esperados[tipo]}.`)
      expect(descreverPrazoNoEvento({ diasAntesDoEvento: 0, diasAteHoje: 40 }, vocabulario)).toBe(`No dia ${esperados[tipo]}.`)
      expect(descreverPrazoNoEvento({ diasAntesDoEvento: -2, diasAteHoje: 42 }, vocabulario)).toBe(`2 dias depois ${esperados[tipo]}.`)
    }
  })

  it('[UNITÁRIO] tipo desconhecido usa o vocabulário neutro, nunca casamento', () => {
    expect(descreverPrazoNoEvento({ diasAntesDoEvento: 3, diasAteHoje: 1 }, vocabularioOuNeutro(null))).toBe('3 dias antes da comemoração.')
  })
})

describe('descreverDistancia e descreverFaltaParaEvento', () => {
  it('[UNITÁRIO] distância relativa a hoje', () => {
    expect(descreverDistancia(0)).toBe('hoje')
    expect(descreverDistancia(1)).toBe('amanhã')
    expect(descreverDistancia(21)).toBe('em 21 dias')
    expect(descreverDistancia(-1)).toBe('há 1 dia')
    expect(descreverDistancia(-7)).toBe('há 7 dias')
  })

  it('[UNITÁRIO] frase de quanto falta para o evento', () => {
    const quinze = VOCABULARIO_TIPO_EVENTO.QuinzeAnos
    expect(descreverFaltaParaEvento(40, quinze)).toBe('Faltam 40 dias para a festa de 15 anos.')
    expect(descreverFaltaParaEvento(1, quinze)).toBe('Falta 1 dia para a festa de 15 anos.')
    expect(descreverFaltaParaEvento(0, VOCABULARIO_TIPO_EVENTO.Aniversario)).toBe('O aniversário é hoje.')
    expect(descreverFaltaParaEvento(-3, VOCABULARIO_TIPO_EVENTO.Comemoracao)).toBe('A comemoração já aconteceu.')
  })
})

describe('marcosDoPrazo', () => {
  it('[UNITÁRIO] ordena hoje, confirmações, prazo e evento pela data', () => {
    const marcos = marcosDoPrazo(EVENTO, '2027-03-01')
    expect(marcos.map((marco) => [marco.chave, marco.data, marco.diasAteHoje])).toEqual([
      ['hoje', '2027-02-08', 0],
      ['confirmacoes', '2027-02-18', 10],
      ['prazo', '2027-03-01', 21],
      ['evento', '2027-03-20', 40],
    ])
  })

  it('[UNITÁRIO] prazo passado vem antes de hoje e prazo depois do evento vem por último', () => {
    expect(marcosDoPrazo(EVENTO, '2027-02-01').map((marco) => marco.chave)).toEqual(['prazo', 'hoje', 'confirmacoes', 'evento'])
    expect(marcosDoPrazo(EVENTO, '2027-04-01').map((marco) => marco.chave)).toEqual(['hoje', 'confirmacoes', 'evento', 'prazo'])
  })

  it('[UNITÁRIO] datas iguais mantêm a ordem fixa hoje, prazo, confirmações, evento', () => {
    const marcos = marcosDoPrazo({ data: '2027-02-08', diasRestantes: 0, dataLimiteRsvpEfetiva: '2027-02-08' }, '2027-02-08')
    expect(marcos.map((marco) => marco.chave)).toEqual(['hoje', 'prazo', 'confirmacoes', 'evento'])
  })

  it('[UNITÁRIO] sem prazo e sem limite de confirmações válido mostra só hoje e o evento', () => {
    const marcos = marcosDoPrazo({ ...EVENTO, dataLimiteRsvpEfetiva: null }, '')
    expect(marcos.map((marco) => marco.chave)).toEqual(['hoje', 'evento'])
  })
})
