import { TEXTOS_CRONOGRAMA_PUBLICO } from '@/textos/cronogramaPublico'
import { ROTULOS_DIA_CRONOGRAMA } from '@/textos/cronograma'
import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'
import type { DiaCronograma } from '@/tipos/cronograma'
import type { EventoCronogramaPublicoDto, ItemCronogramaPublicoDto } from '@/tipos/cronogramaPublico'
import type { FaseGrandeDia } from '@/tipos/grandeDia'
import { resumirDias } from '@/utilitarios/cronograma'
import { agruparRoteiro } from '@/utilitarios/cronogramaPublico'
import { momentoPrincipal } from '@/utilitarios/grandeDia'
import { locaisDoConvite } from '@/utilitarios/rsvp'

export interface EntradaFraseMomento {
  momento: string
  horario: string | null
  fase: FaseGrandeDia | null
  minutoAtual: number
}

export interface HorariosDoDia {
  dia: DiaCronograma
  rotulo: string
  texto: string
}

export function fraseMomentoDoCronograma({ momento, horario, fase, minutoAtual }: EntradaFraseMomento): string | null {
  const principal = momentoPrincipal(minutoAtual, horario)
  if (!principal || fase === null) {
    return null
  }
  if (fase === 'AntesDoDia') {
    return TEXTOS_CRONOGRAMA_PUBLICO.momentoMarcado(momento, principal.horario)
  }
  if (fase === 'DepoisDoDia' || principal.minutos < 0) {
    return TEXTOS_GRANDE_DIA.momentoComecou(momento, principal.horario)
  }
  return principal.minutos === 0
    ? TEXTOS_GRANDE_DIA.momentoComecaAgora(momento, principal.horario)
    : TEXTOS_GRANDE_DIA.momentoComeca(momento, TEXTOS_GRANDE_DIA.emMinutos(principal.minutos), principal.horario)
}

export function horariosPorDia(
  itens: Pick<ItemCronogramaPublicoDto, 'dia' | 'data' | 'inicio' | 'termino' | 'terminaEmOutroDia'>[],
): HorariosDoDia[] {
  return resumirDias(agruparRoteiro(itens)).map((resumo) => ({
    dia: resumo.dia,
    rotulo: ROTULOS_DIA_CRONOGRAMA[resumo.dia],
    texto: TEXTOS_CRONOGRAMA_PUBLICO.quantidadeHorarios(resumo.quantidade, resumo.intervalo),
  }))
}

export function temConteudoParaODia(
  evento: Pick<EventoCronogramaPublicoDto, 'tipo' | 'horarioCerimonia' | 'localCerimonia' | 'localRecepcao'>,
  quantidadeItens: number,
): boolean {
  return quantidadeItens > 0 || momentoPrincipal(0, evento.horarioCerimonia) !== null || locaisDoConvite(evento).length > 0
}
