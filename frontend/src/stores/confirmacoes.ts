import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { ROTA_CASAMENTOS } from '@/stores/casamentos'
import { interpretarFalhaConvidados, type FalhaConvidados, type ResultadoConvidados } from '@/stores/convidados'
import type { CobrancaRsvpDto, ExportacaoBuffetDto, FormatoExportacaoBuffet, PainelConfirmacoesDto } from '@/tipos/confirmacoes'

export function rotaPainelConfirmacoes(casamentoId: string): string {
  return `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/painel-confirmacoes`
}

export function rotaExportacaoBuffet(casamentoId: string, formato: FormatoExportacaoBuffet): string {
  return `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/exportacao-buffet?formato=${formato}`
}

export function rotaCobrancaRsvp(casamentoId: string, conviteId: string): string {
  return `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/convites/${encodeURIComponent(conviteId)}/cobranca`
}

export const useConfirmacoesStore = defineStore('confirmacoes', () => {
  const casamentoId = ref<string | null>(null)
  const painel = ref<PainelConfirmacoesDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaConvidados | null>(null)

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      painel.value = null
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<PainelConfirmacoesDto>(rotaPainelConfirmacoes(id))
      if (casamentoId.value === id) {
        painel.value = resposta
      }
    } catch (erro) {
      if (casamentoId.value === id) {
        painel.value = null
        falha.value = interpretarFalhaConvidados(erro)
      }
    } finally {
      if (casamentoId.value === id) {
        carregando.value = false
      }
    }
  }

  async function exportar(id: string, formato: FormatoExportacaoBuffet): Promise<ResultadoConvidados<ExportacaoBuffetDto>> {
    try {
      return { ok: true, valor: await requisitar<ExportacaoBuffetDto>(rotaExportacaoBuffet(id, formato)) }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaConvidados(erro) }
    }
  }

  async function registrarCobranca(id: string, conviteId: string): Promise<ResultadoConvidados<CobrancaRsvpDto>> {
    try {
      const cobranca = await requisitar<CobrancaRsvpDto>(rotaCobrancaRsvp(id, conviteId), { metodo: 'POST' })
      atualizarCobranca(id, cobranca)
      return { ok: true, valor: cobranca }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaConvidados(erro) }
    }
  }

  function atualizarCobranca(id: string, cobranca: CobrancaRsvpDto) {
    if (casamentoId.value !== id || !painel.value) {
      return
    }
    painel.value = {
      ...painel.value,
      pendentes: painel.value.pendentes.map((pendente) =>
        pendente.conviteId === cobranca.conviteId
          ? { ...pendente, ultimaCobrancaEm: cobranca.ultimaCobrancaEm, quantidadeCobrancas: cobranca.quantidadeCobrancas }
          : pendente,
      ),
    }
  }

  function limpar() {
    casamentoId.value = null
    painel.value = null
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

  return { casamentoId, painel, carregando, falha, carregar, exportar, registrarCobranca, limpar }
})
