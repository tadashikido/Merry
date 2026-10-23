export type DataCalendario = string

export const FASES_EVENTO = ['Planejamento', 'RetaFinal', 'SemanaDoEvento', 'DiaDoEvento', 'Realizado'] as const

export type FaseEvento = (typeof FASES_EVENTO)[number]

export type SituacaoListagemEventos = 'Ativos' | 'Arquivados'

export const TIPOS_EVENTO = ['Casamento', 'QuinzeAnos', 'Aniversario', 'Comemoracao'] as const

export type TipoEvento = (typeof TIPOS_EVENTO)[number]

export interface EventoResumoDto {
  [campo: string]: unknown
  id: string
  tipo: TipoEvento
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string | null
  data: DataCalendario
  horario: string | null
  localCerimonia: string | null
  convidadosEstimados: number | null
  fase: FaseEvento
  diasRestantes: number
  arquivado: boolean
}

export interface EventoDto extends EventoResumoDto {
  localRecepcao: string | null
  observacoes: string | null
  arquivadoEm: string | null
  criadoEm: string
  atualizadoEm: string
  dataLimiteRsvp: DataCalendario | null
  dataLimiteRsvpEfetiva: DataCalendario
  percentualChecklist?: number | null
}

export interface SalvarEventoRequest {
  tipo: TipoEvento
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string | null
  data: DataCalendario
  horario: string | null
  localCerimonia: string | null
  localRecepcao: string | null
  convidadosEstimados: number | null
  observacoes: string | null
  dataLimiteRsvp: DataCalendario | null
}
