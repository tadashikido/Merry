import type { CronogramaDto, ItemCronogramaDto } from '@/tipos/cronograma'

export function itemCronograma(dados: Partial<ItemCronogramaDto> = {}): ItemCronogramaDto {
  return {
    id: 'i1',
    dia: 'DiaDoEvento',
    data: '2027-05-15',
    inicio: '16:30',
    duracaoMinutos: 45,
    termino: '17:15',
    terminaEmOutroDia: false,
    atividade: 'Cerimônia',
    local: 'Capela São José',
    responsavel: 'Fernanda',
    fornecedor: null,
    instrucoes: 'Chegar 15 minutos antes.',
    notasInternas: null,
    status: 'Previsto',
    concluidoEm: null,
    minutosDesdeCerimonia: 0,
    conflitos: [],
    criadoEm: '2026-09-01T12:00:00Z',
    atualizadoEm: '2026-09-01T12:00:00Z',
    ...dados,
  }
}

export function cronogramaExemplo(itens: ItemCronogramaDto[], dados: Partial<CronogramaDto> = {}): CronogramaDto {
  return {
    eventoId: '11111111-1111-4111-8111-111111111111',
    dataEvento: '2027-05-15',
    horarioCerimonia: '16:30',
    localCerimonia: 'Capela São José',
    localRecepcao: 'Espaço Jardim',
    arquivado: false,
    somenteLeitura: false,
    itens,
    itensComConflito: itens.filter((item) => item.conflitos.length > 0).length,
    fornecedoresDisponiveis: [{ fornecedorEventoId: 'v1', nomeEmpresa: 'Coral Harmonia', categoria: 'Musica' }],
    horariosDesatualizados: 0,
    ...dados,
  }
}
