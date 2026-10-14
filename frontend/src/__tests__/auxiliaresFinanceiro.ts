import type {
  AlertasPagamentosDto,
  FinanceiroCasamentoDto,
  FornecedorFinanceiroDto,
  ParcelaAlertaDto,
  ParcelaDto,
} from '@/tipos/financeiro'
import type { ResumoOrcamentoDto } from '@/tipos/fornecedoresCasamento'

export const ID_VINCULO_FINANCEIRO = '77777777-7777-4777-8777-777777777777'
export const ID_VINCULO_FINANCEIRO_2 = '88888888-8888-4888-8888-888888888888'
export const HOJE_TESTE = '2026-09-30'

export function parcelaExemplo(dados: Partial<ParcelaDto> = {}): ParcelaDto {
  return {
    id: 'p1',
    fornecedorCasamentoId: ID_VINCULO_FINANCEIRO,
    numero: 1,
    totalParcelas: 3,
    valor: 6166.66,
    vencimento: '2026-10-15',
    observacao: 'Boleto',
    situacao: 'Pendente',
    diasParaVencimento: 15,
    venceEmBreve: false,
    pagaEm: null,
    comprovante: null,
    atualizadoEm: '2026-09-30T12:00:00Z',
    ...dados,
  }
}

export function fornecedorFinanceiro(dados: Partial<FornecedorFinanceiroDto> = {}): FornecedorFinanceiroDto {
  return {
    fornecedorCasamentoId: ID_VINCULO_FINANCEIRO,
    fornecedorId: 'f1',
    nomeEmpresa: 'Buffet São João',
    categoria: 'Buffet',
    servico: 'Jantar para 200',
    status: 'Contratado',
    valorContratado: 18500,
    parcelado: 0,
    pago: 0,
    pendente: 18500,
    vencido: 0,
    saldoAParcelar: 18500,
    parcelas: [],
    ...dados,
  }
}

export function resumoPagamentos(dados: Partial<ResumoOrcamentoDto> = {}): ResumoOrcamentoDto {
  return {
    categorias: [
      { categoria: 'Buffet', quantidade: 1, contratados: 1, orcado: 18000, contratado: 18500, pago: 6000, pendente: 12500, vencido: 3250, parcelado: 18500 },
    ],
    totalOrcado: 18000,
    totalContratado: 18500,
    quantidadeFornecedores: 1,
    quantidadeContratados: 1,
    totalPago: 6000,
    totalPendente: 12500,
    totalVencido: 3250,
    totalParcelado: 18500,
    ...dados,
  }
}

export function financeiroExemplo(dados: Partial<FinanceiroCasamentoDto> = {}): FinanceiroCasamentoDto {
  return {
    resumo: resumoPagamentos(),
    alertas: { totalVencidas: 1, valorVencidas: 3250, totalProximas: 1, valorProximas: 3250 },
    fornecedores: [
      fornecedorFinanceiro({
        parcelado: 18500,
        pago: 6000,
        pendente: 12500,
        vencido: 3250,
        saldoAParcelar: 0,
        parcelas: [
          parcelaExemplo({ id: 'paga', numero: 1, totalParcelas: 4, valor: 6000, vencimento: '2026-08-30', situacao: 'Paga', diasParaVencimento: -31, pagaEm: '2026-08-29', comprovante: { nomeArquivo: 'pix.png', tipoConteudo: 'image/png', tamanhoBytes: 2048, enviadoEm: '2026-08-29T12:00:00Z' } }),
          parcelaExemplo({ id: 'vencida', numero: 2, totalParcelas: 4, valor: 3250, vencimento: '2026-09-29', situacao: 'Vencida', diasParaVencimento: -1 }),
          parcelaExemplo({ id: 'breve', numero: 3, totalParcelas: 4, valor: 3250, vencimento: '2026-10-02', diasParaVencimento: 2, venceEmBreve: true }),
          parcelaExemplo({ id: 'depois', numero: 4, totalParcelas: 4, valor: 6000, vencimento: '2026-11-30', diasParaVencimento: 61 }),
        ],
      }),
    ],
    hoje: HOJE_TESTE,
    casamentoArquivado: false,
    somenteLeitura: false,
    ...dados,
  }
}

export function alertaExemplo(dados: Partial<ParcelaAlertaDto> = {}): ParcelaAlertaDto {
  return {
    parcelaId: 'a1',
    casamentoId: '22222222-2222-4222-8222-222222222222',
    nomePrimeiraPessoa: 'Ana',
    nomeSegundaPessoa: 'João',
    fornecedorCasamentoId: ID_VINCULO_FINANCEIRO,
    nomeEmpresa: 'Fotografia Lumière',
    numero: 3,
    totalParcelas: 4,
    valor: 2000,
    vencimento: '2026-09-28',
    diasParaVencimento: -2,
    ...dados,
  }
}

export function alertasExemplo(dados: Partial<AlertasPagamentosDto> = {}): AlertasPagamentosDto {
  return {
    totalVencidas: 2,
    valorVencidas: 5250,
    totalProximas: 1,
    valorProximas: 4900,
    casamentosComVencidas: 2,
    hoje: HOJE_TESTE,
    vencidas: [alertaExemplo(), alertaExemplo({ parcelaId: 'a2', nomePrimeiraPessoa: 'Beatriz', nomeSegundaPessoa: 'Rafael', nomeEmpresa: 'Buffet São João', valor: 3250, diasParaVencimento: -5 })],
    proximas: [alertaExemplo({ parcelaId: 'a3', nomeEmpresa: 'Decoração Jardim', valor: 4900, vencimento: '2026-10-02', diasParaVencimento: 2 })],
    ...dados,
  }
}
