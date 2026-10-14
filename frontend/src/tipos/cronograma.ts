import type { DataCalendario } from '@/tipos/casamentos'

export const DIAS_CRONOGRAMA = ['Vespera', 'DiaDoCasamento', 'DiaSeguinte'] as const

export type DiaCronograma = (typeof DIAS_CRONOGRAMA)[number]

export type StatusItemCronograma = 'Previsto' | 'Concluido'

export type MotivoConflitoCronograma = 'Responsavel' | 'Fornecedor'

export interface FornecedorItemCronogramaDto {
  fornecedorCasamentoId: string
  nomeEmpresa: string
  categoria: string
}

export interface ConflitoItemCronogramaDto {
  itemId: string
  atividade: string
  inicio: string
  dia: DiaCronograma
  motivo: MotivoConflitoCronograma
}

export interface ItemCronogramaDto {
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
  fornecedor: FornecedorItemCronogramaDto | null
  instrucoes: string | null
  notasInternas: string | null
  status: StatusItemCronograma
  concluidoEm: string | null
  minutosDesdeCerimonia: number | null
  conflitos: ConflitoItemCronogramaDto[]
  criadoEm: string
  atualizadoEm: string
}

export interface CronogramaDto {
  casamentoId: string
  dataCasamento: DataCalendario
  horarioCerimonia: string | null
  localCerimonia: string | null
  localRecepcao: string | null
  arquivado: boolean
  somenteLeitura: boolean
  itens: ItemCronogramaDto[]
  itensComConflito: number
  fornecedoresDisponiveis: FornecedorItemCronogramaDto[]
  horariosDesatualizados: number
}

export interface SalvarItemCronogramaRequest {
  dia: DiaCronograma
  inicio: string
  duracaoMinutos: number | null
  atividade: string
  local: string | null
  responsavel: string | null
  fornecedorCasamentoId: string | null
  instrucoes: string | null
  notasInternas: string | null
}
