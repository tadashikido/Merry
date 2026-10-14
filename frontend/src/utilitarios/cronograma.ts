import { TEXTOS_CRONOGRAMA } from '@/textos/cronograma'
import { DIAS_CRONOGRAMA, type DiaCronograma, type ItemCronogramaDto } from '@/tipos/cronograma'
import type { RegraValidacao } from '@/utilitarios/validacao'

export const MINUTOS_POR_DIA = 1440

export const LIMITES_CRONOGRAMA = {
  atividadeMinimo: 2,
  atividadeMaximo: 160,
  local: 200,
  responsavel: 120,
  texto: 2000,
  duracaoMinima: 5,
  duracaoMaxima: 1440,
} as const

const PADRAO_HORARIO = /^([01]\d|2[0-3]):([0-5]\d)$/

export interface GrupoCronograma {
  dia: DiaCronograma
  data: string
  itens: ItemCronogramaDto[]
}

export function horarioValido(valor: string): boolean {
  return PADRAO_HORARIO.test(valor)
}

export function horarioParaMinutos(valor: string): number | null {
  const correspondencia = PADRAO_HORARIO.exec(valor)
  if (!correspondencia) {
    return null
  }
  return Number(correspondencia[1]) * 60 + Number(correspondencia[2])
}

export function minutosParaHorario(minutos: number): string {
  const normalizado = ((minutos % MINUTOS_POR_DIA) + MINUTOS_POR_DIA) % MINUTOS_POR_DIA
  const horas = Math.floor(normalizado / 60)
  return `${String(horas).padStart(2, '0')}:${String(normalizado % 60).padStart(2, '0')}`
}

export function duracaoEntre(inicio: string, termino: string): number | null {
  const minutoInicio = horarioParaMinutos(inicio)
  const minutoTermino = horarioParaMinutos(termino)
  if (minutoInicio === null || minutoTermino === null || minutoInicio === minutoTermino) {
    return null
  }
  return minutoTermino > minutoInicio ? minutoTermino - minutoInicio : minutoTermino + MINUTOS_POR_DIA - minutoInicio
}

export function terminoDe(inicio: string, duracaoMinutos: number | null): string {
  const minutoInicio = horarioParaMinutos(inicio)
  if (minutoInicio === null || duracaoMinutos === null) {
    return ''
  }
  return minutosParaHorario(minutoInicio + duracaoMinutos)
}

export function terminaNoDiaSeguinte(inicio: string, termino: string): boolean {
  const minutoInicio = horarioParaMinutos(inicio)
  const minutoTermino = horarioParaMinutos(termino)
  return minutoInicio !== null && minutoTermino !== null && minutoTermino < minutoInicio
}

export function formatarDuracao(minutos: number): string {
  const absoluto = Math.abs(minutos)
  const horas = Math.floor(absoluto / 60)
  const resto = absoluto % 60
  if (horas === 0) {
    return `${resto} min`
  }
  return resto === 0 ? `${horas} h` : `${horas} h ${String(resto).padStart(2, '0')}`
}

export function descreverRelativoCerimonia(minutos: number | null): string | null {
  if (minutos === null) {
    return null
  }
  if (minutos === 0) {
    return TEXTOS_CRONOGRAMA.relativoCerimonia
  }
  return minutos < 0
    ? TEXTOS_CRONOGRAMA.relativoAntes(formatarDuracao(minutos))
    : TEXTOS_CRONOGRAMA.relativoDepois(formatarDuracao(minutos))
}

export function agruparPorDia(itens: ItemCronogramaDto[]): GrupoCronograma[] {
  return DIAS_CRONOGRAMA.map((dia) => {
    const doDia = itens.filter((item) => item.dia === dia)
    return { dia, data: doDia[0]?.data ?? '', itens: doDia }
  }).filter((grupo) => grupo.itens.length > 0)
}

export function textosConflitos(item: ItemCronogramaDto): string[] {
  const vistos = new Set<string>()
  return item.conflitos
    .filter((conflito) => {
      if (vistos.has(conflito.itemId)) {
        return false
      }
      vistos.add(conflito.itemId)
      return true
    })
    .map((conflito) => TEXTOS_CRONOGRAMA.conflitoSelo(conflito.atividade, conflito.inicio))
}

export function rotuloLinha(item: ItemCronogramaDto): string {
  return item.termino
    ? TEXTOS_CRONOGRAMA.rotuloLinhaIntervalo(item.atividade, item.inicio, item.termino)
    : TEXTOS_CRONOGRAMA.rotuloLinhaInstante(item.atividade, item.inicio)
}

export function responsaveisUsados(itens: ItemCronogramaDto[]): string[] {
  const porChave = new Map<string, string>()
  for (const item of itens) {
    const responsavel = item.responsavel?.trim()
    if (responsavel) {
      const chave = responsavel.toLocaleLowerCase('pt-BR')
      if (!porChave.has(chave)) {
        porChave.set(chave, responsavel)
      }
    }
  }
  return [...porChave.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function proximoInicioSugerido(inicio: string, termino: string): string {
  return horarioValido(termino) ? termino : inicio
}

export const regraInicio: RegraValidacao = (valor) => {
  const texto = typeof valor === 'string' ? valor.trim() : ''
  if (texto === '') {
    return TEXTOS_CRONOGRAMA.erroInicio
  }
  return horarioValido(texto) ? null : TEXTOS_CRONOGRAMA.erroHorario
}

export function regraTermino(obterInicio: () => string): RegraValidacao {
  return (valor) => {
    const texto = typeof valor === 'string' ? valor.trim() : ''
    if (texto === '') {
      return null
    }
    if (!horarioValido(texto)) {
      return TEXTOS_CRONOGRAMA.erroHorario
    }
    return texto === obterInicio().trim() ? TEXTOS_CRONOGRAMA.erroTermino : null
  }
}

export const regraAtividade: RegraValidacao = (valor) => {
  const texto = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : ''
  if (texto === '') {
    return TEXTOS_CRONOGRAMA.erroAtividade
  }
  return texto.length < LIMITES_CRONOGRAMA.atividadeMinimo || texto.length > LIMITES_CRONOGRAMA.atividadeMaximo
    ? TEXTOS_CRONOGRAMA.erroTamanhoAtividade
    : null
}
