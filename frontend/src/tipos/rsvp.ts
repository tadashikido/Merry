import type { DataCalendario, TipoEvento } from '@/tipos/eventos'
import type { FaixaEtaria, RespostaRsvp } from '@/tipos/convidados'
import type { ConsentimentoRsvpRequest, PrivacidadeRsvpDto, RestricaoAlimentarRequest } from '@/tipos/dadosSensiveis'

export type EscolhaPresencaRsvp = Extract<RespostaRsvp, 'Confirmado' | 'Recusado'>

export interface EventoRsvpDto {
  tipo: TipoEvento
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string | null
  data: DataCalendario
  horario: string | null
  localCerimonia: string | null
  localRecepcao: string | null
}

export interface PessoaRsvpDto {
  id: string
  nome: string
  faixaEtaria: FaixaEtaria
  resposta: RespostaRsvp
  possuiRestricao: boolean
}

export interface AcompanhanteRsvpDto {
  id: string
  nome: string
  faixaEtaria: FaixaEtaria
  possuiRestricao: boolean
}

export interface RsvpPublicoDto {
  evento: EventoRsvpDto
  nomeConvite: string
  limiteAcompanhantes: number
  dataLimiteResposta: DataCalendario
  podeResponder: boolean
  respondidoEm: string | null
  pessoas: PessoaRsvpDto[]
  acompanhantes: AcompanhanteRsvpDto[]
  privacidade: PrivacidadeRsvpDto
  preVisualizacao?: boolean
}

export interface RespostaPessoaRsvpRequest {
  id: string
  resposta: EscolhaPresencaRsvp
  restricao?: RestricaoAlimentarRequest
}

export interface AcompanhanteRsvpRequest {
  id: string | null
  nome: string
  faixaEtaria: FaixaEtaria
  restricao?: RestricaoAlimentarRequest
}

export interface ResponderRsvpRequest {
  token: string
  pessoas: RespostaPessoaRsvpRequest[]
  acompanhantes: AcompanhanteRsvpRequest[]
  consentimento?: ConsentimentoRsvpRequest
}

export interface LinkRsvpDto {
  token: string
  geradoEm: string
}
