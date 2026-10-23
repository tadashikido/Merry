import { ORIENTACAO_TIPO_RESTRICAO, ROTULOS_TIPO_RESTRICAO, TEXTOS_PREPARO_BUFFET, TIPOS_ALERGIA } from '@/textos/dadosSensiveis'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { RestricoesBuffetDto } from '@/tipos/confirmacoes'
import type { TipoEvento } from '@/tipos/eventos'
import {
  TIPOS_RESTRICAO_ALIMENTAR,
  type ContagemRestricaoDto,
  type RelatorioRestricoesAlimentaresDto,
  type TipoRestricaoAlimentar,
} from '@/tipos/dadosSensiveis'

export function tiposComRestricao<T extends { tipo: TipoRestricaoAlimentar; quantidade: number }>(porTipo: readonly T[]): T[] {
  return porTipo.filter((contagem) => contagem.quantidade > 0 && TIPOS_RESTRICAO_ALIMENTAR.includes(contagem.tipo))
}

export function temAlergia(porTipo: readonly { tipo: TipoRestricaoAlimentar }[]): boolean {
  return porTipo.some((contagem) => TIPOS_ALERGIA.includes(contagem.tipo))
}

export interface SituacaoPreparoBuffet {
  confirmadas: number
  semResposta: number
  pendentesPorTipo: ContagemRestricaoDto[]
  alergiaConfirmada: boolean
  tiposConfirmados: ContagemRestricaoDto[]
}

export function situacaoPreparoBuffet(
  relatorio: Pick<RelatorioRestricoesAlimentaresDto, 'totalConfirmados' | 'porTipo' | 'pessoas'>,
): SituacaoPreparoBuffet {
  const pendentes = relatorio.pessoas.filter((pessoa) => pessoa.resposta === 'Pendente')
  const contagemPendentes = new Map<string, number>()
  for (const pessoa of pendentes) {
    for (const tipo of new Set(pessoa.tipos)) {
      contagemPendentes.set(tipo, (contagemPendentes.get(tipo) ?? 0) + 1)
    }
  }
  const tiposConfirmados = tiposComRestricao(relatorio.porTipo)

  return {
    confirmadas: relatorio.totalConfirmados,
    semResposta: pendentes.length,
    pendentesPorTipo: TIPOS_RESTRICAO_ALIMENTAR.filter((tipo) => contagemPendentes.has(tipo)).map((tipo) => ({
      tipo,
      quantidade: contagemPendentes.get(tipo) ?? 0,
    })),
    alergiaConfirmada: temAlergia(tiposConfirmados),
    tiposConfirmados,
  }
}

export interface OrientacaoBuffet {
  tipo: TipoRestricaoAlimentar
  rotulo: string
  texto: string
}

export interface ConferenciaBuffet {
  orientacoes: OrientacaoBuffet[]
  alergia: boolean
  outras: number
  necessidades: number
}

export function conferenciaBuffet(
  restricoes: Pick<RestricoesBuffetDto, 'porTipo' | 'outrasRestricoes' | 'necessidadesEspeciais' | 'dadosExcluidosEm'>,
  tipoEvento: TipoEvento | null,
): ConferenciaBuffet {
  if (restricoes.dadosExcluidosEm) {
    return { orientacoes: [], alergia: false, outras: 0, necessidades: 0 }
  }
  const doces = vocabularioOuNeutro(tipoEvento).cardapio.doces
  const tipos = tiposComRestricao(restricoes.porTipo)
  return {
    orientacoes: tipos.map((contagem) => ({
      tipo: contagem.tipo,
      rotulo: TEXTOS_PREPARO_BUFFET.itemContagem(ROTULOS_TIPO_RESTRICAO[contagem.tipo], contagem.quantidade),
      texto: ORIENTACAO_TIPO_RESTRICAO[contagem.tipo](doces),
    })),
    alergia: temAlergia(tipos),
    outras: restricoes.outrasRestricoes,
    necessidades: restricoes.necessidadesEspeciais,
  }
}
