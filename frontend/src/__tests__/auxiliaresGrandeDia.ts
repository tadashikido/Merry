import type { GrandeDiaDto, ItemGrandeDiaDto, ItemPainelGrandeDia } from '@/tipos/grandeDia'

export const ID_EVENTO_GRANDE_DIA = '11111111-1111-4111-8111-111111111111'

export function itemGrandeDia(dados: Partial<ItemGrandeDiaDto> = {}): ItemGrandeDiaDto {
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
    fornecedor: { nomeEmpresa: 'Coral Harmonia', categoria: 'Musica', contato: 'Carla', telefone: '11987654321' },
    instrucoes: 'Coral entra às 16:25.',
    notasInternas: 'Pagar saldo',
    status: 'Previsto',
    concluidoEm: null,
    situacao: 'Agora',
    ...dados,
  }
}

export const ITENS_NO_DIA: ItemGrandeDiaDto[] = [
  itemGrandeDia({ id: 'm', inicio: '14:00', termino: '15:30', duracaoMinutos: 90, atividade: 'Montagem do buffet', fornecedor: null, situacao: 'SemMarcar' }),
  itemGrandeDia({ id: 'mk', inicio: '16:00', termino: '17:00', duracaoMinutos: 60, atividade: 'Maquiagem', fornecedor: null, responsavel: 'Ana', situacao: 'Agora' }),
  itemGrandeDia({ id: 'c' }),
  itemGrandeDia({ id: 'f', inicio: '17:15', termino: '18:00', atividade: 'Fotos com a família', fornecedor: null, responsavel: 'Ana', situacao: 'Proximo' }),
  itemGrandeDia({ id: 'r', inicio: '18:00', termino: null, duracaoMinutos: null, atividade: 'Recepção', fornecedor: null, situacao: 'Depois' }),
  itemGrandeDia({
    id: 'b',
    inicio: '13:00',
    termino: '13:30',
    atividade: 'Buquê',
    fornecedor: null,
    status: 'Concluido',
    concluidoEm: '2027-05-15T16:20:00Z',
    situacao: 'Feito',
  }),
]

export function grandeDia(dados: Partial<GrandeDiaDto> = {}): GrandeDiaDto {
  return {
    eventoId: ID_EVENTO_GRANDE_DIA,
    nomePrimeiraPessoa: 'Luísa',
    nomeSegundaPessoa: 'Pedro',
    data: '2027-05-15',
    horarioCerimonia: '16:30',
    localCerimonia: 'Capela São José',
    localRecepcao: 'Espaço Jardim',
    arquivado: false,
    somenteLeitura: false,
    momento: { agora: '2027-05-15T16:34:00', fase: 'NoDia', diasParaOEvento: 0 },
    itens: ITENS_NO_DIA,
    ...dados,
  }
}

export function itemPainel(dados: Partial<ItemPainelGrandeDia> = {}): ItemPainelGrandeDia {
  return {
    chave: dados.atividade ?? 'item',
    dia: 'DiaDoEvento',
    inicio: '16:30',
    termino: '17:15',
    terminaEmOutroDia: false,
    atividade: 'Cerimônia',
    local: null,
    responsavel: null,
    fornecedor: null,
    contato: null,
    instrucoes: null,
    situacao: 'Depois',
    concluidoEm: null,
    cerimonia: false,
    ...dados,
  }
}
