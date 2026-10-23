import type { FaixaEtaria, RespostaRsvp } from '@/tipos/convidados'

export type TipoProblemaLinha = 'Erro' | 'Duplicado' | 'Aviso'
export type SituacaoPessoaImportada = 'Valida' | 'ComErro' | 'Duplicada'
export type ColunaImportacao =
  | 'Convite'
  | 'Grupo'
  | 'Nome'
  | 'Telefone'
  | 'Email'
  | 'FaixaEtaria'
  | 'Acompanhantes'
  | 'Resposta'

export type EtapaImportacao = 'escolha' | 'previa' | 'concluida'

export interface ResumoImportacaoDto {
  linhas: number
  convites: number
  pessoas: number
  convitesValidos: number
  pessoasValidas: number
  adultosValidos: number
  criancasValidas: number
  linhasComErro: number
  linhasDuplicadas: number
  linhasComAviso: number
  convidadosExistentes: number
  limitePorEvento: number
}

export interface PessoaPreVisualizadaDto {
  linha: number
  nome: string
  faixaEtaria: FaixaEtaria
  resposta: RespostaRsvp
  situacao: SituacaoPessoaImportada
}

export interface ConvitePreVisualizadoDto {
  nome: string
  grupo: string | null
  limiteAcompanhantes: number
  valido: boolean
  pessoas: PessoaPreVisualizadaDto[]
}

export interface ValoresLinhaImportacaoDto {
  convite: string
  grupo: string
  nome: string
  telefone: string
  email: string
  faixaEtaria: string
  acompanhantes: string
  resposta: string
}

export interface ProblemaLinhaDto {
  tipo: TipoProblemaLinha
  coluna: ColunaImportacao | null
  mensagem: string
}

export interface LinhaComProblemaDto {
  linha: number
  valores: ValoresLinhaImportacaoDto
  problemas: ProblemaLinhaDto[]
}

export interface PreVisualizacaoImportacaoDto {
  resumo: ResumoImportacaoDto
  colunasReconhecidas: ColunaImportacao[]
  colunasIgnoradas: string[]
  convites: ConvitePreVisualizadoDto[]
  linhasComProblema: LinhaComProblemaDto[]
}

export interface ResultadoImportacaoDto {
  convitesCriados: number
  pessoasCriadas: number
}

export interface GrupoImportacao {
  chave: string
  rotulo: string
  convites: number
  pessoas: number
  existentes: number | null
}

export interface ResumoGruposImportacao {
  grupos: GrupoImportacao[]
  semGrupo: { convites: number; pessoas: number }
  comparado: boolean
  novos: number
  jaExistentes: number
}
