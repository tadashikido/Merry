import { afterEach, describe, expect, it, vi } from 'vitest'

import { CHAVE_DISPENSA_PROXIMOS_PASSOS, estaDispensado, registrarDispensa } from '@/utilitarios/dispensaProximosPassos'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('dispensaProximosPassos', () => {
  it('[UNITÁRIO] registra a dispensa por casamento sem afetar os outros', () => {
    registrarDispensa('a')

    expect(estaDispensado('a')).toBe(true)
    expect(estaDispensado('b')).toBe(false)
    expect(JSON.parse(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS)!)).toEqual(['a'])
  })

  it('[UNITÁRIO] não duplica o mesmo casamento', () => {
    registrarDispensa('a')
    registrarDispensa('b')
    registrarDispensa('a')

    expect(JSON.parse(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS)!)).toEqual(['b', 'a'])
  })

  it('[UNITÁRIO] guarda no máximo 200 casamentos, descartando os mais antigos', () => {
    for (let indice = 0; indice < 205; indice++) {
      registrarDispensa(`c${indice}`)
    }

    const salvos: string[] = JSON.parse(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS)!)
    expect(salvos).toHaveLength(200)
    expect(estaDispensado('c0')).toBe(false)
    expect(estaDispensado('c204')).toBe(true)
  })

  it.each([
    ['JSON inválido', '{nao-e-json'],
    ['objeto em vez de lista', '{"a":true}'],
    ['valores que não são texto', '[1, null, {"x":1}]'],
  ])('[SEGURANÇA] ignora conteúdo adulterado: %s', (_, bruto) => {
    window.localStorage.setItem(CHAVE_DISPENSA_PROXIMOS_PASSOS, bruto)

    expect(estaDispensado('1')).toBe(false)
    expect(() => registrarDispensa('x')).not.toThrow()
    expect(estaDispensado('x')).toBe(true)
  })

  it('[UNITÁRIO] armazenamento indisponível não lança erro', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError')
    })

    expect(estaDispensado('a')).toBe(false)
    expect(() => registrarDispensa('a')).not.toThrow()
  })
})
