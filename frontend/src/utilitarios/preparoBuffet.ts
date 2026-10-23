import { TIPOS_ALERGIA } from '@/textos/dadosSensiveis'
import {
  TIPOS_RESTRICAO_ALIMENTAR,
  type ContagemRestricaoDto,
  type RelatorioRestricoesAlimentaresDto,
} from '@/tipos/dadosSensiveis'

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
  const tiposConfirmados = relatorio.porTipo.filter(
    (contagem) => contagem.quantidade > 0 && TIPOS_RESTRICAO_ALIMENTAR.includes(contagem.tipo),
  )

  return {
    confirmadas: relatorio.totalConfirmados,
    semResposta: pendentes.length,
    pendentesPorTipo: TIPOS_RESTRICAO_ALIMENTAR.filter((tipo) => contagemPendentes.has(tipo)).map((tipo) => ({
      tipo,
      quantidade: contagemPendentes.get(tipo) ?? 0,
    })),
    alergiaConfirmada: tiposConfirmados.some((contagem) => TIPOS_ALERGIA.includes(contagem.tipo)),
    tiposConfirmados,
  }
}
