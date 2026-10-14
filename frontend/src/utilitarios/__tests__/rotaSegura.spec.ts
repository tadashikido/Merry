import { describe, expect, it } from 'vitest'

import { destinoSeguro } from '@/utilitarios/rotaSegura'
import { primeiroNome } from '@/utilitarios/formatacao'

describe('destinoSeguro', () => {
  it.each(['/', '/convidados', '/casamentos/1?aba=rsvp'])('[SEGURANÇA] aceita caminho interno %s', (caminho) => {
    expect(destinoSeguro(caminho)).toBe(caminho)
  })

  it.each(['//malicioso.com', 'https://malicioso.com', '/\\malicioso.com', 'javascript:alert(1)', '', undefined, null, 42])(
    '[SEGURANÇA] recusa destino externo ou inválido %s',
    (valor) => {
      expect(destinoSeguro(valor)).toBeNull()
    },
  )

  it('[SEGURANÇA] usa só o primeiro valor quando a query vem repetida', () => {
    expect(destinoSeguro(['/painel', '//malicioso.com'])).toBe('/painel')
  })
})

describe('primeiroNome', () => {
  it('[UNITÁRIO] devolve o primeiro nome sem espaços', () => {
    expect(primeiroNome('  Renata   Albuquerque ')).toBe('Renata')
    expect(primeiroNome(null)).toBe('')
  })
})
