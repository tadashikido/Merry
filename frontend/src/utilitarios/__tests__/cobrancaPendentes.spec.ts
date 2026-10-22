import { describe, expect, it } from 'vitest'

import { TEXTOS_COBRANCA } from '@/textos/confirmacoes'
import type { ConvitePendenteDto } from '@/tipos/confirmacoes'
import { cobradoHoje, contarCobradosHoje, filaCobranca, formatarHoraCurta, textoUltimaCobranca } from '@/utilitarios/painelConfirmacoes'
import { montarLinkWhatsApp, montarMensagemLembrete } from '@/utilitarios/rsvp'

function pendente(dados: Partial<ConvitePendenteDto> = {}): ConvitePendenteDto {
  return {
    conviteId: crypto.randomUUID(),
    nome: 'Família Lima',
    grupo: null,
    statusEnvio: 'Enviado',
    telefone: null,
    pessoasPendentes: ['Bia Lima'],
    totalPessoas: 2,
    cobravel: true,
    ultimaCobrancaEm: null,
    quantidadeCobrancas: 0,
    ...dados,
  }
}

const AGORA = new Date(2027, 4, 7, 15, 30)

describe('cobrança de pendentes', () => {
  it('[UNITÁRIO] fila só tem cobráveis, com nunca cobrados primeiro e depois a cobrança mais antiga', () => {
    const fila = filaCobranca([
      pendente({ nome: 'Recente', ultimaCobrancaEm: new Date(2027, 4, 7, 10).toISOString(), quantidadeCobrancas: 1 }),
      pendente({ nome: 'Zélia' }),
      pendente({ nome: 'Antiga', ultimaCobrancaEm: new Date(2027, 4, 1, 10).toISOString(), quantidadeCobrancas: 2 }),
      pendente({ nome: 'Não enviado', statusEnvio: 'NaoEnviado', cobravel: false }),
      pendente({ nome: 'Álvaro' }),
    ])

    expect(fila.map((item) => item.nome)).toEqual(['Álvaro', 'Zélia', 'Antiga', 'Recente'])
  })

  it('[UNITÁRIO] fila vazia quando nenhum pendente é cobrável', () => {
    expect(filaCobranca([pendente({ cobravel: false })])).toEqual([])
  })

  it('[UNITÁRIO] descreve a última cobrança de forma relativa', () => {
    expect(textoUltimaCobranca(null, AGORA)).toBe(TEXTOS_COBRANCA.nuncaCobrado)
    expect(textoUltimaCobranca(new Date(2027, 4, 7, 15, 28).toISOString(), AGORA)).toBe(TEXTOS_COBRANCA.cobradoAgora)
    expect(textoUltimaCobranca(new Date(2027, 4, 7, 9, 5).toISOString(), AGORA)).toBe('Cobrado hoje às 9h05')
    expect(textoUltimaCobranca(new Date(2027, 4, 6, 22, 0).toISOString(), AGORA)).toBe(TEXTOS_COBRANCA.cobradoOntem)
    expect(textoUltimaCobranca(new Date(2027, 4, 4, 8, 0).toISOString(), AGORA)).toBe('Cobrado há 3 dias')
    expect(textoUltimaCobranca('data-invalida', AGORA)).toBe(TEXTOS_COBRANCA.nuncaCobrado)
  })

  it('[UNITÁRIO] conta e identifica os cobrados hoje', () => {
    const lista = [
      pendente({ ultimaCobrancaEm: new Date(2027, 4, 7, 8).toISOString() }),
      pendente({ ultimaCobrancaEm: new Date(2027, 4, 6, 23).toISOString() }),
      pendente(),
    ]

    expect(contarCobradosHoje(lista, AGORA)).toBe(1)
    expect(cobradoHoje(null, AGORA)).toBe(false)
    expect(formatarHoraCurta(new Date(2027, 4, 7, 14, 5))).toBe('14h05')
  })

  it('[UNITÁRIO] lembrete traz convite, anfitriões, data, prazo e link', () => {
    const mensagem = montarMensagemLembrete(
      { nomePrimeiraPessoa: 'Ana Beatriz', nomeSegundaPessoa: 'Bruno', data: '2027-05-22', dataLimiteRsvpEfetiva: '2027-05-12' },
      { nome: 'Família Lima' },
      'https://merry.exemplo/rsvp/abc',
    )

    expect(mensagem).toBe(
      'Oi, Família Lima! Passando para lembrar da confirmação de presença no evento de Ana Beatriz e Bruno, em 22 de maio de 2027. Responda até 12 de maio pelo link: https://merry.exemplo/rsvp/abc',
    )
  })

  it('[SEGURANÇA] nome com caracteres especiais é codificado no link do WhatsApp', () => {
    const mensagem = montarMensagemLembrete(
      { nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'Bruno', data: '2027-05-22', dataLimiteRsvpEfetiva: '2027-05-12' },
      { nome: 'Lima & <script>' },
      'https://merry.exemplo/rsvp/abc',
    )
    const destino = new URL(montarLinkWhatsApp('(11) 98765-4321', mensagem))

    expect(destino.origin + destino.pathname).toBe('https://wa.me/5511987654321')
    expect(destino.search).not.toContain('<script>')
    expect(destino.searchParams.get('text')).toBe(mensagem)
  })
})
