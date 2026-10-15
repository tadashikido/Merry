import type { DataCalendario } from '@/tipos/casamentos'
import type { FaixaEtaria, StatusEnvioConvite, TotaisConvidadosDto } from '@/tipos/convidados'
import type { TipoRestricaoAlimentar } from '@/tipos/dadosSensiveis'

export type FormatoExportacaoBuffet = 'csv' | 'impressao'

export interface SituacaoConvitesDto {
  total: number
  naoEnviados: number
  enviados: number
  visualizados: number
  respondidos: number
  aguardandoResposta: number
}

export interface PrazoRsvpDto {
  dataLimite: DataCalendario
  diasRestantes: number
  aceitaRespostas: boolean
}

export interface ConvitePendenteDto {
  conviteId: string
  nome: string
  grupo: string | null
  statusEnvio: StatusEnvioConvite
  telefone: string | null
  pessoasPendentes: string[]
  totalPessoas: number
  cobravel: boolean
  ultimaCobrancaEm: string | null
  quantidadeCobrancas: number
}

export interface CobrancaRsvpDto {
  conviteId: string
  ultimaCobrancaEm: string
  quantidadeCobrancas: number
}

export interface PainelConfirmacoesDto {
  convites: SituacaoConvitesDto
  pessoas: TotaisConvidadosDto
  convidadosEstimados: number | null
  prazo: PrazoRsvpDto
  casamentoArquivado: boolean
  pendentes: ConvitePendenteDto[]
  pessoasComRestricaoAlimentar?: number
}

export interface CasamentoExportacaoDto {
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
  data: DataCalendario
  horario: string | null
  localRecepcao: string | null
}

export interface ContagemBuffetDto {
  adultos: number
  criancas: number
  total: number
}

export interface PessoaBuffetDto {
  nome: string
  faixaEtaria: FaixaEtaria
  acompanhante: boolean
  tipos: TipoRestricaoAlimentar[]
  outraRestricao: string | null
  necessidadeEspecial: string | null
}

export interface ConviteBuffetDto {
  nome: string
  pessoas: PessoaBuffetDto[]
}

export interface ContagemRestricaoBuffetDto {
  tipo: TipoRestricaoAlimentar
  quantidade: number
}

export interface PessoaRestricaoBuffetDto {
  nome: string
  convite: string
  tipos: TipoRestricaoAlimentar[]
  outraRestricao: string | null
  necessidadeEspecial: string | null
}

export interface RestricoesBuffetDto {
  porTipo: ContagemRestricaoBuffetDto[]
  outrasRestricoes: number
  necessidadesEspeciais: number
  pessoas: PessoaRestricaoBuffetDto[]
  registrosIlegiveis: number
  dadosExcluidosEm: string | null
}

export interface ExportacaoBuffetDto {
  casamento: CasamentoExportacaoDto
  geradoEm: string
  confirmados: ContagemBuffetDto
  pendentes: number
  convites: ConviteBuffetDto[]
  restricoes: RestricoesBuffetDto
}
