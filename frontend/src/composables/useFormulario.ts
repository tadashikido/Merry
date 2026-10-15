import { computed, reactive, ref, type UnwrapRef } from 'vue'

import { useRastreioAlteracoes } from '@/composables/useAlteracoesNaoSalvas'
import type { RegraValidacao } from '@/utilitarios/validacao'

export type RegrasFormulario<T extends object> = Partial<Record<keyof T, RegraValidacao[]>>

export interface OpcoesFormulario {
  estadoAdicional?: () => unknown
}

export function useFormulario<T extends Record<string, unknown>>(
  valoresIniciais: T,
  regras: RegrasFormulario<T>,
  opcoes: OpcoesFormulario = {},
) {
  const valores = reactive({ ...valoresIniciais })
  const erros = reactive<Partial<Record<keyof T, string>>>({})
  const tentouEnviar = ref(false)
  const { temAlteracoes, fixarEstadoInicial } = useRastreioAlteracoes(() => [valores, opcoes.estadoAdicional?.() ?? null])

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

  function validarAoSair(campo: keyof T): boolean {
    return tentouEnviar.value ? validarCampo(campo) : true
  }

  function revalidarAoDigitar(campo: keyof T): boolean {
    const temErro = Boolean((erros as Partial<Record<keyof T, string>>)[campo])
    return tentouEnviar.value && temErro ? validarCampo(campo) : true
  }

  function validar(): boolean {
    tentouEnviar.value = true
    const campos = Object.keys(regras) as (keyof T)[]
    return campos.map((campo) => validarCampo(campo)).every(Boolean)
  }

  function limparErro(campo: keyof T) {
    delete (erros as Partial<Record<keyof T, string>>)[campo]
  }

  function redefinir() {
    Object.assign(valores, valoresIniciais)
    tentouEnviar.value = false
    for (const campo of Object.keys(erros)) {
      delete (erros as Record<string, string>)[campo]
    }
    fixarEstadoInicial()
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
    validarAoSair,
    revalidarAoDigitar,
    tentouEnviar,
    limparErro,
    redefinir,
    primeiroCampoInvalido,
    temAlteracoes,
    fixarEstadoInicial,
  }
}
