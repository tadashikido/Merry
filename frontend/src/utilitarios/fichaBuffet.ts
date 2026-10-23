import { TEXTOS_FICHA_BUFFET } from '@/textos/confirmacoes'
import { ehTipoEvento, vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { EventoExportacaoDto } from '@/tipos/confirmacoes'
import type { EventoDto, TipoEvento } from '@/tipos/eventos'
import { formatarDataCalendarioComDiaSemana } from '@/utilitarios/formatacao'

export interface DetalheFichaEvento {
  chave: 'data' | 'horario' | 'localPrincipal' | 'localSecundario'
  rotulo: string
  valor: string
}

export interface CabecalhoFichaEvento {
  tipo: TipoEvento | null
  tipoRotulo: string | null
  detalhes: DetalheFichaEvento[]
}

type EventoDaFicha = Pick<EventoDto, 'tipo' | 'localCerimonia' | 'localRecepcao'>

function textoPreenchido(valor: string | null | undefined): string | null {
  const limpo = valor?.trim()
  return limpo ? limpo : null
}

function comInicialMaiuscula(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1)
}

export function cabecalhoFichaEvento(exportacao: EventoExportacaoDto, evento: EventoDaFicha | null): CabecalhoFichaEvento {
  const tipo = evento && ehTipoEvento(evento.tipo) ? evento.tipo : null
  const vocabulario = vocabularioOuNeutro(tipo)
  const detalhes: DetalheFichaEvento[] = [
    { chave: 'data', rotulo: TEXTOS_FICHA_BUFFET.data, valor: formatarDataCalendarioComDiaSemana(exportacao.data) },
  ]
  const horario = textoPreenchido(exportacao.horario)
  if (horario) {
    detalhes.push({ chave: 'horario', rotulo: vocabulario.horario, valor: horario })
  }
  const principal = textoPreenchido(evento ? evento.localCerimonia : exportacao.localRecepcao)
  const secundario = evento ? textoPreenchido(evento.localRecepcao) : null
  if (principal) {
    detalhes.push({ chave: 'localPrincipal', rotulo: vocabulario.locais.principal, valor: principal })
  }
  if (secundario && secundario.toLocaleLowerCase('pt-BR') !== principal?.toLocaleLowerCase('pt-BR')) {
    detalhes.push({ chave: 'localSecundario', rotulo: vocabulario.locais.secundario, valor: secundario })
  }
  return {
    tipo,
    tipoRotulo: tipo ? comInicialMaiuscula(vocabulario.contagem.singular) : null,
    detalhes,
  }
}

export type OrigemFichaBuffet = 'restricoes' | 'confirmacoes'

export interface RotaResolvida {
  name?: unknown
  params: Record<string, unknown>
}

export function origemDaFicha(
  anterior: unknown,
  eventoId: string,
  resolver: (caminho: string) => RotaResolvida,
): OrigemFichaBuffet {
  if (typeof anterior !== 'string' || !anterior.startsWith('/') || anterior.startsWith('//')) {
    return 'confirmacoes'
  }
  try {
    const rota = resolver(anterior)
    return rota.name === 'restricoes-alimentares' && rota.params.id === eventoId ? 'restricoes' : 'confirmacoes'
  } catch {
    return 'confirmacoes'
  }
}
