import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import BarraAcaoFixa from '../BarraAcaoFixa.vue'
import LinhaPessoaMesa from '../LinhaPessoaMesa.vue'
import OcupacaoMesa from '../OcupacaoMesa.vue'

const global = { plugins: [PrimeVue] }

describe('OcupacaoMesa', () => {
  it('[COMPONENTE] desenha um lugar por cadeira, ocupados primeiro, com texto e rótulo acessível', () => {
    const wrapper = mount(OcupacaoMesa, { props: { ocupados: 5, lugares: 8 } })

    const lugares = wrapper.findAll('[data-teste="lugar-mesa"]')
    expect(lugares).toHaveLength(8)
    expect(lugares.filter((lugar) => lugar.classes('ocupacao-mesa__lugar--ocupado'))).toHaveLength(5)
    expect(lugares[4]!.classes()).toContain('ocupacao-mesa__lugar--ocupado')
    expect(lugares[5]!.classes()).not.toContain('ocupacao-mesa__lugar--ocupado')
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('5 de 8 lugares ocupados')
    expect(wrapper.get('[data-teste="texto-ocupacao"]').text()).toBe('5 de 8')
    expect(wrapper.classes()).not.toContain('ocupacao-mesa--completa')
  })

  it('[COMPONENTE] mesa cheia mostra "completa" fora da versão compacta', () => {
    const completa = mount(OcupacaoMesa, { props: { ocupados: 8, lugares: 8 } })
    const compacta = mount(OcupacaoMesa, { props: { ocupados: 8, lugares: 8, compacta: true } })

    expect(completa.classes()).toContain('ocupacao-mesa--completa')
    expect(completa.get('[data-teste="texto-ocupacao"]').text()).toBe('8 de 8 · completa')
    expect(compacta.get('[data-teste="texto-ocupacao"]').text()).toBe('8 de 8')
    expect(compacta.classes()).toContain('ocupacao-mesa--compacta')
  })

  it('[COMPONENTE] lugar único usa o singular', () => {
    const wrapper = mount(OcupacaoMesa, { props: { ocupados: 0, lugares: 1 } })

    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('0 de 1 lugar ocupado')
  })
})

describe('LinhaPessoaMesa', () => {
  it('[COMPONENTE] o nome é o rótulo da caixa de seleção e o apoio a descreve', async () => {
    const wrapper = mount(LinhaPessoaMesa, {
      props: { nome: 'Carla Souza', apoio: 'Família da noiva', selecionada: false },
      global,
    })

    const entrada = wrapper.get('input[type="checkbox"]')
    const rotulo = wrapper.get('label')
    expect(rotulo.text()).toBe('Carla Souza')
    expect(rotulo.attributes('for')).toBe(entrada.attributes('id'))
    expect(entrada.attributes('aria-describedby')).toBe(wrapper.get('.linha-pessoa-mesa__apoio').attributes('id'))

    await entrada.setValue(true)

    expect(wrapper.emitted('update:selecionada')?.[0]).toEqual([true])
  })

  it('[COMPONENTE] selecionada recebe o destaque e mostra marcas de criança e acompanhante', () => {
    const wrapper = mount(LinhaPessoaMesa, {
      props: { nome: 'Pedro Souza', crianca: true, acompanhante: true, selecionada: true },
      global,
    })

    expect(wrapper.classes()).toContain('linha-pessoa-mesa--selecionada')
    expect(wrapper.text()).toContain('Criança')
    expect(wrapper.text()).toContain('Acompanhante')
  })

  it('[COMPONENTE] somente leitura não tem caixa de seleção nem destaque', () => {
    const wrapper = mount(LinhaPessoaMesa, {
      props: { nome: 'Marcos Lima', selecionavel: false, selecionada: true },
      slots: { extra: () => h('span', { 'data-teste': 'extra' }, 'Convite dividido') },
      global,
    })

    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper.find('label').exists()).toBe(false)
    expect(wrapper.classes()).not.toContain('linha-pessoa-mesa--selecionada')
    expect(wrapper.get('[data-teste="extra"]').text()).toBe('Convite dividido')
  })
})

describe('BarraAcaoFixa', () => {
  it('[COMPONENTE] aceita a variante de seleção com status anunciado', () => {
    const wrapper = mount(BarraAcaoFixa, {
      props: { variante: 'selecao' },
      slots: { status: () => '2 pessoas selecionadas', default: () => h('button', 'Sentar em…') },
    })

    expect(wrapper.classes()).toContain('barra-acao-fixa--selecao')
    expect(wrapper.get('.barra-acao-fixa__status').attributes('aria-live')).toBe('polite')
    expect(wrapper.text()).toContain('2 pessoas selecionadas')
  })
})
