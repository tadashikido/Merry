import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAlteracoesNaoSalvasStore = defineStore('alteracoesNaoSalvas', () => {
  const visivel = ref(false)
  let resolverPendente: ((descartar: boolean) => void) | null = null

  function responder(descartar: boolean) {
    const resolver = resolverPendente
    resolverPendente = null
    visivel.value = false
    resolver?.(descartar)
  }

  function solicitarConfirmacao(): Promise<boolean> {
    if (resolverPendente) {
      responder(false)
    }
    visivel.value = true
    return new Promise<boolean>((resolver) => {
      resolverPendente = resolver
    })
  }

  function descartar() {
    responder(true)
  }

  function continuarEditando() {
    responder(false)
  }

  return { visivel, solicitarConfirmacao, descartar, continuarEditando }
})
