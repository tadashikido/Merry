import type { CategoriaFornecedor } from '@/tipos/fornecedores'
import type { ResumoOrcamentoDto, StatusFornecedorCasamento } from '@/tipos/fornecedoresCasamento'

export const SITUACOES_PARCELA = ['Pendente', 'Vencida', 'Paga'] as const
export type SituacaoParcela = (typeof SITUACOES_PARCELA)[number]

export interface ComprovanteParcelaDto {
  nomeArquivo: string
  tipoConteudo: string
  tamanhoBytes: number
  enviadoEm: string
}

export interface ParcelaDto {
  id: string
  fornecedorCasamentoId: string
  numero: number
  totalParcelas: number
  valor: number
  vencimento: string
  observacao: string | null
  situacao: SituacaoParcela
  diasParaVencimento: number
  venceEmBreve: boolean
  pagaEm: string | null
  comprovante: ComprovanteParcelaDto | null
  atualizadoEm: string
}

export interface CronogramaParcelasDto {
  fornecedorCasamentoId: string
  valorContratado: number
  parcelado: number
  pago: number
  saldoAParcelar: number
  parcelas: ParcelaDto[]
}

export interface FornecedorFinanceiroDto {
  fornecedorCasamentoId: string
  fornecedorId: string
  nomeEmpresa: string
  categoria: CategoriaFornecedor
  servico: string | null
  status: StatusFornecedorCasamento
  valorContratado: number
  parcelado: number
  pago: number
  pendente: number
  vencido: number
  saldoAParcelar: number
  parcelas: ParcelaDto[]
}

export interface TotaisAlertasDto {
  totalVencidas: number
  valorVencidas: number
  totalProximas: number
  valorProximas: number
}

export interface FinanceiroCasamentoDto {
  resumo: ResumoOrcamentoDto
  alertas: TotaisAlertasDto
  fornecedores: FornecedorFinanceiroDto[]
  hoje: string
  casamentoArquivado: boolean
  somenteLeitura: boolean
}

export interface ParcelaAlertaDto {
  parcelaId: string
  casamentoId: string
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
  fornecedorCasamentoId: string
  nomeEmpresa: string
  numero: number
  totalParcelas: number
  valor: number
  vencimento: string
  diasParaVencimento: number
}

export interface AlertasPagamentosDto {
  totalVencidas: number
  valorVencidas: number
  totalProximas: number
  valorProximas: number
  casamentosComVencidas: number
  hoje: string
  vencidas: ParcelaAlertaDto[]
  proximas: ParcelaAlertaDto[]
}

export interface SalvarParcelaRequest {
  valor: number
  vencimento: string
  observacao: string | null
}

export interface GerarParcelasRequest {
  quantidade: number
  valorTotal: number | null
  primeiroVencimento: string
  observacao: string | null
}

export interface RegistrarPagamentoRequest {
  pagaEm: string | null
}

export interface ResultadoPagamento {
  parcela: ParcelaDto
  comprovanteFalhou: boolean
}
