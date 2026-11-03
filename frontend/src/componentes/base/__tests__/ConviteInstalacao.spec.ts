import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import ConviteInstalacao from '@/componentes/base/ConviteInstalacao.vue'

function definirUserAgent(valor: string): void {
  Object.defineProperty(window.navigator, 'userAgent', { value: valor, configurable: true })
}

function dispararBeforeInstall(extra: Record<string, unknown> = {}): void {
  const evento = new Event('beforeinstallprompt')
  Object.assign(evento, extra)
  window.dispatchEvent(evento)
}

const SELETOR = '[data-teste="convite-instalacao"]'

describe('ConviteInstalacao', () => {
  beforeEach(() => {
    definirUserAgent('Mozilla/5.0 (Windows NT 10.0)')
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('[COMPONENTE] fica oculto sem evento de instalação, fora do iOS e do standalone', () => {
    const wrapper = mount(ConviteInstalacao)
    expect(wrapper.find(SELETOR).exists()).toBe(false)
  })

  it('[COMPONENTE] oferece o botão e dispara o prompt nativo quando instalável', async () => {
    const wrapper = mount(ConviteInstalacao)
    const prompt = vi.fn().mockResolvedValue(undefined)
    dispararBeforeInstall({ prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) })
    await flushPromises()

    await wrapper.get('.convite-instalacao__acao').trigger('click')
    await flushPromises()

    expect(prompt).toHaveBeenCalledTimes(1)
    expect(wrapper.find(SELETOR).exists()).toBe(false)
  })

  it('[COMPONENTE] no iOS mostra a instrução manual, sem botão nativo', () => {
    definirUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
    const wrapper = mount(ConviteInstalacao)

    expect(wrapper.get(SELETOR).text()).toContain('Adicionar à Tela de Início')
    expect(wrapper.find('.convite-instalacao__acao').exists()).toBe(false)
  })

  it('[COMPONENTE] não aparece quando o app já está instalado (standalone)', () => {
    definirUserAgent('Mozilla/5.0 (iPhone)')
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const wrapper = mount(ConviteInstalacao)

    expect(wrapper.find(SELETOR).exists()).toBe(false)
  })

  it('[COMPONENTE] dispensar oculta e persiste entre montagens', async () => {
    definirUserAgent('Mozilla/5.0 (iPhone)')
    const wrapper = mount(ConviteInstalacao)
    await wrapper.get('.convite-instalacao__fechar').trigger('click')
    expect(wrapper.find(SELETOR).exists()).toBe(false)

    const remontado = mount(ConviteInstalacao)
    expect(remontado.find(SELETOR).exists()).toBe(false)
  })
})
