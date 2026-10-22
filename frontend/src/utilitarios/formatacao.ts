import { VALOR_AUSENTE } from '@/textos/rotulos'

export const LOCALIDADE = 'pt-BR'
export const FUSO_HORARIO = 'America/Sao_Paulo'

type EntradaData = Date | string | number | null | undefined

const formatoData = new Intl.DateTimeFormat(LOCALIDADE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: FUSO_HORARIO,
})

const formatoDataExtenso = new Intl.DateTimeFormat(LOCALIDADE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: FUSO_HORARIO,
})

const formatoHora = new Intl.DateTimeFormat(LOCALIDADE, {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: FUSO_HORARIO,
})

const formatoMoeda = new Intl.NumberFormat(LOCALIDADE, {
  style: 'currency',
  currency: 'BRL',
})

function paraData(valor: EntradaData): Date | null {
  if (valor === null || valor === undefined || valor === '') {
    return null
  }
  const data = valor instanceof Date ? valor : new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

export function formatarData(valor: EntradaData): string {
  const data = paraData(valor)
  return data ? formatoData.format(data) : VALOR_AUSENTE
}

export function formatarDataExtenso(valor: EntradaData): string {
  const data = paraData(valor)
  return data ? formatoDataExtenso.format(data) : VALOR_AUSENTE
}

export function formatarHora(valor: EntradaData): string {
  const data = paraData(valor)
  return data ? formatoHora.format(data) : VALOR_AUSENTE
}

export function formatarDataHora(valor: EntradaData): string {
  const data = paraData(valor)
  return data ? `${formatoData.format(data)} às ${formatoHora.format(data)}` : VALOR_AUSENTE
}

export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return VALOR_AUSENTE
  }
  return formatoMoeda.format(valor).replace(/ /g, ' ')
}

export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().split(/\s+/)[0] ?? ''
}

const PADRAO_DATA_CALENDARIO = /^(\d{4})-(\d{2})-(\d{2})$/

const formatoDataCalendario = new Intl.DateTimeFormat(LOCALIDADE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const formatoDataCalendarioExtenso = new Intl.DateTimeFormat(LOCALIDADE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const formatoDataCalendarioComDiaSemana = new Intl.DateTimeFormat(LOCALIDADE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const formatoNumero = new Intl.NumberFormat(LOCALIDADE, { maximumFractionDigits: 0 })

function dataCalendarioParaUtc(valor: string | null | undefined): Date | null {
  const correspondencia = PADRAO_DATA_CALENDARIO.exec(valor ?? '')
  if (!correspondencia) {
    return null
  }
  const ano = Number(correspondencia[1])
  const mes = Number(correspondencia[2]) - 1
  const dia = Number(correspondencia[3])
  const data = new Date(Date.UTC(ano, mes, dia))
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes && data.getUTCDate() === dia ? data : null
}

export function formatarDataCalendario(valor: string | null | undefined): string {
  const data = dataCalendarioParaUtc(valor)
  return data ? formatoDataCalendario.format(data) : VALOR_AUSENTE
}

export function formatarDataCalendarioExtenso(valor: string | null | undefined): string {
  const data = dataCalendarioParaUtc(valor)
  return data ? formatoDataCalendarioExtenso.format(data) : VALOR_AUSENTE
}

export function formatarDataCalendarioComDiaSemana(valor: string | null | undefined): string {
  const data = dataCalendarioParaUtc(valor)
  return data ? formatoDataCalendarioComDiaSemana.format(data) : VALOR_AUSENTE
}

const formatoMesCurto = new Intl.DateTimeFormat(LOCALIDADE, { month: 'short', timeZone: 'UTC' })

export function formatarDataCalendarioCurta(valor: string | null | undefined): string {
  const data = dataCalendarioParaUtc(valor)
  if (!data) {
    return VALOR_AUSENTE
  }
  const mes = formatoMesCurto.format(data).replace('.', '')
  return `${String(data.getUTCDate()).padStart(2, '0')} ${mes} ${data.getUTCFullYear()}`
}

export function formatarNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return VALOR_AUSENTE
  }
  return formatoNumero.format(valor)
}

export function formatarNomesAnfitrioes(primeiro: string, segundo: string): string {
  return `${primeiro.trim()} & ${segundo.trim()}`
}
