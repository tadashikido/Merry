import { describe, expect, it } from 'vitest'

import type { TipoEvento } from '@/tipos/eventos'
import {
  URL_BUSCA_MAPA,
  celebracaoDoConvite,
  diasAteOEvento,
  linkMapaDoLocal,
  locaisDoConvite,
  segundoNomeDoConvite,
} from '@/utilitarios/rsvp'

const DESCONHECIDO = 'Formatura' as unknown as TipoEvento

describe('celebracaoDoConvite', () => {
  it.each([
    ['Casamento', 'Ana', 'Bruno', 'vão se casar'],
    ['QuinzeAnos', 'Júlia', null, 'vai comemorar os 15 anos'],
    ['Aniversario', 'Pedro', null, 'vai comemorar o aniversário'],
    ['Comemoracao', 'Helena', 'Rui', 'vão celebrar'],
    ['Comemoracao', 'Família Souza', null, 'vai celebrar'],
  ] as const)('[UNITÁRIO] %s com %s → %s', (tipo, primeiro, segundo, esperado) => {
    expect(celebracaoDoConvite(tipo, primeiro, segundo)).toBe(esperado)
  })

  it('[UNITÁRIO] tipo desconhecido ou ausente usa o neutro', () => {
    expect(celebracaoDoConvite(DESCONHECIDO, 'Turma', null)).toBe('vai celebrar')
    expect(celebracaoDoConvite(null, 'Ana', 'Bruno')).toBe('vão celebrar')
  })

  it('[UNITÁRIO] tipo sem segundo nome ignora o segundo e fica no singular', () => {
    expect(celebracaoDoConvite('Aniversario', 'Pedro', 'Resto')).toBe('vai comemorar o aniversário')
    expect(segundoNomeDoConvite('Aniversario', 'Resto')).toBeNull()
    expect(segundoNomeDoConvite('Casamento', '  Bruno ')).toBe('Bruno')
    expect(segundoNomeDoConvite(DESCONHECIDO, 'Rui')).toBe('Rui')
    expect(segundoNomeDoConvite('Casamento', '   ')).toBeNull()
  })
})

describe('locaisDoConvite', () => {
  it('[UNITÁRIO] rótulos pelo tipo; vazio e repetido ficam de fora', () => {
    expect(locaisDoConvite({ tipo: 'Casamento', localCerimonia: 'Capela', localRecepcao: 'Villa' })).toEqual([
      { chave: 'principal', rotulo: 'Cerimônia', valor: 'Capela' },
      { chave: 'secundario', rotulo: 'Recepção', valor: 'Villa' },
    ])
    expect(locaisDoConvite({ tipo: 'QuinzeAnos', localCerimonia: ' Espaço ', localRecepcao: '' })).toEqual([
      { chave: 'principal', rotulo: 'Festa', valor: 'Espaço' },
    ])
    expect(locaisDoConvite({ tipo: DESCONHECIDO, localCerimonia: 'Teatro', localRecepcao: 'teatro' })).toEqual([
      { chave: 'principal', rotulo: 'Local', valor: 'Teatro' },
    ])
    expect(locaisDoConvite({ tipo: 'Aniversario', localCerimonia: null, localRecepcao: 'Salão' })).toEqual([
      { chave: 'secundario', rotulo: 'Outro local', valor: 'Salão' },
    ])
  })
})

describe('linkMapaDoLocal e diasAteOEvento', () => {
  it('[SEGURANÇA] busca de mapa com host fixo e texto codificado', () => {
    const link = linkMapaDoLocal(' Rua das Flores, 10 & javascript:alert(1) ')
    expect(link.startsWith(URL_BUSCA_MAPA)).toBe(true)
    expect(link).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Rua das Flores, 10 & javascript:alert(1)')}`)
    expect(new URL(link).host).toBe('www.google.com')
  })

  it('[UNITÁRIO] dias entre hoje e o evento', () => {
    expect(diasAteOEvento('2027-05-22', '2027-05-02')).toBe(20)
    expect(diasAteOEvento('2027-05-22', '2027-05-22')).toBe(0)
    expect(diasAteOEvento('2027-05-22', '2027-05-25')).toBe(-3)
    expect(diasAteOEvento('invalida', '2027-05-25')).toBeNull()
  })
})
