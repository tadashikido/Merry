import type { ItemContagem } from '@/componentes/base/tipos'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import type { TotaisConvidadosDto } from '@/tipos/convidados'

export function itensResumoConvidados(totais: TotaisConvidadosDto): ItemContagem[] {
  return [
    {
      chave: 'pessoas',
      valor: totais.pessoas,
      rotulo: TEXTOS_CONVIDADOS.totalPessoas(totais.pessoas),
      detalhe: TEXTOS_CONVIDADOS.detalheFaixas(totais.adultos, totais.criancas),
    },
    {
      chave: 'confirmadas',
      valor: totais.confirmados.total,
      rotulo: TEXTOS_CONVIDADOS.totalConfirmadas(totais.confirmados.total),
      detalhe: TEXTOS_CONVIDADOS.detalheFaixas(totais.confirmados.adultos, totais.confirmados.criancas),
      destaque: true,
    },
    {
      chave: 'pendentes',
      valor: totais.pendentes.total,
      rotulo: TEXTOS_CONVIDADOS.totalPendentes(totais.pendentes.total),
      detalhe: TEXTOS_CONVIDADOS.detalheFaixas(totais.pendentes.adultos, totais.pendentes.criancas),
    },
    {
      chave: 'recusadas',
      valor: totais.recusados.total,
      rotulo: TEXTOS_CONVIDADOS.totalRecusadas(totais.recusados.total),
      detalhe: TEXTOS_CONVIDADOS.detalheFaixas(totais.recusados.adultos, totais.recusados.criancas),
    },
  ]
}

export function complementoResumoConvidados(totais: TotaisConvidadosDto, convidadosEstimados: number | null): string {
  const partes = [TEXTOS_CONVIDADOS.complementoConvites(totais.convites, totais.acompanhantesPermitidos)]
  if (convidadosEstimados !== null) {
    partes.push(TEXTOS_CONVIDADOS.comparacaoEstimativa(totais.pessoas, convidadosEstimados))
  }
  return partes.join(' · ')
}
