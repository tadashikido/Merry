import { describe, expect, it } from 'vitest'

import { destinoSeguro, identificadorSeguro } from '@/utilitarios/rotaSegura'
import { primeiroNome } from '@/utilitarios/formatacao'

describe('destinoSeguro', () => {
  it.each(['/', '/convidados', '/eventos/1?aba=rsvp'])('[SEGURANÇA] aceita caminho interno %s', (caminho) => {
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

describe('identificadorSeguro', () => {
  it('[SEGURANÇA] aceita UUID e usa o primeiro valor de query repetida', () => {
    expect(identificadorSeguro('11111111-2222-3333-4444-55555555aaaa')).toBe('11111111-2222-3333-4444-55555555aaaa')
    expect(identificadorSeguro(['11111111-2222-3333-4444-555555555555', 'x'])).toBe('11111111-2222-3333-4444-555555555555')
  })

  it.each(['"]<img src=x>', '"] *, [x="', 'novo', '11111111-2222-3333-4444-55555555555', '', undefined, null, 42])(
    '[SEGURANÇA] recusa identificador fora do formato %s',
    (valor) => {
      expect(identificadorSeguro(valor)).toBeNull()
    },
  )
})
