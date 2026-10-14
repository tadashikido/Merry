import type { CategoriaFornecedor } from '@/tipos/fornecedores'

export const STATUS_FORNECEDOR_CASAMENTO = ['Cotacao', 'EmNegociacao', 'Contratado', 'Cancelado'] as const
export type StatusFornecedorCasamento = (typeof STATUS_FORNECEDOR_CASAMENTO)[number]

export interface FornecedorVinculadoDto {
  id: string
  categoria: CategoriaFornecedor
  nomeEmpresa: string
  responsavel: string | null
  telefone: string | null
  email: string | null
  site: string | null
  instagram: string | null
  arquivado: boolean
}

export interface ContratoFornecedorDto {
  nomeArquivo: string
  tamanhoBytes: number
  enviadoEm: string
}

export interface ResumoParcelasVinculoDto {
  quantidade: number
  pagas: number
  vencidas: number
  parcelado: number
  pago: number
  saldoAParcelar: number
  proximoVencimento: string | null
  proximoValor: number | null
}

export interface FornecedorCasamentoDto {
  id: string
  fornecedor: FornecedorVinculadoDto
  servico: string | null
  valorOrcado: number | null
  valorContratado: number | null
  status: StatusFornecedorCasamento
  notasInternas: string | null
  contrato: ContratoFornecedorDto | null
  criadoEm: string
  atualizadoEm: string
  parcelas?: ResumoParcelasVinculoDto | null
}

export interface ResumoCategoriaOrcamentoDto {
  categoria: CategoriaFornecedor
  quantidade: number
  contratados: number
  orcado: number
  contratado: number
  pago?: number
  pendente?: number
  vencido?: number
  parcelado?: number
}

export interface ResumoOrcamentoDto {
  categorias: ResumoCategoriaOrcamentoDto[]
  totalOrcado: number
  totalContratado: number
  quantidadeFornecedores: number
  quantidadeContratados: number
  totalPago?: number
  totalPendente?: number
  totalVencido?: number
  totalParcelado?: number
}

export interface ListaFornecedoresCasamentoDto {
  vinculos: FornecedorCasamentoDto[]
  resumo: ResumoOrcamentoDto
  casamentoArquivado: boolean
  somenteLeitura: boolean
}

export interface VincularFornecedorRequest {
  fornecedorId: string
  servico: string | null
  valorOrcado: number | null
  valorContratado: number | null
  status: StatusFornecedorCasamento
  notasInternas: string | null
}

export type AtualizarFornecedorCasamentoRequest = Omit<VincularFornecedorRequest, 'fornecedorId'>

export interface ImportarFornecedoresRequest {
  casamentoOrigemId: string
}

export interface ResultadoImportacaoFornecedoresDto {
  importados: number
  ignorados: number
}

export interface ParticipacaoFornecedorDto {
  casamentoId: string
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
  dataCasamento: string
  casamentoArquivado: boolean
  status: StatusFornecedorCasamento
}
