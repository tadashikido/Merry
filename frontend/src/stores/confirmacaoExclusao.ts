import { ref } from 'vue'
import { defineStore } from 'pinia'

import { MENSAGENS_PADRAO, mensagemExcluido } from '@/textos/mensagens'

export interface OpcoesConfirmarExclusao {
  nomeItem: string
  mensagem?: string
  mensagemSucesso?: string
  aoConfirmar: () => void | Promise<void>
  aoCancelar?: () => void
}

export type ResultadoExclusao = 'excluido' | 'falhou' | 'ignorado'

export const useConfirmacaoExclusaoStore = defineStore('confirmacaoExclusao', () => {
  const visivel = ref(false)
  const executando = ref(false)
  const nomeItem = ref('')
  const mensagem = ref('')
  const mensagemSucesso = ref('')
  let operacaoAtual: OpcoesConfirmarExclusao | null = null

  function solicitar(opcoes: OpcoesConfirmarExclusao) {
    if (executando.value) {
      return
    }
    operacaoAtual = opcoes
    nomeItem.value = opcoes.nomeItem
    mensagem.value = opcoes.mensagem ?? MENSAGENS_PADRAO.exclusaoMensagem
    mensagemSucesso.value = opcoes.mensagemSucesso ?? mensagemExcluido(opcoes.nomeItem)
    visivel.value = true
  }

  async function confirmar(): Promise<ResultadoExclusao> {
    const operacao = operacaoAtual
    if (!operacao || executando.value || !visivel.value) {
      return 'ignorado'
    }
    executando.value = true
    try {
      await operacao.aoConfirmar()
      return 'excluido'
    } catch {
      return 'falhou'
    } finally {
      executando.value = false
      visivel.value = false
      operacaoAtual = null
    }
  }

  function cancelar() {
    if (executando.value || !visivel.value) {
      return
    }
    const operacao = operacaoAtual
    visivel.value = false
    operacaoAtual = null
    operacao?.aoCancelar?.()
  }

  return { visivel, executando, nomeItem, mensagem, mensagemSucesso, solicitar, confirmar, cancelar }
})
