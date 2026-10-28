import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { FASES_EVENTO, TIPOS_EVENTO, type EventoResumoDto, type FaseEvento, type TipoEvento } from '@/tipos/eventos'
import { formatarNumero } from '@/utilitarios/formatacao'

export const JANELA_SEMANA_DIAS = 7
export const JANELA_MES_DIAS = 30

export interface QuantidadePorTipo {
  tipo: TipoEvento
  quantidade: number
}

export interface QuantidadePorFase {
  fase: FaseEvento
  quantidade: number
}

export interface FiltroEventos {
  tipo: TipoEvento | null
  fase: FaseEvento | null
}

export interface ResumoCarteira {
  pelaFrente: number
  proximos7Dias: number
  proximos30Dias: number
  realizados: number
  porTipo: QuantidadePorTipo[]
}

export function resumirCarteira(eventos: readonly EventoResumoDto[]): ResumoCarteira {
  const ativos = eventos.filter((evento) => !evento.arquivado)
  const futuros = ativos.filter((evento) => evento.diasRestantes >= 0)
  const porTipo = TIPOS_EVENTO.map((tipo) => ({
    tipo,
    quantidade: futuros.filter((evento) => evento.tipo === tipo).length,
  })).filter((item) => item.quantidade > 0)

  return {
    pelaFrente: futuros.length,
    proximos7Dias: futuros.filter((evento) => evento.diasRestantes <= JANELA_SEMANA_DIAS).length,
    proximos30Dias: futuros.filter((evento) => evento.diasRestantes <= JANELA_MES_DIAS).length,
    realizados: ativos.length - futuros.length,
    porTipo,
  }
}

export interface ParteCarteiraTipo {
  tipo: TipoEvento
  quantidade: number
  texto: string
  separador: string
}

export function partesCarteiraPorTipo(porTipo: readonly QuantidadePorTipo[]): ParteCarteiraTipo[] {
  const ultimo = porTipo.length - 1
  return porTipo.map(({ tipo, quantidade }, indice) => {
    const { singular, plural } = VOCABULARIO_TIPO_EVENTO[tipo].contagem
    const separador = indice === ultimo ? '' : indice === ultimo - 1 ? ' e ' : ', '
    return { tipo, quantidade, texto: `${formatarNumero(quantidade)} ${quantidade === 1 ? singular : plural}`, separador }
  })
}

export function descreverCarteiraPorTipo(porTipo: readonly QuantidadePorTipo[]): string {
  return partesCarteiraPorTipo(porTipo)
    .map((parte) => `${parte.texto}${parte.separador}`)
    .join('')
}

export function contarPorTipo(eventos: readonly EventoResumoDto[]): QuantidadePorTipo[] {
  return TIPOS_EVENTO.map((tipo) => ({
    tipo,
    quantidade: eventos.filter((evento) => evento.tipo === tipo).length,
  })).filter((item) => item.quantidade > 0)
}

export function contarPorFase(eventos: readonly EventoResumoDto[]): QuantidadePorFase[] {
  return FASES_EVENTO.map((fase) => ({
    fase,
    quantidade: eventos.filter((evento) => evento.fase === fase).length,
  })).filter((item) => item.quantidade > 0)
}

export function filtrarEventos(eventos: readonly EventoResumoDto[], filtro: FiltroEventos): EventoResumoDto[] {
  return eventos.filter(
    (evento) => (filtro.tipo === null || evento.tipo === filtro.tipo) && (filtro.fase === null || evento.fase === filtro.fase),
  )
}
