import { describe, expect, it } from 'vitest'

import type { ConvidadoDto, ConviteDto, RespostaRsvp, StatusEnvioConvite } from '@/tipos/convidados'
import {
  contarConvitesPorGrupo,
  gruposSemEnvio,
  resumirEnvio,
  temConviteSemGrupo,
} from '@/utilitarios/acompanhamentoConvites'
import { GRUPO_NENHUM } from '@/utilitarios/filtroConvidados'

let sequencia = 0

function pessoa(resposta: RespostaRsvp): ConvidadoDto {
  sequencia += 1
  return {
    id: `p${sequencia}`,
    nome: `Pessoa ${sequencia}`,
    telefone: null,
    email: null,
    faixaEtaria: 'Adulto',
    resposta,
    acompanhante: false,
    possuiRestricao: false,
  }
}

function convite(grupo: string | null, statusEnvio: StatusEnvioConvite, respostas: RespostaRsvp[]): ConviteDto {
  sequencia += 1
  return {
    id: `c${sequencia}`,
    nome: `Convite ${sequencia}`,
    grupo,
    limiteAcompanhantes: 0,
    statusEnvio,
    convidados: respostas.map(pessoa),
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: null,
  }
}

describe('acompanhamentoConvites', () => {
  it('[UNITÁRIO] resumirEnvio separa convites em a enviar, aguardando e respondidos sem sobrepor', () => {
    const convites = [
      convite('Família', 'NaoEnviado', ['Pendente', 'Pendente']),
      convite('Família', 'NaoEnviado', ['Pendente']),
      convite('Amigos', 'Enviado', ['Confirmado', 'Pendente']),
      convite('Amigos', 'Visualizado', ['Pendente']),
      convite(null, 'Visualizado', ['Confirmado', 'Recusado']),
      convite(null, 'NaoEnviado', ['Confirmado']),
    ]

    expect(resumirEnvio(convites)).toEqual({ aEnviar: 2, aguardando: 2, respondidos: 2, total: 6 })
  })

  it('[UNITÁRIO] resumirEnvio de lista vazia zera tudo', () => {
    expect(resumirEnvio([])).toEqual({ aEnviar: 0, aguardando: 0, respondidos: 0, total: 0 })
  })

  it('[UNITÁRIO] contarConvitesPorGrupo usa a mesma chave normalizada do filtro e conta sem grupo', () => {
    const contagem = contarConvitesPorGrupo([
      convite('Família', 'NaoEnviado', ['Pendente']),
      convite('  família ', 'Enviado', ['Pendente']),
      convite('Padrinhos', 'NaoEnviado', ['Pendente']),
      convite(null, 'NaoEnviado', ['Pendente']),
      convite('', 'NaoEnviado', ['Pendente']),
    ])

    expect(contagem.get('familia')).toBe(2)
    expect(contagem.get('padrinhos')).toBe(1)
    expect(contagem.get(GRUPO_NENHUM)).toBe(2)
  })

  it('[UNITÁRIO] gruposSemEnvio lista só grupos nomeados sem nenhum convite enviado, em ordem alfabética', () => {
    const grupos = gruposSemEnvio([
      convite('Trabalho', 'NaoEnviado', ['Pendente']),
      convite('Corte', 'NaoEnviado', ['Pendente']),
      convite('Corte', 'NaoEnviado', ['Confirmado']),
      convite('Família', 'NaoEnviado', ['Pendente']),
      convite('família', 'Visualizado', ['Pendente']),
      convite(null, 'NaoEnviado', ['Pendente']),
    ])

    expect(grupos.map((grupo) => grupo.rotulo)).toEqual(['Corte', 'Trabalho'])
    expect(grupos.map((grupo) => grupo.chave)).toEqual(['corte', 'trabalho'])
  })

  it('[UNITÁRIO] temConviteSemGrupo detecta grupo nulo ou em branco', () => {
    expect(temConviteSemGrupo([convite('Família', 'Enviado', ['Pendente'])])).toBe(false)
    expect(temConviteSemGrupo([convite('   ', 'Enviado', ['Pendente'])])).toBe(true)
    expect(temConviteSemGrupo([convite(null, 'Enviado', ['Pendente'])])).toBe(true)
  })
})
