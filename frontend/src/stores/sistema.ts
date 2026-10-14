import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ErroApi, requisitar } from '@/servicos/clienteHttp'
import { MENSAGEM_FALHA_CONEXAO } from '@/textos/mensagens'
import type { InformacoesSistemaDto } from '@/tipos/api'

export type SituacaoConexao = 'carregando' | 'conectado' | 'erro'

export const useSistemaStore = defineStore('sistema', () => {
  const informacoes = ref<InformacoesSistemaDto | null>(null)
  const carregando = ref(false)
  const erro = ref<string | null>(null)
  const offline = ref(false)

  const situacao = computed<SituacaoConexao>(() => {
    if (carregando.value) {
      return 'carregando'
    }
    if (erro.value !== null) {
      return 'erro'
    }
    return informacoes.value !== null ? 'conectado' : 'carregando'
  })

  async function carregarInformacoes(): Promise<void> {
    carregando.value = true
    erro.value = null
    offline.value = false

    try {
      informacoes.value = await requisitar<InformacoesSistemaDto>('/api/sistema/informacoes')
    } catch (falha) {
      informacoes.value = null
      offline.value = typeof navigator !== 'undefined' && !navigator.onLine
      erro.value = falha instanceof ErroApi ? falha.message : MENSAGEM_FALHA_CONEXAO
    } finally {
      carregando.value = false
    }
  }

  return { informacoes, carregando, erro, offline, situacao, carregarInformacoes }
})
