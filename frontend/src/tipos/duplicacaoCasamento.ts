import type { CasamentoDto, CasamentoResumoDto, DataCalendario } from '@/tipos/casamentos'

export interface DuplicarCasamentoRequest {
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
  data: DataCalendario
  horario: string | null
  localCerimonia: string | null
  localRecepcao: string | null
  copiarTarefas: boolean
  copiarFornecedores: boolean
  copiarCronograma: boolean
}

export interface PreviaDuplicacaoDto {
  origem: CasamentoResumoDto
  tarefas: number
  tarefasDoChecklist: number
  tarefasNascemAtrasadas: number
  tarefasCanceladasIgnoradas: number
  fornecedores: number
  fornecedoresIgnorados: number
  itensCronograma: number
}

export interface DuplicacaoCasamentoDto {
  casamento: CasamentoDto
  tarefasCopiadas: number
  fornecedoresCopiados: number
  itensCronogramaCopiados: number
}
