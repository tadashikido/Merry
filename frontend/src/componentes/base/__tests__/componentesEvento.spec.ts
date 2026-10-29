import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createMemoryHistory, createRouter } from 'vue-router'

import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import ContagemRegressiva from '@/componentes/base/ContagemRegressiva.vue'
import ListaDetalhes from '@/componentes/base/ListaDetalhes.vue'
import NomesAnfitrioes from '@/componentes/base/NomesAnfitrioes.vue'
import CartaoEvento from '@/componentes/eventos/CartaoEvento.vue'
import EtiquetaFaseEvento from '@/componentes/eventos/EtiquetaFaseEvento.vue'
import { rotas } from '@/router'
import type { EventoResumoDto } from '@/tipos/eventos'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, object]] }

describe('NomesAnfitrioes', () => {
  it('[COMPONENTE] mostra os nomes com "&" decorativo e "e" para leitor de tela', () => {
    const wrapper = mount(NomesAnfitrioes, { props: { primeiro: 'Ana Beatriz', segundo: 'Bruno' }, global })

    const e = wrapper.get('.nomes-anfitrioes__e')
    expect(e.text()).toBe('&')
    expect(e.attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.somente-leitor-tela').text()).toBe('e')
    expect(wrapper.findAll('.nomes-anfitrioes__nome').map((nome) => nome.text())).toEqual(['Ana Beatriz', 'Bruno'])
    expect(wrapper.classes()).toContain('nomes-anfitrioes--linha')
  })

  it('[REGRESSÃO] oferece ponto de quebra entre os nomes para não cortar palavra no meio em coluna estreita', () => {
    const wrapper = mount(NomesAnfitrioes, { props: { primeiro: 'Maria Eduarda Vasconcellos', segundo: 'Bernardo' }, global })

    const filhos = [...wrapper.element.childNodes].filter((no) => no.nodeType === 1).map((no) => (no as Element).tagName.toLowerCase())
    expect(filhos).toEqual(['span', 'span', 'span', 'wbr', 'span'])
    expect(wrapper.text()).toContain('Bernardo')
  })

  it('[COMPONENTE] sem segundo nome não insere ponto de quebra', () => {
    const wrapper = mount(NomesAnfitrioes, { props: { primeiro: 'Valentina', segundo: null }, global })

    expect(wrapper.findAll('wbr')).toHaveLength(0)
  })

  it('[COMPONENTE] aplica o tamanho pedido', () => {
    const wrapper = mount(NomesAnfitrioes, { props: { primeiro: 'Ana', segundo: 'Bruno', tamanho: 'titulo' }, global })

    expect(wrapper.classes()).toContain('nomes-anfitrioes--titulo')
  })
})

describe('ContagemRegressiva', () => {
  it.each([
    [42, 'Faltam 42 dias'],
    [0, 'É hoje'],
    [-3, 'Foi há 3 dias'],
  ])('[COMPONENTE] variante compacta com %i dias exibe "%s"', (dias, texto) => {
    const wrapper = mount(ContagemRegressiva, { props: { dias }, global })

    expect(wrapper.text()).toBe(texto)
    expect(wrapper.classes('contagem--passado')).toBe(dias < 0)
  })

  it.each([
    [42, 'Faltam 42 dias', ['42']],
    [1200, 'Faltam 1.200 dias', ['1.200']],
    [0, 'É hoje', []],
    [-48, 'Foi há 48 dias', ['48']],
  ])('[COMPONENTE] variante tabela com %i dias mantém o texto "%s" e destaca só o número', (dias, texto, numeros) => {
    const wrapper = mount(ContagemRegressiva, { props: { dias, variante: 'tabela' }, global })

    expect(wrapper.text()).toBe(texto)
    expect(wrapper.classes()).toContain('contagem--tabela')
    expect(wrapper.findAll('.contagem__numero-tabela').map((numero) => numero.text())).toEqual(numeros)
    expect(wrapper.classes('contagem--passado')).toBe(dias < 0)
  })

  it('[COMPONENTE] variante destaque mostra número, legenda e rótulo acessível completo', () => {
    const wrapper = mount(ContagemRegressiva, {
      props: { dias: 42, variante: 'destaque' },
      slots: { default: 'sábado, 15 de maio de 2027' },
      global,
    })

    expect(wrapper.get('.contagem__numero').text()).toBe('42')
    expect(wrapper.get('.contagem__legenda').text()).toBe('dias para o evento')
    expect(wrapper.attributes('role')).toBe('group')
    expect(wrapper.attributes('aria-label')).toBe('Faltam 42 dias para o evento')
    expect(wrapper.get('.contagem__complemento').text()).toBe('sábado, 15 de maio de 2027')
  })

  it('[COMPONENTE] variante destaque no dia ou no passado mostra frase em vez de número', () => {
    const hoje = mount(ContagemRegressiva, { props: { dias: 0, variante: 'destaque' }, global })
    const passado = mount(ContagemRegressiva, { props: { dias: -1, variante: 'destaque' }, global })

    expect(hoje.find('.contagem__numero').exists()).toBe(false)
    expect(hoje.get('.contagem__frase').text()).toBe('É hoje')
    expect(passado.get('.contagem__frase').text()).toBe('Foi ontem')
    expect(passado.classes()).toContain('contagem--passado')
  })

  it('[COMPONENTE] singular para 1 dia', () => {
    const wrapper = mount(ContagemRegressiva, { props: { dias: 1, variante: 'destaque' }, global })

    expect(wrapper.get('.contagem__legenda').text()).toBe('dia para o evento')
    expect(wrapper.attributes('aria-label')).toBe('Falta 1 dia para o evento')
  })
})

describe('ListaDetalhes', () => {
  it('[COMPONENTE] renderiza pares rótulo/valor, travessão para ausente e multilinha', () => {
    const wrapper = mount(ListaDetalhes, {
      props: {
        itens: [
          { rotulo: 'Data do evento', valor: '15 de maio de 2027' },
          { rotulo: 'Local da recepção', valor: null },
          { rotulo: 'Convidados estimados', valor: 150 },
          { rotulo: 'Observações', valor: 'Linha 1\nLinha 2', multilinha: true },
          { rotulo: 'Vazio', valor: '   ' },
        ],
      },
      global,
    })

    const termos = wrapper.findAll('dt').map((dt) => dt.text())
    const valores = wrapper.findAll('dd')
    expect(termos).toEqual(['Data do evento', 'Local da recepção', 'Convidados estimados', 'Observações', 'Vazio'])
    expect(valores[1]?.text()).toBe('—')
    expect(valores[1]?.classes()).toContain('lista-detalhes__valor--ausente')
    expect(valores[2]?.text()).toBe('150')
    expect(valores[3]?.classes()).toContain('lista-detalhes__valor--multilinha')
    expect(valores[4]?.text()).toBe('—')
  })
})

describe('CabecalhoPagina com título rico', () => {
  it('[COMPONENTE] o slot titulo substitui o texto dentro do h1', () => {
    const wrapper = mount(CabecalhoPagina, {
      props: { titulo: 'Ana & Bruno' },
      slots: { titulo: '<span class="rico">Ana &amp; Bruno</span>' },
      global,
    })

    expect(wrapper.get('h1 .rico').text()).toBe('Ana & Bruno')
  })
})

describe('CartaoEvento', () => {
  const evento: EventoResumoDto = {
    id: '11111111-1111-1111-1111-111111111111',
    tipo: 'Casamento',
    nomePrimeiraPessoa: 'Ana Beatriz',
    nomeSegundaPessoa: 'Bruno',
    data: '2027-05-15',
    horario: '16:30',
    localCerimonia: 'Capela',
    convidadosEstimados: 150,
    fase: 'RetaFinal',
    diasRestantes: 42,
    arquivado: false,
  }

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('[COMPONENTE] é um link único para a página do evento com nome acessível completo', async () => {
    const roteador = createRouter({ history: createMemoryHistory(), routes: rotas })
    const wrapper = mount(CartaoEvento, { props: { evento }, global: { plugins: [...global.plugins, roteador] } })
    await flushPromises()

    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe(`/eventos/${evento.id}`)
    expect(link.attributes('aria-label')).toBe('Ana Beatriz e Bruno, Casamento, sábado, 15 de maio de 2027, 16:30, Reta final, Faltam 42 dias')
    expect(wrapper.text()).toContain('sábado, 15 de maio de 2027, 16:30')
    expect(wrapper.text()).toContain('Reta final')
    expect(wrapper.text()).toContain('Faltam 42 dias')
    expect(wrapper.findAll('a')).toHaveLength(1)
  })

  it('[COMPONENTE] sem horário mostra só a data', async () => {
    const roteador = createRouter({ history: createMemoryHistory(), routes: rotas })
    const wrapper = mount(CartaoEvento, {
      props: { evento: { ...evento, horario: null } },
      global: { plugins: [...global.plugins, roteador] },
    })
    await flushPromises()

    expect(wrapper.get('.cartao-evento__quando .numeros-tabulares').text()).toBe('sábado, 15 de maio de 2027')
  })

  it('[COMPONENTE] aniversário mostra o tipo e um único nome, sem conector', async () => {
    const roteador = createRouter({ history: createMemoryHistory(), routes: rotas })
    const wrapper = mount(CartaoEvento, {
      props: { evento: { ...evento, tipo: 'Aniversario', nomePrimeiraPessoa: 'Helena', nomeSegundaPessoa: null } },
      global: { plugins: [...global.plugins, roteador] },
    })
    await flushPromises()

    expect(wrapper.get('[data-teste="tipo-evento"]').text()).toBe('Aniversário')
    expect(wrapper.get('[data-teste="nomes-anfitrioes"]').text()).toBe('Helena')
    expect(wrapper.get('a').attributes('aria-label')).toMatch(/^Helena, Aniversário, /)
  })

  it('[COMPONENTE] usa a cor do tipo, tile e etiqueta de fase com ponto', async () => {
    const roteador = createRouter({ history: createMemoryHistory(), routes: rotas })
    const wrapper = mount(CartaoEvento, {
      props: { evento: { ...evento, tipo: 'QuinzeAnos', fase: 'SemanaDoEvento' } },
      global: { plugins: [...global.plugins, roteador] },
    })
    await flushPromises()

    expect(wrapper.get('a').classes()).toContain('tom-tipo--orquidea')
    expect(wrapper.get('[data-teste="tile-tipo"]').attributes('data-tom')).toBe('orquidea')
    expect(wrapper.get('[data-teste="etiqueta-tipo"]').attributes('data-tom')).toBe('orquidea')
    const fase = wrapper.get('[data-teste="etiqueta-fase"]')
    expect(fase.attributes('data-fase')).toBe('retaFinal')
    expect(fase.text()).toBe('Semana do evento')
    expect(wrapper.find('[data-teste="badge-status"]').exists()).toBe(false)
  })
})

describe('EtiquetaFaseEvento', () => {
  it.each([
    ['Planejamento', 'planejamento', 'Planejamento'],
    ['RetaFinal', 'retaFinal', 'Reta final'],
    ['SemanaDoEvento', 'retaFinal', 'Semana do evento'],
    ['DiaDoEvento', 'retaFinal', 'Dia do evento'],
    ['Realizado', 'realizado', 'Realizado'],
  ] as const)('[COMPONENTE] fase %s usa a cor visual %s e o rótulo de domínio', (fase, visual, rotulo) => {
    const wrapper = mount(EtiquetaFaseEvento, { props: { fase }, global })

    expect(wrapper.attributes('data-fase')).toBe(visual)
    expect(wrapper.text()).toBe(rotulo)
  })
})
