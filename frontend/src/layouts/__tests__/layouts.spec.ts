import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import PrimeVue from 'primevue/config'

import LayoutPainel from '@/layouts/LayoutPainel.vue'
import LayoutPublico from '@/layouts/LayoutPublico.vue'
import NavegacaoEvento from '@/layouts/NavegacaoEvento.vue'
import { gruposNavegacaoEvento } from '@/layouts/modulosEvento'
import type { ContextoEvento, ItemRail } from '@/layouts/tipos'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'

const Vazia = defineComponent({ render: () => h('p', 'Página') })

const ID = '11111111-1111-4111-8111-111111111111'

const itensRail: ItemRail[] = [
  { rotulo: 'Dashboard', icone: 'dashboard', rota: { name: 'inicio' }, prefixoAtivo: '/' },
  { rotulo: 'Eventos', icone: 'evento', rota: { name: 'eventos' }, prefixoAtivo: '/eventos' },
]

const evento: ContextoEvento = { nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'João', data: '2026-12-12', diasRestantes: 75 }

function criarRoteador() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'inicio', component: Vazia },
      { path: '/eventos', name: 'eventos', component: Vazia },
      { path: '/eventos/:id', name: 'evento', component: Vazia },
      { path: '/eventos/:id/tarefas', name: 'evento-tarefas', component: Vazia },
      { path: '/eventos/:id/tarefas/nova', name: 'tarefa-nova', component: Vazia },
      { path: '/eventos/:id/tarefas/:tarefaId/editar', name: 'tarefa-editar', component: Vazia },
      { path: '/eventos/:id/checklist', name: 'evento-checklist', component: Vazia },
      { path: '/eventos/:id/cronograma', name: 'evento-cronograma', component: Vazia },
      { path: '/eventos/:id/fornecedores', name: 'evento-fornecedores', component: Vazia },
      { path: '/eventos/:id/convidados', name: 'evento-convidados', component: Vazia },
      { path: '/eventos/:id/convidados/novo', name: 'convite-novo', component: Vazia },
      { path: '/eventos/:id/convidados/importar', name: 'convidados-importar', component: Vazia },
      { path: '/eventos/:id/convidados/:conviteId/editar', name: 'convite-editar', component: Vazia },
      { path: '/eventos/:id/confirmacoes', name: 'painel-confirmacoes', component: Vazia },
      { path: '/eventos/:id/restricoes-alimentares', name: 'restricoes-alimentares', component: Vazia },
      { path: '/eventos/:id/mesas', name: 'evento-mesas', component: Vazia },
      { path: '/eventos/:id/mesas/impressao', name: 'impressao-mesas', component: Vazia },
      { path: '/eventos/:id/financeiro', name: 'evento-financeiro', component: Vazia },
      { path: '/eventos/:id/grande-dia', name: 'evento-grande-dia', component: Vazia },
    ],
  })
}

async function montarPainel(caminho = '/eventos', comWorkspace = false) {
  const roteador = criarRoteador()
  await roteador.push(caminho)
  await roteador.isReady()
  const wrapper = mount(LayoutPainel, {
    props: {
      itensRail,
      gruposEvento: comWorkspace ? gruposNavegacaoEvento(ID, 'evento-convidados', () => true) : null,
      contextoEvento: comWorkspace ? evento : null,
    },
    slots: { default: '<h1>Convidados</h1>', 'rodape-menu': '<button type="button">Sair</button>' },
    attachTo: document.body,
    global: { plugins: [roteador, [PrimeVue, { unstyled: true }]] },
  })
  await nextTick()
  return { wrapper, roteador }
}

describe('LayoutPainel', () => {
  let montado: VueWrapper | undefined

  afterEach(() => {
    montado?.unmount()
    document.body.innerHTML = ''
  })

  it('[COMPONENTE] exibe o rail global com ícones rotulados, marca e item ativo por prefixo', async () => {
    simularMatchMedia(false)
    const { wrapper } = await montarPainel('/eventos')
    montado = wrapper

    const rail = wrapper.get('[data-teste="menu-lateral"]')
    expect(rail.get('nav').attributes('aria-label')).toBe('Navegação global')
    expect(rail.find('[data-teste="marca-produto"]').exists()).toBe(true)
    const links = rail.findAll('[data-teste="item-menu"]')
    expect(links.map((link) => link.text())).toEqual(['Dashboard', 'Eventos'])
    expect(links.map((link) => link.attributes('data-rotulo'))).toEqual(['Dashboard', 'Eventos'])
    expect(links[0]?.attributes('aria-current')).toBeUndefined()
    expect(links[1]?.attributes('aria-current')).toBe('page')
    expect(links[1]?.find('.ie-evento').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('[data-teste="abrir-menu"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="workspace-evento"]').exists()).toBe(false)
    expect(wrapper.get('main').attributes('id')).toBe('conteudo-principal')
    expect(wrapper.get('main h1').text()).toBe('Convidados')
    expect(rail.text()).toContain('Sair')
  })

  it('[COMPONENTE] marca Eventos ativo também dentro de um evento e Dashboard só na raiz', async () => {
    simularMatchMedia(false)
    const { wrapper, roteador } = await montarPainel(`/eventos/${ID}/convidados`)
    montado = wrapper

    const links = wrapper.findAll('[data-teste="item-menu"]')
    expect(links[1]?.attributes('aria-current')).toBe('page')
    await roteador.push('/')
    await flushPromises()
    expect(wrapper.findAll('[data-teste="item-menu"]')[0]?.attributes('aria-current')).toBe('page')
  })

  it('[COMPONENTE] dentro de um evento mostra a navegação do evento com nomes, data, contagem e só os grupos existentes', async () => {
    simularMatchMedia(false)
    const { wrapper } = await montarPainel(`/eventos/${ID}/convidados`, true)
    montado = wrapper

    expect(wrapper.get('.layout-painel').classes()).toContain('layout-painel--workspace')
    const workspace = wrapper.get('[data-teste="workspace-evento"]')
    expect(workspace.get('nav').attributes('aria-label')).toBe('Módulos do evento')
    expect(workspace.get('[data-teste="nomes-anfitrioes"]').text()).toContain('Ana')
    expect(workspace.get('[data-teste="navegacao-evento-quando"]').text()).toBe('12 dez 2026 · faltam 75 dias')
    expect(workspace.findAll('[data-teste="grupo-evento"]').map((grupo) => grupo.find('span').text())).toEqual(['Planejar', 'Pessoas', 'Dinheiro & documentos', 'Execução'])
    const ativo = workspace.get('[aria-current="page"]')
    expect(ativo.text()).toBe('Convidados')
    expect(ativo.attributes('href')).toBe(`/eventos/${ID}/convidados`)
  })

  it('[COMPONENTE] oferece link para pular ao conteúdo', async () => {
    simularMatchMedia(false)
    const { wrapper } = await montarPainel()
    montado = wrapper

    const pular = wrapper.get('.layout-painel__pular')
    expect(pular.attributes('href')).toBe('#conteudo-principal')
    expect(pular.text()).toBe('Pular para o conteúdo')
  })

  it('[COMPONENTE] no celular troca o rail por barra clara e abre a gaveta com rail expandido e navegação do evento', async () => {
    simularMatchMedia(true)
    const { wrapper } = await montarPainel(`/eventos/${ID}/convidados`, true)
    montado = wrapper

    expect(wrapper.find('[data-teste="menu-lateral"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="workspace-evento"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="barra-anfitriao"]').text()).toBe('Ana & João')
    const botao = wrapper.get('[data-teste="abrir-menu"]')
    expect(botao.attributes('aria-label')).toBe('Abrir menu')
    expect(botao.attributes('aria-expanded')).toBe('false')

    await botao.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-teste="abrir-menu"]').attributes('aria-expanded')).toBe('true')
    expect(document.body.querySelectorAll('[data-teste="item-menu"]')).toHaveLength(2)
    expect(document.body.querySelector('.rail-navegacao--expandido')).not.toBeNull()
    expect(document.body.querySelectorAll('[data-teste="item-evento"]')).toHaveLength(11)
  })

  it('[COMPONENTE] fecha a gaveta ao navegar', async () => {
    simularMatchMedia(true)
    const { wrapper, roteador } = await montarPainel()
    montado = wrapper

    await wrapper.get('[data-teste="abrir-menu"]').trigger('click')
    await flushPromises()
    await roteador.push('/')
    await flushPromises()

    expect(wrapper.get('[data-teste="abrir-menu"]').attributes('aria-expanded')).toBe('false')
  })

  it('[COMPONENTE] volta ao rail fixo e fecha a gaveta ao aumentar a tela', async () => {
    const midia = simularMatchMedia(true)
    const { wrapper } = await montarPainel()
    montado = wrapper

    await wrapper.get('[data-teste="abrir-menu"]').trigger('click')
    midia.definirTelaPequena(false)
    await flushPromises()

    expect(wrapper.find('[data-teste="abrir-menu"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="menu-lateral"]').exists()).toBe(true)
  })
})

describe('NavegacaoEvento', () => {
  it('[COMPONENTE] enquanto o evento carrega mostra esqueleto no lugar dos nomes e mantém os módulos', async () => {
    const roteador = criarRoteador()
    await roteador.push(`/eventos/${ID}`)
    const wrapper = mount(NavegacaoEvento, {
      props: { evento: null, grupos: gruposNavegacaoEvento(ID, 'evento', () => true) },
      global: { plugins: [roteador] },
    })

    expect(wrapper.find('[data-teste="nomes-anfitrioes"]').exists()).toBe(false)
    expect(wrapper.findAll('.navegacao-evento__esqueleto')).toHaveLength(2)
    expect(wrapper.findAll('[data-teste="item-evento"]')).toHaveLength(11)
  })

  it.each([
    ['Casamento', 'tom-tipo--rose', 'Casamento'],
    ['QuinzeAnos', 'tom-tipo--orquidea', '15 anos'],
    ['Aniversario', 'tom-tipo--tangerina', 'Aniversário'],
    ['Comemoracao', 'tom-tipo--champanhe', 'Comemoração'],
  ] as const)('[COMPONENTE] o cartão do evento %s usa o tom do tipo e mostra a etiqueta do tipo', async (tipo, classe, rotulo) => {
    const roteador = criarRoteador()
    const wrapper = mount(NavegacaoEvento, {
      props: { evento: { ...evento, tipo }, grupos: [] },
      global: { plugins: [roteador] },
    })

    const cabecalho = wrapper.get('[data-teste="navegacao-evento-cabecalho"]')
    expect(cabecalho.classes()).toContain(classe)
    expect(cabecalho.get('[data-teste="etiqueta-tipo"]').text()).toBe(rotulo)
    expect(cabecalho.find('[data-teste="nomes-anfitrioes"]').exists()).toBe(true)
  })

  it.each([null, undefined, 'Formatura'])('[COMPONENTE] tipo %s cai no neutro meia-noite, nunca no rosé de Casamento', async (tipo) => {
    const roteador = criarRoteador()
    const wrapper = mount(NavegacaoEvento, {
      props: { evento: { ...evento, tipo: tipo as ContextoEvento['tipo'] }, grupos: [] },
      global: { plugins: [roteador] },
    })

    const cabecalho = wrapper.get('[data-teste="navegacao-evento-cabecalho"]')
    expect(cabecalho.classes()).toContain('tom-tipo--neutro')
    expect(cabecalho.classes()).not.toContain('tom-tipo--rose')
    expect(cabecalho.find('[data-teste="etiqueta-tipo"]').exists()).toBe(false)
    expect(cabecalho.text()).toContain('Evento')
  })

  it('[COMPONENTE] marca o Grande Dia com a centelha decorativa e mantém aria-current no item ativo', async () => {
    const roteador = criarRoteador()
    await roteador.push(`/eventos/${ID}`)
    const wrapper = mount(NavegacaoEvento, {
      props: { evento, grupos: gruposNavegacaoEvento(ID, 'evento', () => true) },
      global: { plugins: [roteador] },
    })

    const grandeDia = wrapper.get('.navegacao-evento__item--grande-dia')
    expect(grandeDia.get('.ie-centelha').attributes('aria-hidden')).toBe('true')
    expect(wrapper.findAll('[aria-current="page"]')).toHaveLength(1)
  })

  it('[COMPONENTE] descreve o dia do evento e datas passadas sem recalcular os dias', async () => {
    const roteador = criarRoteador()
    const hoje = mount(NavegacaoEvento, {
      props: { evento: { ...evento, diasRestantes: 0 }, grupos: [] },
      global: { plugins: [roteador] },
    })
    expect(hoje.get('[data-teste="navegacao-evento-quando"]').text()).toBe('12 dez 2026 · é hoje')

    const passado = mount(NavegacaoEvento, {
      props: { evento: { ...evento, diasRestantes: -1 }, grupos: [] },
      global: { plugins: [roteador] },
    })
    expect(passado.get('[data-teste="navegacao-evento-quando"]').text()).toBe('12 dez 2026 · foi ontem')
    expect(passado.findAll('[data-teste="grupo-evento"]')).toHaveLength(0)
  })
})

describe('LayoutPublico', () => {
  it('[COMPONENTE] envolve o conteúdo em main com marca Celebri e rodapé', () => {
    const wrapper = mount(LayoutPublico, {
      slots: { default: '<h1>Lívia &amp; Rafael</h1>', rodape: 'Dúvidas? Fale com a cerimonialista.' },
    })

    expect(wrapper.get('main').attributes('id')).toBe('conteudo-principal')
    expect(wrapper.get('main h1').text()).toBe('Lívia & Rafael')
    expect(wrapper.get('footer').text()).toContain('Dúvidas?')
    expect(wrapper.get('.somente-leitor-tela').text()).toBe('Celebri')
    expect(wrapper.classes()).toContain('layout-publico--padrao')
  })

  it('[COMPONENTE] variante convite dispensa o cabeçalho de marca e usa o fundo do convite', () => {
    const wrapper = mount(LayoutPublico, { props: { variante: 'convite' }, slots: { default: '<p>Convite</p>' } })

    expect(wrapper.classes()).toContain('layout-publico--convite')
    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.get('main').text()).toBe('Convite')
  })

  it('[COMPONENTE] em modo demonstração não cria um segundo main', () => {
    const wrapper = mount(LayoutPublico, { props: { demonstracao: true }, slots: { default: '<p>Exemplo</p>' } })

    expect(wrapper.find('main').exists()).toBe(false)
    expect(wrapper.find('#conteudo-principal').exists()).toBe(false)
    expect(wrapper.find('footer').exists()).toBe(false)
  })
})
