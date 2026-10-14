import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaCasamento, ROTA_CASAMENTOS, type FalhaCasamento, type ResultadoCasamento } from '@/stores/casamentos'
import type { AcessoCasalDto, ConvidarCasalRequest } from '@/tipos/acessoCasal'

export function caminhoAcessosCasal(casamentoId: string, acessoId?: string, acao?: string): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/acessos-casal`
  const comAcesso = acessoId ? `${base}/${encodeURIComponent(acessoId)}` : base
  return acao ? `${comAcesso}/${acao}` : comAcesso
}

export const useAcessoCasalStore = defineStore('acessoCasal', () => {
  const casamentoId = ref<string | null>(null)
  const acessos = ref<AcessoCasalDto[]>([])
  const carregando = ref(false)
  const falha = ref<FalhaCasamento | null>(null)

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      acessos.value = []
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<AcessoCasalDto[]>(caminhoAcessosCasal(id))
      if (casamentoId.value === id) {
        acessos.value = resposta
      }
    } catch (erro) {
      if (casamentoId.value === id) {
        acessos.value = []
        falha.value = interpretarFalhaCasamento(erro)
      }
    } finally {
      if (casamentoId.value === id) {
        carregando.value = false
      }
    }
  }

  function substituir(acesso: AcessoCasalDto) {
    const indice = acessos.value.findIndex((item) => item.id === acesso.id)
    if (indice >= 0) {
      acessos.value.splice(indice, 1, acesso)
      return
    }
    acessos.value.push(acesso)
  }

  async function convidar(id: string, dados: ConvidarCasalRequest): Promise<ResultadoCasamento<AcessoCasalDto>> {
    try {
      const acesso = await requisitar<AcessoCasalDto>(caminhoAcessosCasal(id), { metodo: 'POST', corpo: dados })
      if (casamentoId.value === id) {
        substituir(acesso)
      }
      return { ok: true, valor: acesso }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function reenviar(id: string, acessoId: string): Promise<ResultadoCasamento<AcessoCasalDto>> {
    try {
      const acesso = await requisitar<AcessoCasalDto>(caminhoAcessosCasal(id, acessoId, 'reenvio'), { metodo: 'POST' })
      if (casamentoId.value === id) {
        substituir(acesso)
      }
      return { ok: true, valor: acesso }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function revogar(id: string, acessoId: string): Promise<ResultadoCasamento<null>> {
    try {
      await requisitar<void>(caminhoAcessosCasal(id, acessoId), { metodo: 'DELETE' })
      if (casamentoId.value === id) {
        acessos.value = acessos.value.filter((acesso) => acesso.id !== acessoId)
      }
      return { ok: true, valor: null }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  return { casamentoId, acessos, carregando, falha, carregar, convidar, reenviar, revogar }
})
