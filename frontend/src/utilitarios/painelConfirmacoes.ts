import type { SegmentoProgresso } from '@/componentes/base/tipos'
import { TEXTOS_COBRANCA, TEXTOS_CONFIRMACOES } from '@/textos/confirmacoes'
import type { ConvitePendenteDto, SituacaoConvitesDto } from '@/tipos/confirmacoes'
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

const MINUTOS_AGORA_HA_POUCO = 5
const MILISSEGUNDOS_MINUTO = 60_000
const MILISSEGUNDOS_DIA = 86_400_000

function inicioDoDia(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime()
}

function diasEntre(anterior: Date, atual: Date): number {
  return Math.round((inicioDoDia(atual) - inicioDoDia(anterior)) / MILISSEGUNDOS_DIA)
}

function lerInstante(instante: string | null): Date | null {
  if (!instante) {
    return null
  }
  const data = new Date(instante)
  return Number.isNaN(data.getTime()) ? null : data
}

export function filaCobranca(pendentes: ConvitePendenteDto[]): ConvitePendenteDto[] {
  return pendentes
    .filter((pendente) => pendente.cobravel)
    .sort((a, b) => {
      const instanteA = lerInstante(a.ultimaCobrancaEm)?.getTime() ?? null
      const instanteB = lerInstante(b.ultimaCobrancaEm)?.getTime() ?? null
      if (instanteA === null && instanteB === null) {
        return a.nome.localeCompare(b.nome, 'pt-BR')
      }
      if (instanteA === null) {
        return -1
      }
      if (instanteB === null) {
        return 1
      }
      return instanteA - instanteB || a.nome.localeCompare(b.nome, 'pt-BR')
    })
}

export function cobradoHoje(instante: string | null, agora: Date = new Date()): boolean {
  const data = lerInstante(instante)
  return data !== null && diasEntre(data, agora) === 0
}

export function contarCobradosHoje(pendentes: ConvitePendenteDto[], agora: Date = new Date()): number {
  return pendentes.filter((pendente) => cobradoHoje(pendente.ultimaCobrancaEm, agora)).length
}

export function formatarHoraCurta(data: Date): string {
  return `${data.getHours()}h${String(data.getMinutes()).padStart(2, '0')}`
}

export function textoUltimaCobranca(instante: string | null, agora: Date = new Date()): string {
  const data = lerInstante(instante)
  if (!data) {
    return TEXTOS_COBRANCA.nuncaCobrado
  }
  const dias = diasEntre(data, agora)
  if (dias <= 0) {
    const minutos = (agora.getTime() - data.getTime()) / MILISSEGUNDOS_MINUTO
    return minutos < MINUTOS_AGORA_HA_POUCO ? TEXTOS_COBRANCA.cobradoAgora : TEXTOS_COBRANCA.cobradoHoje(formatarHoraCurta(data))
  }
  return dias === 1 ? TEXTOS_COBRANCA.cobradoOntem : TEXTOS_COBRANCA.cobradoDias(dias)
}
