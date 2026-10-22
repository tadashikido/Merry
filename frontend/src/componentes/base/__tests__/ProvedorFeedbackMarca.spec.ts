import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'

import ProvedorFeedback from '@/componentes/base/ProvedorFeedback.vue'
import { useNotificacao } from '@/composables/useNotificacao'

type Api = ReturnType<typeof useNotificacao>

function montarHarness() {
  let api: Api | undefined
  const Harness = defineComponent({
    setup() {
      api = useNotificacao()
      return () => h(ProvedorFeedback)
    },
  })
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [createPinia(), [PrimeVue, { unstyled: true }], ToastService] },
  })
  if (!api) {
    throw new Error('Harness não inicializado')
  }
  return { wrapper, api }
}

function toasts(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('[data-teste="toast"]'))
}

describe('ProvedorFeedback — classes do bloco toast-feedback', () => {
  let montado: VueWrapper | undefined

  afterEach(() => {
    montado?.unmount()
    document.body.innerHTML = ''
  })

  it('[COMPONENTE] toast de sucesso usa o bloco e o modificador toast-feedback', async () => {
    const { wrapper, api } = montarHarness()
    montado = wrapper

    api.sucesso('Detalhe salvo.', 'Salvo')
    await flushPromises()

    const [toast] = toasts()
    expect(toast).toBeDefined()
    expect(toast?.classList.contains('toast-feedback')).toBe(true)
    expect(toast?.classList.contains('toast-feedback--success')).toBe(true)
    expect(toast?.querySelector('.toast-feedback__icone')).not.toBeNull()
    expect(toast?.querySelector('.toast-feedback__textos')).not.toBeNull()
    expect(toast?.querySelector('.toast-feedback__resumo')?.textContent?.trim()).toBe('Salvo')
    expect(toast?.querySelector('.toast-feedback__detalhe')?.textContent?.trim()).toBe('Detalhe salvo.')
    expect(toast?.querySelector('.toast-feedback__fechar')).not.toBeNull()
  })

  it('[COMPONENTE] toast de erro usa o modificador toast-feedback--error', async () => {
    const { wrapper, api } = montarHarness()
    montado = wrapper

    api.erro('Não foi possível salvar.', 'Algo deu errado')
    await flushPromises()

    const [toast] = toasts()
    expect(toast?.classList.contains('toast-feedback--error')).toBe(true)
  })

  it('[COMPONENTE] toast com desfazer usa toast-feedback__desfazer', async () => {
    const { wrapper, api } = montarHarness()
    montado = wrapper

    api.sucesso('Casamento arquivado.', { desfazer: vi.fn() })
    await flushPromises()

    const desfazer = document.body.querySelector('[data-teste="toast-desfazer"]')
    expect(desfazer?.classList.contains('toast-feedback__desfazer')).toBe(true)
  })

  it('[COMPONENTE] nenhum elemento do toast usa classe com a marca legada', async () => {
    const { wrapper, api } = montarHarness()
    montado = wrapper

    api.sucesso('Casamento arquivado.', { desfazer: vi.fn() })
    api.erro()
    await flushPromises()

    expect(toasts()).toHaveLength(2)
    expect(document.body.querySelector('[class*="enlace"]')).toBeNull()
    expect(document.body.querySelector('[class*="nossia"]')).toBeNull()
    expect(document.body.innerHTML).not.toMatch(/enlace|nossia/i)
  })
})
