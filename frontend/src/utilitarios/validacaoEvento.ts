import { MENSAGENS_VALIDACAO_EVENTO } from '@/textos/eventos'
import { lerDataCalendario } from '@/utilitarios/dataCalendario'
import type { RegraValidacao } from '@/utilitarios/validacao'

export const LIMITES_EVENTO = {
  nomeMinimo: 2,
  nomeMaximo: 80,
  local: 200,
  observacoes: 2000,
  convidadosMinimo: 1,
  convidadosMaximo: 5000,
  dataMinima: '2000-01-01',
  dataMaxima: '2100-12-31',
} as const

const PADRAO_HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/
const PADRAO_INTEIRO = /^\d+$/

function textoDe(valor: unknown): string {
  return typeof valor === 'string' ? valor : valor === null || valor === undefined ? '' : String(valor)
}

export const nomeAnfitrioes: RegraValidacao = (valor) => {
  const texto = textoDe(valor).trim()
  if (texto === '') {
    return null
  }
  return texto.length < LIMITES_EVENTO.nomeMinimo || texto.length > LIMITES_EVENTO.nomeMaximo
    ? MENSAGENS_VALIDACAO_EVENTO.nomeTamanho
    : null
}

export const dataEvento: RegraValidacao = (valor) => {
  const texto = textoDe(valor).trim()
  if (texto === '') {
    return null
  }
  if (!lerDataCalendario(texto)) {
    return MENSAGENS_VALIDACAO_EVENTO.dataInvalida
  }
  return texto < LIMITES_EVENTO.dataMinima || texto > LIMITES_EVENTO.dataMaxima
    ? MENSAGENS_VALIDACAO_EVENTO.dataFaixa
    : null
}

export const horarioEvento: RegraValidacao = (valor) => {
  const texto = textoDe(valor).trim()
  return texto === '' || PADRAO_HORARIO.test(texto) ? null : MENSAGENS_VALIDACAO_EVENTO.horarioInvalido
}

export function dataLimiteRsvp(obterDataEvento: () => string): RegraValidacao {
  return (valor) => {
    const texto = textoDe(valor).trim()
    if (texto === '') {
      return null
    }
    if (!lerDataCalendario(texto) || texto < LIMITES_EVENTO.dataMinima) {
      return MENSAGENS_VALIDACAO_EVENTO.dataLimiteRsvpInvalida
    }
    const dataEvento = obterDataEvento().trim()
    return lerDataCalendario(dataEvento) && texto > dataEvento ? MENSAGENS_VALIDACAO_EVENTO.dataLimiteRsvpInvalida : null
  }
}

export const convidadosEstimados: RegraValidacao = (valor) => {
  const texto = textoDe(valor).trim()
  if (texto === '') {
    return null
  }
  if (!PADRAO_INTEIRO.test(texto)) {
    return MENSAGENS_VALIDACAO_EVENTO.convidadosFaixa
  }
  const numero = Number(texto)
  return numero < LIMITES_EVENTO.convidadosMinimo || numero > LIMITES_EVENTO.convidadosMaximo
    ? MENSAGENS_VALIDACAO_EVENTO.convidadosFaixa
    : null
}

export function textoOpcional(limite: number): RegraValidacao {
  const mensagem =
    limite === LIMITES_EVENTO.observacoes ? MENSAGENS_VALIDACAO_EVENTO.observacoesTamanho : MENSAGENS_VALIDACAO_EVENTO.localTamanho
  return (valor) => (textoDe(valor).trim().length > limite ? mensagem : null)
}
