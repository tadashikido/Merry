import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useAtualizacaoPeriodica(acao: () => void | Promise<void>, intervaloMs: number) {
  let temporizador: ReturnType<typeof setInterval> | null = null

  function parar() {
    if (temporizador !== null) {
      clearInterval(temporizador)
      temporizador = null
    }
  }

  function iniciar() {
    parar()
    temporizador = setInterval(() => {
      if (!document.hidden) {
        void acao()
      }
    }, intervaloMs)
  }

  function aoMudarVisibilidade() {
    if (!document.hidden) {
      void acao()
    }
  }

  onMounted(() => {
    iniciar()
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
  })

  onBeforeUnmount(() => {
    parar()
    document.removeEventListener('visibilitychange', aoMudarVisibilidade)
  })

  return { iniciar, parar }
}

export function useRelogioDispositivo(intervaloMs: number) {
  const agora = ref(Date.now())
  let temporizador: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    temporizador = setInterval(() => {
      agora.value = Date.now()
    }, intervaloMs)
  })

  onBeforeUnmount(() => {
    if (temporizador !== null) {
      clearInterval(temporizador)
    }
  })

  return agora
}
