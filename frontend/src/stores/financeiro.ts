import { ref } from 'vue'
import { defineStore } from 'pinia'

import { ErroApi, requisitar, requisitarArquivo } from '@/servicos/clienteHttp'
import { interpretarFalhaCasamento, ROTA_CASAMENTOS, type FalhaCasamento, type ResultadoCasamento } from '@/stores/casamentos'
import { TEXTOS_COMPROVANTE } from '@/textos/financeiro'
import type {
  AlertasPagamentosDto,
  CronogramaParcelasDto,
  FinanceiroCasamentoDto,
  GerarParcelasRequest,
  ParcelaDto,
  RegistrarPagamentoRequest,
  SalvarParcelaRequest,
} from '@/tipos/financeiro'
import { baixarBlob } from '@/utilitarios/arquivo'

export const ROTA_ALERTAS_PAGAMENTOS = '/api/financeiro/alertas'

type AcaoParcela = 'pagamento' | 'comprovante'

export function caminhoFinanceiro(casamentoId: string, alertas = false): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/financeiro`
  return alertas ? `${base}/alertas` : base
}

export function caminhoParcelas(casamentoId: string, vinculoId: string, parcelaId?: string, acao?: AcaoParcela | 'geracao'): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/fornecedores/${encodeURIComponent(vinculoId)}/parcelas`
  const comParcela = parcelaId ? `${base}/${encodeURIComponent(parcelaId)}` : base
  return acao ? `${comParcela}/${acao}` : comParcela
}

export function interpretarFalhaFinanceiro(erro: unknown): FalhaCasamento {
  if (erro instanceof ErroApi && erro.status === 413) {
    return { tipo: 'regra', mensagem: TEXTOS_COMPROVANTE.erroTamanho, errosCampos: {} }
  }
  if (erro instanceof ErroApi && erro.status === 429) {
    return { tipo: 'regra', mensagem: TEXTOS_COMPROVANTE.erroLimite, errosCampos: {} }
  }
  return interpretarFalhaCasamento(erro)
}

async function executar<T>(acao: () => Promise<T>): Promise<ResultadoCasamento<T>> {
  try {
    return { ok: true, valor: await acao() }
  } catch (erro) {
    return { ok: false, falha: interpretarFalhaFinanceiro(erro) }
  }
}

export const useFinanceiroStore = defineStore('financeiro', () => {
  const casamentoId = ref<string | null>(null)
  const financeiro = ref<FinanceiroCasamentoDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaCasamento | null>(null)

  const casamentoAlertas = ref<string | null>(null)
  const alertasCasamento = ref<AlertasPagamentosDto | null>(null)
  const carregandoAlertasCasamento = ref(false)
  const falhaAlertasCasamento = ref<FalhaCasamento | null>(null)

  const alertasOrganizacao = ref<AlertasPagamentosDto | null>(null)
  const carregandoAlertasOrganizacao = ref(false)
  const falhaAlertasOrganizacao = ref<FalhaCasamento | null>(null)

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      financeiro.value = null
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<FinanceiroCasamentoDto>(caminhoFinanceiro(id))
      if (casamentoId.value === id) {
        financeiro.value = resposta
      }
    } catch (erro) {
      if (casamentoId.value === id) {
        financeiro.value = null
        falha.value = interpretarFalhaFinanceiro(erro)
      }
    } finally {
      if (casamentoId.value === id) {
        carregando.value = false
      }
    }
  }

  async function recarregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      return
    }
    try {
      const resposta = await requisitar<FinanceiroCasamentoDto>(caminhoFinanceiro(id))
      if (casamentoId.value === id) {
        financeiro.value = resposta
      }
    } catch (erro) {
      if (casamentoId.value === id && !financeiro.value) {
        falha.value = interpretarFalhaFinanceiro(erro)
      }
    }
    if (casamentoAlertas.value === id) {
      void carregarAlertasCasamento(id)
    }
  }

  async function carregarAlertasCasamento(id: string): Promise<void> {
    if (casamentoAlertas.value !== id) {
      alertasCasamento.value = null
    }
    casamentoAlertas.value = id
    carregandoAlertasCasamento.value = true
    falhaAlertasCasamento.value = null
    try {
      const resposta = await requisitar<AlertasPagamentosDto>(caminhoFinanceiro(id, true))
      if (casamentoAlertas.value === id) {
        alertasCasamento.value = resposta
      }
    } catch (erro) {
      if (casamentoAlertas.value === id) {
        alertasCasamento.value = null
        falhaAlertasCasamento.value = interpretarFalhaFinanceiro(erro)
      }
    } finally {
      if (casamentoAlertas.value === id) {
        carregandoAlertasCasamento.value = false
      }
    }
  }

  async function carregarAlertasOrganizacao(): Promise<void> {
    carregandoAlertasOrganizacao.value = true
    falhaAlertasOrganizacao.value = null
    try {
      alertasOrganizacao.value = await requisitar<AlertasPagamentosDto>(ROTA_ALERTAS_PAGAMENTOS)
    } catch (erro) {
      alertasOrganizacao.value = null
      falhaAlertasOrganizacao.value = interpretarFalhaFinanceiro(erro)
    } finally {
      carregandoAlertasOrganizacao.value = false
    }
  }

  async function aposEscrita<T>(id: string, resultado: ResultadoCasamento<T>): Promise<ResultadoCasamento<T>> {
    if (resultado.ok || resultado.falha.tipo === 'conflito' || resultado.falha.tipo === 'naoEncontrado') {
      await recarregar(id)
    }
    return resultado
  }

  async function criarParcela(id: string, vinculoId: string, dados: SalvarParcelaRequest): Promise<ResultadoCasamento<ParcelaDto>> {
    const resultado = await executar(() =>
      requisitar<ParcelaDto>(caminhoParcelas(id, vinculoId), { metodo: 'POST', corpo: dados }),
    )
    return aposEscrita(id, resultado)
  }

  async function gerarParcelas(
    id: string,
    vinculoId: string,
    dados: GerarParcelasRequest,
  ): Promise<ResultadoCasamento<CronogramaParcelasDto>> {
    const resultado = await executar(() =>
      requisitar<CronogramaParcelasDto>(caminhoParcelas(id, vinculoId, undefined, 'geracao'), { metodo: 'POST', corpo: dados }),
    )
    return aposEscrita(id, resultado)
  }

  async function atualizarParcela(
    id: string,
    vinculoId: string,
    parcelaId: string,
    dados: SalvarParcelaRequest,
  ): Promise<ResultadoCasamento<ParcelaDto>> {
    const resultado = await executar(() =>
      requisitar<ParcelaDto>(caminhoParcelas(id, vinculoId, parcelaId), { metodo: 'PUT', corpo: dados }),
    )
    return aposEscrita(id, resultado)
  }

  async function removerParcela(id: string, vinculoId: string, parcelaId: string): Promise<ResultadoCasamento<null>> {
    const resultado = await executar(async () => {
      await requisitar<void>(caminhoParcelas(id, vinculoId, parcelaId), { metodo: 'DELETE' })
      return null
    })
    return aposEscrita(id, resultado)
  }

  async function registrarPagamento(
    id: string,
    vinculoId: string,
    parcelaId: string,
    dados: RegistrarPagamentoRequest,
  ): Promise<ResultadoCasamento<ParcelaDto>> {
    const resultado = await executar(() =>
      requisitar<ParcelaDto>(caminhoParcelas(id, vinculoId, parcelaId, 'pagamento'), { metodo: 'PUT', corpo: dados }),
    )
    return aposEscrita(id, resultado)
  }

  async function desfazerPagamento(id: string, vinculoId: string, parcelaId: string): Promise<ResultadoCasamento<ParcelaDto>> {
    const resultado = await executar(() =>
      requisitar<ParcelaDto>(caminhoParcelas(id, vinculoId, parcelaId, 'pagamento'), { metodo: 'DELETE' }),
    )
    return aposEscrita(id, resultado)
  }

  async function enviarComprovante(
    id: string,
    vinculoId: string,
    parcelaId: string,
    arquivo: File,
    recarregarDepois = true,
  ): Promise<ResultadoCasamento<ParcelaDto>> {
    const corpo = new FormData()
    corpo.append('arquivo', arquivo, arquivo.name)
    const resultado = await executar(() =>
      requisitar<ParcelaDto>(caminhoParcelas(id, vinculoId, parcelaId, 'comprovante'), {
        metodo: 'PUT',
        corpo,
        tempoLimiteMs: 60_000,
      }),
    )
    return recarregarDepois ? aposEscrita(id, resultado) : resultado
  }

  async function removerComprovante(id: string, vinculoId: string, parcelaId: string): Promise<ResultadoCasamento<ParcelaDto>> {
    const resultado = await executar(() =>
      requisitar<ParcelaDto>(caminhoParcelas(id, vinculoId, parcelaId, 'comprovante'), { metodo: 'DELETE' }),
    )
    return aposEscrita(id, resultado)
  }

  async function baixarComprovante(id: string, parcela: ParcelaDto): Promise<ResultadoCasamento<null>> {
    const resultado = await executar(() =>
      requisitarArquivo(caminhoParcelas(id, parcela.fornecedorCasamentoId, parcela.id, 'comprovante'), { tempoLimiteMs: 60_000 }),
    )
    if (!resultado.ok) {
      return resultado
    }
    baixarBlob(parcela.comprovante?.nomeArquivo ?? resultado.valor.nomeArquivo ?? 'comprovante', resultado.valor.conteudo)
    return { ok: true, valor: null }
  }

  function limpar() {
    casamentoId.value = null
    financeiro.value = null
    carregando.value = false
    falha.value = null
    casamentoAlertas.value = null
    alertasCasamento.value = null
    carregandoAlertasCasamento.value = false
    falhaAlertasCasamento.value = null
    alertasOrganizacao.value = null
    carregandoAlertasOrganizacao.value = false
    falhaAlertasOrganizacao.value = null
  }

  return {
    casamentoId,
    financeiro,
    carregando,
    falha,
    casamentoAlertas,
    alertasCasamento,
    carregandoAlertasCasamento,
    falhaAlertasCasamento,
    alertasOrganizacao,
    carregandoAlertasOrganizacao,
    falhaAlertasOrganizacao,
    carregar,
    recarregar,
    carregarAlertasCasamento,
    carregarAlertasOrganizacao,
    criarParcela,
    gerarParcelas,
    atualizarParcela,
    removerParcela,
    registrarPagamento,
    desfazerPagamento,
    enviarComprovante,
    removerComprovante,
    baixarComprovante,
    limpar,
  }
})
