import { FUSO_HORARIO } from './formatacao'
import type { DataCalendario } from '@/tipos/eventos'

const PADRAO_DATA_CALENDARIO = /^(\d{4})-(\d{2})-(\d{2})$/
const MILISSEGUNDOS_DIA = 86_400_000

const formatoIsoSaoPaulo = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: FUSO_HORARIO,
})

export interface PartesData {
  ano: number
  mes: number
  dia: number
}

export function lerDataCalendario(valor: string | null | undefined): PartesData | null {
  const correspondencia = PADRAO_DATA_CALENDARIO.exec(valor ?? '')
  if (!correspondencia) {
    return null
  }
  const ano = Number(correspondencia[1])
  const mes = Number(correspondencia[2])
  const dia = Number(correspondencia[3])
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    return null
  }
  return { ano, mes, dia }
}

export function ehDataCalendario(valor: string | null | undefined): valor is DataCalendario {
  return lerDataCalendario(valor) !== null
}

export function paraInstanteUtc(valor: DataCalendario): Date | null {
  const partes = lerDataCalendario(valor)
  return partes ? new Date(Date.UTC(partes.ano, partes.mes - 1, partes.dia)) : null
}

export function hojeEmSaoPaulo(agora: Date = new Date()): DataCalendario {
  return formatoIsoSaoPaulo.format(agora)
}

export function diferencaEmDias(inicio: DataCalendario, fim: DataCalendario): number | null {
  const instanteInicio = paraInstanteUtc(inicio)
  const instanteFim = paraInstanteUtc(fim)
  if (!instanteInicio || !instanteFim) {
    return null
  }
  return Math.round((instanteFim.getTime() - instanteInicio.getTime()) / MILISSEGUNDOS_DIA)
}

export function somarDias(data: DataCalendario, dias: number): DataCalendario | null {
  const instante = paraInstanteUtc(data)
  if (!instante) {
    return null
  }
  return new Date(instante.getTime() + dias * MILISSEGUNDOS_DIA).toISOString().slice(0, 10)
}
