import { describe, expect, it } from 'vitest'

import { useFormulario } from '@/composables/useFormulario'
import { MENSAGENS_VALIDACAO, email, obrigatorio } from '@/utilitarios/validacao'

function criarFormulario() {
  return useFormulario({ nome: '', email: '', observacao: '' }, { nome: [obrigatorio], email: [obrigatorio, email] })
}

describe('useFormulario', () => {
  it('[UNITÁRIO] reprova formulário vazio e registra erro por campo', () => {
    const formulario = criarFormulario()

    expect(formulario.validar()).toBe(false)
    expect(formulario.erros.nome).toBe(MENSAGENS_VALIDACAO.obrigatorio)
    expect(formulario.erros.email).toBe(MENSAGENS_VALIDACAO.obrigatorio)
    expect(formulario.erros.observacao).toBeUndefined()
    expect(formulario.primeiroCampoInvalido.value).toBe('nome')
  })

  it('[UNITÁRIO] usa a primeira regra que falhar', () => {
    const formulario = criarFormulario()
    formulario.valores.nome = 'Ana'
    formulario.valores.email = 'ana@'

    expect(formulario.validar()).toBe(false)
    expect(formulario.erros.email).toBe(MENSAGENS_VALIDACAO.email)
    expect(formulario.primeiroCampoInvalido.value).toBe('email')
  })

  it('[UNITÁRIO] aprova formulário válido e limpa erros anteriores', () => {
    const formulario = criarFormulario()
    formulario.validar()
    formulario.valores.nome = 'Ana'
    formulario.valores.email = 'ana@exemplo.com'

    expect(formulario.validar()).toBe(true)
    expect(formulario.erros).toEqual({})
    expect(formulario.primeiroCampoInvalido.value).toBeNull()
  })

  it('[UNITÁRIO] valida um campo isolado sem afetar os demais', () => {
    const formulario = criarFormulario()

    expect(formulario.validarCampo('email')).toBe(false)
    expect(formulario.erros.email).toBeDefined()
    expect(formulario.erros.nome).toBeUndefined()
  })

  it('[UNITÁRIO] limpa erro de um campo e redefine valores e erros', () => {
    const formulario = criarFormulario()
    formulario.valores.nome = 'Ana'
    formulario.validar()
    formulario.limparErro('email')
    expect(formulario.erros.email).toBeUndefined()

    formulario.validar()
    formulario.redefinir()
    expect(formulario.valores.nome).toBe('')
    expect(formulario.erros).toEqual({})
  })
})
