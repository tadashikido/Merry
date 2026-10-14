import { TEXTOS_MESAS } from '@/textos/mesas'
import type { RegraValidacao } from '@/utilitarios/validacao'

export const LIMITES_MESA = {
  numeroMinimo: 1,
  numeroMaximo: 999,
  capacidadeMinima: 1,
  capacidadeMaxima: 30,
  nomeMaximo: 60,
} as const

function inteiroEntre(valor: unknown, minimo: number, maximo: number): boolean {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= minimo && valor <= maximo
}

export const regraNumeroMesa: RegraValidacao = (valor) => {
  if (valor === null || valor === undefined || valor === '') {
    return TEXTOS_MESAS.erroObrigatorio
  }
  return inteiroEntre(valor, LIMITES_MESA.numeroMinimo, LIMITES_MESA.numeroMaximo) ? null : TEXTOS_MESAS.erroNumeroFaixa
}

export const regraCapacidadeMesa: RegraValidacao = (valor) => {
  if (valor === null || valor === undefined || valor === '') {
    return TEXTOS_MESAS.erroObrigatorio
  }
  return inteiroEntre(valor, LIMITES_MESA.capacidadeMinima, LIMITES_MESA.capacidadeMaxima) ? null : TEXTOS_MESAS.erroLugaresFaixa
}

export const regraNomeMesa: RegraValidacao = (valor) =>
  typeof valor === 'string' && valor.trim().length > LIMITES_MESA.nomeMaximo ? TEXTOS_MESAS.erroNomeTamanho : null
