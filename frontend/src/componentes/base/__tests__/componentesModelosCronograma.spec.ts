import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import AbasSecao from '../AbasSecao.vue'
import { ABAS_MODELOS } from '@/layouts/abasModelos'
import { ITENS_RAIL_ASSESSORIA, itemRailAtivo } from '@/layouts/menuPainel'
import { TEXTOS_ABAS_MODELOS } from '@/textos/modelosCronograma'

const Vazio = defineComponent({ render: () => h('div') })

function criarRoteador() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/modelos-checklist', name: 'modelos-checklist', component: Vazio },
      { path: '/modelos-cronograma', name: 'modelos-cronograma', component: Vazio },
    ],
  })
}

async function montarAbas(ativa: string) {
  const roteador = criarRoteador()
  await roteador.push('/modelos-cronograma')
  await roteador.isReady()
  return mount(AbasSecao, {
    props: { rotulo: TEXTOS_ABAS_MODELOS.rotulo, abas: ABAS_MODELOS, ativa },
    global: { plugins: [roteador] },
  })
}

describe('AbasSecao', () => {
  it('[COMPONENTE] é uma navegação rotulada com links e marca a aba atual', async () => {
    const wrapper = await montarAbas('cronograma')

    const nav = wrapper.get('nav[data-teste="abas-secao"]')
    expect(nav.attributes('aria-label')).toBe('Tipos de modelo')
    const checklist = wrapper.get('[data-teste="aba-checklist"]')
    const cronograma = wrapper.get('[data-teste="aba-cronograma"]')
    expect(checklist.element.tagName).toBe('A')
    expect(checklist.attributes('href')).toBe('/modelos-checklist')
    expect(checklist.attributes('aria-current')).toBeUndefined()
    expect(cronograma.attributes('aria-current')).toBe('page')
    expect(cronograma.classes()).toContain('abas-secao__aba--ativa')
    expect(wrapper.findAll('li')).toHaveLength(2)
  })

  it('[COMPONENTE] a aba ativa acompanha a prop', async () => {
    const wrapper = await montarAbas('checklist')

    expect(wrapper.get('[data-teste="aba-checklist"]').attributes('aria-current')).toBe('page')
    expect(wrapper.get('[data-teste="aba-cronograma"]').attributes('aria-current')).toBeUndefined()
  })
})

describe('rail Modelos', () => {
  it('[UNITÁRIO] fica ativo nas duas áreas de modelos e não em rotas parecidas', () => {
    const modelos = ITENS_RAIL_ASSESSORIA.find((item) => item.rota && typeof item.rota === 'object' && 'name' in item.rota && item.rota.name === 'modelos-checklist')!

    expect(itemRailAtivo(modelos, '/modelos-checklist')).toBe(true)
    expect(itemRailAtivo(modelos, '/modelos-cronograma')).toBe(true)
    expect(itemRailAtivo(modelos, '/modelos-cronograma/33333333-3333-4333-8333-333333333333/editar')).toBe(true)
    expect(itemRailAtivo(modelos, '/modelos-cronogramax')).toBe(false)
    expect(itemRailAtivo(modelos, '/casamentos')).toBe(false)
  })
})
