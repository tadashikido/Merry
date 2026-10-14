import { MENSAGENS_VALIDACAO_CASAMENTO } from '@/textos/casamentos'
import { lerDataCalendario } from '@/utilitarios/dataCalendario'
import type { RegraValidacao } from '@/utilitarios/validacao'

export const LIMITES_CASAMENTO = {
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

export const nomeCasal: RegraValidacao = (valor) => {
  const texto = textoDe(valor).trim()
  if (texto === '') {
    return null
  }
  return texto.length < LIMITES_CASAMENTO.nomeMinimo || texto.length > LIMITES_CASAMENTO.nomeMaximo
    ? MENSAGENS_VALIDACAO_CASAMENTO.nomeTamanho
    : null
}

export const dataCasamento: RegraValidacao = (valor) => {
  const texto = textoDe(valor).trim()
  if (texto === '') {
    return null
  }
  if (!lerDataCalendario(texto)) {
    return MENSAGENS_VALIDACAO_CASAMENTO.dataInvalida
  }
  return texto < LIMITES_CASAMENTO.dataMinima || texto > LIMITES_CASAMENTO.dataMaxima
    ? MENSAGENS_VALIDACAO_CASAMENTO.dataFaixa
    : null
}

export const horarioCasamento: RegraValidacao = (valor) => {
  const texto = textoDe(valor).trim()
  return texto === '' || PADRAO_HORARIO.test(texto) ? null : MENSAGENS_VALIDACAO_CASAMENTO.horarioInvalido
}

export function dataLimiteRsvp(obterDataCasamento: () => string): RegraValidacao {
  return (valor) => {
    const texto = textoDe(valor).trim()
    if (texto === '') {
      return null
    }
    if (!lerDataCalendario(texto) || texto < LIMITES_CASAMENTO.dataMinima) {
      return MENSAGENS_VALIDACAO_CASAMENTO.dataLimiteRsvpInvalida
    }
    const dataCasamento = obterDataCasamento().trim()
    return lerDataCalendario(dataCasamento) && texto > dataCasamento ? MENSAGENS_VALIDACAO_CASAMENTO.dataLimiteRsvpInvalida : null
  }
}

export const convidadosEstimados: RegraValidacao = (valor) => {
  const texto = textoDe(valor).trim()
  if (texto === '') {
    return null
  }
  if (!PADRAO_INTEIRO.test(texto)) {
    return MENSAGENS_VALIDACAO_CASAMENTO.convidadosFaixa
  }
  const numero = Number(texto)
  return numero < LIMITES_CASAMENTO.convidadosMinimo || numero > LIMITES_CASAMENTO.convidadosMaximo
    ? MENSAGENS_VALIDACAO_CASAMENTO.convidadosFaixa
    : null
}

export function textoOpcional(limite: number): RegraValidacao {
  const mensagem =
    limite === LIMITES_CASAMENTO.observacoes ? MENSAGENS_VALIDACAO_CASAMENTO.observacoesTamanho : MENSAGENS_VALIDACAO_CASAMENTO.localTamanho
  return (valor) => (textoDe(valor).trim().length > limite ? mensagem : null)
}
