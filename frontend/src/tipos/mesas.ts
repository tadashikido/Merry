import type { FaixaEtaria, RespostaRsvp } from '@/tipos/convidados'

export interface MesaDto {
  id: string
  numero: number
  nome: string | null
  capacidade: number
  especial: boolean
  ocupacao: number
  criadoEm: string
  atualizadoEm: string
}

export interface PessoaMesaDto {
  id: string
  nome: string
  faixaEtaria: FaixaEtaria
  acompanhante: boolean
  conviteId: string
  convite: string
  grupo: string | null
  mesaId: string | null
}

export interface AvisoSaidaMesaDto {
  convidadoId: string
  nome: string
  convite: string
  resposta: RespostaRsvp
  mesaId: string | null
  mesaNumero: number | null
  mesaNome: string | null
  mesaEspecial: boolean | null
  saiuEm: string
}

export interface TotaisMesasDto {
  mesas: number
  capacidadeTotal: number
  confirmados: number
  acomodados: number
  lugaresLivres: number
  semMesa: number
}

export interface MapaMesasDto {
  mesas: MesaDto[]
  pessoas: PessoaMesaDto[]
  avisosSaida: AvisoSaidaMesaDto[]
  totais: TotaisMesasDto
  casamentoArquivado: boolean
}

export interface SalvarMesaRequest {
  numero: number | null
  nome: string | null
  capacidade: number | null
  especial: boolean
}

export interface PessoasMesaRequest {
  convidadosIds: string[]
}

export type SituacaoMesa = 'livre' | 'completa'
