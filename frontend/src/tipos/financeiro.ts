import type { CategoriaFornecedor } from '@/tipos/fornecedores'
import type { ResumoOrcamentoDto, StatusFornecedorEvento } from '@/tipos/fornecedoresEvento'

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
  fornecedorEventoId: string
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
  fornecedorEventoId: string
  valorContratado: number
  parcelado: number
  pago: number
  saldoAParcelar: number
  parcelas: ParcelaDto[]
}

export interface FornecedorFinanceiroDto {
  fornecedorEventoId: string
  fornecedorId: string
  nomeEmpresa: string
  categoria: CategoriaFornecedor
  servico: string | null
  status: StatusFornecedorEvento
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

export interface FinanceiroEventoDto {
  resumo: ResumoOrcamentoDto
  alertas: TotaisAlertasDto
  fornecedores: FornecedorFinanceiroDto[]
  hoje: string
  eventoArquivado: boolean
  somenteLeitura: boolean
}

export interface ParcelaAlertaDto {
  parcelaId: string
  eventoId: string
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string | null
  fornecedorEventoId: string
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
  eventosComVencidas: number
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
