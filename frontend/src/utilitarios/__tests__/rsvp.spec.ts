import { describe, expect, it } from 'vitest'

import {
  dataLimitePadrao,
  escolhaInicial,
  formatarDiaMes,
  formatarHorarioConvite,
  montarLinkWhatsApp,
  montarMensagemConvite,
  montarUrlRsvp,
  primeiroTelefone,
  telefoneWhatsApp,
  tokenRsvpValido,
} from '@/utilitarios/rsvp'
import { dataLimiteRsvp } from '@/utilitarios/validacaoCasamento'

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'

describe('utilitários de RSVP', () => {
  it('[UNITÁRIO] aceita só tokens de 43 caracteres base64url', () => {
    expect(tokenRsvpValido(TOKEN)).toBe(true)
    expect(tokenRsvpValido(`${TOKEN}f`)).toBe(false)
    expect(tokenRsvpValido(TOKEN.slice(1))).toBe(false)
    expect(tokenRsvpValido(`${TOKEN.slice(0, 42)}/`)).toBe(false)
    expect(tokenRsvpValido(null)).toBe(false)
  })

  it('[UNITÁRIO] monta a URL pública a partir da origem', () => {
    expect(montarUrlRsvp(TOKEN, 'https://app.exemplo.com.br/')).toBe(`https://app.exemplo.com.br/rsvp/${TOKEN}`)
  })

  it('[UNITÁRIO] normaliza telefone para o wa.me', () => {
    expect(telefoneWhatsApp('11987654321')).toBe('5511987654321')
    expect(telefoneWhatsApp('1133334444')).toBe('551133334444')
    expect(telefoneWhatsApp('+351912345678')).toBe('351912345678')
    expect(telefoneWhatsApp('5511987654321')).toBe('5511987654321')
    expect(telefoneWhatsApp('')).toBeNull()
    expect(telefoneWhatsApp('123')).toBeNull()
  })

  it('[SEGURANÇA] codifica a mensagem no link do WhatsApp', () => {
    const link = montarLinkWhatsApp('11987654321', 'Olá & até já? <script>')
    expect(link).toBe(`https://wa.me/5511987654321?text=${encodeURIComponent('Olá & até já? <script>')}`)
    expect(montarLinkWhatsApp(null, 'Oi')).toBe('https://wa.me/?text=Oi')
  })

  it('[UNITÁRIO] usa o primeiro telefone disponível do convite', () => {
    const convidados = [
      { id: '1', nome: 'A', telefone: null, email: null, faixaEtaria: 'Adulto' as const, resposta: 'Pendente' as const, acompanhante: false, possuiRestricao: false },
      { id: '2', nome: 'B', telefone: '11987654321', email: null, faixaEtaria: 'Adulto' as const, resposta: 'Pendente' as const, acompanhante: false, possuiRestricao: false },
    ]
    expect(primeiroTelefone({ convidados })).toBe('11987654321')
    expect(primeiroTelefone({ convidados: [] })).toBeNull()
  })

  it('[UNITÁRIO] monta a mensagem pronta com casal, data, prazo e link', () => {
    const mensagem = montarMensagemConvite(
      { nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'Bruno', data: '2027-05-22', dataLimiteRsvpEfetiva: '2027-05-12' },
      { nome: 'Família Souza' },
      'https://app/rsvp/x',
    )
    expect(mensagem).toBe(
      'Olá, Família Souza! Ana e Bruno vão se casar em 22 de maio de 2027 e querem muito contar com vocês. Confirme a presença por este link até 12 de maio: https://app/rsvp/x',
    )
  })

  it('[UNITÁRIO] formata horário e dia do mês', () => {
    expect(formatarHorarioConvite('16:30')).toBe('16h30')
    expect(formatarHorarioConvite('09:00')).toBe('9h')
    expect(formatarHorarioConvite(null)).toBeNull()
    expect(formatarDiaMes('2027-05-12')).toBe('12 de maio')
  })

  it('[UNITÁRIO] calcula o prazo padrão de 10 dias antes', () => {
    expect(dataLimitePadrao('2027-05-22')).toBe('2027-05-12')
    expect(dataLimitePadrao('2027-03-05')).toBe('2027-02-23')
    expect(dataLimitePadrao('')).toBeNull()
  })

  it('[UNITÁRIO] escolha inicial ignora pendente', () => {
    expect(escolhaInicial({ resposta: 'Pendente' })).toBeNull()
    expect(escolhaInicial({ resposta: 'Recusado' })).toBe('Recusado')
  })

  it('[UNITÁRIO] valida data limite contra a data do casamento', () => {
    const regra = dataLimiteRsvp(() => '2027-05-22')
    expect(regra('')).toBeNull()
    expect(regra('2027-05-22')).toBeNull()
    expect(regra('2027-05-23')).toBe('A data limite precisa ser igual ou anterior à data do casamento.')
    expect(regra('1999-12-31')).not.toBeNull()
    expect(dataLimiteRsvp(() => '')('2030-01-01')).toBeNull()
  })
})
