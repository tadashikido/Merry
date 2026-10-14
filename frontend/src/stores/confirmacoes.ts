import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { ROTA_CASAMENTOS } from '@/stores/casamentos'
import { interpretarFalhaConvidados, type FalhaConvidados, type ResultadoConvidados } from '@/stores/convidados'
import type { ExportacaoBuffetDto, FormatoExportacaoBuffet, PainelConfirmacoesDto } from '@/tipos/confirmacoes'

export function rotaPainelConfirmacoes(casamentoId: string): string {
  return `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/painel-confirmacoes`
}

export function rotaExportacaoBuffet(casamentoId: string, formato: FormatoExportacaoBuffet): string {
  return `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/exportacao-buffet?formato=${formato}`
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

  return { casamentoId, painel, carregando, falha, carregar, exportar, limpar }
})
