import { TEXTOS_ITEM_MODELO, TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import { MARCOS_CHECKLIST, type GrupoMarco, type MarcoChecklist, type SentidoPrazo } from '@/tipos/checklist'
import type { TarefaDto } from '@/tipos/tarefas'
import type { RegraValidacao } from '@/utilitarios/validacao'
import { tarefaAberta } from '@/utilitarios/tarefas'

export const LIMITES_CHECKLIST = {
  nomeMinimo: 2,
  nomeMaximo: 80,
  descricaoModeloMaximo: 500,
  diasAntesMaximo: 1095,
  diasDepoisMaximo: 365,
} as const

const MILISSEGUNDOS_DIA = 86_400_000

function diaAbsoluto(data: string): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data)
  if (!partes) {
    return null
  }
  return Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) / MILISSEGUNDOS_DIA
}

export function diasAntesDoEvento(dataEvento: string, prazo: string | null): number | null {
  if (!prazo) {
    return null
  }
  const evento = diaAbsoluto(dataEvento)
  const dia = diaAbsoluto(prazo)
  return evento === null || dia === null ? null : evento - dia
}

export function marcoPorDias(dias: number | null): MarcoChecklist {
  if (dias === null) {
    return 'semPrazo'
  }
  if (dias >= 365) {
    return 'dozeMeses'
  }
  if (dias >= 180) {
    return 'seisMeses'
  }
  if (dias >= 90) {
    return 'tresMeses'
  }
  if (dias >= 30) {
    return 'trintaDias'
  }
  if (dias >= 1) {
    return 'retaFinal'
  }
  return dias === 0 ? 'noDia' : 'depois'
}

export function agruparPorMarco<T>(itens: T[], diasDe: (item: T) => number | null): GrupoMarco<T>[] {
  const grupos = new Map<MarcoChecklist, T[]>()
  for (const item of itens) {
    const marco = marcoPorDias(diasDe(item))
    const lista = grupos.get(marco)
    if (lista) {
      lista.push(item)
    } else {
      grupos.set(marco, [item])
    }
  }
  return MARCOS_CHECKLIST.filter((marco) => grupos.has(marco)).map((marco) => ({ marco, itens: grupos.get(marco) ?? [] }))
}

export interface AlcancePrazos {
  primeiro: number
  ultimo: number
}

export function alcanceDosPrazos(dias: readonly number[]): AlcancePrazos | null {
  if (dias.length === 0) {
    return null
  }
  return { primeiro: Math.max(...dias), ultimo: Math.min(...dias) }
}

export function sentidoDosDias(dias: number): SentidoPrazo {
  return dias < 0 ? 'depois' : 'antes'
}

export function diasComSentido(dias: number, sentido: SentidoPrazo): number {
  return sentido === 'depois' ? -Math.abs(dias) : Math.abs(dias)
}

export function diasValidos(dias: number | null, sentido: SentidoPrazo): string | null {
  if (dias === null || Number.isNaN(dias)) {
    return TEXTOS_ITEM_MODELO.erroDiasObrigatorio
  }
  if (!Number.isInteger(dias) || dias < 0) {
    return TEXTOS_ITEM_MODELO.erroDias
  }
  if (sentido === 'depois') {
    return dias >= 1 && dias <= LIMITES_CHECKLIST.diasDepoisMaximo ? null : TEXTOS_ITEM_MODELO.erroDias
  }
  return dias <= LIMITES_CHECKLIST.diasAntesMaximo ? null : TEXTOS_ITEM_MODELO.erroDias
}

export const nomeModelo: RegraValidacao = (valor) => {
  const texto = String(valor ?? '').trim().replace(/\s+/g, ' ')
  if (texto === '') {
    return null
  }
  return texto.length < LIMITES_CHECKLIST.nomeMinimo || texto.length > LIMITES_CHECKLIST.nomeMaximo
    ? TEXTOS_MODELOS_CHECKLIST.erroNomeTamanho
    : null
}

export const descricaoModelo: RegraValidacao = (valor) =>
  String(valor ?? '').trim().length > LIMITES_CHECKLIST.descricaoModeloMaximo ? TEXTOS_MODELOS_CHECKLIST.erroDescricaoTamanho : null

export interface SituacaoMarco {
  total: number
  concluidas: number
  abertas: number
  atrasadas: number
}

export function situacaoDoMarco(tarefas: readonly Pick<TarefaDto, 'status' | 'atrasada'>[]): SituacaoMarco {
  let concluidas = 0
  let abertas = 0
  let atrasadas = 0
  for (const tarefa of tarefas) {
    if (tarefa.status === 'Concluida') {
      concluidas += 1
    } else if (tarefaAberta(tarefa.status)) {
      abertas += 1
      if (tarefa.atrasada) {
        atrasadas += 1
      }
    }
  }
  return { total: tarefas.length, concluidas, abertas, atrasadas }
}
