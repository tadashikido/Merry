import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar, type ProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useOperadorAutenticacaoStore } from '@/stores/operadorAutenticacao'

export const ROTAS_IMPERSONACAO = {
  base: '/api/operador/impersonacoes',
} as const

export interface SessaoImpersonacao {
  sessaoId: string
  tokenAcesso: string
  expiraEm: string
  assessoria: { id: string; nome: string }
}

export type ResultadoImpersonacao = { ok: true } | { ok: false }

export const useImpersonacaoStore = defineStore('impersonacao', () => {
  const operador = useOperadorAutenticacaoStore()
  const tenant = useAutenticacaoStore()
  const provedor: ProvedorAutenticacao = {
    obterToken: () => operador.tokenAcesso,
    renovar: () => operador.renovar(),
  }

  const sessaoId = ref<string | null>(null)

  async function iniciar(organizacaoId: string, motivo: string): Promise<ResultadoImpersonacao> {
    try {
      const sessao = await requisitar<SessaoImpersonacao>(ROTAS_IMPERSONACAO.base, {
        metodo: 'POST',
        corpo: { organizacaoId, motivo },
        provedor,
      })
      sessaoId.value = sessao.sessaoId
      tenant.aplicarImpersonacao({ tokenAcesso: sessao.tokenAcesso, expiraEm: sessao.expiraEm, assessoria: sessao.assessoria })
      await tenant.carregarUsuario()
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }

  async function encerrar(): Promise<void> {
    const id = sessaoId.value
    if (id) {
      await requisitar<void>(`${ROTAS_IMPERSONACAO.base}/${id}/encerrar`, { metodo: 'POST', provedor }).catch(() => undefined)
    }
    sessaoId.value = null
    tenant.encerrarImpersonacao()
  }

  return { sessaoId, iniciar, encerrar }
})
