import { afterEach, describe, expect, it } from 'vitest'

import { lerEstadoAnterior, origemInterna, type RotaResolvida } from '@/utilitarios/navegacao'

const ID = '11111111-1111-4111-8111-111111111111'
const PERMITIDAS = ['evento-mesas', 'painel-confirmacoes'] as const

function resolver(nome: string, id: string) {
  return (): RotaResolvida => ({ name: nome, params: { id } })
}

describe('origemInterna', () => {
  it('[UNITÁRIO] devolve a rota permitida quando a página anterior é do mesmo evento', () => {
    expect(origemInterna(`/eventos/${ID}/confirmacoes`, ID, resolver('painel-confirmacoes', ID), PERMITIDAS, 'evento-mesas')).toBe('painel-confirmacoes')
    expect(origemInterna(`/eventos/${ID}/mesas`, ID, resolver('evento-mesas', ID), PERMITIDAS, 'evento-mesas')).toBe('evento-mesas')
  })

  it('[SEGURANÇA] cai no padrão para rota fora da lista, outro evento, endereço externo ou erro', () => {
    expect(origemInterna(`/eventos/${ID}/restricoes-alimentares`, ID, resolver('restricoes-alimentares', ID), PERMITIDAS, 'evento-mesas')).toBe('evento-mesas')
    expect(origemInterna('/eventos/x/confirmacoes', ID, resolver('painel-confirmacoes', 'outro'), PERMITIDAS, 'evento-mesas')).toBe('evento-mesas')
    expect(origemInterna('//malicioso.example/confirmacoes', ID, resolver('painel-confirmacoes', ID), PERMITIDAS, 'evento-mesas')).toBe('evento-mesas')
    expect(origemInterna('https://malicioso.example', ID, resolver('painel-confirmacoes', ID), PERMITIDAS, 'evento-mesas')).toBe('evento-mesas')
    expect(origemInterna(undefined, ID, resolver('painel-confirmacoes', ID), PERMITIDAS, 'evento-mesas')).toBe('evento-mesas')
    expect(
      origemInterna('/qualquer', ID, () => {
        throw new Error('rota inválida')
      }, PERMITIDAS, 'evento-mesas'),
    ).toBe('evento-mesas')
  })
})

describe('lerEstadoAnterior', () => {
  afterEach(() => {
    window.history.replaceState(null, '')
  })

  it('[UNITÁRIO] lê o campo back do estado informado', () => {
    expect(lerEstadoAnterior({ back: `/eventos/${ID}/mesas` })).toBe(`/eventos/${ID}/mesas`)
  })

  it('[UNITÁRIO] usa o estado do histórico do navegador por padrão', () => {
    window.history.replaceState({ back: `/eventos/${ID}/confirmacoes` }, '')

    expect(lerEstadoAnterior()).toBe(`/eventos/${ID}/confirmacoes`)
  })

  it('[SEGURANÇA] estado ausente ou malformado não produz origem', () => {
    expect(lerEstadoAnterior(null)).toBeNull()
    expect(lerEstadoAnterior('texto')).toBeNull()
    expect(lerEstadoAnterior({ outro: 1 })).toBeNull()
  })
})
