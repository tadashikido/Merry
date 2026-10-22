import type {
  AplicacaoModeloCronogramaDto,
  ItemModeloCronogramaDto,
  ModeloCronogramaDto,
  ModeloCronogramaResumoDto,
} from '@/tipos/modelosCronograma'

export const ID_MODELO_CRONOGRAMA = '33333333-3333-4333-8333-333333333333'
export const ID_ITEM_MODELO_CRONOGRAMA = '44444444-4444-4444-8444-444444444444'

export function resumoModeloCronograma(dados: Partial<ModeloCronogramaResumoDto> = {}): ModeloCronogramaResumoDto {
  return {
    id: ID_MODELO_CRONOGRAMA,
    nome: 'Roteiro clássico',
    descricao: 'Do ensaio na véspera à desmontagem.',
    horarioReferencia: '16:00',
    sugerido: true,
    tipoEvento: 'Casamento',
    quantidadeItens: 20,
    atualizadoEm: '2026-10-01T12:00:00Z',
    ...dados,
  }
}

export function itemModeloCronograma(dados: Partial<ItemModeloCronogramaDto> = {}): ItemModeloCronogramaDto {
  return {
    id: ID_ITEM_MODELO_CRONOGRAMA,
    minutosDesdeCerimonia: -360,
    dia: 'DiaDoEvento',
    inicio: '10:00',
    duracaoMinutos: 240,
    termino: '14:00',
    terminaEmOutroDia: false,
    atividade: 'Making of da noiva',
    referenciaLocal: null,
    local: 'Hotel Fasano',
    responsavel: 'Equipe de beleza',
    categoriaFornecedor: 'Beleza',
    instrucoes: null,
    ...dados,
  }
}

export function modeloCronogramaCompleto(dados: Partial<ModeloCronogramaDto> = {}): ModeloCronogramaDto {
  return {
    id: ID_MODELO_CRONOGRAMA,
    nome: 'Roteiro clássico',
    descricao: 'Do ensaio na véspera à desmontagem.',
    horarioReferencia: '16:00',
    sugerido: true,
    tipoEvento: 'Casamento',
    itens: [
      itemModeloCronograma({
        id: 'e',
        minutosDesdeCerimonia: -1260,
        dia: 'Vespera',
        inicio: '19:00',
        duracaoMinutos: 60,
        termino: '20:00',
        atividade: 'Ensaio da cerimônia',
        referenciaLocal: 'Cerimonia',
        local: null,
        categoriaFornecedor: null,
      }),
      itemModeloCronograma(),
      itemModeloCronograma({
        id: 'c',
        minutosDesdeCerimonia: 0,
        inicio: '16:00',
        duracaoMinutos: 60,
        termino: '17:00',
        atividade: 'Cerimônia',
        referenciaLocal: 'Cerimonia',
        local: null,
        responsavel: 'Celebrante',
        categoriaFornecedor: null,
      }),
    ],
    criadoEm: '2026-10-01T12:00:00Z',
    atualizadoEm: '2026-10-01T12:00:00Z',
    ...dados,
  }
}

export function aplicacaoModeloCronograma(dados: Partial<AplicacaoModeloCronogramaDto> = {}): AplicacaoModeloCronogramaDto {
  return {
    itensNoModelo: 20,
    itensCriados: 20,
    jaAplicados: 0,
    fornecedoresPreenchidos: 2,
    itensAjustados: 0,
    itensNoCronograma: 0,
    excedeLimite: false,
    semHorarioCerimonia: false,
    horarioCerimonia: '16:30',
    primeiroItem: { dia: 'Vespera', inicio: '19:30', atividade: 'Ensaio da cerimônia' },
    ultimoItem: { dia: 'DiaSeguinte', inicio: '02:00', atividade: 'Desmontagem' },
    ...dados,
  }
}
