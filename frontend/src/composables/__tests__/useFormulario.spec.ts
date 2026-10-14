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

  it('[UNITÁRIO] não valida ao sair do campo antes da primeira tentativa de envio', () => {
    const formulario = criarFormulario()

    expect(formulario.tentouEnviar.value).toBe(false)
    expect(formulario.validarAoSair('nome')).toBe(true)
    expect(formulario.erros).toEqual({})
  })

  it('[UNITÁRIO] depois da primeira tentativa revalida ao sair e remove o erro corrigido', () => {
    const formulario = criarFormulario()

    expect(formulario.validar()).toBe(false)
    expect(formulario.tentouEnviar.value).toBe(true)
    expect(formulario.erros.nome).toBe(MENSAGENS_VALIDACAO.obrigatorio)

    formulario.valores.nome = 'Ana'
    expect(formulario.validarAoSair('nome')).toBe(true)
    expect(formulario.erros.nome).toBeUndefined()

    formulario.valores.email = 'invalido'
    expect(formulario.validarAoSair('email')).toBe(false)
    expect(formulario.erros.email).toBeDefined()
  })

  it('[UNITÁRIO] redefinir volta ao estado de antes da primeira tentativa', () => {
    const formulario = criarFormulario()
    formulario.validar()

    formulario.redefinir()

    expect(formulario.tentouEnviar.value).toBe(false)
    expect(formulario.validarAoSair('nome')).toBe(true)
    expect(formulario.erros).toEqual({})
  })

  it('[UNITÁRIO] não revalida ao digitar antes da primeira tentativa de envio', () => {
    const formulario = criarFormulario()

    formulario.valores.email = 'invalido'

    expect(formulario.revalidarAoDigitar('email')).toBe(true)
    expect(formulario.erros).toEqual({})
  })

  it('[UNITÁRIO] depois da tentativa, revalida ao digitar só o campo que já tem erro', () => {
    const formulario = criarFormulario()
    formulario.valores.nome = 'Ana'
    formulario.validar()
    expect(formulario.erros.email).toBe(MENSAGENS_VALIDACAO.obrigatorio)

    formulario.valores.email = 'invalido'
    expect(formulario.revalidarAoDigitar('email')).toBe(false)
    expect(formulario.erros.email).toBe(MENSAGENS_VALIDACAO.email)

    formulario.valores.email = 'ana@exemplo.com'
    expect(formulario.revalidarAoDigitar('email')).toBe(true)
    expect(formulario.erros.email).toBeUndefined()

    formulario.valores.nome = ''
    expect(formulario.revalidarAoDigitar('nome')).toBe(true)
    expect(formulario.erros.nome).toBeUndefined()
  })
})
