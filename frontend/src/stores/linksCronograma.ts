import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaEvento, ROTA_EVENTOS, type FalhaEvento, type ResultadoEvento } from '@/stores/eventos'
import type { GerarLinkCronogramaRequest, LinkCronogramaDto, LinksCronogramaDto } from '@/tipos/cronogramaPublico'

export function caminhoLinksCronograma(eventoId: string, linkId?: string): string {
  const base = `${ROTA_EVENTOS}/${encodeURIComponent(eventoId)}/cronograma/links`
  return linkId ? `${base}/${encodeURIComponent(linkId)}` : base
}

export const useLinksCronogramaStore = defineStore('linksCronograma', () => {
  const eventoId = ref<string | null>(null)
  const links = ref<LinksCronogramaDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaEvento | null>(null)

  async function buscar(id: string): Promise<void> {
    const resposta = await requisitar<LinksCronogramaDto>(caminhoLinksCronograma(id))
    if (eventoId.value === id) {
      links.value = resposta
    }
  }

  async function carregar(id: string): Promise<void> {
    if (eventoId.value !== id) {
      links.value = null
    }
    eventoId.value = id
    carregando.value = true
    falha.value = null
    try {
      await buscar(id)
    } catch (erro) {
      if (eventoId.value === id) {
        links.value = null
        falha.value = interpretarFalhaEvento(erro)
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
      await buscar(id)
    } catch {
      return
    }
  }

  async function gerar(id: string, request: GerarLinkCronogramaRequest): Promise<ResultadoEvento<LinkCronogramaDto>> {
    try {
      const valor = await requisitar<LinkCronogramaDto>(caminhoLinksCronograma(id), { metodo: 'POST', corpo: request })
      await recarregar(id)
      return { ok: true, valor }
    } catch (erro) {
      await recarregar(id)
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function regenerar(id: string, linkId: string): Promise<ResultadoEvento<LinkCronogramaDto>> {
    try {
      const valor = await requisitar<LinkCronogramaDto>(`${caminhoLinksCronograma(id, linkId)}/regenerar`, { metodo: 'POST' })
      await recarregar(id)
      return { ok: true, valor }
    } catch (erro) {
      await recarregar(id)
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function revogar(id: string, linkId: string): Promise<ResultadoEvento<null>> {
    try {
      await requisitar<void>(caminhoLinksCronograma(id, linkId), { metodo: 'DELETE' })
      await recarregar(id)
      return { ok: true, valor: null }
    } catch (erro) {
      await recarregar(id)
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  function limpar() {
    eventoId.value = null
    links.value = null
    carregando.value = false
    falha.value = null
  }

  return { eventoId, links, carregando, falha, carregar, gerar, regenerar, revogar, limpar }
})
