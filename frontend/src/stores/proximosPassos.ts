import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaEvento, ROTA_EVENTOS, type FalhaEvento } from '@/stores/eventos'
import type { ProximosPassosEventoDto } from '@/tipos/proximosPassos'

export function caminhoProximosPassos(eventoId: string): string {
  return `${ROTA_EVENTOS}/${encodeURIComponent(eventoId)}/proximos-passos`
}

export const useProximosPassosStore = defineStore('proximosPassos', () => {
  const eventoId = ref<string | null>(null)
  const passos = ref<ProximosPassosEventoDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaEvento | null>(null)

  async function carregar(id: string): Promise<void> {
    if (eventoId.value !== id) {
      passos.value = null
    }
    eventoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<ProximosPassosEventoDto>(caminhoProximosPassos(id))
      if (eventoId.value === id) {
        passos.value = resposta
      }
    } catch (erro) {
      if (eventoId.value === id) {
        passos.value = null
        falha.value = interpretarFalhaEvento(erro)
      }
    } finally {
      if (eventoId.value === id) {
        carregando.value = false
      }
    }
  }

  function limpar() {
    eventoId.value = null
    passos.value = null
    carregando.value = false
    falha.value = null
  }

  return { eventoId, passos, carregando, falha, carregar, limpar }
})
