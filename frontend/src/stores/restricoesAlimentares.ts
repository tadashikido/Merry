import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { ROTA_CASAMENTOS } from '@/stores/casamentos'
import { interpretarFalhaConvidados, rotaConvites, type FalhaConvidados, type ResultadoConvidados } from '@/stores/convidados'
import type {
  RelatorioRestricoesAlimentaresDto,
  RestricaoAlimentarDto,
  SalvarRestricaoAlimentarRequest,
} from '@/tipos/dadosSensiveis'

export function rotaRelatorioRestricoes(casamentoId: string): string {
  return `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/restricoes-alimentares`
}

export function rotaRestricaoConvidado(casamentoId: string, conviteId: string, convidadoId: string): string {
  return `${rotaConvites(casamentoId, conviteId)}/convidados/${encodeURIComponent(convidadoId)}/restricao-alimentar`
}

export const useRestricoesAlimentaresStore = defineStore('restricoesAlimentares', () => {
  const casamentoId = ref<string | null>(null)
  const relatorio = ref<RelatorioRestricoesAlimentaresDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaConvidados | null>(null)

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      relatorio.value = null
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<RelatorioRestricoesAlimentaresDto>(rotaRelatorioRestricoes(id))
      if (casamentoId.value === id) {
        relatorio.value = resposta
      }
    } catch (erro) {
      if (casamentoId.value === id) {
        relatorio.value = null
        falha.value = interpretarFalhaConvidados(erro)
      }
    } finally {
      if (casamentoId.value === id) {
        carregando.value = false
      }
    }
  }

  async function salvar(
    id: string,
    conviteId: string,
    convidadoId: string,
    request: SalvarRestricaoAlimentarRequest,
  ): Promise<ResultadoConvidados<RestricaoAlimentarDto>> {
    try {
      const valor = await requisitar<RestricaoAlimentarDto>(rotaRestricaoConvidado(id, conviteId, convidadoId), {
        metodo: 'PUT',
        corpo: request,
      })
      return { ok: true, valor }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaConvidados(erro) }
    }
  }

  async function remover(id: string, conviteId: string, convidadoId: string): Promise<ResultadoConvidados<void>> {
    try {
      await requisitar<void>(rotaRestricaoConvidado(id, conviteId, convidadoId), { metodo: 'DELETE' })
      return { ok: true, valor: undefined }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaConvidados(erro) }
    }
  }

  function limpar() {
    casamentoId.value = null
    relatorio.value = null
    carregando.value = false
    falha.value = null
  }

  const autenticacao = useAutenticacaoStore()
  watch(
    () => autenticacao.usuario?.organizacao.id ?? null,
    (organizacaoAtual, organizacaoAnterior) => {
      if (organizacaoAtual !== organizacaoAnterior) {
        limpar()
      }
    },
  )

  return { casamentoId, relatorio, carregando, falha, carregar, salvar, remover, limpar }
})
