import type { DataCalendario } from '@/tipos/eventos'
import type { RespostaRsvp } from '@/tipos/convidados'

export type TipoRestricaoAlimentar =
  | 'Vegetariana'
  | 'Vegana'
  | 'SemGluten'
  | 'SemLactose'
  | 'AlergiaFrutosDoMar'
  | 'AlergiaAmendoimCastanhas'

export const TIPOS_RESTRICAO_ALIMENTAR: readonly TipoRestricaoAlimentar[] = [
  'Vegetariana',
  'Vegana',
  'SemGluten',
  'SemLactose',
  'AlergiaFrutosDoMar',
  'AlergiaAmendoimCastanhas',
]

export type OrigemConsentimento = 'Convidado' | 'Cerimonialista'

export type SituacaoRestricao = 'manter' | 'informar' | 'remover'

export interface RestricaoPessoaFormulario {
  situacao: SituacaoRestricao
  tipos: TipoRestricaoAlimentar[]
  outraRestricao: string
  necessidadeEspecial: string
}

export interface RestricaoAlimentarRequest {
  tipos: TipoRestricaoAlimentar[]
  outraRestricao: string | null
  necessidadeEspecial: string | null
}

export interface ConsentimentoRsvpRequest {
  aceito: boolean
  versaoTermo: string
}

export interface PrivacidadeRsvpDto {
  versaoTermo: string
  diasRetencao: number
}

export interface SalvarRestricaoAlimentarRequest extends RestricaoAlimentarRequest {
  consentimentoObtido: boolean
}

export interface RestricaoAlimentarDto {
  tipos: TipoRestricaoAlimentar[]
  outraRestricao: string | null
  necessidadeEspecial: string | null
  origemConsentimento: OrigemConsentimento
  consentidoEm: string
}

export interface ContagemRestricaoDto {
  tipo: TipoRestricaoAlimentar
  quantidade: number
}

export interface PessoaRestricaoAlimentarDto {
  convidadoId: string
  conviteId: string
  nome: string
  acompanhante: boolean
  resposta: RespostaRsvp
  tipos: TipoRestricaoAlimentar[]
  outraRestricao: string | null
  necessidadeEspecial: string | null
  origemConsentimento: OrigemConsentimento
  consentidoEm: string
}

export interface RelatorioRestricoesAlimentaresDto {
  totalPessoas: number
  totalConfirmados: number
  porTipo: ContagemRestricaoDto[]
  outrasRestricoes: number
  necessidadesEspeciais: number
  pessoas: PessoaRestricaoAlimentarDto[]
  diasRetencao: number
  dataExclusaoPrevista: DataCalendario
  dadosExcluidosEm: string | null
  registrosIlegiveis: number
  podeRegistrar: boolean
}

export interface PessoaSelecionavel {
  convidadoId: string
  conviteId: string
  nome: string
}
