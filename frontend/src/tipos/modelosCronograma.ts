import type { DiaCronograma } from '@/tipos/cronograma'
import type { CategoriaFornecedor } from '@/tipos/fornecedores'

export const REFERENCIAS_LOCAL_CRONOGRAMA = ['Cerimonia', 'Recepcao'] as const

export type ReferenciaLocalCronograma = (typeof REFERENCIAS_LOCAL_CRONOGRAMA)[number]

export type OpcaoLocalModelo = ReferenciaLocalCronograma | 'Outro'

export interface ModeloCronogramaResumoDto {
  id: string
  nome: string
  descricao: string | null
  horarioReferencia: string
  sugerido: boolean
  quantidadeItens: number
  atualizadoEm: string
}

export interface ItemModeloCronogramaDto {
  id: string
  minutosDesdeCerimonia: number
  dia: DiaCronograma
  inicio: string
  duracaoMinutos: number | null
  termino: string | null
  terminaEmOutroDia: boolean
  atividade: string
  referenciaLocal: ReferenciaLocalCronograma | null
  local: string | null
  responsavel: string | null
  categoriaFornecedor: CategoriaFornecedor | null
  instrucoes: string | null
}

export interface ModeloCronogramaDto {
  id: string
  nome: string
  descricao: string | null
  horarioReferencia: string
  sugerido: boolean
  itens: ItemModeloCronogramaDto[]
  criadoEm: string
  atualizadoEm: string
}

export interface SalvarModeloCronogramaRequest {
  nome: string
  descricao: string | null
  horarioReferencia?: string | null
}

export interface SalvarItemModeloCronogramaRequest {
  minutosDesdeCerimonia: number
  duracaoMinutos: number | null
  atividade: string
  referenciaLocal: ReferenciaLocalCronograma | null
  local: string | null
  responsavel: string | null
  categoriaFornecedor: CategoriaFornecedor | null
  instrucoes: string | null
}

export interface ItemPrevistoCronogramaDto {
  dia: DiaCronograma
  inicio: string
  atividade: string
}

export interface AplicacaoModeloCronogramaDto {
  itensNoModelo: number
  itensCriados: number
  jaAplicados: number
  fornecedoresPreenchidos: number
  itensAjustados: number
  itensNoCronograma: number
  excedeLimite: boolean
  semHorarioCerimonia: boolean
  horarioCerimonia: string | null
  primeiroItem: ItemPrevistoCronogramaDto | null
  ultimoItem: ItemPrevistoCronogramaDto | null
}

export interface RecalculoHorariosDto {
  itens: number
}
