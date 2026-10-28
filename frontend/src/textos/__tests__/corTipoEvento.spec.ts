import { describe, expect, it } from 'vitest'

import { NOMES_ICONES } from '@/design/icones'
import { tonsCelebracao } from '@/design/tokens'
import { ICONE_DO_TOM, TOM_DO_TIPO, classeTom, classeTomDoTipo, corDoTipo, iconeDoTipo, tomDoTipo } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'

describe('cor por tipo de evento', () => {
  it('[UNITÁRIO] cada tipo de evento tem o seu tom de celebração, todos distintos', () => {
    expect(TOM_DO_TIPO).toEqual({ Casamento: 'rose', QuinzeAnos: 'orquidea', Aniversario: 'tangerina', Comemoracao: 'champanhe' })
    expect(new Set(TIPOS_EVENTO.map((tipo) => tomDoTipo(tipo))).size).toBe(TIPOS_EVENTO.length)
  })

  it('[UNITÁRIO] corDoTipo devolve viva, fundo, tinta, tinta profunda e data do tom', () => {
    expect(corDoTipo('Casamento')).toEqual({ viva: '#D9837A', fundo: '#F6DEDA', tinta: '#9C3F3A', tintaProfunda: '#3A1512', data: '#7A3530' })
    expect(corDoTipo('QuinzeAnos')).toBe(tonsCelebracao.orquidea)
    expect(corDoTipo('Aniversario')).toBe(tonsCelebracao.tangerina)
    expect(corDoTipo('Comemoracao')).toBe(tonsCelebracao.champanhe)
  })

  it.each([null, undefined, 'Formatura', 'casamento', '', 'Corporativo'])(
    '[UNITÁRIO] tipo %s nulo ou desconhecido cai no neutro meia-noite, nunca em Casamento',
    (tipo) => {
      const valor = tipo as TipoEvento | null | undefined
      expect(tomDoTipo(valor)).toBe('neutro')
      expect(corDoTipo(valor)).toBe(tonsCelebracao.neutro)
      expect(corDoTipo(valor)).not.toEqual(tonsCelebracao.rose)
      expect(classeTomDoTipo(valor)).toBe('tom-tipo--neutro')
      expect(iconeDoTipo(valor)).toBe('evento')
    },
  )

  it('[UNITÁRIO] Jade existe só como token: nenhum tipo de evento aponta para ele', () => {
    expect(Object.values(TOM_DO_TIPO)).not.toContain('jade')
    expect(TIPOS_EVENTO).not.toContain('Formatura' as TipoEvento)
    expect(tonsCelebracao.jade.fundo).toBe('#D8EEEA')
  })

  it('[UNITÁRIO] classes e ícones por tom usam nomes do catálogo', () => {
    expect(classeTom('jade')).toBe('tom-tipo--jade')
    expect(classeTomDoTipo('QuinzeAnos')).toBe('tom-tipo--orquidea')
    expect(ICONE_DO_TOM).toEqual({ rose: 'aneis', orquidea: 'coroa', tangerina: 'bolo', champanhe: 'taca', jade: 'capelo', neutro: 'evento' })
    Object.values(ICONE_DO_TOM).forEach((icone) => expect(NOMES_ICONES).toContain(icone))
  })
})
