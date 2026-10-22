import type {
  CronogramaPublicoDto,
  DestinoLinkCronogramaDto,
  ItemCronogramaPublicoDto,
  LinksCronogramaDto,
} from '@/tipos/cronogramaPublico'

export const TOKEN_CRONOGRAMA = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'
export const OUTRO_TOKEN_CRONOGRAMA = 'ZyXwVuTsRqPoNmLkJiHgFeDcBa9876543210-_edcba'

export function itemPublico(dados: Partial<ItemCronogramaPublicoDto> = {}): ItemCronogramaPublicoDto {
  return {
    dia: 'DiaDoEvento',
    data: '2027-05-15',
    inicio: '14:00',
    duracaoMinutos: 90,
    termino: '15:30',
    terminaEmOutroDia: false,
    atividade: 'Montagem do buffet',
    local: 'Espaço Jardim',
    responsavel: 'Fernanda',
    fornecedor: { nomeEmpresa: 'Buffet Sabor', categoria: 'Buffet' },
    instrucoes: 'Entrada pela rua lateral.',
    status: 'Previsto',
    concluidoEm: null,
    situacao: 'Depois',
    ...dados,
  }
}

export function cronogramaPublico(dados: Partial<CronogramaPublicoDto> = {}): CronogramaPublicoDto {
  return {
    evento: {
      nomePrimeiraPessoa: 'Ana Beatriz',
      nomeSegundaPessoa: 'Bruno',
      data: '2027-05-15',
      horarioCerimonia: '16:30',
      localCerimonia: 'Capela São José',
      localRecepcao: 'Espaço Jardim',
    },
    filtro: { tipo: 'Fornecedor', rotulo: 'Buffet Sabor', categoria: 'Buffet' },
    itens: [
      itemPublico(),
      itemPublico({ inicio: '16:30', termino: '17:15', atividade: 'Cerimônia', local: 'Capela São José', fornecedor: null, instrucoes: null }),
      itemPublico({ inicio: '21:30', termino: '02:00', terminaEmOutroDia: true, atividade: 'Pista', status: 'Concluido', situacao: 'Feito', concluidoEm: '2027-05-16T05:00:00Z', instrucoes: null }),
      itemPublico({ dia: 'Vespera', data: '2027-05-14', inicio: '19:00', termino: '20:00', atividade: 'Ensaio', fornecedor: null, instrucoes: null }),
    ],
    validoAte: '2027-05-22',
    momento: { agora: '2027-05-01T10:00:00', fase: 'AntesDoDia', diasParaOEvento: 14 },
    ...dados,
  }
}

export function destino(dados: Partial<DestinoLinkCronogramaDto> = {}): DestinoLinkCronogramaDto {
  return {
    tipo: 'Geral',
    fornecedorEventoId: null,
    responsavel: null,
    rotulo: null,
    categoria: null,
    telefone: null,
    cancelado: false,
    quantidadeItens: 5,
    link: null,
    ...dados,
  }
}

export function linksExemplo(dados: Partial<LinksCronogramaDto> = {}): LinksCronogramaDto {
  return {
    validoAte: '2027-05-22',
    expirado: false,
    arquivado: false,
    destinos: [
      destino({ link: { id: 'l-geral', token: TOKEN_CRONOGRAMA, geradoEm: '2027-03-10T12:00:00Z' } }),
      destino({
        tipo: 'Fornecedor',
        fornecedorEventoId: 'v-buffet',
        rotulo: 'Buffet Sabor',
        categoria: 'Buffet',
        telefone: '11987654321',
        quantidadeItens: 2,
      }),
      destino({ tipo: 'Responsavel', responsavel: 'Fernanda', rotulo: 'Fernanda', quantidadeItens: 3, link: { id: 'l-fernanda', token: null, geradoEm: '2027-03-10T12:00:00Z' } }),
    ],
    ...dados,
  }
}
