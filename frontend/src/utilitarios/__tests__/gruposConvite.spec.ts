import { describe, expect, it } from 'vitest'

import type { ConviteDto } from '@/tipos/convidados'
import type { TipoEvento } from '@/tipos/eventos'
import { outrosConvitesNoGrupo, sugestoesDeGrupo } from '@/utilitarios/gruposConvite'

function convite(id: string, grupo: string | null): ConviteDto {
  return {
    id,
    nome: `Convite ${id}`,
    grupo,
    limiteAcompanhantes: 0,
    statusEnvio: 'NaoEnviado',
    convidados: [],
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: null,
  }
}

describe('sugestoesDeGrupo', () => {
  it('[UNITÁRIO] sem convites sugere os grupos do tipo do evento', () => {
    expect(sugestoesDeGrupo([], 'QuinzeAnos')).toEqual(['Família', 'Corte', 'Amigos da escola', 'Amigos da família'])
    expect(sugestoesDeGrupo([], 'Aniversario')).toEqual(['Família', 'Amigos', 'Trabalho', 'Vizinhos'])
  })

  it('[UNITÁRIO] grupos usados vêm primeiro e as sugestões do tipo não repetem por acento ou caixa', () => {
    const convites = [convite('1', 'familia'), convite('2', 'Tios'), convite('3', null), convite('4', 'PADRINHOS')]

    expect(sugestoesDeGrupo(convites, 'Casamento')).toEqual(['familia', 'PADRINHOS', 'Tios', 'Amigos', 'Trabalho'])
  })

  it('[UNITÁRIO] tipo desconhecido usa os grupos neutros, nunca os de casamento', () => {
    const sugestoes = sugestoesDeGrupo([], 'Corporativo' as TipoEvento)

    expect(sugestoes).toEqual(['Família', 'Amigos', 'Convidados de honra'])
    expect(sugestoes).not.toContain('Padrinhos')
    expect(sugestoesDeGrupo([], null)).toEqual(sugestoes)
  })
})

describe('outrosConvitesNoGrupo', () => {
  const convites = [convite('1', 'Família'), convite('2', 'familia '), convite('3', 'Amigos'), convite('4', null)]

  it('[UNITÁRIO] conta convites do mesmo grupo pela chave normalizada e devolve o rótulo já usado', () => {
    expect(outrosConvitesNoGrupo(convites, 'FAMÍLIA')).toEqual({ rotulo: 'Família', quantidade: 2 })
  })

  it('[UNITÁRIO] desconta o convite em edição', () => {
    expect(outrosConvitesNoGrupo(convites, 'Família', '1')).toEqual({ rotulo: 'familia ', quantidade: 1 })
    expect(outrosConvitesNoGrupo(convites, 'Amigos', '3')).toBeNull()
  })

  it('[UNITÁRIO] grupo vazio ou novo não tem contagem', () => {
    expect(outrosConvitesNoGrupo(convites, '   ')).toBeNull()
    expect(outrosConvitesNoGrupo(convites, 'Vizinhos')).toBeNull()
    expect(outrosConvitesNoGrupo([], 'Família')).toBeNull()
  })
})
