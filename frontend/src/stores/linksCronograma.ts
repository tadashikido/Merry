import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaCasamento, ROTA_CASAMENTOS, type FalhaCasamento, type ResultadoCasamento } from '@/stores/casamentos'
import type { GerarLinkCronogramaRequest, LinkCronogramaDto, LinksCronogramaDto } from '@/tipos/cronogramaPublico'

export function caminhoLinksCronograma(casamentoId: string, linkId?: string): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/cronograma/links`
  return linkId ? `${base}/${encodeURIComponent(linkId)}` : base
}

export const useLinksCronogramaStore = defineStore('linksCronograma', () => {
  const casamentoId = ref<string | null>(null)
  const links = ref<LinksCronogramaDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaCasamento | null>(null)

  async function buscar(id: string): Promise<void> {
    const resposta = await requisitar<LinksCronogramaDto>(caminhoLinksCronograma(id))
    if (casamentoId.value === id) {
      links.value = resposta
    }
  }

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      links.value = null
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null
    try {
      await buscar(id)
    } catch (erro) {
      if (casamentoId.value === id) {
        links.value = null
        falha.value = interpretarFalhaCasamento(erro)
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
      await buscar(id)
    } catch {
      return
    }
  }

  async function gerar(id: string, request: GerarLinkCronogramaRequest): Promise<ResultadoCasamento<LinkCronogramaDto>> {
    try {
      const valor = await requisitar<LinkCronogramaDto>(caminhoLinksCronograma(id), { metodo: 'POST', corpo: request })
      await recarregar(id)
      return { ok: true, valor }
    } catch (erro) {
      await recarregar(id)
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function regenerar(id: string, linkId: string): Promise<ResultadoCasamento<LinkCronogramaDto>> {
    try {
      const valor = await requisitar<LinkCronogramaDto>(`${caminhoLinksCronograma(id, linkId)}/regenerar`, { metodo: 'POST' })
      await recarregar(id)
      return { ok: true, valor }
    } catch (erro) {
      await recarregar(id)
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function revogar(id: string, linkId: string): Promise<ResultadoCasamento<null>> {
    try {
      await requisitar<void>(caminhoLinksCronograma(id, linkId), { metodo: 'DELETE' })
      await recarregar(id)
      return { ok: true, valor: null }
    } catch (erro) {
      await recarregar(id)
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  function limpar() {
    casamentoId.value = null
    links.value = null
    carregando.value = false
    falha.value = null
  }

  return { casamentoId, links, carregando, falha, carregar, gerar, regenerar, revogar, limpar }
})
