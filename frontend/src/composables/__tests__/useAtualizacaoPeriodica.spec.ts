import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

import { useAtualizacaoPeriodica, useRelogioDispositivo } from '@/composables/useAtualizacaoPeriodica'

function montarCom(configurar: () => void) {
  return mount(
    defineComponent({
      setup: () => {
        configurar()
        return () => h('div')
      },
    }),
  )
}

function definirOculto(valor: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => valor })
}

beforeEach(() => {
  vi.useFakeTimers()
  definirOculto(false)
})

afterEach(() => {
  vi.useRealTimers()
  definirOculto(false)
})

describe('useAtualizacaoPeriodica', () => {
  it('[UNITÁRIO] chama a ação a cada intervalo, pausa com a aba oculta e para ao desmontar', () => {
    const acao = vi.fn()
    const wrapper = montarCom(() => useAtualizacaoPeriodica(acao, 30_000))

    vi.advanceTimersByTime(30_000)
    expect(acao).toHaveBeenCalledTimes(1)

    definirOculto(true)
    vi.advanceTimersByTime(60_000)
    expect(acao).toHaveBeenCalledTimes(1)

    definirOculto(false)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(acao).toHaveBeenCalledTimes(2)

    wrapper.unmount()
    vi.advanceTimersByTime(90_000)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(acao).toHaveBeenCalledTimes(2)
  })

  it('[UNITÁRIO] aba que fica oculta não dispara consulta no evento de visibilidade', () => {
    const acao = vi.fn()
    const wrapper = montarCom(() => useAtualizacaoPeriodica(acao, 60_000))

    definirOculto(true)
    document.dispatchEvent(new Event('visibilitychange'))

    expect(acao).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('useRelogioDispositivo', () => {
  it('[UNITÁRIO] avança o relógio no intervalo pedido', () => {
    let agora: { value: number } = { value: 0 }
    const wrapper = montarCom(() => {
      agora = useRelogioDispositivo(15_000)
    })
    const inicial = agora.value

    vi.advanceTimersByTime(15_000)

    expect(agora.value).toBeGreaterThanOrEqual(inicial + 15_000)
    wrapper.unmount()
  })
})
