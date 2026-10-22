import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import CabecalhoOperacao from '../CabecalhoOperacao.vue'
import ItemRoteiro from '../ItemRoteiro.vue'
import LinhaDestinoLink from '../LinhaDestinoLink.vue'
import LayoutPublico from '@/layouts/LayoutPublico.vue'

const global = { plugins: [[PrimeVue, { unstyled: true }]] as [typeof PrimeVue, Record<string, unknown>][] }

describe('ItemRoteiro', () => {
  it('[COMPONENTE] mostra horário tabular, término, local, quem e instruções em leitura', () => {
    const wrapper = mount(ItemRoteiro, {
      props: {
        inicio: '14:00',
        termino: '15:30',
        atividade: 'Montagem do buffet',
        local: 'Espaço Jardim',
        responsavel: 'Fernanda',
        fornecedor: 'Buffet Sabor',
        instrucoes: 'Entrada pela rua lateral.\nDescarga até 14:30.',
      },
      global,
    })

    expect(wrapper.element.tagName).toBe('LI')
    expect(wrapper.get('time').attributes('datetime')).toBe('14:00')
    expect(wrapper.get('.item-roteiro__termino').text()).toBe('até 15:30')
    expect(wrapper.get('.item-roteiro__local').text()).toContain('Espaço Jardim')
    expect(wrapper.findAll('.item-roteiro__pessoa').map((pessoa) => pessoa.text())).toEqual(['Fernanda', 'Buffet Sabor'])
    expect(wrapper.get('[data-teste="item-roteiro-instrucoes"]').text()).toContain('Descarga até 14:30.')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('[data-teste="item-roteiro-feito"]').exists()).toBe(false)
  })

  it('[COMPONENTE] cerimônia ganha os dois anéis, dia seguinte é lido por extenso e concluído mostra Feito', () => {
    const cerimonia = mount(ItemRoteiro, { props: { inicio: '16:30', atividade: 'Cerimônia', cerimonia: true }, global })
    const pista = mount(ItemRoteiro, {
      props: { inicio: '21:30', termino: '02:00', terminaEmOutroDia: true, atividade: 'Pista', concluido: true },
      global,
    })

    expect(cerimonia.classes()).toContain('item-roteiro--cerimonia')
    expect(cerimonia.find('.item-roteiro__anel').exists()).toBe(true)
    expect(cerimonia.find('.item-roteiro__termino').exists()).toBe(false)
    expect(pista.get('.item-roteiro__termino').text()).toContain('+1')
    expect(pista.get('.item-roteiro__termino').text()).toContain('do dia seguinte')
    expect(pista.get('[data-teste="item-roteiro-feito"]').text()).toContain('Feito')
    expect(pista.classes()).toContain('item-roteiro--concluido')
  })
})

describe('CabecalhoOperacao', () => {
  it('[COMPONENTE] nomes com frase acessível, data com dia da semana, selo e locais', () => {
    const wrapper = mount(CabecalhoOperacao, {
      props: {
        primeiro: 'Ana',
        segundo: 'Bruno',
        data: '2027-05-15',
        filtro: 'Seus horários · Buffet Sabor',
        locais: [{ rotulo: 'Cerimônia', valor: '16:30 · Capela' }],
      },
    })

    expect(wrapper.get('h1').text()).toContain('Cronograma do evento de Ana & Bruno')
    expect(wrapper.get('[data-teste="cabecalho-operacao-data"]').text()).toBe('Sábado, 15 de maio de 2027')
    expect(wrapper.get('[data-teste="cabecalho-operacao-filtro"]').text()).toBe('Seus horários · Buffet Sabor')
    expect(wrapper.get('dt').text()).toBe('Cerimônia')
    expect(wrapper.get('dd').text()).toBe('16:30 · Capela')
  })

  it('[COMPONENTE] sem locais não mostra a lista e aceita título de nível 2', () => {
    const wrapper = mount(CabecalhoOperacao, {
      props: { primeiro: 'Ana', segundo: 'Bruno', data: '2027-05-15', filtro: 'Equipe completa', nivelTitulo: 2 },
    })

    expect(wrapper.find('dl').exists()).toBe(false)
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('h2').exists()).toBe(true)
  })
})

describe('LinhaDestinoLink', () => {
  it('[COMPONENTE] mostra situação com texto e ações no slot', () => {
    const wrapper = mount(LinhaDestinoLink, {
      props: { rotulo: 'Buffet Sabor', detalhe: 'Buffet · 3 itens', situacao: 'ativo' },
      slots: { acoes: '<button type="button">Copiar link</button>' },
      global,
    })

    expect(wrapper.text()).toContain('Buffet Sabor')
    expect(wrapper.text()).toContain('Buffet · 3 itens')
    expect(wrapper.get('[data-teste="linha-destino-link-situacao"]').text()).toContain('Link ativo')
    expect(wrapper.get('.linha-destino-link__acoes button').text()).toBe('Copiar link')
  })

  it('[COMPONENTE] sem link e indisponível têm textos próprios e sem slot não há área de ações', () => {
    const semLink = mount(LinhaDestinoLink, { props: { rotulo: 'Equipe completa', situacao: 'semLink' }, global })
    const indisponivel = mount(LinhaDestinoLink, { props: { rotulo: 'Fernanda', situacao: 'indisponivel' }, global })

    expect(semLink.text()).toContain('Sem link')
    expect(semLink.find('.linha-destino-link__acoes').exists()).toBe(false)
    expect(indisponivel.text()).toContain('Link indisponível')
  })
})

describe('LayoutPublico variante operação', () => {
  it('[COMPONENTE] aplica a classe do modo operação sem o cabeçalho da marca', () => {
    const wrapper = mount(LayoutPublico, { props: { variante: 'operacao' }, slots: { default: '<p>conteúdo</p>' } })

    expect(wrapper.classes()).toContain('layout-publico--operacao')
    expect(wrapper.find('.layout-publico__cabecalho').exists()).toBe(false)
    expect(wrapper.find('main').text()).toBe('conteúdo')
  })
})
