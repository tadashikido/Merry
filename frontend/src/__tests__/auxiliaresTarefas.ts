import type { ListaTarefasDto, PendenciasTarefasDto, TarefaDto, TarefaPendenteDto } from '@/tipos/tarefas'

export function tarefaExemplo(dados: Partial<TarefaDto> = {}): TarefaDto {
  return {
    id: 't1',
    titulo: 'Confirmar buffet para 460 pessoas',
    descricao: null,
    responsavel: 'Assessoria',
    categoria: 'Fornecedores',
    status: 'AFazer',
    prazo: '2027-01-10',
    atrasada: false,
    venceNaSemana: false,
    diasParaPrazo: 30,
    concluidaEm: null,
    concluidaPor: null,
    geradaDeModelo: false,
    criadoEm: '2026-09-01T12:00:00Z',
    atualizadoEm: '2026-09-01T12:00:00Z',
    ...dados,
  }
}

export function listaTarefas(tarefas: TarefaDto[], dados: Partial<ListaTarefasDto> = {}): ListaTarefasDto {
  const abertas = tarefas.filter((tarefa) => tarefa.status === 'AFazer' || tarefa.status === 'EmAndamento')
  return {
    tarefas,
    resumo: {
      abertas: abertas.length,
      atrasadas: tarefas.filter((tarefa) => tarefa.atrasada).length,
      estaSemana: tarefas.filter((tarefa) => tarefa.venceNaSemana).length,
      concluidas: tarefas.filter((tarefa) => tarefa.status === 'Concluida').length,
      canceladas: tarefas.filter((tarefa) => tarefa.status === 'Cancelada').length,
      total: tarefas.length,
    },
    eventoArquivado: false,
    somenteDoAnfitriao: false,
    ...dados,
  }
}

export function pendenteExemplo(dados: Partial<TarefaPendenteDto> = {}): TarefaPendenteDto {
  return {
    id: 'p1',
    eventoId: '11111111-1111-4111-8111-111111111111',
    nomePrimeiraPessoa: 'Luísa',
    nomeSegundaPessoa: 'Pedro',
    titulo: 'Confirmar horário do DJ',
    responsavel: 'Assessoria',
    categoria: 'Fornecedores',
    status: 'AFazer',
    prazo: '2026-09-27',
    diasParaPrazo: -3,
    ...dados,
  }
}

export function pendenciasExemplo(dados: Partial<PendenciasTarefasDto> = {}): PendenciasTarefasDto {
  return {
    totalAtrasadas: 1,
    totalEstaSemana: 1,
    eventosComAtraso: 1,
    atrasadas: [pendenteExemplo()],
    estaSemana: [pendenteExemplo({ id: 'p2', titulo: 'Pagar parcela da fotografia', diasParaPrazo: 0, prazo: '2026-09-30' })],
    ...dados,
  }
}
