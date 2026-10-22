import type { DataCalendario } from '@/tipos/eventos'
import type { DiaCronograma, StatusItemCronograma } from '@/tipos/cronograma'
import type { MomentoGrandeDiaDto, SituacaoItemGrandeDia } from '@/tipos/grandeDia'

export const TIPOS_LINK_CRONOGRAMA = ['Geral', 'Fornecedor', 'Responsavel'] as const

export type TipoLinkCronograma = (typeof TIPOS_LINK_CRONOGRAMA)[number]

export interface EventoCronogramaPublicoDto {
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
  data: DataCalendario
  horarioCerimonia: string | null
  localCerimonia: string | null
  localRecepcao: string | null
}

export interface FiltroCronogramaPublicoDto {
  tipo: TipoLinkCronograma
  rotulo: string | null
  categoria: string | null
}

export interface FornecedorCronogramaPublicoDto {
  nomeEmpresa: string
  categoria: string
}

export interface ItemCronogramaPublicoDto {
  dia: DiaCronograma
  data: DataCalendario
  inicio: string
  duracaoMinutos: number | null
  termino: string | null
  terminaEmOutroDia: boolean
  atividade: string
  local: string | null
  responsavel: string | null
  fornecedor: FornecedorCronogramaPublicoDto | null
  instrucoes: string | null
  status: StatusItemCronograma
  concluidoEm: string | null
  situacao: SituacaoItemGrandeDia
}

export interface CronogramaPublicoDto {
  evento: EventoCronogramaPublicoDto
  filtro: FiltroCronogramaPublicoDto
  itens: ItemCronogramaPublicoDto[]
  validoAte: DataCalendario
  momento: MomentoGrandeDiaDto
}

export interface LinkCronogramaDto {
  id: string
  token: string | null
  geradoEm: string
}

export interface DestinoLinkCronogramaDto {
  tipo: TipoLinkCronograma
  fornecedorEventoId: string | null
  responsavel: string | null
  rotulo: string | null
  categoria: string | null
  telefone: string | null
  cancelado: boolean
  quantidadeItens: number
  link: LinkCronogramaDto | null
}

export interface LinksCronogramaDto {
  validoAte: DataCalendario
  expirado: boolean
  arquivado: boolean
  destinos: DestinoLinkCronogramaDto[]
}

export interface GerarLinkCronogramaRequest {
  tipo: TipoLinkCronograma
  fornecedorEventoId?: string | null
  responsavel?: string | null
}

export type SituacaoLinkCronograma = 'ativo' | 'semLink' | 'indisponivel'
