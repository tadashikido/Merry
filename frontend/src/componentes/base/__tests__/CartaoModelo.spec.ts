import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createMemoryHistory, createRouter } from 'vue-router'

import CartaoModelo from '@/componentes/base/CartaoModelo.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'

const acoes: ItemMenuAcoes[] = [
  { chave: 'editar', rotulo: 'Editar nome' },
  { chave: 'excluir', rotulo: 'Excluir', perigoso: true },
]

const propsPadrao: {
  nome: string
  descricao: string | null
  rota: { name: string; params: { modeloId: string } }
  contagem: string
  sugerido: boolean
  rotuloSugerido: string
  acoes: ItemMenuAcoes[]
  rotuloAcoes: string
  rotuloAcessivelAcoes: string
} = {
  nome: 'Casamento no campo',
  descricao: 'Cerimônia ao ar livre com tenda.',
  rota: { name: 'detalhe', params: { modeloId: 'm1' } },
  contagem: '18 itens',
  sugerido: true,
  rotuloSugerido: 'Sugerido',
  acoes,
  rotuloAcoes: 'Mais ações',
  rotuloAcessivelAcoes: 'Mais ações para Casamento no campo',
}

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

async function montar(props: Partial<typeof propsPadrao> = {}, slots: Record<string, string> = {}) {
  const roteador = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/modelos/:modeloId', name: 'detalhe', component: { template: '<div />' } },
    ],
  })
  await roteador.push('/')
  await roteador.isReady()
  wrapper = mount(CartaoModelo, {
    props: { ...propsPadrao, ...props },
    slots,
    attachTo: document.body,
    global: { plugins: [roteador, [PrimeVue, { unstyled: true }] as [typeof PrimeVue, object]] },
  })
  await flushPromises()
  return { wrapper, roteador }
}

describe('CartaoModelo', () => {
  it('[COMPONENTE] mostra nome como link de cabeçalho, descrição, selo e contagem', async () => {
    const { wrapper } = await montar()

    const titulo = wrapper.get('h2')
    expect(titulo.text()).toBe('Casamento no campo')
    expect(titulo.get('[data-teste="link-modelo"]').attributes('href')).toBe('/modelos/m1')
    expect(wrapper.get('[data-teste="descricao-modelo"]').text()).toBe('Cerimônia ao ar livre com tenda.')
    expect(wrapper.text()).toContain('Sugerido')
    expect(wrapper.get('[data-teste="contagem-modelo"]').text()).toBe('18 itens')
    expect(wrapper.get('[data-teste="menu-acoes"]').attributes('aria-label')).toBe('Mais ações para Casamento no campo')
  })

  it('[COMPONENTE] sem descrição e não sugerido omite os dois blocos', async () => {
    const { wrapper } = await montar({ descricao: null, sugerido: false })

    expect(wrapper.find('[data-teste="descricao-modelo"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Sugerido')
    expect(wrapper.get('[data-teste="contagem-modelo"]').text()).toBe('18 itens')
  })

  it('[COMPONENTE] slot detalhes entra no rodapé ao lado do selo', async () => {
    const { wrapper } = await montar({}, { detalhes: '<span data-teste="extra">Referência 16:00</span>' })

    expect(wrapper.get('.cartao-modelo__selos').get('[data-teste="extra"]').text()).toBe('Referência 16:00')
  })

  it('[COMPONENTE] escolher uma ação do menu emite selecionar sem navegar', async () => {
    const { wrapper, roteador } = await montar()

    wrapper.findComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'excluir')
    await flushPromises()

    expect(wrapper.emitted('selecionar')).toEqual([['excluir']])
    expect(roteador.currentRoute.value.path).toBe('/')
  })

  it('[COMPONENTE] clicar no nome navega para o detalhe', async () => {
    const { wrapper, roteador } = await montar()

    await wrapper.get('[data-teste="link-modelo"]').trigger('click')
    await flushPromises()

    expect(roteador.currentRoute.value.fullPath).toBe('/modelos/m1')
  })

  it('[UNITÁRIO] estilo usa link esticado, menu acima do link, foco no cartão e @container sem @media', () => {
    const fonte = readFileSync(resolve(__dirname, '../CartaoModelo.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))

    expect(estilo).toMatch(/\.cartao-modelo__link::after\s*\{[^}]*position: absolute;[^}]*inset: 0;/)
    expect(estilo).toMatch(/\.cartao-modelo__menu\s*\{[^}]*position: relative;[^}]*z-index: 1;/)
    expect(estilo).toMatch(/\.cartao-modelo__link:focus-visible::after\s*\{[^}]*outline: var\(--p-focus-ring-width\)/)
    expect(estilo).toContain('container: cartao-modelo / inline-size')
    expect(estilo).toContain('@container cartao-modelo')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toMatch(/box-shadow|gradient|#[0-9a-fA-F]{3,6}\b|--p-espaco-/)
  })
})
