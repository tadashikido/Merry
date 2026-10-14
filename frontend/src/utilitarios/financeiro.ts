import type { VarianteStatus } from '@/componentes/base/tipos'
import { TEXTOS_PARCELA } from '@/textos/financeiro'
import type { FornecedorFinanceiroDto, ParcelaDto, SituacaoParcela } from '@/tipos/financeiro'
import { deCentavos, paraCentavos, temNoMaximoDuasCasas, valorEmCentavosValido } from '@/utilitarios/centavos'
import type { RegraValidacao } from '@/utilitarios/validacao'

export const LIMITES_PARCELA = {
  quantidadeMaxima: 60,
  valorMinimoCentavos: 1,
  valorMaximoCentavos: 9_999_999_999,
  observacaoMaximo: 120,
  janelaAlertaDias: 7,
  dataMinima: '2000-01-01',
  dataMaxima: '2100-12-31',
} as const

export const LIMITE_ALERTAS_ORGANIZACAO = 10
export const LIMITE_ALERTAS_CASAMENTO = 5

export interface ParcelaGerada {
  numero: number
  vencimento: string
  valorCentavos: number
}

export interface ParcelaNoLivro extends ParcelaDto {
  nomeEmpresa: string
  statusFornecedor: FornecedorFinanceiroDto['status']
}

export interface GruposLivro {
  vencidas: ParcelaNoLivro[]
  proximas: ParcelaNoLivro[]
  depois: ParcelaNoLivro[]
  pagas: ParcelaNoLivro[]
}

function lerPartes(data: string): [number, number, number] | null {
  const correspondencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data)
  if (!correspondencia) {
    return null
  }
  const ano = Number(correspondencia[1])
  const mes = Number(correspondencia[2])
  const dia = Number(correspondencia[3])
  const instante = new Date(Date.UTC(ano, mes - 1, dia))
  return instante.getUTCFullYear() === ano && instante.getUTCMonth() === mes - 1 && instante.getUTCDate() === dia
    ? [ano, mes, dia]
    : null
}

function formatarPartes(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function adicionarMeses(data: string, meses: number): string | null {
  const partes = lerPartes(data)
  if (!partes) {
    return null
  }
  const [ano, mes, dia] = partes
  const indiceMes = mes - 1 + meses
  const anoAlvo = ano + Math.floor(indiceMes / 12)
  const mesAlvo = (((indiceMes % 12) + 12) % 12) + 1
  const ultimoDia = new Date(Date.UTC(anoAlvo, mesAlvo, 0)).getUTCDate()
  return formatarPartes(anoAlvo, mesAlvo, Math.min(dia, ultimoDia))
}

export function gerarParcelasLocal(totalCentavos: number, quantidade: number, primeiroVencimento: string): ParcelaGerada[] {
  if (!Number.isSafeInteger(totalCentavos) || totalCentavos <= 0 || !Number.isInteger(quantidade) || quantidade < 1) {
    return []
  }
  const baseCentavos = Math.floor(totalCentavos / quantidade)
  if (baseCentavos < LIMITES_PARCELA.valorMinimoCentavos) {
    return []
  }
  const ultimaCentavos = totalCentavos - baseCentavos * (quantidade - 1)
  const parcelas: ParcelaGerada[] = []
  for (let indice = 0; indice < quantidade; indice++) {
    const vencimento = adicionarMeses(primeiroVencimento, indice)
    if (!vencimento) {
      return []
    }
    parcelas.push({ numero: indice + 1, vencimento, valorCentavos: indice === quantidade - 1 ? ultimaCentavos : baseCentavos })
  }
  return parcelas
}

export function saldoAParcelarCentavos(contratado: number, parcelas: Pick<ParcelaDto, 'valor' | 'id'>[], ignorarId?: string): number {
  const soma = parcelas.filter((parcela) => parcela.id !== ignorarId).reduce((total, parcela) => total + paraCentavos(parcela.valor), 0)
  return paraCentavos(contratado) - soma
}

export function valorParcelaValido(valor: number | null | undefined): boolean {
  if (valor === null || valor === undefined || !temNoMaximoDuasCasas(valor)) {
    return false
  }
  return valorEmCentavosValido(paraCentavos(valor), LIMITES_PARCELA.valorMinimoCentavos, LIMITES_PARCELA.valorMaximoCentavos)
}

export function dataValida(valor: unknown): boolean {
  return typeof valor === 'string' && lerPartes(valor) !== null && valor >= LIMITES_PARCELA.dataMinima && valor <= LIMITES_PARCELA.dataMaxima
}

export const regraValorParcela: RegraValidacao = (valor) =>
  valorParcelaValido(typeof valor === 'number' ? valor : null) ? null : TEXTOS_PARCELA.erroValor

export const regraVencimento: RegraValidacao = (valor) =>
  typeof valor === 'string' && valor !== '' ? (dataValida(valor) ? null : TEXTOS_PARCELA.erroVencimentoInvalido) : TEXTOS_PARCELA.erroVencimento

export const regraObservacao: RegraValidacao = (valor) =>
  typeof valor === 'string' && valor.trim().length > LIMITES_PARCELA.observacaoMaximo ? TEXTOS_PARCELA.erroObservacao : null

export const regraQuantidade: RegraValidacao = (valor) =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= LIMITES_PARCELA.quantidadeMaxima
    ? null
    : TEXTOS_PARCELA.erroQuantidade

export function regraDataPagamento(hoje: () => string): RegraValidacao {
  return (valor) => {
    if (typeof valor !== 'string' || valor === '') {
      return TEXTOS_PARCELA.erroDataPagamento
    }
    if (valor > hoje()) {
      return TEXTOS_PARCELA.erroPagamentoFuturo
    }
    return valor < LIMITES_PARCELA.dataMinima ? TEXTOS_PARCELA.erroDataPagamento : null
  }
}

export function reaisDeCentavos(centavos: number): number {
  return deCentavos(centavos)
}

export function agruparLivro(fornecedores: FornecedorFinanceiroDto[]): GruposLivro {
  const todas: ParcelaNoLivro[] = fornecedores
    .filter((fornecedor) => fornecedor.status === 'Contratado')
    .flatMap((fornecedor) =>
      fornecedor.parcelas.map((parcela) => ({ ...parcela, nomeEmpresa: fornecedor.nomeEmpresa, statusFornecedor: fornecedor.status })),
    )
  const porVencimento = (a: ParcelaNoLivro, b: ParcelaNoLivro) =>
    a.vencimento.localeCompare(b.vencimento) || a.nomeEmpresa.localeCompare(b.nomeEmpresa, 'pt-BR') || a.numero - b.numero
  const pendentes = todas.filter((parcela) => parcela.situacao !== 'Paga').sort(porVencimento)
  return {
    vencidas: pendentes.filter((parcela) => parcela.situacao === 'Vencida'),
    proximas: pendentes.filter((parcela) => parcela.situacao === 'Pendente' && parcela.venceEmBreve),
    depois: pendentes.filter((parcela) => parcela.situacao === 'Pendente' && !parcela.venceEmBreve),
    pagas: todas
      .filter((parcela) => parcela.situacao === 'Paga')
      .sort((a, b) => (b.pagaEm ?? '').localeCompare(a.pagaEm ?? '') || porVencimento(a, b)),
  }
}

export interface DescricaoSituacao {
  texto: string
  variante: VarianteStatus
}

export function descreverSituacao(
  parcela: Pick<ParcelaDto, 'situacao' | 'diasParaVencimento' | 'venceEmBreve' | 'pagaEm'>,
  formatarData: (valor: string) => string,
): DescricaoSituacao {
  if (parcela.situacao === 'Paga') {
    return { texto: TEXTOS_PARCELA.situacaoPaga(parcela.pagaEm ? formatarData(parcela.pagaEm) : ''), variante: 'sucesso' }
  }
  if (parcela.situacao === 'Vencida') {
    return { texto: TEXTOS_PARCELA.situacaoVencida(-parcela.diasParaVencimento), variante: 'erro' }
  }
  if (parcela.venceEmBreve) {
    return {
      texto: parcela.diasParaVencimento === 0 ? TEXTOS_PARCELA.situacaoVenceHoje : TEXTOS_PARCELA.situacaoVenceEm(parcela.diasParaVencimento),
      variante: 'alerta',
    }
  }
  return { texto: TEXTOS_PARCELA.situacaoPendente, variante: 'neutro' }
}

export const VARIANTES_SITUACAO_PARCELA: Record<SituacaoParcela, VarianteStatus> = {
  Pendente: 'neutro',
  Vencida: 'erro',
  Paga: 'sucesso',
}
