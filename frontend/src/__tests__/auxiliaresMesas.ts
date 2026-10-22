import type { AvisoSaidaMesaDto, MapaMesasDto, MesaDto, PessoaMesaDto } from '@/tipos/mesas'

export const MESA_ANFITRIOES = 'aaaaaaaa-0000-4000-8000-000000000001'
export const MESA_PADRINHOS = 'aaaaaaaa-0000-4000-8000-000000000002'
export const MESA_TIOS = 'aaaaaaaa-0000-4000-8000-000000000003'
export const CONVITE_SOUZA = 'bbbbbbbb-0000-4000-8000-000000000001'
export const CONVITE_RUI = 'bbbbbbbb-0000-4000-8000-000000000002'
export const CONVITE_LIMA = 'bbbbbbbb-0000-4000-8000-000000000003'

export function mesaExemplo(dados: Partial<MesaDto> = {}): MesaDto {
  return {
    id: MESA_PADRINHOS,
    numero: 2,
    nome: 'Padrinhos',
    capacidade: 8,
    especial: false,
    ocupacao: 0,
    criadoEm: '2026-10-01T12:00:00Z',
    atualizadoEm: '2026-10-01T12:00:00Z',
    ...dados,
  }
}

export function pessoaMesa(dados: Partial<PessoaMesaDto> & Pick<PessoaMesaDto, 'id' | 'nome'>): PessoaMesaDto {
  return {
    faixaEtaria: 'Adulto',
    acompanhante: false,
    conviteId: CONVITE_SOUZA,
    convite: 'Família Souza',
    grupo: 'Família da noiva',
    mesaId: null,
    ...dados,
  }
}

export function avisoExemplo(dados: Partial<AvisoSaidaMesaDto> = {}): AvisoSaidaMesaDto {
  return {
    convidadoId: 'cccccccc-0000-4000-8000-000000000009',
    nome: 'Bia Lima',
    convite: 'Família Lima',
    resposta: 'Recusado',
    mesaId: MESA_PADRINHOS,
    mesaNumero: 2,
    mesaNome: 'Padrinhos',
    mesaEspecial: false,
    saiuEm: '2026-10-02T15:00:00Z',
    ...dados,
  }
}

export function mapaExemplo(dados: Partial<MapaMesasDto> = {}): MapaMesasDto {
  const pessoas = dados.pessoas ?? [
    pessoaMesa({ id: 'p-carla', nome: 'Carla Souza' }),
    pessoaMesa({ id: 'p-pedro', nome: 'Pedro Souza', faixaEtaria: 'Crianca' }),
    pessoaMesa({ id: 'p-ana', nome: 'Ana Souza', mesaId: MESA_ANFITRIOES }),
    pessoaMesa({ id: 'p-rui', nome: 'Rui Fontes', conviteId: CONVITE_RUI, convite: 'Rui Fontes', grupo: 'Amigos do trabalho', mesaId: MESA_PADRINHOS }),
    pessoaMesa({ id: 'p-zeca', nome: '=Primo Zeca', conviteId: CONVITE_LIMA, convite: 'Família Lima', grupo: null, acompanhante: true }),
  ]
  const mesas = dados.mesas ?? [
    mesaExemplo({ id: MESA_ANFITRIOES, numero: 1, nome: null, especial: true, capacidade: 2, ocupacao: 1 }),
    mesaExemplo({ id: MESA_PADRINHOS, numero: 2, nome: 'Padrinhos', capacidade: 3, ocupacao: 1 }),
    mesaExemplo({ id: MESA_TIOS, numero: 3, nome: 'Tios', capacidade: 2, ocupacao: 0 }),
  ]
  const acomodados = pessoas.filter((pessoa) => pessoa.mesaId !== null).length
  return {
    mesas,
    pessoas,
    avisosSaida: [],
    totais: {
      mesas: mesas.length,
      capacidadeTotal: mesas.reduce((soma, mesa) => soma + mesa.capacidade, 0),
      confirmados: pessoas.length,
      acomodados,
      lugaresLivres: mesas.reduce((soma, mesa) => soma + Math.max(mesa.capacidade - mesa.ocupacao, 0), 0),
      semMesa: pessoas.length - acomodados,
    },
    eventoArquivado: false,
    ...dados,
  }
}
