import type { EventoDto, EventoResumoDto, DataCalendario } from '@/tipos/eventos'

export interface DuplicarEventoRequest {
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
  origem: EventoResumoDto
  tarefas: number
  tarefasDoChecklist: number
  tarefasNascemAtrasadas: number
  tarefasCanceladasIgnoradas: number
  fornecedores: number
  fornecedoresIgnorados: number
  itensCronograma: number
}

export interface DuplicacaoEventoDto {
  evento: EventoDto
  tarefasCopiadas: number
  fornecedoresCopiados: number
  itensCronogramaCopiados: number
}
