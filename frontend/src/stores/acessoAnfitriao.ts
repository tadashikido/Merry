import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaEvento, ROTA_EVENTOS, type FalhaEvento, type ResultadoEvento } from '@/stores/eventos'
import type { AcessoAnfitriaoDto, ConvidarAnfitriaoRequest } from '@/tipos/acessoAnfitriao'

export function caminhoAcessosAnfitriao(eventoId: string, acessoId?: string, acao?: string): string {
  const base = `${ROTA_EVENTOS}/${encodeURIComponent(eventoId)}/acessos-anfitriao`
  const comAcesso = acessoId ? `${base}/${encodeURIComponent(acessoId)}` : base
  return acao ? `${comAcesso}/${acao}` : comAcesso
}

export const useAcessoAnfitriaoStore = defineStore('acessoAnfitriao', () => {
  const eventoId = ref<string | null>(null)
  const acessos = ref<AcessoAnfitriaoDto[]>([])
  const carregando = ref(false)
  const falha = ref<FalhaEvento | null>(null)

  async function carregar(id: string): Promise<void> {
    if (eventoId.value !== id) {
      acessos.value = []
    }
    eventoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<AcessoAnfitriaoDto[]>(caminhoAcessosAnfitriao(id))
      if (eventoId.value === id) {
        acessos.value = resposta
      }
    } catch (erro) {
      if (eventoId.value === id) {
        acessos.value = []
        falha.value = interpretarFalhaEvento(erro)
      }
    } finally {
      if (eventoId.value === id) {
        carregando.value = false
      }
    }
  }

  function substituir(acesso: AcessoAnfitriaoDto) {
    const indice = acessos.value.findIndex((item) => item.id === acesso.id)
    if (indice >= 0) {
      acessos.value.splice(indice, 1, acesso)
      return
    }
    acessos.value.push(acesso)
  }

  async function convidar(id: string, dados: ConvidarAnfitriaoRequest): Promise<ResultadoEvento<AcessoAnfitriaoDto>> {
    try {
      const acesso = await requisitar<AcessoAnfitriaoDto>(caminhoAcessosAnfitriao(id), { metodo: 'POST', corpo: dados })
      if (eventoId.value === id) {
        substituir(acesso)
      }
      return { ok: true, valor: acesso }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function reenviar(id: string, acessoId: string): Promise<ResultadoEvento<AcessoAnfitriaoDto>> {
    try {
      const acesso = await requisitar<AcessoAnfitriaoDto>(caminhoAcessosAnfitriao(id, acessoId, 'reenvio'), { metodo: 'POST' })
      if (eventoId.value === id) {
        substituir(acesso)
      }
      return { ok: true, valor: acesso }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function revogar(id: string, acessoId: string): Promise<ResultadoEvento<null>> {
    try {
      await requisitar<void>(caminhoAcessosAnfitriao(id, acessoId), { metodo: 'DELETE' })
      if (eventoId.value === id) {
        acessos.value = acessos.value.filter((acesso) => acesso.id !== acessoId)
      }
      return { ok: true, valor: null }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  return { eventoId, acessos, carregando, falha, carregar, convidar, reenviar, revogar }
})
