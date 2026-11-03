import { computed, onBeforeUnmount, onMounted, readonly, ref } from 'vue'

const CHAVE_DISPENSA = 'celebri:convite-instalacao-dispensado'

interface EventoInstalacao extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function ehAmbienteNavegador(): boolean {
  return typeof window !== 'undefined'
}

function detectarIos(): boolean {
  if (!ehAmbienteNavegador()) {
    return false
  }
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function detectarStandalone(): boolean {
  if (!ehAmbienteNavegador()) {
    return false
  }
  const porMedia =
    typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
  const porNavegador = (window.navigator as unknown as { standalone?: boolean }).standalone === true
  return porMedia || porNavegador
}

function lerDispensa(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_DISPENSA) === '1'
  } catch (erro) {
    void erro
    return false
  }
}

function gravarDispensa(): void {
  try {
    window.localStorage.setItem(CHAVE_DISPENSA, '1')
  } catch (erro) {
    void erro
  }
}

export function useInstalacaoPwa() {
  const eventoInstalacao = ref<EventoInstalacao | null>(null)
  const podeInstalar = ref(false)
  const dispensado = ref(lerDispensa())
  const ehIos = detectarIos()
  const ehStandalone = detectarStandalone()

  function aoReceberEvento(evento: Event) {
    evento.preventDefault()
    eventoInstalacao.value = evento as EventoInstalacao
    podeInstalar.value = true
  }

  function aoInstalar() {
    eventoInstalacao.value = null
    podeInstalar.value = false
  }

  onMounted(() => {
    if (!ehAmbienteNavegador()) {
      return
    }
    window.addEventListener('beforeinstallprompt', aoReceberEvento)
    window.addEventListener('appinstalled', aoInstalar)
  })

  onBeforeUnmount(() => {
    if (!ehAmbienteNavegador()) {
      return
    }
    window.removeEventListener('beforeinstallprompt', aoReceberEvento)
    window.removeEventListener('appinstalled', aoInstalar)
  })

  const mostrarConvite = computed(
    () => !ehStandalone && !dispensado.value && (podeInstalar.value || ehIos),
  )

  async function instalar(): Promise<void> {
    const evento = eventoInstalacao.value
    if (!evento) {
      return
    }
    await evento.prompt()
    await evento.userChoice.catch(() => undefined)
    aoInstalar()
  }

  function dispensar(): void {
    dispensado.value = true
    gravarDispensa()
  }

  return {
    podeInstalar: readonly(podeInstalar),
    ehIos,
    ehStandalone,
    mostrarConvite,
    instalar,
    dispensar,
  }
}
