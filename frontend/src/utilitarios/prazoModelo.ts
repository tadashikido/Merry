import { TEXTOS_ITEM_MODELO } from '@/textos/checklist'
import { MARCOS_CHECKLIST, type ItemModeloChecklistDto, type MarcoChecklist } from '@/tipos/checklist'
import { alcanceDosPrazos, marcoPorDias, type AlcancePrazos } from '@/utilitarios/checklist'

const DIAS_POR_SEMANA = 7
const DIAS_POR_MES = 30
const MESES_POR_ANO = 12
const LIMITE_DIAS_EXATOS = 14
const LIMITE_SEMANAS = 60

export type UnidadePrazo = 'dia' | 'semana' | 'mes' | 'ano'

export interface PrazoAproximado {
  unidade: UnidadePrazo
  quantidade: number
  meses: number
  exato: boolean
}

export function aproximarDias(dias: number): PrazoAproximado {
  const absoluto = Math.abs(dias)
  if (absoluto < LIMITE_DIAS_EXATOS) {
    return { unidade: 'dia', quantidade: absoluto, meses: 0, exato: true }
  }
  if (absoluto < LIMITE_SEMANAS) {
    return {
      unidade: 'semana',
      quantidade: Math.round(absoluto / DIAS_POR_SEMANA),
      meses: 0,
      exato: absoluto % DIAS_POR_SEMANA === 0,
    }
  }
  const meses = Math.round(absoluto / DIAS_POR_MES)
  if (meses < MESES_POR_ANO) {
    return { unidade: 'mes', quantidade: meses, meses: 0, exato: false }
  }
  return { unidade: 'ano', quantidade: Math.floor(meses / MESES_POR_ANO), meses: meses % MESES_POR_ANO, exato: false }
}

function quantidadeEmTexto(prazo: PrazoAproximado): string {
  switch (prazo.unidade) {
    case 'dia':
      return TEXTOS_ITEM_MODELO.dias(prazo.quantidade)
    case 'semana':
      return TEXTOS_ITEM_MODELO.semanas(prazo.quantidade)
    case 'mes':
      return TEXTOS_ITEM_MODELO.meses(prazo.quantidade)
    default:
      return TEXTOS_ITEM_MODELO.anos(prazo.quantidade, prazo.meses)
  }
}

export function descreverPrazoAproximado(dias: number, contracaoDe: string): string {
  if (dias === 0) {
    return TEXTOS_ITEM_MODELO.prazoNoDia(contracaoDe)
  }
  const prazo = aproximarDias(dias)
  const sentido = dias > 0 ? 'antes' : 'depois'
  const quantidade = quantidadeEmTexto(prazo)
  return prazo.exato
    ? TEXTOS_ITEM_MODELO.prazoExato(quantidade, sentido, contracaoDe)
    : TEXTOS_ITEM_MODELO.prazoCerca(quantidade, sentido, contracaoDe)
}

export interface MarcoDoModelo {
  marco: MarcoChecklist
  quantidade: number
  atual: boolean
}

export interface PosicaoItemNoModelo {
  marco: MarcoChecklist | null
  marcos: MarcoDoModelo[]
  vizinhos: ItemModeloChecklistDto[]
  maisNoMarco: number
  alcance: AlcancePrazos | null
  ampliaPrimeiro: boolean
  ampliaUltimo: boolean
  outrosItens: number
}

export function posicaoItemNoModelo(
  itens: readonly ItemModeloChecklistDto[],
  dias: number | null,
  itemId: string | null = null,
  limite = 4,
): PosicaoItemNoModelo {
  const outros = itens.filter((item) => item.id !== itemId)
  const marco = dias === null ? null : marcoPorDias(dias)
  const contagem = new Map<MarcoChecklist, number>()
  for (const item of outros) {
    const chave = marcoPorDias(item.diasAntesDoEvento)
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
  }
  const marcos = MARCOS_CHECKLIST.filter((chave) => contagem.has(chave) || chave === marco).map((chave) => ({
    marco: chave,
    quantidade: (contagem.get(chave) ?? 0) + (chave === marco ? 1 : 0),
    atual: chave === marco,
  }))

  const doMarco = dias === null ? [] : outros.filter((item) => marcoPorDias(item.diasAntesDoEvento) === marco)
  const vizinhos =
    dias === null
      ? []
      : [...doMarco]
          .sort((a, b) => Math.abs(a.diasAntesDoEvento - dias) - Math.abs(b.diasAntesDoEvento - dias))
          .slice(0, limite)
          .sort((a, b) => b.diasAntesDoEvento - a.diasAntesDoEvento)

  const alcance = alcanceDosPrazos(outros.map((item) => item.diasAntesDoEvento))
  return {
    marco,
    marcos,
    vizinhos,
    maisNoMarco: doMarco.length - vizinhos.length,
    alcance,
    ampliaPrimeiro: alcance !== null && dias !== null && dias > alcance.primeiro,
    ampliaUltimo: alcance !== null && dias !== null && dias < alcance.ultimo,
    outrosItens: outros.length,
  }
}
