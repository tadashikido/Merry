import type { DataCalendario } from '@/tipos/eventos'

export const STATUS_TAREFA = ['AFazer', 'EmAndamento', 'Concluida', 'Cancelada'] as const
export type StatusTarefa = (typeof STATUS_TAREFA)[number]

export const RESPONSAVEIS_TAREFA = ['Assessoria', 'Anfitriao'] as const
export type ResponsavelTarefa = (typeof RESPONSAVEIS_TAREFA)[number]

export const CATEGORIAS_TAREFA = [
  'Geral',
  'Cerimonia',
  'Recepcao',
  'Fornecedores',
  'Convidados',
  'Financeiro',
  'Documentos',
  'TrajesBeleza',
] as const
export type CategoriaTarefa = (typeof CATEGORIAS_TAREFA)[number]

export interface TarefaDto {
  id: string
  titulo: string
  descricao: string | null
  responsavel: ResponsavelTarefa
  categoria: CategoriaTarefa
  status: StatusTarefa
  prazo: DataCalendario | null
  atrasada: boolean
  venceNaSemana: boolean
  diasParaPrazo: number | null
  concluidaEm: string | null
  concluidaPor: ResponsavelTarefa | null
  geradaDeModelo: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface ResumoTarefasDto {
  abertas: number
  atrasadas: number
  estaSemana: number
  concluidas: number
  canceladas: number
  total: number
}

export interface ListaTarefasDto {
  tarefas: TarefaDto[]
  resumo: ResumoTarefasDto
  eventoArquivado: boolean
  somenteDoAnfitriao: boolean
}

export interface SalvarTarefaRequest {
  titulo: string
  descricao: string | null
  responsavel: ResponsavelTarefa
  categoria: CategoriaTarefa
  prazo: DataCalendario | null
}

export interface TarefaPendenteDto {
  id: string
  eventoId: string
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
  titulo: string
  responsavel: ResponsavelTarefa
  categoria: CategoriaTarefa
  status: StatusTarefa
  prazo: DataCalendario
  diasParaPrazo: number
}

export interface PendenciasTarefasDto {
  totalAtrasadas: number
  totalEstaSemana: number
  eventosComAtraso: number
  atrasadas: TarefaPendenteDto[]
  estaSemana: TarefaPendenteDto[]
}

export const SITUACOES_FILTRO_TAREFA = ['abertas', 'atrasadas', 'semana', 'concluidas', 'canceladas', 'todas'] as const
export type SituacaoFiltroTarefa = (typeof SITUACOES_FILTRO_TAREFA)[number]

export type FiltroResponsavelTarefa = ResponsavelTarefa | 'Todos'
export type FiltroCategoriaTarefa = CategoriaTarefa | 'Todas'

export type HorizonteTarefa = 'atrasadas' | 'semana' | 'adiante' | 'semPrazo'
