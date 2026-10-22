import { afterEach, describe, expect, it, vi } from 'vitest'

import { CHAVE_DISPENSA_PROXIMOS_PASSOS, CHAVE_DISPENSA_PROXIMOS_PASSOS_LEGADA, estaDispensado, registrarDispensa } from '@/utilitarios/dispensaProximosPassos'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('dispensaProximosPassos', () => {
  it('[UNITÁRIO] registra a dispensa por evento sem afetar os outros', () => {
    registrarDispensa('a')

    expect(estaDispensado('a')).toBe(true)
    expect(estaDispensado('b')).toBe(false)
    expect(JSON.parse(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS)!)).toEqual(['a'])
  })

  it('[UNITÁRIO] não duplica o mesmo evento', () => {
    registrarDispensa('a')
    registrarDispensa('b')
    registrarDispensa('a')

    expect(JSON.parse(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS)!)).toEqual(['b', 'a'])
  })

  it('[UNITÁRIO] guarda no máximo 200 eventos, descartando os mais antigos', () => {
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

  it('[UNITÁRIO] usa a chave do Celebri e reconhece a chave legada', () => {
    expect(CHAVE_DISPENSA_PROXIMOS_PASSOS).toBe('celebri:proximos-passos-dispensados')
    expect(CHAVE_DISPENSA_PROXIMOS_PASSOS_LEGADA).toBe('nossia:proximos-passos-dispensados')
  })

  it('[UNITÁRIO] migra as dispensas da chave legada sem perder nenhuma e remove a chave antiga', () => {
    window.localStorage.setItem(CHAVE_DISPENSA_PROXIMOS_PASSOS_LEGADA, JSON.stringify(['a', 'b']))

    expect(estaDispensado('a')).toBe(true)
    expect(estaDispensado('b')).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS)!)).toEqual(['a', 'b'])
    expect(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS_LEGADA)).toBeNull()
  })

  it('[UNITÁRIO] une a chave legada com a nova sem duplicar e mantém as novas por último', () => {
    window.localStorage.setItem(CHAVE_DISPENSA_PROXIMOS_PASSOS_LEGADA, JSON.stringify(['a', 'b']))
    window.localStorage.setItem(CHAVE_DISPENSA_PROXIMOS_PASSOS, JSON.stringify(['b', 'c']))

    registrarDispensa('d')

    expect(JSON.parse(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS)!)).toEqual(['a', 'b', 'c', 'd'])
    expect(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS_LEGADA)).toBeNull()
  })

  it('[UNITÁRIO] a migração respeita o limite de 200 dispensas', () => {
    const legados = Array.from({ length: 210 }, (_, indice) => `l${indice}`)
    window.localStorage.setItem(CHAVE_DISPENSA_PROXIMOS_PASSOS_LEGADA, JSON.stringify(legados))

    expect(estaDispensado('l209')).toBe(true)
    expect(estaDispensado('l0')).toBe(false)
    expect(JSON.parse(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS)!)).toHaveLength(200)
  })

  it.each([
    ['JSON inválido', '{nao-e-json'],
    ['objeto em vez de lista', '{"a":true}'],
    ['valores que não são texto', '[1, null, {"x":1}]'],
  ])('[SEGURANÇA] descarta a chave legada adulterada sem lançar erro: %s', (_, bruto) => {
    window.localStorage.setItem(CHAVE_DISPENSA_PROXIMOS_PASSOS_LEGADA, bruto)

    expect(() => estaDispensado('1')).not.toThrow()
    expect(estaDispensado('1')).toBe(false)
    expect(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS_LEGADA)).toBeNull()
    expect(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS)).toBeNull()
  })
})
