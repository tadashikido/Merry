import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import PrimeVue from 'primevue/config'

import { rotas } from '@/router'
import { TEXTOS_NAO_ENCONTRADO } from '@/textos/naoEncontrado'
import NaoEncontradoView from '@/views/NaoEncontradoView.vue'

const CAMINHO_INEXISTENTE = '/convite/<script>alert(1)</script>'

async function montar(caminho = '/inexistente') {
  const roteador = createRouter({ history: createMemoryHistory(), routes: rotas })
  await roteador.push(caminho)
  await roteador.isReady()
  const wrapper = mount(NaoEncontradoView, { global: { plugins: [roteador, PrimeVue] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, roteador }
}

describe('NaoEncontradoView', () => {
  it('[COMPONENTE] explica o que aconteceu com título, explicação e dica', async () => {
    const { wrapper } = await montar()

    expect(wrapper.get('h1').text()).toBe('Página não encontrada')
    expect(wrapper.get('.nao-encontrado__explicacao').text()).toBe('O endereço acessado não existe.')
    expect(wrapper.get('[data-teste="dica-nao-encontrado"]').text()).toBe(TEXTOS_NAO_ENCONTRADO.dica)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    wrapper.unmount()
  })

  it('[COMPONENTE] a saída é um link real com aparência de ação primária', async () => {
    const { wrapper } = await montar()

    const link = wrapper.get('[data-teste="voltar-inicio"]')
    expect(link.element.tagName).toBe('A')
    expect(link.attributes('href')).toBe('/')
    expect(link.classes()).toContain('p-button')
    expect(link.text()).toBe('Voltar para o início')
    expect(wrapper.findAll('a, button')).toHaveLength(1)
    wrapper.unmount()
  })

  it('[COMPONENTE] ativar o link navega para o início', async () => {
    const { wrapper, roteador } = await montar()

    await wrapper.get('[data-teste="voltar-inicio"]').trigger('click')
    await flushPromises()

    expect(roteador.currentRoute.value.path).not.toBe('/inexistente')
    expect(roteador.currentRoute.value.matched[0]?.path).not.toBe('/:caminho(.*)*')
    wrapper.unmount()
  })

  it('[COMPONENTE] lacre decorativo fica oculto para leitores de tela e a seção é rotulada pelo título', async () => {
    const { wrapper } = await montar()

    const lacre = wrapper.get('[data-teste="lacre-nao-encontrado"]')
    expect(lacre.attributes('aria-hidden')).toBe('true')
    expect(lacre.find('.ie-busca').exists()).toBe(true)
    const secao = wrapper.get('section')
    expect(secao.attributes('aria-labelledby')).toBe('nao-encontrado-titulo')
    expect(wrapper.get('h1').attributes('id')).toBe('nao-encontrado-titulo')
    wrapper.unmount()
  })

  it('[COMPONENTE] usa o ritmo da fundação: bloco entre mensagem e ação, grupo e campo dentro da mensagem', async () => {
    const { wrapper } = await montar()

    expect(wrapper.get('section').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    expect(wrapper.get('.nao-encontrado__mensagem').classes()).toContain('pilha--grupo')
    expect(wrapper.get('.nao-encontrado__textos').classes()).toContain('pilha--campo')
    expect(wrapper.get('.nao-encontrado__explicacao').classes()).toContain('texto-destaque')
    expect(wrapper.get('[data-teste="dica-nao-encontrado"]').classes()).toContain('texto-legenda')
    expect(wrapper.findAll('.texto-tagline').length).toBeLessThanOrEqual(1)
    wrapper.unmount()
  })

  it('[UNITÁRIO] estilos da tela não usam cor, fonte ou espaçamento soltos', () => {
    const fonte = readFileSync(resolve(__dirname, '../NaoEncontradoView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))

    expect(estilo).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(estilo).not.toMatch(/rgba?\(/)
    expect(estilo).not.toMatch(/font-family/)
    expect(estilo).not.toMatch(/\b(margin|padding|gap)[a-z-]*\s*:/)
    expect(estilo).not.toMatch(/-\d/)
    expect(fonte).not.toMatch(/<!--|\/\/ |\/\*/)
  })

  it('[SEGURANÇA] não reflete o caminho acessado na página', async () => {
    const { wrapper } = await montar(CAMINHO_INEXISTENTE)

    expect(wrapper.html()).not.toContain('alert(1)')
    expect(wrapper.html()).not.toContain('<script>')
    expect(wrapper.text()).not.toContain('convite')
    wrapper.unmount()
  })
})
