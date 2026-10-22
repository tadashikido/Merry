import { ref } from 'vue'
import { defineStore } from 'pinia'

import { ErroApi, requisitar, requisitarArquivo } from '@/servicos/clienteHttp'
import { interpretarFalhaEvento, ROTA_EVENTOS, type FalhaEvento, type ResultadoEvento } from '@/stores/eventos'
import { TEXTOS_COMPROVANTE } from '@/textos/financeiro'
import type {
  AlertasPagamentosDto,
  CronogramaParcelasDto,
  FinanceiroEventoDto,
  GerarParcelasRequest,
  ParcelaDto,
  RegistrarPagamentoRequest,
  SalvarParcelaRequest,
} from '@/tipos/financeiro'
import { baixarBlob } from '@/utilitarios/arquivo'

export const ROTA_ALERTAS_PAGAMENTOS = '/api/financeiro/alertas'

type AcaoParcela = 'pagamento' | 'comprovante'

export function caminhoFinanceiro(eventoId: string, alertas = false): string {
  const base = `${ROTA_EVENTOS}/${encodeURIComponent(eventoId)}/financeiro`
  return alertas ? `${base}/alertas` : base
}

export function caminhoParcelas(eventoId: string, vinculoId: string, parcelaId?: string, acao?: AcaoParcela | 'geracao'): string {
  const base = `${ROTA_EVENTOS}/${encodeURIComponent(eventoId)}/fornecedores/${encodeURIComponent(vinculoId)}/parcelas`
  const comParcela = parcelaId ? `${base}/${encodeURIComponent(parcelaId)}` : base
  return acao ? `${comParcela}/${acao}` : comParcela
}

export function interpretarFalhaFinanceiro(erro: unknown): FalhaEvento {
  if (erro instanceof ErroApi && erro.status === 413) {
    return { tipo: 'regra', mensagem: TEXTOS_COMPROVANTE.erroTamanho, errosCampos: {} }
  }
  if (erro instanceof ErroApi && erro.status === 429) {
    return { tipo: 'regra', mensagem: TEXTOS_COMPROVANTE.erroLimite, errosCampos: {} }
  }
  return interpretarFalhaEvento(erro)
}

async function executar<T>(acao: () => Promise<T>): Promise<ResultadoEvento<T>> {
  try {
    return { ok: true, valor: await acao() }
  } catch (erro) {
    return { ok: false, falha: interpretarFalhaFinanceiro(erro) }
  }
}

export const useFinanceiroStore = defineStore('financeiro', () => {
  const eventoId = ref<string | null>(null)
  const financeiro = ref<FinanceiroEventoDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaEvento | null>(null)

  const eventoAlertas = ref<string | null>(null)
  const alertasEvento = ref<AlertasPagamentosDto | null>(null)
  const carregandoAlertasEvento = ref(false)
  const falhaAlertasEvento = ref<FalhaEvento | null>(null)

  const alertasOrganizacao = ref<AlertasPagamentosDto | null>(null)
  const carregandoAlertasOrganizacao = ref(false)
  const falhaAlertasOrganizacao = ref<FalhaEvento | null>(null)

  async function carregar(id: string): Promise<void> {
    if (eventoId.value !== id) {
      financeiro.value = null
    }
    eventoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<FinanceiroEventoDto>(caminhoFinanceiro(id))
      if (eventoId.value === id) {
        financeiro.value = resposta
      }
    } catch (erro) {
      if (eventoId.value === id) {
        financeiro.value = null
        falha.value = interpretarFalhaFinanceiro(erro)
      }
    } finally {
      if (eventoId.value === id) {
        carregando.value = false
      }
    }
  }

  async function recarregar(id: string): Promise<void> {
    if (eventoId.value !== id) {
      return
    }
    try {
      const resposta = await requisitar<FinanceiroEventoDto>(caminhoFinanceiro(id))
      if (eventoId.value === id) {
        financeiro.value = resposta
      }
    } catch (erro) {
      if (eventoId.value === id && !financeiro.value) {
        falha.value = interpretarFalhaFinanceiro(erro)
      }
    }
    if (eventoAlertas.value === id) {
      void carregarAlertasEvento(id)
    }
  }

  async function carregarAlertasEvento(id: string): Promise<void> {
    if (eventoAlertas.value !== id) {
      alertasEvento.value = null
    }
    eventoAlertas.value = id
    carregandoAlertasEvento.value = true
    falhaAlertasEvento.value = null
    try {
      const resposta = await requisitar<AlertasPagamentosDto>(caminhoFinanceiro(id, true))
      if (eventoAlertas.value === id) {
        alertasEvento.value = resposta
      }
    } catch (erro) {
      if (eventoAlertas.value === id) {
        alertasEvento.value = null
        falhaAlertasEvento.value = interpretarFalhaFinanceiro(erro)
      }
    } finally {
      if (eventoAlertas.value === id) {
        carregandoAlertasEvento.value = false
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

  async function aposEscrita<T>(id: string, resultado: ResultadoEvento<T>): Promise<ResultadoEvento<T>> {
    if (resultado.ok || resultado.falha.tipo === 'conflito' || resultado.falha.tipo === 'naoEncontrado') {
      await recarregar(id)
    }
    return resultado
  }

  async function criarParcela(id: string, vinculoId: string, dados: SalvarParcelaRequest): Promise<ResultadoEvento<ParcelaDto>> {
    const resultado = await executar(() =>
      requisitar<ParcelaDto>(caminhoParcelas(id, vinculoId), { metodo: 'POST', corpo: dados }),
    )
    return aposEscrita(id, resultado)
  }

  async function gerarParcelas(
    id: string,
    vinculoId: string,
    dados: GerarParcelasRequest,
  ): Promise<ResultadoEvento<CronogramaParcelasDto>> {
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
  ): Promise<ResultadoEvento<ParcelaDto>> {
    const resultado = await executar(() =>
      requisitar<ParcelaDto>(caminhoParcelas(id, vinculoId, parcelaId), { metodo: 'PUT', corpo: dados }),
    )
    return aposEscrita(id, resultado)
  }

  async function removerParcela(id: string, vinculoId: string, parcelaId: string): Promise<ResultadoEvento<null>> {
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
  ): Promise<ResultadoEvento<ParcelaDto>> {
    const resultado = await executar(() =>
      requisitar<ParcelaDto>(caminhoParcelas(id, vinculoId, parcelaId, 'pagamento'), { metodo: 'PUT', corpo: dados }),
    )
    return aposEscrita(id, resultado)
  }

  async function desfazerPagamento(id: string, vinculoId: string, parcelaId: string): Promise<ResultadoEvento<ParcelaDto>> {
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
  ): Promise<ResultadoEvento<ParcelaDto>> {
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

  async function removerComprovante(id: string, vinculoId: string, parcelaId: string): Promise<ResultadoEvento<ParcelaDto>> {
    const resultado = await executar(() =>
      requisitar<ParcelaDto>(caminhoParcelas(id, vinculoId, parcelaId, 'comprovante'), { metodo: 'DELETE' }),
    )
    return aposEscrita(id, resultado)
  }

  async function baixarComprovante(id: string, parcela: ParcelaDto): Promise<ResultadoEvento<null>> {
    const resultado = await executar(() =>
      requisitarArquivo(caminhoParcelas(id, parcela.fornecedorEventoId, parcela.id, 'comprovante'), { tempoLimiteMs: 60_000 }),
    )
    if (!resultado.ok) {
      return resultado
    }
    baixarBlob(parcela.comprovante?.nomeArquivo ?? resultado.valor.nomeArquivo ?? 'comprovante', resultado.valor.conteudo)
    return { ok: true, valor: null }
  }

  function limpar() {
    eventoId.value = null
    financeiro.value = null
    carregando.value = false
    falha.value = null
    eventoAlertas.value = null
    alertasEvento.value = null
    carregandoAlertasEvento.value = false
    falhaAlertasEvento.value = null
    alertasOrganizacao.value = null
    carregandoAlertasOrganizacao.value = false
    falhaAlertasOrganizacao.value = null
  }

  return {
    eventoId,
    financeiro,
    carregando,
    falha,
    eventoAlertas,
    alertasEvento,
    carregandoAlertasEvento,
    falhaAlertasEvento,
    alertasOrganizacao,
    carregandoAlertasOrganizacao,
    falhaAlertasOrganizacao,
    carregar,
    recarregar,
    carregarAlertasEvento,
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
