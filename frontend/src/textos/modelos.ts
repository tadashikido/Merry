import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
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
  abrirEventoDoTipo: (indefinido: string, destino = 'Checklist') => `Abra ${indefinido} e entre em ${destino}.`,
  abrirQualquerEvento: (destino = 'Checklist') => `Abra qualquer evento e entre em ${destino}.`,
  abrirEventoOutroTipo: (destino = 'Checklist') => `Abra um evento desse tipo e entre em ${destino}.`,
  ondeTitulo: 'Onde o modelo aparece',
  novoParaQualquerTipo: 'Os sugeridos já vêm separados por tipo de evento; os modelos da assessoria valem para todos.',
  edicaoNaoMudaAplicados: (recurso: string) => `Mudar o nome ou a descrição não altera o ${recurso} dos eventos que já aplicaram este modelo.`,
  bomModeloTitulo: 'Para um bom modelo',
  exemplosApoio: 'Um nome que diga o tipo e o estilo do evento, como:',
  exemplosRotulo: 'Exemplos de nome por tipo de evento',
  depoisDeCriarTitulo: 'Depois de criar',
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

export function abrirEventoDoModelo(tipo: TipoEvento | null | undefined, destino = 'Checklist'): string {
  if (ehTipoEvento(tipo)) {
    return TEXTOS_MODELOS_POR_TIPO.abrirEventoDoTipo(VOCABULARIO_TIPO_EVENTO[tipo].referencia.indefinido, destino)
  }
  return tipo === null || tipo === undefined ? TEXTOS_MODELOS_POR_TIPO.abrirQualquerEvento(destino) : TEXTOS_MODELOS_POR_TIPO.abrirEventoOutroTipo(destino)
}

export interface ExemploNomeModelo {
  tipo: TipoEvento
  rotulo: string
  exemplo: string
}

export function exemplosNomeModelo(): ExemploNomeModelo[] {
  return TIPOS_EVENTO.map((tipo) => ({
    tipo,
    rotulo: VOCABULARIO_TIPO_EVENTO[tipo].rotulo,
    exemplo: VOCABULARIO_TIPO_EVENTO[tipo].exemploNomeModelo,
  }))
}
