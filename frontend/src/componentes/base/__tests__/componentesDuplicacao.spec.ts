import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import ListaNaoCopiado from '@/componentes/base/ListaNaoCopiado.vue'
import OpcaoCopia from '@/componentes/base/OpcaoCopia.vue'

function montarOpcao(props: Record<string, unknown> = {}) {
  return mount(OpcaoCopia, {
    props: {
      idCampo: 'copia-tarefas',
      titulo: 'Tarefas e checklist',
      descricao: 'Os prazos acompanham a nova data.',
      quantidade: 29,
      rotuloQuantidade: '29 tarefas',
      modelValue: true,
      ...props,
    },
    global: { plugins: [[PrimeVue, { unstyled: true }]] },
  })
}

describe('OpcaoCopia', () => {
  it('[COMPONENTE] mostra o número editorial marcado e liga a descrição à caixa', () => {
    const wrapper = montarOpcao({ complemento: '1 cancelada fica de fora.' })

    const entrada = wrapper.get('input[type="checkbox"]')
    expect((entrada.element as HTMLInputElement).checked).toBe(true)
    expect(entrada.attributes('aria-describedby')).toBe('copia-tarefas-descricao')
    expect(wrapper.get('#copia-tarefas-descricao').text()).toContain('Os prazos acompanham a nova data.')
    expect(wrapper.get('[data-teste="opcao-copia-complemento"]').text()).toBe('1 cancelada fica de fora.')
    expect(wrapper.get('[data-teste="opcao-copia-quantidade"]').text()).toBe('29')
    expect(wrapper.get('[data-teste="opcao-copia-quantidade"]').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('label').text()).toContain(': 29 tarefas')
    expect(wrapper.classes()).toContain('opcao-copia--marcada')
  })

  it('[COMPONENTE] emite a mudança ao desmarcar', async () => {
    const wrapper = montarOpcao()

    await wrapper.get('input').setValue(false)

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('[COMPONENTE] desabilitada não fica marcada visualmente e bloqueia a caixa', () => {
    const wrapper = montarOpcao({ desabilitado: true, quantidade: 0, modelValue: false })

    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('opcao-copia--desabilitada')
    expect(wrapper.classes()).not.toContain('opcao-copia--marcada')
    expect(wrapper.get('[data-teste="opcao-copia-quantidade"]').text()).toBe('0')
  })

  it('[COMPONENTE] carregando mostra esqueleto no lugar do número e não anuncia quantidade', () => {
    const wrapper = montarOpcao({ quantidade: null })

    expect(wrapper.get('[data-teste="opcao-copia-quantidade"]').text()).toBe('')
    expect(wrapper.get('label').text()).not.toContain('29 tarefas')
  })
})

describe('ListaNaoCopiado', () => {
  it('[COMPONENTE] nomeia a origem e lista o que não é copiado com ícone decorativo', () => {
    const wrapper = mount(ListaNaoCopiado, {
      props: { titulo: 'Fica com Ana & João', itens: ['Convidados', 'Acesso do casal'], idTitulo: 'fica' },
    })

    expect(wrapper.get('section').attributes('aria-labelledby')).toBe('fica')
    expect(wrapper.get('h2#fica').text()).toBe('Fica com Ana & João')
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual(['Convidados', 'Acesso do casal'])
    expect(wrapper.findAll('.ie-permissao').every((icone) => icone.attributes('aria-hidden') === 'true')).toBe(true)
  })

  it('[COMPONENTE] sem itens mostra só o título', () => {
    const wrapper = mount(ListaNaoCopiado, { props: { titulo: 'Fica com A & B', itens: [], idTitulo: 'vazio' } })

    expect(wrapper.find('ul').exists()).toBe(false)
  })
})
