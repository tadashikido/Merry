import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

import { breakpoints } from '@/design/tokens'

export const CONSULTA_TELA_PEQUENA = `(max-width: ${breakpoints.notebook - 1}px)`

function criarLista(consulta: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null
  }
  return window.matchMedia(consulta)
}

export function useTelaPequena(consulta: string = CONSULTA_TELA_PEQUENA): Ref<boolean> {
  const lista = criarLista(consulta)
  const telaPequena = ref(lista?.matches ?? false)

  function atualizar(evento: MediaQueryList | MediaQueryListEvent) {
    telaPequena.value = evento.matches
  }

  onMounted(() => {
    if (lista) {
      atualizar(lista)
      lista.addEventListener('change', atualizar)
    }
  })

  onBeforeUnmount(() => {
    lista?.removeEventListener('change', atualizar)
  })

  return telaPequena
}
