export type DataCalendario = string

export type FaseEvento = 'Planejamento' | 'RetaFinal' | 'SemanaDoEvento' | 'DiaDoEvento' | 'Realizado'

export type SituacaoListagemEventos = 'Ativos' | 'Arquivados'

export interface EventoResumoDto {
  [campo: string]: unknown
  id: string
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
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
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
  data: DataCalendario
  horario: string | null
  localCerimonia: string | null
  localRecepcao: string | null
  convidadosEstimados: number | null
  observacoes: string | null
  dataLimiteRsvp: DataCalendario | null
}
