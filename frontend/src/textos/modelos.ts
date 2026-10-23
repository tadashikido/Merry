import type { TipoEvento } from '@/tipos/eventos'
import { VOCABULARIO_TIPO_EVENTO, ehTipoEvento, vocabularioOuNeutro, type VocabularioTipoEvento } from '@/textos/tiposEvento'

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR')
}

function contar(quantidade: number, singular: string, plural: string): string {
  return `${numero(quantidade)} ${quantidade === 1 ? singular : plural}`
}

export const TEXTOS_MODELOS_POR_TIPO = {
  grupoQualquerTitulo: 'Para qualquer tipo de evento',
  grupoOutrosTitulo: 'Outros tipos de evento',
  quantidade: (quantidade: number) => contar(quantidade, 'modelo', 'modelos'),
  notaTipo: (recurso: string, singular: string) => `Na lista ao aplicar o ${recurso} de cada ${singular}.`,
  notaQualquer: (recurso: string) => `Na lista ao aplicar o ${recurso} de qualquer evento.`,
  notaOutros: 'De um tipo que esta tela ainda não reconhece. Só aparece nos eventos desse tipo.',
  sugeridoPara: (singular: string) => `Sugerido para ${singular}`,
  origemAssessoria: 'Modelo da assessoria',
  coberturaTitulo: 'Por tipo de evento',
  coberturaApoio: (recurso: string) => `O que a equipe vê ao aplicar o ${recurso}.`,
  comSugerido: (singular: string) => `Inclui o sugerido para ${singular}.`,
  comEspecificos: (quantidade: number) => `Inclui ${numero(quantidade)} só deste tipo.`,
  soQualquer: 'Só os modelos para qualquer tipo.',
  nenhum: 'Nenhum modelo. Um modelo novo vale para todos os tipos.',
  reaproveitamentoTitulo: 'Como os modelos são reaproveitados',
  comoAplicarTitulo: 'Como aplicar num evento',
  abrirEventoDoTipo: (indefinido: string) => `Abra ${indefinido} e entre em Checklist.`,
  abrirQualquerEvento: 'Abra qualquer evento e entre em Checklist.',
  abrirEventoOutroTipo: 'Abra um evento desse tipo e entre em Checklist.',
} as const

export type ReferenciaModelo = Pick<VocabularioTipoEvento['referencia'], 'artigo' | 'contracaoDe' | 'indefinido'>

export const REFERENCIA_QUALQUER_EVENTO: ReferenciaModelo = {
  artigo: 'o evento',
  contracaoDe: 'do evento',
  indefinido: 'um evento',
}

export function referenciaDoModelo(tipo: TipoEvento | null | undefined): ReferenciaModelo {
  return ehTipoEvento(tipo) ? vocabularioOuNeutro(tipo).referencia : REFERENCIA_QUALQUER_EVENTO
}

export function rotuloSugeridoDoModelo(tipo: TipoEvento | null | undefined, padrao: string): string {
  return ehTipoEvento(tipo) ? TEXTOS_MODELOS_POR_TIPO.sugeridoPara(VOCABULARIO_TIPO_EVENTO[tipo].contagem.singular) : padrao
}

export function ondeApareceModelo(tipo: TipoEvento | null | undefined, recurso: string): string {
  if (ehTipoEvento(tipo)) {
    return TEXTOS_MODELOS_POR_TIPO.notaTipo(recurso, VOCABULARIO_TIPO_EVENTO[tipo].contagem.singular)
  }
  return tipo === null || tipo === undefined ? TEXTOS_MODELOS_POR_TIPO.notaQualquer(recurso) : TEXTOS_MODELOS_POR_TIPO.notaOutros
}

export function abrirEventoDoModelo(tipo: TipoEvento | null | undefined): string {
  if (ehTipoEvento(tipo)) {
    return TEXTOS_MODELOS_POR_TIPO.abrirEventoDoTipo(VOCABULARIO_TIPO_EVENTO[tipo].referencia.indefinido)
  }
  return tipo === null || tipo === undefined ? TEXTOS_MODELOS_POR_TIPO.abrirQualquerEvento : TEXTOS_MODELOS_POR_TIPO.abrirEventoOutroTipo
}
