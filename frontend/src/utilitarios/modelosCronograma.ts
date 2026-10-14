import { TEXTOS_MODELOS_CRONOGRAMA } from '@/textos/modelosCronograma'
import type { DiaCronograma } from '@/tipos/cronograma'
import type { ItemModeloCronogramaDto, OpcaoLocalModelo } from '@/tipos/modelosCronograma'
import { horarioParaMinutos, minutosParaHorario, MINUTOS_POR_DIA } from '@/utilitarios/cronograma'
import type { RegraValidacao } from '@/utilitarios/validacao'

export const LIMITES_MODELO_CRONOGRAMA = {
  nomeMinimo: 2,
  nomeMaximo: 80,
  descricaoMaximo: 500,
  itens: 200,
  posicaoMinima: -MINUTOS_POR_DIA,
  posicaoMaxima: 2 * MINUTOS_POR_DIA - 1,
} as const

export const HORARIO_REFERENCIA_PADRAO = '16:00'

const DESLOCAMENTO_DIA: Record<DiaCronograma, number> = {
  Vespera: -1,
  DiaDoCasamento: 0,
  DiaSeguinte: 1,
}

export function posicaoDe(dia: DiaCronograma, inicio: string): number | null {
  const minutos = horarioParaMinutos(inicio)
  return minutos === null ? null : DESLOCAMENTO_DIA[dia] * MINUTOS_POR_DIA + minutos
}

export function minutosDesdeCerimonia(dia: DiaCronograma, inicio: string, referencia: string): number | null {
  const posicao = posicaoDe(dia, inicio)
  const cerimonia = horarioParaMinutos(referencia)
  return posicao === null || cerimonia === null ? null : posicao - cerimonia
}

export function posicaoNaReferencia(minutos: number, referencia: string): { dia: DiaCronograma; inicio: string } | null {
  const cerimonia = horarioParaMinutos(referencia)
  if (cerimonia === null) {
    return null
  }
  const posicao = Math.min(Math.max(cerimonia + minutos, LIMITES_MODELO_CRONOGRAMA.posicaoMinima), LIMITES_MODELO_CRONOGRAMA.posicaoMaxima)
  const dia: DiaCronograma = posicao < 0 ? 'Vespera' : posicao < MINUTOS_POR_DIA ? 'DiaDoCasamento' : 'DiaSeguinte'
  return { dia, inicio: minutosParaHorario(posicao) }
}

export function opcaoLocalDoItem(item: Pick<ItemModeloCronogramaDto, 'referenciaLocal' | 'local'>): OpcaoLocalModelo {
  return item.referenciaLocal ?? 'Outro'
}

export function agruparItensModeloPorDia(itens: ItemModeloCronogramaDto[]): { dia: DiaCronograma; itens: ItemModeloCronogramaDto[] }[] {
  const dias: DiaCronograma[] = ['Vespera', 'DiaDoCasamento', 'DiaSeguinte']
  return dias
    .map((dia) => ({ dia, itens: itens.filter((item) => item.dia === dia) }))
    .filter((grupo) => grupo.itens.length > 0)
}

export const regraNomeModeloCronograma: RegraValidacao = (valor) => {
  const texto = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : ''
  if (texto === '') {
    return null
  }
  return texto.length < LIMITES_MODELO_CRONOGRAMA.nomeMinimo || texto.length > LIMITES_MODELO_CRONOGRAMA.nomeMaximo
    ? TEXTOS_MODELOS_CRONOGRAMA.erroNomeTamanho
    : null
}

export const regraDescricaoModeloCronograma: RegraValidacao = (valor) => {
  const texto = typeof valor === 'string' ? valor.trim() : ''
  return texto.length > LIMITES_MODELO_CRONOGRAMA.descricaoMaximo ? TEXTOS_MODELOS_CRONOGRAMA.erroDescricaoTamanho : null
}

export const regraHorarioReferencia: RegraValidacao = (valor) => {
  const texto = typeof valor === 'string' ? valor.trim() : ''
  return horarioParaMinutos(texto) === null ? TEXTOS_MODELOS_CRONOGRAMA.erroHorario : null
}
