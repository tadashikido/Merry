import type { SegmentoProgresso } from '@/componentes/base/tipos'
import { TEXTOS_COBRANCA, TEXTOS_CONFIRMACOES } from '@/textos/confirmacoes'
import type { ConvitePendenteDto, PainelConfirmacoesDto, SituacaoConvitesDto } from '@/tipos/confirmacoes'
import type { DataCalendario } from '@/tipos/eventos'
import { contemTexto } from '@/utilitarios/busca'
import { diferencaEmDias } from '@/utilitarios/dataCalendario'
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

export interface FaixaConfirmacao {
  confirmadas: number
  maximo: number
  semResposta: number
}

export function faixaConfirmacao(confirmadas: number, semResposta: number): FaixaConfirmacao {
  return { confirmadas, maximo: confirmadas + semResposta, semResposta }
}

export type ChavePassoConfirmacao = 'aEnviar' | 'semLembrete' | 'jaLembrados'

export interface PassoConfirmacao {
  chave: ChavePassoConfirmacao
  quantidade: number
}

export interface ProximosPassosConfirmacoes {
  confirmadas: number
  maximo: number
  semResposta: number
  passos: PassoConfirmacao[]
  visualizadosSemLembrete: number
  lembradosHoje: number
  diasPrazoAntesDoEvento: number | null
}

function categoriaDoPendente(pendente: ConvitePendenteDto): ChavePassoConfirmacao | null {
  if (pendente.statusEnvio === 'NaoEnviado') {
    return 'aEnviar'
  }
  if (!pendente.cobravel) {
    return null
  }
  return lerInstante(pendente.ultimaCobrancaEm) === null ? 'semLembrete' : 'jaLembrados'
}

export function proximosPassosConfirmacoes(
  painel: Pick<PainelConfirmacoesDto, 'pessoas' | 'pendentes' | 'prazo'>,
  dataEvento: DataCalendario | null,
  agora: Date = new Date(),
): ProximosPassosConfirmacoes {
  const contagem: Record<ChavePassoConfirmacao, number> = { aEnviar: 0, semLembrete: 0, jaLembrados: 0 }
  let visualizadosSemLembrete = 0
  for (const pendente of painel.pendentes) {
    const categoria = categoriaDoPendente(pendente)
    if (categoria === null) {
      continue
    }
    contagem[categoria] += 1
    if (categoria === 'semLembrete' && pendente.statusEnvio === 'Visualizado') {
      visualizadosSemLembrete += 1
    }
  }
  const ordem: ChavePassoConfirmacao[] = ['aEnviar', 'semLembrete', 'jaLembrados']
  const dias = dataEvento ? diferencaEmDias(painel.prazo.dataLimite, dataEvento) : null
  const { confirmadas, maximo, semResposta } = faixaConfirmacao(painel.pessoas.confirmados.total, painel.pessoas.pendentes.total)

  return {
    confirmadas,
    maximo,
    semResposta,
    passos: ordem.filter((chave) => contagem[chave] > 0).map((chave) => ({ chave, quantidade: contagem[chave] })),
    visualizadosSemLembrete,
    lembradosHoje: contarCobradosHoje(painel.pendentes, agora),
    diasPrazoAntesDoEvento: dias !== null && dias >= 0 ? dias : null,
  }
}
