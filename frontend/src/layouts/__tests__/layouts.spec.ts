import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import PrimeVue from 'primevue/config'

import LayoutPainel from '@/layouts/LayoutPainel.vue'
import LayoutPublico from '@/layouts/LayoutPublico.vue'
import NavegacaoCasamento from '@/layouts/NavegacaoCasamento.vue'
import { gruposNavegacaoCasamento } from '@/layouts/modulosCasamento'
import type { ContextoCasamento, ItemRail } from '@/layouts/tipos'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'

const Vazia = defineComponent({ render: () => h('p', 'Página') })

const ID = '11111111-1111-4111-8111-111111111111'

const itensRail: ItemRail[] = [
  { rotulo: 'Dashboard', icone: 'dashboard', rota: { name: 'inicio' }, prefixoAtivo: '/' },
  { rotulo: 'Casamentos', icone: 'casamento', rota: { name: 'casamentos' }, prefixoAtivo: '/casamentos' },
]

const casamento: ContextoCasamento = { nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'João', data: '2026-12-12', diasRestantes: 75 }

function criarRoteador() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'inicio', component: Vazia },
      { path: '/casamentos', name: 'casamentos', component: Vazia },
      { path: '/casamentos/:id', name: 'casamento', component: Vazia },
      { path: '/casamentos/:id/tarefas', name: 'casamento-tarefas', component: Vazia },
      { path: '/casamentos/:id/tarefas/nova', name: 'tarefa-nova', component: Vazia },
      { path: '/casamentos/:id/tarefas/:tarefaId/editar', name: 'tarefa-editar', component: Vazia },
      { path: '/casamentos/:id/checklist', name: 'casamento-checklist', component: Vazia },
      { path: '/casamentos/:id/cronograma', name: 'casamento-cronograma', component: Vazia },
      { path: '/casamentos/:id/fornecedores', name: 'casamento-fornecedores', component: Vazia },
      { path: '/casamentos/:id/convidados', name: 'casamento-convidados', component: Vazia },
      { path: '/casamentos/:id/convidados/novo', name: 'convite-novo', component: Vazia },
      { path: '/casamentos/:id/convidados/importar', name: 'convidados-importar', component: Vazia },
      { path: '/casamentos/:id/convidados/:conviteId/editar', name: 'convite-editar', component: Vazia },
      { path: '/casamentos/:id/confirmacoes', name: 'painel-confirmacoes', component: Vazia },
      { path: '/casamentos/:id/restricoes-alimentares', name: 'restricoes-alimentares', component: Vazia },
      { path: '/casamentos/:id/mesas', name: 'casamento-mesas', component: Vazia },
      { path: '/casamentos/:id/mesas/impressao', name: 'impressao-mesas', component: Vazia },
      { path: '/casamentos/:id/financeiro', name: 'casamento-financeiro', component: Vazia },
      { path: '/casamentos/:id/grande-dia', name: 'casamento-grande-dia', component: Vazia },
    ],
  })
}

async function montarPainel(caminho = '/casamentos', comWorkspace = false) {
  const roteador = criarRoteador()
  await roteador.push(caminho)
  await roteador.isReady()
  const wrapper = mount(LayoutPainel, {
    props: {
      itensRail,
      gruposCasamento: comWorkspace ? gruposNavegacaoCasamento(ID, 'casamento-convidados', () => true) : null,
      contextoCasamento: comWorkspace ? casamento : null,
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
    const { wrapper } = await montarPainel('/casamentos')
    montado = wrapper

    const rail = wrapper.get('[data-teste="menu-lateral"]')
    expect(rail.get('nav').attributes('aria-label')).toBe('Navegação global')
    expect(rail.find('[data-teste="marca-produto"]').exists()).toBe(true)
    const links = rail.findAll('[data-teste="item-menu"]')
    expect(links.map((link) => link.text())).toEqual(['Dashboard', 'Casamentos'])
    expect(links.map((link) => link.attributes('data-rotulo'))).toEqual(['Dashboard', 'Casamentos'])
    expect(links[0]?.attributes('aria-current')).toBeUndefined()
    expect(links[1]?.attributes('aria-current')).toBe('page')
    expect(links[1]?.find('.ie-casamento').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('[data-teste="abrir-menu"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="workspace-casamento"]').exists()).toBe(false)
    expect(wrapper.get('main').attributes('id')).toBe('conteudo-principal')
    expect(wrapper.get('main h1').text()).toBe('Convidados')
    expect(rail.text()).toContain('Sair')
  })

  it('[COMPONENTE] marca Casamentos ativo também dentro de um casamento e Dashboard só na raiz', async () => {
    simularMatchMedia(false)
    const { wrapper, roteador } = await montarPainel(`/casamentos/${ID}/convidados`)
    montado = wrapper

    const links = wrapper.findAll('[data-teste="item-menu"]')
    expect(links[1]?.attributes('aria-current')).toBe('page')
    await roteador.push('/')
    await flushPromises()
    expect(wrapper.findAll('[data-teste="item-menu"]')[0]?.attributes('aria-current')).toBe('page')
  })

  it('[COMPONENTE] dentro de um casamento mostra a navegação do casamento com nomes, data, contagem e só os grupos existentes', async () => {
    simularMatchMedia(false)
    const { wrapper } = await montarPainel(`/casamentos/${ID}/convidados`, true)
    montado = wrapper

    expect(wrapper.get('.layout-painel').classes()).toContain('layout-painel--workspace')
    const workspace = wrapper.get('[data-teste="workspace-casamento"]')
    expect(workspace.get('nav').attributes('aria-label')).toBe('Módulos do casamento')
    expect(workspace.get('[data-teste="nomes-casal"]').text()).toContain('Ana')
    expect(workspace.get('[data-teste="navegacao-casamento-quando"]').text()).toBe('12 dez 2026 · faltam 75 dias')
    expect(workspace.findAll('[data-teste="grupo-casamento"]').map((grupo) => grupo.find('span').text())).toEqual(['Planejar', 'Pessoas', 'Dinheiro & documentos', 'Execução'])
    const ativo = workspace.get('[aria-current="page"]')
    expect(ativo.text()).toBe('Convidados')
    expect(ativo.attributes('href')).toBe(`/casamentos/${ID}/convidados`)
  })

  it('[COMPONENTE] oferece link para pular ao conteúdo', async () => {
    simularMatchMedia(false)
    const { wrapper } = await montarPainel()
    montado = wrapper

    const pular = wrapper.get('.layout-painel__pular')
    expect(pular.attributes('href')).toBe('#conteudo-principal')
    expect(pular.text()).toBe('Pular para o conteúdo')
  })

  it('[COMPONENTE] no celular troca o rail por barra escura e abre a gaveta com rail expandido e navegação do casamento', async () => {
    simularMatchMedia(true)
    const { wrapper } = await montarPainel(`/casamentos/${ID}/convidados`, true)
    montado = wrapper

    expect(wrapper.find('[data-teste="menu-lateral"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="workspace-casamento"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="barra-casal"]').text()).toBe('Ana & João')
    const botao = wrapper.get('[data-teste="abrir-menu"]')
    expect(botao.attributes('aria-label')).toBe('Abrir menu')
    expect(botao.attributes('aria-expanded')).toBe('false')

    await botao.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-teste="abrir-menu"]').attributes('aria-expanded')).toBe('true')
    expect(document.body.querySelectorAll('[data-teste="item-menu"]')).toHaveLength(2)
    expect(document.body.querySelector('.rail-navegacao--expandido')).not.toBeNull()
    expect(document.body.querySelectorAll('[data-teste="item-casamento"]')).toHaveLength(11)
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

describe('NavegacaoCasamento', () => {
  it('[COMPONENTE] enquanto o casamento carrega mostra esqueleto no lugar dos nomes e mantém os módulos', async () => {
    const roteador = criarRoteador()
    await roteador.push(`/casamentos/${ID}`)
    const wrapper = mount(NavegacaoCasamento, {
      props: { casamento: null, grupos: gruposNavegacaoCasamento(ID, 'casamento', () => true) },
      global: { plugins: [roteador] },
    })

    expect(wrapper.find('[data-teste="nomes-casal"]').exists()).toBe(false)
    expect(wrapper.findAll('.navegacao-casamento__esqueleto')).toHaveLength(2)
    expect(wrapper.findAll('[data-teste="item-casamento"]')).toHaveLength(11)
  })

  it('[COMPONENTE] descreve o dia do casamento e datas passadas sem recalcular os dias', async () => {
    const roteador = criarRoteador()
    const hoje = mount(NavegacaoCasamento, {
      props: { casamento: { ...casamento, diasRestantes: 0 }, grupos: [] },
      global: { plugins: [roteador] },
    })
    expect(hoje.get('[data-teste="navegacao-casamento-quando"]').text()).toBe('12 dez 2026 · é hoje')

    const passado = mount(NavegacaoCasamento, {
      props: { casamento: { ...casamento, diasRestantes: -1 }, grupos: [] },
      global: { plugins: [roteador] },
    })
    expect(passado.get('[data-teste="navegacao-casamento-quando"]').text()).toBe('12 dez 2026 · foi ontem')
    expect(passado.findAll('[data-teste="grupo-casamento"]')).toHaveLength(0)
  })
})

describe('LayoutPublico', () => {
  it('[COMPONENTE] envolve o conteúdo em main com marca Enlace e rodapé', () => {
    const wrapper = mount(LayoutPublico, {
      slots: { default: '<h1>Lívia &amp; Rafael</h1>', rodape: 'Dúvidas? Fale com a cerimonialista.' },
    })

    expect(wrapper.get('main').attributes('id')).toBe('conteudo-principal')
    expect(wrapper.get('main h1').text()).toBe('Lívia & Rafael')
    expect(wrapper.get('footer').text()).toContain('Dúvidas?')
    expect(wrapper.get('.somente-leitor-tela').text()).toBe('Enlace')
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
