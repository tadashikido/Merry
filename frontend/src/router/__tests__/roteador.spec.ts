import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import roteador, { TITULO_APLICACAO, rotas } from '@/router'
import NaoEncontradoView from '@/views/NaoEncontradoView.vue'

function criarRoteadorDeTeste() {
  return createRouter({ history: createMemoryHistory(), routes: rotas })
}

describe('roteador', () => {
  it('[UNITÁRIO] resolve a raiz para a rota inicio', () => {
    expect(criarRoteadorDeTeste().resolve('/').name).toBe('inicio')
  })

  it.each(['/qualquer', '/convidados/123', '/a/b/c?x=1'])('[UNITÁRIO] resolve %s para a rota nao-encontrado', (caminho) => {
    expect(criarRoteadorDeTeste().resolve(caminho).name).toBe('nao-encontrado')
  })

  it('[UNITÁRIO] atualiza o título do documento após a navegação', async () => {
    await roteador.push('/rota-que-nao-existe')
    await roteador.isReady()

    expect(document.title).toBe(`Página não encontrada · ${TITULO_APLICACAO}`)

    await roteador.push('/')
    expect(document.title).toBe(TITULO_APLICACAO)
  })
})

describe('NaoEncontradoView', () => {
  it('[COMPONENTE] exibe mensagem e link real para voltar ao início', async () => {
    const roteadorTeste = criarRoteadorDeTeste()
    await roteadorTeste.push('/inexistente')
    await roteadorTeste.isReady()

    const wrapper = mount(NaoEncontradoView, { global: { plugins: [roteadorTeste] } })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Página não encontrada')
    const link = wrapper.get('[data-teste="voltar-inicio"]')
    expect(link.element.tagName).toBe('A')
    expect(link.attributes('href')).toBe('/')
    expect(link.text()).toBe('Voltar para o início')
  })
})
