import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaCasamento, ROTA_CASAMENTOS, type FalhaCasamento, type ResultadoCasamento } from '@/stores/casamentos'
import type { GrandeDiaDto } from '@/tipos/grandeDia'

export function caminhoGrandeDia(casamentoId: string): string {
  return `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/grande-dia`
}

export function caminhoConclusao(casamentoId: string, itemId: string): string {
  return `${caminhoGrandeDia(casamentoId)}/itens/${encodeURIComponent(itemId)}/conclusao`
}

export const useGrandeDiaStore = defineStore('grandeDia', () => {
  const casamentoId = ref<string | null>(null)
  const dados = ref<GrandeDiaDto | null>(null)
  const carregando = ref(false)
  const atualizando = ref(false)
  const falha = ref<FalhaCasamento | null>(null)
  const semConexao = ref(false)
  const carregadoEm = ref<Date | null>(null)
  const itemEmAcao = ref<string | null>(null)

  function aplicar(id: string, resposta: GrandeDiaDto) {
    if (casamentoId.value === id) {
      dados.value = resposta
      carregadoEm.value = new Date()
      semConexao.value = false
    }
  }

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      dados.value = null
      carregadoEm.value = null
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null
    semConexao.value = false

    try {
      aplicar(id, await requisitar<GrandeDiaDto>(caminhoGrandeDia(id)))
    } catch (erro) {
      if (casamentoId.value === id) {
        dados.value = null
        falha.value = interpretarFalhaCasamento(erro)
      }
    } finally {
      if (casamentoId.value === id) {
        carregando.value = false
      }
    }
  }

  async function atualizar(id: string): Promise<void> {
    if (casamentoId.value !== id || dados.value === null || atualizando.value) {
      return
    }
    atualizando.value = true
    try {
      aplicar(id, await requisitar<GrandeDiaDto>(caminhoGrandeDia(id)))
    } catch (erro) {
      if (casamentoId.value === id) {
        const tipo = interpretarFalhaCasamento(erro).tipo
        if (tipo === 'naoEncontrado' || tipo === 'semPermissao') {
          dados.value = null
          falha.value = interpretarFalhaCasamento(erro)
        } else {
          semConexao.value = true
        }
      }
    } finally {
      atualizando.value = false
    }
  }

  async function alterar(id: string, itemId: string, metodo: 'PUT' | 'DELETE'): Promise<ResultadoCasamento<GrandeDiaDto>> {
    itemEmAcao.value = itemId
    try {
      const resposta = await requisitar<GrandeDiaDto>(caminhoConclusao(id, itemId), { metodo })
      aplicar(id, resposta)
      return { ok: true, valor: resposta }
    } catch (erro) {
      const falhaAcao = interpretarFalhaCasamento(erro)
      if (falhaAcao.tipo === 'conflito') {
        await atualizar(id)
      }
      return { ok: false, falha: falhaAcao }
    } finally {
      itemEmAcao.value = null
    }
  }

  function concluir(id: string, itemId: string): Promise<ResultadoCasamento<GrandeDiaDto>> {
    return alterar(id, itemId, 'PUT')
  }

  function reabrir(id: string, itemId: string): Promise<ResultadoCasamento<GrandeDiaDto>> {
    return alterar(id, itemId, 'DELETE')
  }

  function limpar() {
    casamentoId.value = null
    dados.value = null
    carregando.value = false
    atualizando.value = false
    falha.value = null
    semConexao.value = false
    carregadoEm.value = null
    itemEmAcao.value = null
  }

  return {
    casamentoId,
    dados,
    carregando,
    atualizando,
    falha,
    semConexao,
    carregadoEm,
    itemEmAcao,
    carregar,
    atualizar,
    concluir,
    reabrir,
    limpar,
  }
})
