import { TEXTOS_TAREFAS } from '@/textos/tarefas'
import type { VocabularioTipoEvento } from '@/textos/tiposEvento'
import type { DataCalendario } from '@/tipos/eventos'
import { diferencaEmDias, ehDataCalendario, somarDias } from '@/utilitarios/dataCalendario'

export interface DadosEventoPrazo {
  data: DataCalendario
  diasRestantes: number
  dataLimiteRsvpEfetiva: DataCalendario | null
}

export interface PosicaoPrazoNoEvento {
  diasAntesDoEvento: number
  diasAteHoje: number
}

export type ChaveMarcoPrazo = 'hoje' | 'prazo' | 'confirmacoes' | 'evento'

export interface MarcoPrazo {
  chave: ChaveMarcoPrazo
  data: DataCalendario
  diasAteHoje: number
}

const ORDEM_MARCOS: Record<ChaveMarcoPrazo, number> = { hoje: 0, prazo: 1, confirmacoes: 2, evento: 3 }

function diasAteHoje(data: DataCalendario, evento: DadosEventoPrazo): number | null {
  const antes = diferencaEmDias(data, evento.data)
  return antes === null ? null : evento.diasRestantes - antes
}

export function posicaoPrazoNoEvento(prazo: string, evento: DadosEventoPrazo): PosicaoPrazoNoEvento | null {
  if (!ehDataCalendario(prazo)) {
    return null
  }
  const diasAntesDoEvento = diferencaEmDias(prazo, evento.data)
  if (diasAntesDoEvento === null) {
    return null
  }
  return { diasAntesDoEvento, diasAteHoje: evento.diasRestantes - diasAntesDoEvento }
}

export function descreverPrazoNoEvento(posicao: PosicaoPrazoNoEvento, vocabulario: VocabularioTipoEvento): string {
  const contracaoDe = vocabulario.referencia.contracaoDe
  if (posicao.diasAntesDoEvento > 0) {
    return TEXTOS_TAREFAS.prazoAntesDoEvento(posicao.diasAntesDoEvento, contracaoDe)
  }
  if (posicao.diasAntesDoEvento === 0) {
    return TEXTOS_TAREFAS.prazoNoDiaDoEvento(contracaoDe)
  }
  return TEXTOS_TAREFAS.prazoDepoisDoEvento(-posicao.diasAntesDoEvento, contracaoDe)
}

export function descreverDistancia(diasAteHoje: number): string {
  if (diasAteHoje === 0) {
    return TEXTOS_TAREFAS.distanciaHoje
  }
  if (diasAteHoje === 1) {
    return TEXTOS_TAREFAS.distanciaAmanha
  }
  return diasAteHoje > 1 ? TEXTOS_TAREFAS.distanciaFutura(diasAteHoje) : TEXTOS_TAREFAS.distanciaPassada(-diasAteHoje)
}

export function descreverFaltaParaEvento(diasRestantes: number, vocabulario: VocabularioTipoEvento): string {
  const artigo = vocabulario.referencia.artigo
  if (diasRestantes > 0) {
    return TEXTOS_TAREFAS.calendarioFalta(diasRestantes, artigo)
  }
  return diasRestantes === 0 ? TEXTOS_TAREFAS.calendarioHoje(artigo) : TEXTOS_TAREFAS.calendarioPassou(artigo)
}

export function marcosDoPrazo(evento: DadosEventoPrazo, prazo: string): MarcoPrazo[] {
  const marcos: MarcoPrazo[] = []
  const hoje = somarDias(evento.data, -evento.diasRestantes)
  if (hoje) {
    marcos.push({ chave: 'hoje', data: hoje, diasAteHoje: 0 })
  }
  const candidatos: { chave: ChaveMarcoPrazo; data: DataCalendario | null }[] = [
    { chave: 'prazo', data: ehDataCalendario(prazo) ? prazo : null },
    { chave: 'confirmacoes', data: evento.dataLimiteRsvpEfetiva },
    { chave: 'evento', data: evento.data },
  ]
  for (const candidato of candidatos) {
    if (!candidato.data || !ehDataCalendario(candidato.data)) {
      continue
    }
    const dias = diasAteHoje(candidato.data, evento)
    if (dias !== null) {
      marcos.push({ chave: candidato.chave, data: candidato.data, diasAteHoje: dias })
    }
  }
  return marcos.sort((a, b) => a.diasAteHoje - b.diasAteHoje || ORDEM_MARCOS[a.chave] - ORDEM_MARCOS[b.chave])
}
