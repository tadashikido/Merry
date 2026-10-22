import type { DataCalendario, TipoEvento } from '@/tipos/eventos'
import type { CategoriaTarefa, ResponsavelTarefa, TarefaDto } from '@/tipos/tarefas'

export const MARCOS_CHECKLIST = [
  'dozeMeses',
  'seisMeses',
  'tresMeses',
  'trintaDias',
  'retaFinal',
  'noDia',
  'depois',
  'semPrazo',
] as const
export type MarcoChecklist = (typeof MARCOS_CHECKLIST)[number]

export const SENTIDOS_PRAZO = ['antes', 'depois'] as const
export type SentidoPrazo = (typeof SENTIDOS_PRAZO)[number]

export interface ModeloChecklistResumoDto {
  tipoEvento: TipoEvento | null
  id: string
  nome: string
  descricao: string | null
  sugerido: boolean
  quantidadeItens: number
  atualizadoEm: string
}

export interface ItemModeloChecklistDto {
  id: string
  titulo: string
  descricao: string | null
  responsavel: ResponsavelTarefa
  categoria: CategoriaTarefa
  diasAntesDoEvento: number
}

export interface ModeloChecklistDto {
  tipoEvento: TipoEvento | null
  id: string
  nome: string
  descricao: string | null
  sugerido: boolean
  itens: ItemModeloChecklistDto[]
  criadoEm: string
  atualizadoEm: string
}

export interface SalvarModeloChecklistRequest {
  nome: string
  descricao: string | null
}

export interface SalvarItemModeloChecklistRequest {
  titulo: string
  descricao: string | null
  responsavel: ResponsavelTarefa
  categoria: CategoriaTarefa
  diasAntesDoEvento: number
}

export interface ProgressoChecklistDto {
  percentual: number | null
  concluidas: number
  consideradas: number
  canceladas: number
  total: number
}

export interface ChecklistEventoDto {
  progresso: ProgressoChecklistDto
  dataEvento: DataCalendario
  eventoArquivado: boolean
  prazosDesatualizados: number
  tarefas: TarefaDto[]
}

export interface AplicacaoModeloChecklistDto {
  itensNoModelo: number
  tarefasCriadas: number
  jaAplicadas: number
  nascemAtrasadas: number
  tarefasNoEvento: number
  excedeLimite: boolean
  progresso: ProgressoChecklistDto
}

export interface RecalculoPrazosDto {
  tarefas: number
}

export interface GrupoMarco<T> {
  marco: MarcoChecklist
  itens: T[]
}
