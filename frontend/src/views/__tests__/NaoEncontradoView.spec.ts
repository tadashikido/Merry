import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import PrimeVue from 'primevue/config'

import { aguardarAte, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { rotas } from '@/router'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useEventosStore } from '@/stores/eventos'
import { TEXTOS_NAO_ENCONTRADO } from '@/textos/naoEncontrado'
import { TIPOS_EVENTO, type EventoDto, type TipoEvento } from '@/tipos/eventos'
import NaoEncontradoView from '@/views/NaoEncontradoView.vue'

await precarregarRotas('nao-encontrado')

const CAMINHO_INEXISTENTE = '/convite/<script>alert(1)</script>'
const ID_EVENTO = '11111111-2222-3333-4444-555555555555'
const OUTRO_EVENTO = '99999999-8888-7777-6666-555555555555'

const ROTULO_ANFITRIAO: Record<TipoEvento, string> = {
  Casamento: 'Voltar para o casamento',
  QuinzeAnos: 'Voltar para a festa de 15 anos',
  Aniversario: 'Voltar para o aniversário',
  Comemoracao: 'Voltar para a comemoração',
}

let pinia: Pinia

function entrarComo(papel: 'Dono' | 'Anfitriao', eventoId: string | null = ID_EVENTO) {
  const autenticacao = useAutenticacaoStore(pinia)
  autenticacao.tokenAcesso = 'token'
  autenticacao.usuario = {
    id: 'u1',
    nome: 'Pessoa Teste',
    email: 'pessoa@exemplo.com',
    papel,
    organizacao: { id: 'o1', nome: 'Assessoria' },
    eventoId: papel === 'Anfitriao' ? eventoId : null,
  }
}

function carregarEvento(tipo: TipoEvento, id = ID_EVENTO) {
  useEventosStore(pinia).atual = { id, tipo } as EventoDto
}

async function montar(caminho = '/inexistente') {
  const roteador = createRouter({ history: createMemoryHistory(), routes: rotas })
  await roteador.push(caminho)
  await roteador.isReady()
  const wrapper = mount(NaoEncontradoView, { global: { plugins: [roteador, PrimeVue, pinia] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, roteador }
}

describe('NaoEncontradoView', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('[COMPONENTE] explica o que aconteceu com título, explicação e dica', async () => {
    const { wrapper } = await montar()

    expect(wrapper.get('h1').text()).toBe('Página não encontrada')
    expect(wrapper.get('.nao-encontrado__explicacao').text()).toBe('O endereço acessado não existe.')
    expect(wrapper.get('[data-teste="dica-nao-encontrado"]').text()).toBe(TEXTOS_NAO_ENCONTRADO.dica)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    wrapper.unmount()
  })

  it('[COMPONENTE] visitante tem uma única saída real para o início, com aparência de ação primária', async () => {
    const { wrapper } = await montar()

    const link = wrapper.get('[data-teste="voltar-inicio"]')
    expect(link.element.tagName).toBe('A')
    expect(link.attributes('href')).toBe('/')
    expect(link.classes()).toContain('p-button')
    expect(link.text()).toBe('Voltar para o início')
    expect(wrapper.findAll('a, button')).toHaveLength(1)
    expect(wrapper.find('[data-teste="ver-eventos"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('[COMPONENTE] visitante recebe orientação sobre links recebidos, rotulada pelo próprio título', async () => {
    const { wrapper } = await montar()

    const nota = wrapper.get('[data-teste="orientacao-link-recebido"]')
    expect(nota.element.tagName).toBe('ASIDE')
    expect(nota.attributes('aria-labelledby')).toBe('nao-encontrado-link-recebido')
    expect(nota.get('h2').attributes('id')).toBe('nao-encontrado-link-recebido')
    expect(nota.get('h2').text()).toBe(TEXTOS_NAO_ENCONTRADO.linkRecebidoTitulo)
    expect(nota.text()).toContain('confirmação de presença')
    wrapper.unmount()
  })

  it('[COMPONENTE] ativar o link navega para o início', async () => {
    const { wrapper, roteador } = await montar()

    await wrapper.get('[data-teste="voltar-inicio"]').trigger('click')
    await flushPromises()

    await aguardarAte(() => expect(roteador.currentRoute.value.path).not.toBe('/inexistente'))
    expect(roteador.currentRoute.value.matched[0]?.path).not.toBe('/:caminho(.*)*')
    wrapper.unmount()
  })

  it('[COMPONENTE] assessoria tem atalhos para o início e para a lista de eventos, sem a nota de links', async () => {
    entrarComo('Dono')
    const { wrapper } = await montar()

    const atalhos = wrapper.get('nav[data-teste="atalhos-nao-encontrado"]')
    expect(atalhos.attributes('aria-label')).toBe('Atalhos')
    const links = atalhos.findAll('a')
    expect(links.map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Voltar para o início', '/'],
      ['Ver eventos', '/eventos'],
    ])
    expect(wrapper.get('[data-teste="ver-eventos"]').classes()).toContain('p-button-outlined')
    expect(wrapper.find('[data-teste="orientacao-link-recebido"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="dica-nao-encontrado"]').text()).toBe(TEXTOS_NAO_ENCONTRADO.dica)
    wrapper.unmount()
  })

  it('[COMPONENTE] assessoria vai para a lista de eventos pelo atalho', async () => {
    entrarComo('Dono')
    const { wrapper, roteador } = await montar()

    await wrapper.get('[data-teste="ver-eventos"]').trigger('click')

    await aguardarAte(() => expect(roteador.currentRoute.value.name).toBe('eventos'))
    wrapper.unmount()
  })

  it.each(TIPOS_EVENTO)('[COMPONENTE] anfitrião de %s volta direto para o próprio evento, citado pelo tipo', async (tipo) => {
    entrarComo('Anfitriao')
    carregarEvento(tipo)
    const { wrapper } = await montar()

    const link = wrapper.get('[data-teste="voltar-inicio"]')
    expect(link.text()).toBe(ROTULO_ANFITRIAO[tipo])
    expect(link.attributes('href')).toBe(`/eventos/${ID_EVENTO}`)
    expect(wrapper.findAll('a')).toHaveLength(1)
    expect(wrapper.find('[data-teste="ver-eventos"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="orientacao-link-recebido"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="dica-nao-encontrado"]').text()).toBe(TEXTOS_NAO_ENCONTRADO.dicaAnfitriao)
    wrapper.unmount()
  })

  it('[COMPONENTE] anfitrião sem o evento em memória vê o rótulo neutro, sem presumir casamento', async () => {
    entrarComo('Anfitriao')
    const { wrapper } = await montar()

    expect(wrapper.get('[data-teste="voltar-inicio"]').text()).toBe('Voltar para o evento')
    expect(wrapper.text()).not.toMatch(/casamento/i)
    wrapper.unmount()
  })

  it('[SEGURANÇA] anfitrião não herda o tipo de outro evento que esteja em memória', async () => {
    entrarComo('Anfitriao')
    carregarEvento('QuinzeAnos', OUTRO_EVENTO)
    const { wrapper } = await montar()

    const link = wrapper.get('[data-teste="voltar-inicio"]')
    expect(link.text()).toBe('Voltar para o evento')
    expect(link.attributes('href')).toBe(`/eventos/${ID_EVENTO}`)
    wrapper.unmount()
  })

  it('[SEGURANÇA] anfitrião sem evento na sessão cai na saída para o início, sem atalho exclusivo da assessoria', async () => {
    entrarComo('Anfitriao', null)
    const { wrapper } = await montar()

    expect(wrapper.get('[data-teste="voltar-inicio"]').attributes('href')).toBe('/')
    expect(wrapper.get('[data-teste="dica-nao-encontrado"]').text()).toBe(TEXTOS_NAO_ENCONTRADO.dica)
    expect(wrapper.find('[data-teste="ver-eventos"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('[INTEGRAÇÃO] não faz nenhuma requisição, em nenhum perfil', async () => {
    const espiao = vi.spyOn(globalThis, 'fetch')

    const visitante = await montar()
    visitante.wrapper.unmount()
    entrarComo('Dono')
    const assessoria = await montar()
    assessoria.wrapper.unmount()
    entrarComo('Anfitriao')
    const anfitriao = await montar()
    anfitriao.wrapper.unmount()

    expect(espiao).not.toHaveBeenCalled()
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
    expect(wrapper.get('.nao-encontrado__atalhos').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--grupo']))
    expect(wrapper.get('.nao-encontrado__explicacao').classes()).toContain('texto-destaque')
    expect(wrapper.get('[data-teste="dica-nao-encontrado"]').classes()).toContain('texto-legenda')
    expect(wrapper.findAll('.texto-tagline').length).toBeLessThanOrEqual(1)
    wrapper.unmount()
  })

  it('[UNITÁRIO] estilos da tela não usam cor, fonte ou espaçamento soltos e ajustam largura só por @container', () => {
    const fonte = readFileSync(resolve(__dirname, '../NaoEncontradoView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    const espacamentos = [...estilo.matchAll(/\b(?:margin|padding|gap)[a-z-]*\s*:\s*([^;]+);/g)].map((encontrado) => encontrado[1]?.trim())

    expect(estilo).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(estilo).not.toMatch(/rgba?\(/)
    expect(estilo).not.toMatch(/font-family/)
    expect(espacamentos.every((valor) => /^var\(--p-ritmo-[a-z]+\)$/.test(valor ?? ''))).toBe(true)
    expect(estilo).not.toMatch(/-\d/)
    expect(estilo).not.toMatch(/@media/)
    expect(estilo).toMatch(/@container nao-encontrado \(min-width: 28rem\)/)
    expect(fonte).not.toMatch(/<!--|\/\/ |\/\*/)
  })

  it('[SEGURANÇA] não reflete o caminho acessado na página', async () => {
    const { wrapper } = await montar(CAMINHO_INEXISTENTE)

    expect(wrapper.html()).not.toContain('alert(1)')
    expect(wrapper.html()).not.toContain('<script>')
    expect(wrapper.text()).not.toContain('convite/')
    wrapper.unmount()
  })
})
