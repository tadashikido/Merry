import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import { CONSULTA_TELA_PEQUENA, useTelaPequena } from '@/composables/useTelaPequena'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'

const Sonda = defineComponent({
  setup() {
    const telaPequena = useTelaPequena()
    return () => h('span', { 'data-teste': 'sonda' }, String(telaPequena.value))
  },
})

describe('useTelaPequena', () => {
  it('[UNITÁRIO] usa o breakpoint de notebook dos tokens', () => {
    expect(CONSULTA_TELA_PEQUENA).toBe('(max-width: 1023px)')
  })

  it('[UNITÁRIO] reflete a consulta de mídia ao montar e ao mudar', async () => {
    const midia = simularMatchMedia(true)
    const wrapper = mount(Sonda)
    await nextTick()
    expect(wrapper.text()).toBe('true')

    midia.definirTelaPequena(false)
    await nextTick()
    expect(wrapper.text()).toBe('false')
  })

  it('[UNITÁRIO] já renderiza o primeiro quadro no modo celular, sem salto de layout', () => {
    simularMatchMedia(true)
    const wrapper = mount(Sonda)
    expect(wrapper.text()).toBe('true')
  })

  it('[UNITÁRIO] assume tela grande quando o navegador não suporta matchMedia', async () => {
    vi.stubGlobal('matchMedia', undefined)
    const wrapper = mount(Sonda)
    await nextTick()
    expect(wrapper.text()).toBe('false')
  })
})
