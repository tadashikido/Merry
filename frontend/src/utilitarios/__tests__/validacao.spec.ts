import { describe, expect, it } from 'vitest'

import { MENSAGENS_VALIDACAO, email, obrigatorio, tamanhoMaximo, tamanhoMinimo } from '@/utilitarios/validacao'

describe('regras de validação', () => {
  it.each(['', '   ', null, undefined])('[UNITÁRIO] obrigatorio reprova valor vazio: %s', (valor) => {
    expect(obrigatorio(valor)).toBe(MENSAGENS_VALIDACAO.obrigatorio)
  })

  it.each(['Ana', 0, 'a'])('[UNITÁRIO] obrigatorio aceita valor preenchido: %s', (valor) => {
    expect(obrigatorio(valor)).toBeNull()
  })

  it.each(['nome@exemplo.com', 'a.b+c@dominio.com.br', ''])('[UNITÁRIO] email aceita %s', (valor) => {
    expect(email(valor)).toBeNull()
  })

  it.each(['nome', 'nome@', '@exemplo.com', 'nome @exemplo.com', 'nome@exemplo'])('[UNITÁRIO] email reprova %s', (valor) => {
    expect(email(valor)).toBe(MENSAGENS_VALIDACAO.email)
  })

  it('[UNITÁRIO] tamanhoMaximo respeita o limite exato', () => {
    const regra = tamanhoMaximo(5)
    expect(regra('12345')).toBeNull()
    expect(regra('123456')).toBe('Use no máximo 5 caracteres.')
  })

  it('[UNITÁRIO] tamanhoMinimo ignora vazio e reprova texto curto', () => {
    const regra = tamanhoMinimo(3)
    expect(regra('')).toBeNull()
    expect(regra('ab')).toBe('Use pelo menos 3 caracteres.')
    expect(regra('abc')).toBeNull()
  })
})
