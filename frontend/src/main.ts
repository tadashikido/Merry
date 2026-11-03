import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import roteador from './router'
import { instalarGuardaAutenticacao } from './router/guardaAutenticacao'
import { instalarGuardaOperador } from './router/guardaOperador'
import { useAutenticacaoStore } from './stores/autenticacao'
import { useOperadorAutenticacaoStore } from './stores/operadorAutenticacao'
import { presetTema } from './design/presetTema'
import { localePtBr } from './design/localePtBr'
import { lerNonceCsp } from './design/nonceCsp'
import './estilos/fontes.css'
import './estilos/icones.css'
import './estilos/base.css'
import './estilos/layout.css'
import './estilos/componentes.css'

const aplicacao = createApp(App)

const pinia = createPinia()
aplicacao.use(pinia)
instalarGuardaAutenticacao(roteador, useAutenticacaoStore(pinia))
instalarGuardaOperador(roteador, useOperadorAutenticacaoStore(pinia))
aplicacao.use(roteador)
aplicacao.use(PrimeVue, {
  theme: {
    preset: presetTema,
    options: {
      darkModeSelector: false,
    },
  },
  locale: localePtBr,
  csp: {
    nonce: lerNonceCsp(),
  },
})
aplicacao.use(ToastService)

aplicacao.mount('#app')

registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa:atualizacao-disponivel'))
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('pwa:pronto-offline'))
  },
})
