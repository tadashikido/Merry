import { describe, expect, it } from 'vitest'

import { MENSAGENS_VALIDACAO, avaliarRequisitosSenha, igualA, senhaForte } from '@/utilitarios/validacao'

describe('senhaForte', () => {
  it.each(['senhaForte1', 'çãoáéíóú12', '1234567890a'])('[UNITÁRIO] aceita "%s"', (senha) => {
    expect(senhaForte()(senha)).toBeNull()
  })

  it.each(['curta1', 'somenteletras', '1234567890'])('[UNITÁRIO] recusa "%s" com a mensagem da política', (senha) => {
    expect(senhaForte()(senha)).toBe(MENSAGENS_VALIDACAO.senhaFraca)
  })

  it('[UNITÁRIO] recusa senha acima de 128 caracteres', () => {
    expect(senhaForte()(`${'a'.repeat(128)}1`)).toBe(MENSAGENS_VALIDACAO.tamanhoMaximo(128))
  })

  it('[UNITÁRIO] recusa senha igual ao e-mail sem diferenciar caixa', () => {
    expect(senhaForte(() => 'Ana1@exemplo.com')('ana1@exemplo.com')).toBe(MENSAGENS_VALIDACAO.senhaIgualEmail)
  })

  it('[UNITÁRIO] deixa o campo vazio para a regra de obrigatório', () => {
    expect(senhaForte()('')).toBeNull()
  })
})

describe('avaliarRequisitosSenha', () => {
  it('[UNITÁRIO] informa cada requisito separadamente', () => {
    expect(avaliarRequisitosSenha('')).toEqual({ tamanho: false, letra: false, numero: false })
    expect(avaliarRequisitosSenha('abc1')).toEqual({ tamanho: false, letra: true, numero: true })
    expect(avaliarRequisitosSenha('abcdefghij')).toEqual({ tamanho: true, letra: true, numero: false })
  })
})

describe('igualA', () => {
  it('[UNITÁRIO] compara com o valor de referência atual', () => {
    let referencia = 'senhaForte1'
    const regra = igualA(() => referencia)

    expect(regra('senhaForte1')).toBeNull()
    expect(regra('outra')).toBe(MENSAGENS_VALIDACAO.senhasDiferentes)
    referencia = 'outra'
    expect(regra('outra')).toBeNull()
    expect(regra('')).toBeNull()
  })
})
