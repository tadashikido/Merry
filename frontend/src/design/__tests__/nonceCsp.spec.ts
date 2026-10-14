import { afterEach, describe, expect, it } from 'vitest'

import { lerNonceCsp } from '@/design/nonceCsp'

function definirMeta(conteudo: string | null) {
  document.head.querySelectorAll('meta[name="csp-nonce"]').forEach((meta) => meta.remove())
  if (conteudo !== null) {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'csp-nonce')
    meta.setAttribute('content', conteudo)
    document.head.appendChild(meta)
  }
}

describe('lerNonceCsp', () => {
  afterEach(() => definirMeta(null))

  it('[SEGURANÇA] devolve o nonce gerado pelo nginx', () => {
    definirMeta('2b0b27f8f8d84fe0fb1b22cf7aa2ba76')
    expect(lerNonceCsp()).toBe('2b0b27f8f8d84fe0fb1b22cf7aa2ba76')
  })

  it('[SEGURANÇA] ignora o marcador não substituído do ambiente de desenvolvimento', () => {
    definirMeta('__CSP_NONCE__')
    expect(lerNonceCsp()).toBeUndefined()
  })

  it.each(['abc', '2b0b27f8f8d84fe0fb1b22cf7aa2ba76" onload="x', '2B0B27F8F8D84FE0FB1B22CF7AA2BA76', ''])(
    '[SEGURANÇA] rejeita valor fora do formato esperado: %s',
    (valor) => {
      definirMeta(valor)
      expect(lerNonceCsp()).toBeUndefined()
    },
  )

  it('[SEGURANÇA] devolve indefinido quando a meta não existe', () => {
    expect(lerNonceCsp()).toBeUndefined()
  })
})
