import type { SegmentoProgresso } from '@/componentes/base/tipos'
import { TEXTOS_CONFIRMACOES } from '@/textos/confirmacoes'
import type { SituacaoConvitesDto } from '@/tipos/confirmacoes'
import { contemTexto } from '@/utilitarios/busca'
import { formatarNumero } from '@/utilitarios/formatacao'

export function segmentosEnvio(convites: SituacaoConvitesDto): SegmentoProgresso[] {
  return [
    { chave: 'naoEnviados', rotulo: TEXTOS_CONFIRMACOES.naoEnviados, valor: convites.naoEnviados, tom: 'neutro' },
    { chave: 'enviados', rotulo: TEXTOS_CONFIRMACOES.enviados, valor: convites.enviados, tom: 'informacao' },
    { chave: 'visualizados', rotulo: TEXTOS_CONFIRMACOES.visualizados, valor: convites.visualizados, tom: 'marca' },
  ]
}

export function textoEstimativa(pessoas: number, estimados: number | null): string | null {
  if (estimados === null) {
    return null
  }
  const diferenca = pessoas - estimados
  const complemento =
    diferenca === 0
      ? TEXTOS_CONFIRMACOES.estimativaIgual
      : diferenca > 0
        ? TEXTOS_CONFIRMACOES.estimativaAcima(diferenca)
        : TEXTOS_CONFIRMACOES.estimativaAbaixo(-diferenca)
  return `${formatarNumero(pessoas)} de ${formatarNumero(estimados)} estimados · ${complemento}`
}

export function filtrarPendentes<T extends { nome: string; pessoasPendentes: string[] }>(pendentes: T[], busca: string): T[] {
  return pendentes.filter((pendente) => contemTexto(busca, pendente.nome, ...pendente.pessoasPendentes))
}
