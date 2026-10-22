import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { computed, defineComponent, h, nextTick, provide, type VNode } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import PrimeVue from 'primevue/config'
import Select from 'primevue/select'

import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import NavegacaoEvento from '@/layouts/NavegacaoEvento.vue'
import { gruposNavegacaoEvento } from '@/layouts/modulosEvento'
import type { ContextoEvento, NivelTrilha, OpcaoSeletorEvento } from '@/layouts/tipos'
import { CHAVE_TRILHA, LIMITE_NIVEIS_TRILHA, destinoTrocaEvento, montarTrilha } from '@/layouts/trilha'
import { criarRotas } from '@/router'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'

const ID = '11111111-1111-4111-8111-111111111111'
const ID_OUTRO = '22222222-2222-4222-8222-222222222222'
const ID_MODELO = '33333333-3333-4333-8333-333333333333'
const ID_CONVITE = '44444444-4444-4444-8444-444444444444'

function roteadorReal(): Router {
  return createRouter({ history: createMemoryHistory(), routes: criarRotas() })
}

function buscador(roteador: Router) {
  return (nome: string) => roteador.getRoutes().find((registro) => registro.name === nome)
}

function rotulos(niveis: NivelTrilha[]): (string | null)[] {
  return niveis.map((nivel) => nivel.rotulo)
}

describe('montarTrilha', () => {
  const roteador = roteadorReal()
  const buscar = buscador(roteador)

  it('[UNITÁRIO] monta Eventos / anfitriões / módulo para a assessoria, com parâmetros do evento', () => {
    const niveis = montarTrilha('evento-convidados', { id: ID }, buscar, { ehAnfitriao: false, rotuloEvento: 'Ana & João' })

    expect(niveis.map((nivel) => nivel.chave)).toEqual(['eventos', 'evento', 'evento-convidados'])
    expect(rotulos(niveis)).toEqual(['Eventos', 'Ana & João', 'Convidados'])
    expect(niveis[0]?.rota).toEqual({ name: 'eventos', params: {} })
    expect(niveis[1]?.rota).toEqual({ name: 'evento', params: { id: ID } })
  })

  it('[SEGURANÇA] omite para os anfitriões os níveis exclusivos da assessoria', () => {
    const niveis = montarTrilha('evento-convidados', { id: ID }, buscar, { ehAnfitriao: true, rotuloEvento: 'Ana & João' })

    expect(niveis.map((nivel) => nivel.chave)).toEqual(['evento', 'evento-convidados'])
  })

  it('[UNITÁRIO] anfitriões na visão geral ficam só com o item atual', () => {
    const niveis = montarTrilha('evento', { id: ID }, buscar, { ehAnfitriao: true, rotuloEvento: 'Ana & João' })

    expect(niveis.map((nivel) => nivel.chave)).toEqual(['evento'])
  })

  it('[UNITÁRIO] sub-rotas descartam parâmetros que o nível pai não usa', () => {
    const niveis = montarTrilha('convite-editar', { id: ID, conviteId: ID_CONVITE }, buscar, { ehAnfitriao: false, rotuloEvento: null })

    expect(niveis.map((nivel) => nivel.chave)).toEqual(['eventos', 'evento', 'evento-convidados', 'convite-editar'])
    expect(niveis[2]?.rota).toEqual({ name: 'evento-convidados', params: { id: ID } })
    expect(niveis[3]?.rota).toEqual({ name: 'convite-editar', params: { id: ID, conviteId: ID_CONVITE } })
    expect(niveis[1]?.rotulo).toBeNull()
    expect(niveis[3]?.rotulo).toBeNull()
  })

  it('[UNITÁRIO] trilha do item de modelo passa pelo modelo', () => {
    const niveis = montarTrilha('item-modelo-novo', { modeloId: ID_MODELO }, buscar, { ehAnfitriao: false, rotuloEvento: null })

    expect(niveis.map((nivel) => nivel.chave)).toEqual(['modelos-checklist', 'modelo-checklist', 'item-modelo-novo'])
    expect(niveis[1]?.rota).toEqual({ name: 'modelo-checklist', params: { modeloId: ID_MODELO } })
  })

  it('[UNITÁRIO] rotas sem meta de trilha não geram trilha', () => {
    expect(montarTrilha('evento-grande-dia', { id: ID }, buscar, { ehAnfitriao: false, rotuloEvento: null })).toEqual([])
    expect(montarTrilha('inicio', {}, buscar, { ehAnfitriao: false, rotuloEvento: null })).toEqual([])
    expect(montarTrilha(null, {}, buscar, { ehAnfitriao: false, rotuloEvento: null })).toEqual([])
    expect(montarTrilha('rota-inexistente', {}, buscar, { ehAnfitriao: false, rotuloEvento: null })).toEqual([])
  })

  it('[UNITÁRIO] interrompe cadeias cíclicas e respeita o limite de níveis', () => {
    const ciclico = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/a', name: 'a', component: { render: () => null }, meta: { trilha: { rotulo: 'A', pai: 'b' } } },
        { path: '/b', name: 'b', component: { render: () => null }, meta: { trilha: { rotulo: 'B', pai: 'a' } } },
      ],
    })
    expect(montarTrilha('a', {}, buscador(ciclico), { ehAnfitriao: false, rotuloEvento: null }).map((nivel) => nivel.chave)).toEqual(['b', 'a'])

    const longo = createRouter({
      history: createMemoryHistory(),
      routes: Array.from({ length: 10 }, (_, indice) => ({
        path: `/n${indice}`,
        name: `n${indice}`,
        component: { render: () => null },
        meta: { trilha: { rotulo: `N${indice}`, pai: `n${indice + 1}` } },
      })),
    })
    expect(montarTrilha('n0', {}, buscador(longo), { ehAnfitriao: false, rotuloEvento: null })).toHaveLength(LIMITE_NIVEIS_TRILHA)
  })
})

describe('destinoTrocaEvento', () => {
  it('[UNITÁRIO] mantém o módulo atual na rota principal do novo evento', () => {
    expect(destinoTrocaEvento('evento-convidados', ID_OUTRO)).toEqual({ name: 'evento-convidados', params: { id: ID_OUTRO } })
    expect(destinoTrocaEvento('convite-editar', ID_OUTRO)).toEqual({ name: 'evento-convidados', params: { id: ID_OUTRO } })
    expect(destinoTrocaEvento('tarefa-nova', ID_OUTRO)).toEqual({ name: 'evento-tarefas', params: { id: ID_OUTRO } })
  })

  it('[UNITÁRIO] fora de módulo leva à visão geral', () => {
    expect(destinoTrocaEvento('evento-editar', ID_OUTRO)).toEqual({ name: 'evento', params: { id: ID_OUTRO } })
    expect(destinoTrocaEvento(null, ID_OUTRO)).toEqual({ name: 'evento', params: { id: ID_OUTRO } })
  })
})

describe('CabecalhoPagina com trilha central', () => {
  let montado: VueWrapper | undefined

  afterEach(() => {
    montado?.unmount()
    montado = undefined
    document.body.innerHTML = ''
  })

  async function montarCabecalho(niveis: NivelTrilha[], propriedades: Record<string, unknown> = {}, slots: Record<string, () => VNode> = {}) {
    const roteador = roteadorReal()
    await roteador.push('/entrar')
    await roteador.isReady()
    const Provedor = defineComponent({
      setup(_, { slots: slotsProvedor }) {
        provide(
          CHAVE_TRILHA,
          computed(() => niveis),
        )
        return () => h('div', slotsProvedor.default?.())
      },
    })
    montado = mount(Provedor, {
      slots: { default: () => h(CabecalhoPagina, { titulo: 'Título da página', ...propriedades }, slots) },
      global: { plugins: [roteador] },
    })
    await flushPromises()
    return montado
  }

  const niveisConvidados: NivelTrilha[] = [
    { chave: 'eventos', rotulo: 'Eventos', rota: { name: 'eventos', params: {} } },
    { chave: 'evento', rotulo: 'Ana & João', rota: { name: 'evento', params: { id: ID } } },
    { chave: 'evento-convidados', rotulo: 'Convidados', rota: { name: 'evento-convidados', params: { id: ID } } },
  ]

  it('[COMPONENTE] renderiza a trilha com links, separadores ocultos e item atual marcado', async () => {
    const wrapper = await montarCabecalho(niveisConvidados)

    const nav = wrapper.get('nav')
    expect(nav.attributes('aria-label')).toBe('Você está em')
    expect(nav.find('ol').exists()).toBe(true)
    const links = wrapper.findAll('[data-teste="trilha-link"]')
    expect(links.map((link) => link.text())).toEqual(['Eventos', 'Ana & João'])
    expect(links[1]?.attributes('href')).toBe(`/eventos/${ID}`)
    const separadores = wrapper.findAll('.trilha-pagina__separador')
    expect(separadores).toHaveLength(2)
    expect(separadores.every((separador) => separador.attributes('aria-hidden') === 'true')).toBe(true)
    const atual = wrapper.get('[aria-current="page"]')
    expect(atual.text()).toBe('Convidados')
    expect(atual.element.tagName).toBe('SPAN')
  })

  it('[COMPONENTE] aplica rótulos dinâmicos da view e reservas quando faltam rótulos', async () => {
    const niveis: NivelTrilha[] = [
      { chave: 'eventos', rotulo: 'Eventos', rota: { name: 'eventos', params: {} } },
      { chave: 'evento', rotulo: null, rota: { name: 'evento', params: { id: ID } } },
      { chave: 'convite-editar', rotulo: null, rota: { name: 'evento', params: { id: ID } } },
    ]
    const semDinamico = await montarCabecalho(niveis)
    expect(semDinamico.findAll('[data-teste="trilha-link"]')[1]?.text()).toBe('Evento')
    expect(semDinamico.get('[aria-current="page"]').text()).toBe('Título da página')
    semDinamico.unmount()

    const comDinamico = await montarCabecalho(niveis, { rotuloTrilha: 'Editar convite', rotulosTrilha: { evento: 'Bia & Caio' } })
    expect(comDinamico.findAll('[data-teste="trilha-link"]')[1]?.text()).toBe('Bia & Caio')
    expect(comDinamico.get('[aria-current="page"]').text()).toBe('Editar convite')
  })

  it('[COMPONENTE] não exibe trilha de um único item nem fora do layout', async () => {
    const umItem = await montarCabecalho([niveisConvidados[1]!])
    expect(umItem.find('nav').exists()).toBe(false)
    umItem.unmount()

    montado = mount(CabecalhoPagina, { props: { titulo: 'Sem layout' } })
    expect(montado.find('nav').exists()).toBe(false)
  })

  it('[COMPONENTE] slot #trilha explícito tem precedência sobre a trilha central', async () => {
    const wrapper = await montarCabecalho(niveisConvidados, {}, { trilha: () => h('a', { href: '/manual' }, 'Manual') })

    expect(wrapper.get('nav').text()).toBe('Manual')
    expect(wrapper.find('[data-teste="trilha"]').exists()).toBe(false)
  })
})

describe('Seletor de evento na NavegacaoEvento', () => {
  let montado: VueWrapper | undefined

  beforeEach(() => {
    simularMatchMedia(false)
  })

  afterEach(() => {
    montado?.unmount()
    montado = undefined
    document.body.innerHTML = ''
  })

  const evento: ContextoEvento = { nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'João', data: '2026-12-12', diasRestantes: 75 }

  function opcao(id: string, primeira: string, segunda: string, diasRestantes: number): OpcaoSeletorEvento {
    return { id, nomePrimeiraPessoa: primeira, nomeSegundaPessoa: segunda, rotulo: `${primeira} & ${segunda}`, data: '2026-12-12', diasRestantes }
  }

  async function montarNavegacao(opcoesSeletor: OpcaoSeletorEvento[] | null, eventoId: string | null = ID) {
    const roteador = roteadorReal()
    await roteador.push(`/eventos/${ID}/convidados`)
    await roteador.isReady()
    montado = mount(NavegacaoEvento, {
      props: {
        evento,
        grupos: gruposNavegacaoEvento(ID, 'evento-convidados', () => true),
        eventoId,
        opcoesSeletor,
        anexarSeletor: 'self',
      },
      attachTo: document.body,
      global: { plugins: [roteador, [PrimeVue, { unstyled: true }]] },
    })
    await nextTick()
    return montado
  }

  it('[COMPONENTE] sem outros eventos ativos mantém o cabeçalho estático', async () => {
    const semOpcoes = await montarNavegacao(null)
    expect(semOpcoes.find('[data-teste="seletor-evento"]').exists()).toBe(false)
    expect(semOpcoes.get('[data-teste="nomes-anfitrioes"]').text()).toContain('Ana')
    semOpcoes.unmount()

    const soOAtual = await montarNavegacao([opcao(ID, 'Ana', 'João', 75)])
    expect(soOAtual.find('[data-teste="seletor-evento"]').exists()).toBe(false)
  })

  it('[COMPONENTE] com outros ativos exibe o seletor rotulado, mostrando os anfitriões atuais', async () => {
    const wrapper = await montarNavegacao([opcao(ID, 'Ana', 'João', 75), opcao(ID_OUTRO, 'Bia', 'Caio', 97)])

    const seletor = wrapper.get('[data-teste="seletor-evento"]')
    expect(seletor.get('[role="combobox"]').attributes('aria-label')).toBe('Trocar de evento')
    expect(seletor.text()).toContain('Ana')
    expect(seletor.get('[data-teste="navegacao-evento-quando"]').text()).toContain('75 dias')
  })

  it('[COMPONENTE] escolher outro evento emite a troca e escolher o atual não emite', async () => {
    const wrapper = await montarNavegacao([opcao(ID, 'Ana', 'João', 75), opcao(ID_OUTRO, 'Bia', 'Caio', 97)])
    const select = wrapper.findComponent(Select)

    select.vm.$emit('update:modelValue', ID)
    select.vm.$emit('update:modelValue', ID_OUTRO)
    await nextTick()

    expect(wrapper.emitted('trocarEvento')).toEqual([[ID_OUTRO]])
  })

  it('[COMPONENTE] abre a lista com as opções, data e marca no evento atual', async () => {
    const wrapper = await montarNavegacao([opcao(ID, 'Ana', 'João', 75), opcao(ID_OUTRO, 'Bia', 'Caio', 97)])

    await wrapper.get('[role="combobox"]').trigger('click')
    await flushPromises()

    const opcoes = wrapper.findAll('[data-teste="opcao-evento"]')
    expect(opcoes).toHaveLength(2)
    expect(opcoes[1]?.text()).toContain('Bia')
    expect(opcoes[1]?.text()).toContain('97 dias')
    expect(opcoes[0]?.classes()).toContain('seletor-evento__opcao--atual')
    expect(opcoes[1]?.classes()).not.toContain('seletor-evento__opcao--atual')
  })

  it('[COMPONENTE] a partir de 8 eventos oferece busca por anfitriões', async () => {
    const muitas = Array.from({ length: 8 }, (_, indice) =>
      opcao(indice === 0 ? ID : `${indice}${ID_OUTRO.slice(1)}`, `Pessoa${indice}`, 'Par', 10 + indice),
    )
    const wrapper = await montarNavegacao(muitas)

    await wrapper.get('[role="combobox"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('input[placeholder="Buscar anfitriões"]').exists()).toBe(true)
  })
})
