import { tarefaExemplo } from '@/__tests__/auxiliaresTarefas'
import type {
  AplicacaoModeloChecklistDto,
  ChecklistEventoDto,
  ItemModeloChecklistDto,
  ModeloChecklistDto,
  ModeloChecklistResumoDto,
} from '@/tipos/checklist'
import type { TarefaDto } from '@/tipos/tarefas'

export const ID_MODELO = '33333333-3333-4333-8333-333333333333'
export const ID_ITEM = '44444444-4444-4444-8444-444444444444'
export const DATA_EVENTO = '2027-12-12'

export function resumoModelo(dados: Partial<ModeloChecklistResumoDto> = {}): ModeloChecklistResumoDto {
  return {
    id: ID_MODELO,
    nome: 'Checklist essencial',
    descricao: 'Marcos de 12, 6 e 3 meses e 30 dias antes do evento.',
    sugerido: true,
    quantidadeItens: 26,
    atualizadoEm: '2026-09-30T12:00:00Z',
    ...dados,
  }
}

export function itemModelo(dados: Partial<ItemModeloChecklistDto> = {}): ItemModeloChecklistDto {
  return {
    id: ID_ITEM,
    titulo: 'Reservar local da cerimônia e da recepção',
    descricao: null,
    responsavel: 'Assessoria',
    categoria: 'Cerimonia',
    diasAntesDoEvento: 365,
    ...dados,
  }
}

export function modeloCompleto(itens: ItemModeloChecklistDto[] = [itemModelo()], dados: Partial<ModeloChecklistDto> = {}): ModeloChecklistDto {
  return {
    id: ID_MODELO,
    nome: 'Checklist essencial',
    descricao: null,
    sugerido: true,
    itens,
    criadoEm: '2026-09-30T12:00:00Z',
    atualizadoEm: '2026-09-30T12:00:00Z',
    ...dados,
  }
}

export function tarefaChecklist(dados: Partial<TarefaDto> = {}): TarefaDto {
  return tarefaExemplo({ geradaDeModelo: true, ...dados })
}

export function checklistExemplo(tarefas: TarefaDto[] = [], dados: Partial<ChecklistEventoDto> = {}): ChecklistEventoDto {
  const canceladas = tarefas.filter((tarefa) => tarefa.status === 'Cancelada').length
  const concluidas = tarefas.filter((tarefa) => tarefa.status === 'Concluida').length
  const consideradas = tarefas.length - canceladas
  return {
    progresso: {
      percentual: consideradas === 0 ? null : Math.floor((concluidas * 100) / consideradas),
      concluidas,
      consideradas,
      canceladas,
      total: tarefas.length,
    },
    dataEvento: DATA_EVENTO,
    eventoArquivado: false,
    prazosDesatualizados: 0,
    tarefas,
    ...dados,
  }
}

export function aplicacaoExemplo(dados: Partial<AplicacaoModeloChecklistDto> = {}): AplicacaoModeloChecklistDto {
  return {
    itensNoModelo: 26,
    tarefasCriadas: 26,
    jaAplicadas: 0,
    nascemAtrasadas: 0,
    tarefasNoEvento: 0,
    excedeLimite: false,
    progresso: { percentual: 0, concluidas: 0, consideradas: 26, canceladas: 0, total: 26 },
    ...dados,
  }
}
