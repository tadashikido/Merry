import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'

export interface VocabularioTipoEvento {
  rotulo: string
  rotuloPlural: string
  descricao: string
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
  aneisNoConvite: boolean
  celebracao: (nomes: string, varios: boolean) => string
}

export const VOCABULARIO_TIPO_EVENTO: Record<TipoEvento, VocabularioTipoEvento> = {
  Casamento: {
    rotulo: 'Casamento',
    rotuloPlural: 'Casamentos',
    descricao: 'Dois nomes, cerimônia e recepção',
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
    aneisNoConvite: true,
    celebracao: (nomes) => `${nomes} vão se casar`,
  },
  QuinzeAnos: {
    rotulo: '15 anos',
    rotuloPlural: 'Festas de 15 anos',
    descricao: 'A festa da debutante',
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
    aneisNoConvite: false,
    celebracao: (nomes) => `${nomes} vai comemorar os 15 anos`,
  },
  Aniversario: {
    rotulo: 'Aniversário',
    rotuloPlural: 'Aniversários',
    descricao: 'Para quem faz aniversário',
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
    aneisNoConvite: false,
    celebracao: (nomes) => `${nomes} vai comemorar o aniversário`,
  },
  Comemoracao: {
    rotulo: 'Comemoração',
    rotuloPlural: 'Comemorações',
    descricao: 'Bodas, chá, encontro de família',
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
