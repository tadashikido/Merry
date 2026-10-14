import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import PrimeVue from 'primevue/config'

import CaixaConsentimento from '@/componentes/base/CaixaConsentimento.vue'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, { unstyled: boolean }]] }

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

describe('CaixaConsentimento', () => {
  function montarCaixa(erro: string | null = null) {
    const marcado = ref(false)
    const Hospedeiro = defineComponent({
      setup() {
        return () =>
          h(CaixaConsentimento, {
            texto: 'Autorizo',
            idCampo: 'caixa',
            erro,
            modelValue: marcado.value,
            'onUpdate:modelValue': (valor: boolean) => {
              marcado.value = valor
            },
          })
      },
    })
    wrapper = mount(Hospedeiro, { global, attachTo: document.body })
    return marcado
  }

  it('[COMPONENTE] começa desmarcada e atualiza o modelo pelo rótulo', async () => {
    const marcado = montarCaixa()
    const entrada = wrapper!.get<HTMLInputElement>('[data-teste="consentimento-entrada"]')

    expect(entrada.element.checked).toBe(false)
    await entrada.setValue(true)

    expect(marcado.value).toBe(true)
    expect(wrapper!.get('label').attributes('for')).toBe('caixa')
  })

  it('[COMPONENTE] erro fica ligado por aria-describedby e aria-invalid', () => {
    montarCaixa('Marque')
    const entrada = wrapper!.get('[data-teste="consentimento-entrada"]')

    expect(entrada.attributes('aria-invalid')).toBe('true')
    expect(entrada.attributes('aria-describedby')).toBe('caixa-erro')
    expect(wrapper!.get('#caixa-erro').text()).toBe('Marque')
  })

  it('[COMPONENTE] expõe focar()', () => {
    wrapper = mount(CaixaConsentimento, { props: { texto: 'Autorizo', idCampo: 'caixa-foco', modelValue: false }, global, attachTo: document.body })

    ;(wrapper.vm as unknown as { focar: () => void }).focar()

    expect(document.activeElement?.id).toBe('caixa-foco')
  })
})
