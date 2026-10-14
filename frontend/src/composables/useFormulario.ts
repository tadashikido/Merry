import { computed, reactive, type UnwrapRef } from 'vue'

import type { RegraValidacao } from '@/utilitarios/validacao'

export type RegrasFormulario<T extends object> = Partial<Record<keyof T, RegraValidacao[]>>

export function useFormulario<T extends Record<string, unknown>>(valoresIniciais: T, regras: RegrasFormulario<T>) {
  const valores = reactive({ ...valoresIniciais })
  const erros = reactive<Partial<Record<keyof T, string>>>({})

  function validarCampo(campo: keyof T): boolean {
    const regrasCampo = regras[campo] ?? []
    const valor = (valores as Record<keyof T, unknown>)[campo]
    const mensagem = regrasCampo.map((regra) => regra(valor)).find((resultado) => resultado !== null) ?? null
    const errosMutaveis = erros as Partial<Record<keyof T, string>>
    if (mensagem) {
      errosMutaveis[campo] = mensagem
    } else {
      delete errosMutaveis[campo]
    }
    return mensagem === null
  }

  function validar(): boolean {
    const campos = Object.keys(regras) as (keyof T)[]
    return campos.map((campo) => validarCampo(campo)).every(Boolean)
  }

  function limparErro(campo: keyof T) {
    delete (erros as Partial<Record<keyof T, string>>)[campo]
  }

  function redefinir() {
    Object.assign(valores, valoresIniciais)
    for (const campo of Object.keys(erros)) {
      delete (erros as Record<string, string>)[campo]
    }
  }

  const primeiroCampoInvalido = computed(() => {
    const campos = Object.keys(regras) as (keyof T)[]
    return campos.find((campo) => (erros as Partial<Record<keyof T, string>>)[campo]) ?? null
  })

  return {
    valores: valores as UnwrapRef<T>,
    erros: erros as Partial<Record<keyof T, string>>,
    validar,
    validarCampo,
    limparErro,
    redefinir,
    primeiroCampoInvalido,
  }
}
