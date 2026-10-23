import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'

import roteador, { TITULO_APLICACAO, rotas } from '@/router'
import NaoEncontradoView from '@/views/NaoEncontradoView.vue'

const ID_EVENTO = '11111111-2222-3333-4444-555555555555'

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

  it.each([
    ['/casamentos', '/eventos', 'eventos'],
    ['/casamentos/novo', '/eventos/novo', 'evento-novo'],
    [`/casamentos/${ID_EVENTO}`, `/eventos/${ID_EVENTO}`, 'evento'],
    [`/casamentos/${ID_EVENTO}/convidados`, `/eventos/${ID_EVENTO}/convidados`, 'evento-convidados'],
  ])('[SEGURANÇA] endereço antigo %s redireciona para %s preservando query e hash', async (antigo, novo, nome) => {
    const roteadorTeste = criarRoteadorDeTeste()

    await roteadorTeste.push(`${antigo}?filtro=pendentes#lista`)

    const atual = roteadorTeste.currentRoute.value
    expect(atual.path).toBe(novo)
    expect(atual.name).toBe(nome)
    expect(atual.query).toEqual({ filtro: 'pendentes' })
    expect(atual.hash).toBe('#lista')
  })

  it('[SEGURANÇA] link antigo do convite do anfitrião abre o aceite com o token preservado', async () => {
    const roteadorTeste = criarRoteadorDeTeste()

    await roteadorTeste.push('/acesso-casal#token=abc123')

    const atual = roteadorTeste.currentRoute.value
    expect(atual.name).toBe('aceite-acesso-anfitriao')
    expect(atual.path).toBe('/acesso-anfitriao')
    expect(atual.hash).toBe('#token=abc123')
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

    const wrapper = mount(NaoEncontradoView, { global: { plugins: [roteadorTeste, createPinia()] } })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Página não encontrada')
    const link = wrapper.get('[data-teste="voltar-inicio"]')
    expect(link.element.tagName).toBe('A')
    expect(link.attributes('href')).toBe('/')
    expect(link.text()).toBe('Voltar para o início')
  })
})
