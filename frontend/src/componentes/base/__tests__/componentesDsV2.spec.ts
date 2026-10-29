import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import CampoBusca from '@/componentes/base/CampoBusca.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import EtiquetaFase from '@/componentes/base/EtiquetaFase.vue'
import EtiquetaTipo from '@/componentes/base/EtiquetaTipo.vue'
import FiltroPilulas from '@/componentes/base/FiltroPilulas.vue'
import LateralDestaque from '@/componentes/base/LateralDestaque.vue'
import LateralOrientacao from '@/componentes/base/LateralOrientacao.vue'
import NomesAnfitrioes from '@/componentes/base/NomesAnfitrioes.vue'
import TileTipo from '@/componentes/base/TileTipo.vue'
import type { OpcaoFiltroPilula } from '@/componentes/base/tipos'
import type { TipoEvento } from '@/tipos/eventos'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, object]] }

describe('EtiquetaTipo', () => {
  it.each([
    ['Casamento', 'rose', 'Casamento'],
    ['QuinzeAnos', 'orquidea', '15 anos'],
    ['Aniversario', 'tangerina', 'Aniversário'],
    ['Comemoracao', 'champanhe', 'Comemoração'],
  ] as const)('[COMPONENTE] %s usa o tom %s e o rótulo do vocabulário', (tipo, tom, rotulo) => {
    const wrapper = mount(EtiquetaTipo, { props: { tipo } })

    expect(wrapper.classes()).toContain(`tom-tipo--${tom}`)
    expect(wrapper.attributes('data-tom')).toBe(tom)
    expect(wrapper.text()).toBe(rotulo)
  })

  it('[COMPONENTE] sem tipo mostra “Evento” no neutro, nunca o rosé', () => {
    const wrapper = mount(EtiquetaTipo, { props: { tipo: null } })

    expect(wrapper.classes()).toContain('tom-tipo--neutro')
    expect(wrapper.text()).toBe('Evento')
  })

  it('[COMPONENTE] aceita tom e rótulo explícitos e ícone decorativo do tom', () => {
    const wrapper = mount(EtiquetaTipo, { props: { tom: 'jade', rotulo: 'Formatura', comIcone: true } })

    expect(wrapper.classes()).toContain('tom-tipo--jade')
    expect(wrapper.text()).toBe('Formatura')
    expect(wrapper.get('.ie-capelo').attributes('aria-hidden')).toBe('true')
  })
})

describe('EtiquetaFase', () => {
  it.each([
    ['planejamento', 'fase--planejamento'],
    ['retaFinal', 'fase--reta-final'],
    ['realizado', 'fase--realizado'],
    ['atrasado', 'fase--atrasado'],
  ] as const)('[COMPONENTE] a fase %s tem ponto decorativo e rótulo em texto', (fase, classe) => {
    const wrapper = mount(EtiquetaFase, { props: { fase, texto: 'Rótulo' } })

    expect(wrapper.classes()).toContain(classe)
    expect(wrapper.get('.etiqueta-fase__ponto').attributes('aria-hidden')).toBe('true')
    expect(wrapper.text()).toBe('Rótulo')
  })
})

describe('TileTipo', () => {
  it.each([
    ['Casamento', 'ie-aneis'],
    ['QuinzeAnos', 'ie-coroa'],
    ['Aniversario', 'ie-bolo'],
    ['Comemoracao', 'ie-taca'],
    [null, 'ie-evento'],
  ] as const)('[COMPONENTE] o tile de %s usa o ícone %s e é decorativo', (tipo, icone) => {
    const wrapper = mount(TileTipo, { props: { tipo: tipo as TipoEvento | null } })

    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.find(`.${icone}`).exists()).toBe(true)
  })

  it('[COMPONENTE] aceita ícone e tamanho grande', () => {
    const wrapper = mount(TileTipo, { props: { tom: 'champanhe', icone: 'checklist', tamanho: 'grande' } })

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['tom-tipo--champanhe', 'tile-tipo--grande']))
    expect(wrapper.find('.ie-checklist').exists()).toBe(true)
  })
})

describe('FiltroPilulas', () => {
  const opcoes: OpcaoFiltroPilula<'todos' | TipoEvento>[] = [
    { valor: 'todos', rotulo: 'Todos', contagem: 7 },
    { valor: 'Casamento', rotulo: 'Casamentos', tom: 'rose', contagem: 4 },
    { valor: 'QuinzeAnos', rotulo: '15 anos', tom: 'orquidea' },
  ]

  it('[COMPONENTE] é um grupo rotulado de botões com aria-pressed só na opção ativa', () => {
    const wrapper = mount(FiltroPilulas, { props: { opcoes, rotulo: 'Filtrar por tipo', modelValue: 'todos' } })

    expect(wrapper.attributes('role')).toBe('group')
    expect(wrapper.attributes('aria-label')).toBe('Filtrar por tipo')
    const botoes = wrapper.findAll('button')
    expect(botoes.map((botao) => botao.attributes('type'))).toEqual(['button', 'button', 'button'])
    expect(botoes.map((botao) => botao.attributes('aria-pressed'))).toEqual(['true', 'false', 'false'])
    expect(botoes[1]!.classes()).toContain('tom-tipo--rose')
    expect(botoes[1]!.find('.filtro-pilulas__ponto').attributes('aria-hidden')).toBe('true')
    expect(botoes[0]!.find('.filtro-pilulas__ponto').exists()).toBe(false)
    expect(botoes[1]!.text()).toBe('Casamentos 4')
  })

  it('[COMPONENTE] emite a opção escolhida pelo v-model', async () => {
    const wrapper = mount(FiltroPilulas, { props: { opcoes, rotulo: 'Filtrar por tipo', modelValue: 'todos' } })

    await wrapper.findAll('button')[2]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['QuinzeAnos']])
  })
})

describe('CampoBusca', () => {
  it('[COMPONENTE] exige rótulo acessível, mostra ícone decorativo e atualiza o v-model', async () => {
    const wrapper = mount(CampoBusca, { props: { rotulo: 'Buscar anfitriões', placeholder: 'Buscar', modelValue: '' } })

    const entrada = wrapper.get('input')
    expect(entrada.attributes('type')).toBe('search')
    expect(entrada.attributes('aria-label')).toBe('Buscar anfitriões')
    expect(entrada.attributes('placeholder')).toBe('Buscar')
    expect(wrapper.get('.ie-busca').attributes('aria-hidden')).toBe('true')

    await entrada.setValue('Ana')
    expect(wrapper.emitted('update:modelValue')).toEqual([['Ana']])
  })

  it('[SEGURANÇA] trata o termo como texto, sem interpretar marcação', async () => {
    const wrapper = mount(CampoBusca, { props: { rotulo: 'Buscar', modelValue: '<img src=x onerror=alert(1)>' } })

    expect(wrapper.find('img').exists()).toBe(false)
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('<img src=x onerror=alert(1)>')
  })
})

describe('LateralDestaque', () => {
  it('[COMPONENTE] tem cabeçalho escuro com rótulo, título h2 e descrição; corpo e rodapé só com slot', () => {
    const vazia = mount(LateralDestaque, { props: { rotulo: 'Tarefas típicas', titulo: 'Checklist essencial' } })
    expect(vazia.element.tagName).toBe('ASIDE')
    expect(vazia.get('.lateral-destaque__rotulo').text()).toBe('Tarefas típicas')
    expect(vazia.get('h2').text()).toBe('Checklist essencial')
    expect(vazia.find('.lateral-destaque__descricao').exists()).toBe(false)
    expect(vazia.find('.lateral-destaque__corpo').exists()).toBe(false)
    expect(vazia.find('footer').exists()).toBe(false)

    const completa = mount(LateralDestaque, {
      props: { rotulo: 'Por tipo', titulo: 'Modelos', descricao: '26 tarefas', elemento: 'section' },
      slots: { default: '<p data-teste="corpo">Itens</p>', rodape: '<button type="button">Aplicar</button>' },
    })
    expect(completa.element.tagName).toBe('SECTION')
    expect(completa.get('.lateral-destaque__descricao').text()).toBe('26 tarefas')
    expect(completa.get('[data-teste="corpo"]').text()).toBe('Itens')
    expect(completa.get('footer button').text()).toBe('Aplicar')
  })
})

describe('LateralDestaque nomeada', () => {
  it('[COMPONENTE] com idTitulo, o h2 recebe o id e nomeia a região', () => {
    const wrapper = mount(LateralDestaque, { props: { rotulo: 'Casamento', titulo: 'Como organizar o casamento', idTitulo: 'titulo-lateral' } })
    expect(wrapper.get('h2').attributes('id')).toBe('titulo-lateral')
    expect(wrapper.attributes('aria-labelledby')).toBe('titulo-lateral')

    const semId = mount(LateralDestaque, { props: { rotulo: 'R', titulo: 'T' } })
    expect(semId.attributes('aria-labelledby')).toBeUndefined()
    expect(semId.get('h2').attributes('id')).toBeUndefined()
  })
})

describe('LateralOrientacao', () => {
  it('[COMPONENTE] lateral escura nomeada pelo título, com um item h3 + texto por orientação', () => {
    const itens = [
      { chave: 'a', titulo: 'O mesmo tipo', texto: 'Casamento gera casamento.', teste: 'item-a' },
      { chave: 'b', titulo: 'O que vai', texto: 'Tarefas e cronograma.' },
    ]
    const wrapper = mount(LateralOrientacao, { props: { idTitulo: 'titulo-o', rotulo: 'Duplicar evento', titulo: 'Como funciona', itens } })
    expect(wrapper.element.tagName).toBe('ASIDE')
    expect(wrapper.attributes('aria-labelledby')).toBe('titulo-o')
    expect(wrapper.get('h2#titulo-o').text()).toBe('Como funciona')
    expect(wrapper.get('.lateral-destaque__rotulo').text()).toBe('Duplicar evento')
    expect(wrapper.findAll('li h3').map((titulo) => titulo.text())).toEqual(['O mesmo tipo', 'O que vai'])
    expect(wrapper.get('[data-teste="item-a"] p').text()).toBe('Casamento gera casamento.')
  })
})

describe('EstadoVazio no DS v2', () => {
  it('[COMPONENTE] usa o cartão tracejado por padrão e a variante simples quando pedida', () => {
    const cartao = mount(EstadoVazio, { props: { titulo: 'Nenhuma tarefa ainda' }, global })
    expect(cartao.classes()).toContain('estado-vazio--cartao')
    expect(cartao.get('.estado-vazio__circulo').attributes('aria-hidden')).toBe('true')

    const simples = mount(EstadoVazio, { props: { titulo: 'Nada aqui', variante: 'simples' }, global })
    expect(simples.classes()).toContain('estado-vazio--simples')
  })
})

describe('NomesAnfitrioes no DS v2', () => {
  it('[COMPONENTE] o “&” é decorativo e o leitor de tela ouve o conector por extenso', () => {
    const wrapper = mount(NomesAnfitrioes, { props: { primeiro: 'Tadashi', segundo: 'Laís', tamanho: 'navegacao' } })

    expect(wrapper.get('.nomes-anfitrioes__e').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.somente-leitor-tela').text()).toBe('e')
    expect(wrapper.classes()).toContain('nomes-anfitrioes--navegacao')
  })
})

describe('FiltroPilulas desabilitado e alvo de toque', () => {
  const opcoes: OpcaoFiltroPilula<'todos' | TipoEvento>[] = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'Casamento', rotulo: 'Casamento', tom: 'rose' },
  ]

  it('[COMPONENTE] desabilitado trava todas as pílulas e não emite troca', async () => {
    const wrapper = mount(FiltroPilulas, { props: { opcoes, rotulo: 'Filtrar por tipo', modelValue: 'todos', desabilitado: true } })

    const botoes = wrapper.findAll('button')
    expect(botoes.every((botao) => botao.attributes('disabled') !== undefined)).toBe(true)
    await botoes[1]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
