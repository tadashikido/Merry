import { computed, onBeforeUnmount, onMounted, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

import { useAlteracoesNaoSalvasStore } from '@/stores/alteracoesNaoSalvas'

function serializar(estado: unknown): string {
  return JSON.stringify(estado) ?? ''
}

export function useRastreioAlteracoes(obterEstado: () => unknown) {
  const estadoInicial = ref(serializar(obterEstado()))

  const temAlteracoes = computed(() => serializar(obterEstado()) !== estadoInicial.value)

  function fixarEstadoInicial() {
    estadoInicial.value = serializar(obterEstado())
  }

  return { temAlteracoes, fixarEstadoInicial }
}

export function useAlteracoesNaoSalvas(temAlteracoes: MaybeRefOrGetter<boolean>) {
  const store = useAlteracoesNaoSalvasStore()
  let saidaLiberada = false

  function protegido(): boolean {
    return !saidaLiberada && toValue(temAlteracoes)
  }

  function aoSairDaPagina(evento: BeforeUnloadEvent) {
    if (!protegido()) {
      return
    }
    evento.preventDefault()
    evento.returnValue = ''
  }

  onBeforeRouteLeave(() => (protegido() ? store.solicitarConfirmacao() : true))

  onMounted(() => {
    window.addEventListener('beforeunload', aoSairDaPagina)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', aoSairDaPagina)
  })

  function liberarSaida() {
    saidaLiberada = true
  }

  return { liberarSaida }
}
