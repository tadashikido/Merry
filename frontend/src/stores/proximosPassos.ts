import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaCasamento, ROTA_CASAMENTOS, type FalhaCasamento } from '@/stores/casamentos'
import type { ProximosPassosCasamentoDto } from '@/tipos/proximosPassos'

export function caminhoProximosPassos(casamentoId: string): string {
  return `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/proximos-passos`
}

export const useProximosPassosStore = defineStore('proximosPassos', () => {
  const casamentoId = ref<string | null>(null)
  const passos = ref<ProximosPassosCasamentoDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaCasamento | null>(null)

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      passos.value = null
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<ProximosPassosCasamentoDto>(caminhoProximosPassos(id))
      if (casamentoId.value === id) {
        passos.value = resposta
      }
    } catch (erro) {
      if (casamentoId.value === id) {
        passos.value = null
        falha.value = interpretarFalhaCasamento(erro)
      }
    } finally {
      if (casamentoId.value === id) {
        carregando.value = false
      }
    }
  }

  function limpar() {
    casamentoId.value = null
    passos.value = null
    carregando.value = false
    falha.value = null
  }

  return { casamentoId, passos, carregando, falha, carregar, limpar }
})
