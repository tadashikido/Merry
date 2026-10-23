import type { DataCalendario, TipoEvento } from '@/tipos/eventos'
import type { DiaCronograma, StatusItemCronograma } from '@/tipos/cronograma'

export const FASES_GRANDE_DIA = ['AntesDoDia', 'NoDia', 'DepoisDoDia'] as const

export type FaseGrandeDia = (typeof FASES_GRANDE_DIA)[number]

export const SITUACOES_ITEM_GRANDE_DIA = ['Feito', 'Agora', 'Proximo', 'Depois', 'SemMarcar'] as const

export type SituacaoItemGrandeDia = (typeof SITUACOES_ITEM_GRANDE_DIA)[number]

export interface MomentoGrandeDiaDto {
  agora: string
  fase: FaseGrandeDia
  diasParaOEvento: number
}

export interface FornecedorGrandeDiaDto {
  nomeEmpresa: string
  categoria: string
  contato: string | null
  telefone: string | null
}

export interface ItemGrandeDiaDto {
  id: string
  dia: DiaCronograma
  data: DataCalendario
  inicio: string
  duracaoMinutos: number | null
  termino: string | null
  terminaEmOutroDia: boolean
  atividade: string
  local: string | null
  responsavel: string | null
  fornecedor: FornecedorGrandeDiaDto | null
  instrucoes: string | null
  notasInternas: string | null
  status: StatusItemCronograma
  concluidoEm: string | null
  situacao: SituacaoItemGrandeDia
}

export interface GrandeDiaDto {
  tipo: TipoEvento
  eventoId: string
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string | null
  data: DataCalendario
  horarioCerimonia: string | null
  localCerimonia: string | null
  localRecepcao: string | null
  arquivado: boolean
  somenteLeitura: boolean
  momento: MomentoGrandeDiaDto
  itens: ItemGrandeDiaDto[]
}

export interface ContatoItemPainel {
  nome: string
  telefone: string | null
}

export interface ItemPainelGrandeDia {
  chave: string
  dia: DiaCronograma
  inicio: string
  termino: string | null
  terminaEmOutroDia: boolean
  atividade: string
  local: string | null
  responsavel: string | null
  fornecedor: string | null
  contato: ContatoItemPainel | null
  instrucoes: string | null
  situacao: SituacaoItemGrandeDia
  concluidoEm: string | null
  cerimonia: boolean
}

export interface DistribuicaoPainel {
  principal: ItemPainelGrandeDia | null
  tambemAgora: ItemPainelGrandeDia[]
  proximo: ItemPainelGrandeDia | null
  depois: ItemPainelGrandeDia[]
  semMarcar: ItemPainelGrandeDia[]
  feitos: ItemPainelGrandeDia[]
}

export interface MomentoInterpolado {
  data: DataCalendario
  hora: string
  minutoDoDia: number
}

export interface MomentoPrincipal {
  minutos: number
  horario: string
}

export interface FornecedorDoDia {
  chave: string
  nomeEmpresa: string
  categoria: string
  contato: string | null
  telefone: string | null
  inicio: string
  situacao: 'Agora' | 'Proximo' | null
  encerrado: boolean
  noCartaoAgora: boolean
}
