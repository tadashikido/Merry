export type DataCalendario = string

export type FaseCasamento = 'Planejamento' | 'RetaFinal' | 'SemanaDoCasamento' | 'DiaDoCasamento' | 'Realizado'

export type SituacaoListagemCasamentos = 'Ativos' | 'Arquivados'

export interface CasamentoResumoDto {
  [campo: string]: unknown
  id: string
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
  data: DataCalendario
  horario: string | null
  localCerimonia: string | null
  convidadosEstimados: number | null
  fase: FaseCasamento
  diasRestantes: number
  arquivado: boolean
}

export interface CasamentoDto extends CasamentoResumoDto {
  localRecepcao: string | null
  observacoes: string | null
  arquivadoEm: string | null
  criadoEm: string
  atualizadoEm: string
  dataLimiteRsvp: DataCalendario | null
  dataLimiteRsvpEfetiva: DataCalendario
  percentualChecklist?: number | null
}

export interface SalvarCasamentoRequest {
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
