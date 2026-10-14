import type { RegraValidacao } from '@/utilitarios/validacao'
import { email } from '@/utilitarios/validacao'
import { telefoneValido } from '@/utilitarios/telefone'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'

export const LIMITES_CONVIDADOS = {
  nomeMinimo: 2,
  nomeMaximo: 120,
  grupoMaximo: 60,
  emailMaximo: 254,
  telefoneMaximo: 30,
  acompanhantesMaximo: 10,
  pessoasMinimo: 1,
  pessoasMaximo: 30,
} as const

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim() : ''
}

export const nomePessoa: RegraValidacao = (valor) => {
  const nome = texto(valor)
  if (nome === '') {
    return null
  }
  return nome.length < LIMITES_CONVIDADOS.nomeMinimo || nome.length > LIMITES_CONVIDADOS.nomeMaximo
    ? TEXTOS_CONVIDADOS.erroNome
    : null
}

export const grupoConvite: RegraValidacao = (valor) =>
  texto(valor).length > LIMITES_CONVIDADOS.grupoMaximo ? TEXTOS_CONVIDADOS.erroGrupo : null

export const telefone: RegraValidacao = (valor) =>
  telefoneValido(typeof valor === 'string' ? valor : '') ? null : TEXTOS_CONVIDADOS.erroTelefone

export const emailConvidado: RegraValidacao = (valor) => {
  if (texto(valor).length > LIMITES_CONVIDADOS.emailMaximo) {
    return email('invalido')
  }
  return email(valor)
}

export function textoOuNulo(valor: string): string | null {
  const normalizado = valor.replace(/\s+/g, ' ').trim()
  return normalizado === '' ? null : normalizado
}
