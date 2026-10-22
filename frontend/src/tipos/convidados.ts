export type FaixaEtaria = 'Adulto' | 'Crianca'
export type RespostaRsvp = 'Pendente' | 'Confirmado' | 'Recusado'
export type StatusEnvioConvite = 'NaoEnviado' | 'Enviado' | 'Visualizado'

export const FAIXAS_ETARIAS: readonly FaixaEtaria[] = ['Adulto', 'Crianca']
export const RESPOSTAS_RSVP: readonly RespostaRsvp[] = ['Pendente', 'Confirmado', 'Recusado']

export interface ConvidadoDto {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  faixaEtaria: FaixaEtaria
  resposta: RespostaRsvp
  acompanhante: boolean
  possuiRestricao: boolean | null
  mesaId?: string | null
}

export interface ConviteDto {
  id: string
  nome: string
  grupo: string | null
  limiteAcompanhantes: number
  statusEnvio: StatusEnvioConvite
  convidados: ConvidadoDto[]
  criadoEm: string
  atualizadoEm: string
  respondidoEm: string | null
}

export interface TotaisPorFaixaDto {
  adultos: number
  criancas: number
  total: number
}

export interface TotaisConvidadosDto {
  convites: number
  pessoas: number
  adultos: number
  criancas: number
  acompanhantesPermitidos: number
  pendentes: TotaisPorFaixaDto
  confirmados: TotaisPorFaixaDto
  recusados: TotaisPorFaixaDto
}

export interface ListaConvitesDto {
  convites: ConviteDto[]
  totais: TotaisConvidadosDto
  convidadosEstimados: number | null
  eventoArquivado: boolean
  mesas?: MesaResumoDto[]
}

export interface MesaResumoDto {
  id: string
  numero: number
  nome: string | null
  especial: boolean
}

export interface SalvarConvidadoRequest {
  id: string | null
  nome: string
  telefone: string | null
  email: string | null
  faixaEtaria: FaixaEtaria
  resposta: RespostaRsvp
}

export interface SalvarConviteRequest {
  nome: string | null
  grupo: string | null
  limiteAcompanhantes: number
  convidados: SalvarConvidadoRequest[]
}
