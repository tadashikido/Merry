import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import type { CategoriaFornecedor } from '@/tipos/fornecedores'

export interface VocabularioTipoEvento {
  rotulo: string
  rotuloPlural: string
  descricao: string
  comoCostumaSer: string
  contagem: {
    singular: string
    plural: string
  }
  referencia: {
    artigo: string
    contracaoDe: string
    indefinido: string
    relativoAoMomento: string
  }
  momento: {
    artigo: string
    contracaoDe: string
  }
  homenageados: {
    grupo: string
    primeiro: string
    segundo: string | null
    segundoObrigatorio: boolean
    dicaPrimeiro: string | null
  }
  locais: {
    principal: string
    secundario: string
    campoPrincipal: string
    campoSecundario: string
    dicaSecundario: string
  }
  horario: string
  momentoPrincipal: string
  faltaHorario: string
  faltaLocal: string
  mesaEspecial: string
  fornecedoresEssenciais: readonly CategoriaFornecedor[]
  aneisNoConvite: boolean
  celebracao: (nomes: string, varios: boolean) => string
}

export const VOCABULARIO_TIPO_EVENTO: Record<TipoEvento, VocabularioTipoEvento> = {
  Casamento: {
    rotulo: 'Casamento',
    rotuloPlural: 'Casamentos',
    descricao: 'Dois nomes, cerimônia e recepção',
    comoCostumaSer: 'Cerimônia e recepção, às vezes em lugares diferentes, com padrinhos, mesa dos noivos e um roteiro do dia com horários marcados.',
    contagem: {
      singular: 'casamento',
      plural: 'casamentos',
    },
    referencia: {
      artigo: 'o casamento',
      contracaoDe: 'do casamento',
      indefinido: 'um casamento',
      relativoAoMomento: 'à cerimônia',
    },
    momento: {
      artigo: 'a cerimônia',
      contracaoDe: 'da cerimônia',
    },
    homenageados: {
      grupo: 'Os noivos',
      primeiro: 'Nome de um dos noivos',
      segundo: 'Nome do outro noivo',
      segundoObrigatorio: true,
      dicaPrimeiro: null,
    },
    locais: {
      principal: 'Cerimônia',
      secundario: 'Recepção',
      campoPrincipal: 'Local da cerimônia',
      campoSecundario: 'Local da recepção',
      dicaSecundario: 'Se for no mesmo lugar, repita o nome.',
    },
    horario: 'Horário da cerimônia',
    momentoPrincipal: 'cerimônia',
    faltaHorario: 'Falta o horário da cerimônia.',
    faltaLocal: 'Falta o local da cerimônia.',
    mesaEspecial: 'Mesa dos noivos',
    fornecedoresEssenciais: ['EspacoLocal', 'Buffet', 'Fotografia', 'Decoracao', 'Musica', 'Filmagem', 'BoloDoces', 'Beleza', 'Vestuario', 'ConvitesPapelaria'],
    aneisNoConvite: true,
    celebracao: (nomes) => `${nomes} vão se casar`,
  },
  QuinzeAnos: {
    rotulo: '15 anos',
    rotuloPlural: 'Festas de 15 anos',
    descricao: 'A festa da debutante',
    comoCostumaSer: 'Uma festa com valsa, homenagens e mesa da debutante; às vezes com missa ou cerimônia antes, em outro endereço.',
    contagem: {
      singular: 'festa de 15 anos',
      plural: 'festas de 15 anos',
    },
    referencia: {
      artigo: 'a festa de 15 anos',
      contracaoDe: 'da festa de 15 anos',
      indefinido: 'uma festa de 15 anos',
      relativoAoMomento: 'à festa',
    },
    momento: {
      artigo: 'a festa',
      contracaoDe: 'da festa',
    },
    homenageados: {
      grupo: 'A debutante',
      primeiro: 'Nome da debutante',
      segundo: null,
      segundoObrigatorio: false,
      dicaPrimeiro: null,
    },
    locais: {
      principal: 'Festa',
      secundario: 'Outro local',
      campoPrincipal: 'Local da festa',
      campoSecundario: 'Outro local',
      dicaSecundario: 'Use se parte do evento for em outro endereço, como uma missa antes da festa.',
    },
    horario: 'Horário da festa',
    momentoPrincipal: 'festa',
    faltaHorario: 'Falta o horário da festa.',
    faltaLocal: 'Falta o local da festa.',
    mesaEspecial: 'Mesa da debutante',
    fornecedoresEssenciais: ['EspacoLocal', 'Buffet', 'Decoracao', 'Fotografia', 'Musica', 'IluminacaoSom', 'Filmagem', 'BoloDoces', 'Beleza', 'Vestuario'],
    aneisNoConvite: false,
    celebracao: (nomes) => `${nomes} vai comemorar os 15 anos`,
  },
  Aniversario: {
    rotulo: 'Aniversário',
    rotuloPlural: 'Aniversários',
    descricao: 'Para quem faz aniversário',
    comoCostumaSer: 'Uma festa, quase sempre num lugar só, com parabéns, mesa do aniversariante e uma lista de convidados mais próxima.',
    contagem: {
      singular: 'aniversário',
      plural: 'aniversários',
    },
    referencia: {
      artigo: 'o aniversário',
      contracaoDe: 'do aniversário',
      indefinido: 'um aniversário',
      relativoAoMomento: 'à festa',
    },
    momento: {
      artigo: 'a festa',
      contracaoDe: 'da festa',
    },
    homenageados: {
      grupo: 'O aniversariante',
      primeiro: 'Nome do aniversariante',
      segundo: null,
      segundoObrigatorio: false,
      dicaPrimeiro: null,
    },
    locais: {
      principal: 'Festa',
      secundario: 'Outro local',
      campoPrincipal: 'Local da festa',
      campoSecundario: 'Outro local',
      dicaSecundario: 'Use se parte do evento for em outro endereço.',
    },
    horario: 'Horário da festa',
    momentoPrincipal: 'festa',
    faltaHorario: 'Falta o horário da festa.',
    faltaLocal: 'Falta o local da festa.',
    mesaEspecial: 'Mesa do aniversariante',
    fornecedoresEssenciais: ['EspacoLocal', 'Buffet', 'Decoracao', 'BoloDoces', 'Fotografia', 'Musica'],
    aneisNoConvite: false,
    celebracao: (nomes) => `${nomes} vai comemorar o aniversário`,
  },
  Comemoracao: {
    rotulo: 'Comemoração',
    rotuloPlural: 'Comemorações',
    descricao: 'Bodas, chá, encontro de família',
    comoCostumaSer: 'Bodas, chá ou encontro de família: um ou mais homenageados, um local principal e um roteiro simples.',
    contagem: {
      singular: 'comemoração',
      plural: 'comemorações',
    },
    referencia: {
      artigo: 'a comemoração',
      contracaoDe: 'da comemoração',
      indefinido: 'uma comemoração',
      relativoAoMomento: 'ao evento',
    },
    momento: {
      artigo: 'o evento',
      contracaoDe: 'do evento',
    },
    homenageados: {
      grupo: 'Os homenageados',
      primeiro: 'Quem celebra',
      segundo: 'Outro nome (opcional)',
      segundoObrigatorio: false,
      dicaPrimeiro: 'Pode ser um nome, um casal ou a família, como “Família Souza”.',
    },
    locais: {
      principal: 'Local',
      secundario: 'Outro local',
      campoPrincipal: 'Local do evento',
      campoSecundario: 'Outro local',
      dicaSecundario: 'Use se parte do evento for em outro endereço.',
    },
    horario: 'Horário do evento',
    momentoPrincipal: 'evento',
    faltaHorario: 'Falta o horário do evento.',
    faltaLocal: 'Falta o local do evento.',
    mesaEspecial: 'Mesa de honra',
    fornecedoresEssenciais: ['EspacoLocal', 'Buffet', 'Decoracao', 'Fotografia'],
    aneisNoConvite: false,
    celebracao: (nomes, varios) => `${nomes} ${varios ? 'vão' : 'vai'} celebrar`,
  },
}

export function ehTipoEvento(valor: unknown): valor is TipoEvento {
  return typeof valor === 'string' && (TIPOS_EVENTO as readonly string[]).includes(valor)
}

export function vocabularioDoTipo(tipo: TipoEvento | null | undefined): VocabularioTipoEvento {
  return VOCABULARIO_TIPO_EVENTO[ehTipoEvento(tipo) ? tipo : 'Casamento']
}

export const TIPO_EVENTO_NEUTRO: TipoEvento = 'Comemoracao'

export function vocabularioOuNeutro(tipo: TipoEvento | null | undefined): VocabularioTipoEvento {
  return VOCABULARIO_TIPO_EVENTO[ehTipoEvento(tipo) ? tipo : TIPO_EVENTO_NEUTRO]
}

export function aceitaSegundoNome(tipo: TipoEvento): boolean {
  return VOCABULARIO_TIPO_EVENTO[tipo].homenageados.segundo !== null
}

export function tiposEventoEmFrase(): string {
  const rotulos = TIPOS_EVENTO.map((tipo) => VOCABULARIO_TIPO_EVENTO[tipo].rotuloPlural.toLocaleLowerCase('pt-BR'))
  const ultimo = rotulos.pop() ?? ''
  return rotulos.length > 0 ? `${rotulos.join(', ')} e ${ultimo}` : ultimo
}

export const TEXTOS_TIPO_EVENTO = {
  grupo: 'Tipo de evento',
} as const
