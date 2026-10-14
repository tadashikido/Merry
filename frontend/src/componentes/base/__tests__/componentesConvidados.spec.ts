import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import PrimeVue from 'primevue/config'

import CampoSugestoes from '@/componentes/base/CampoSugestoes.vue'
import ListaRepetivel from '@/componentes/base/ListaRepetivel.vue'
import ResumoContagem from '@/componentes/base/ResumoContagem.vue'
import type { ItemContagem, TextosListaRepetivel } from '@/componentes/base/tipos'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, { unstyled: boolean }]] }

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

const TEXTOS: TextosListaRepetivel = {
  rotuloItem: (numero) => `Pessoa ${numero}`,
  adicionar: 'Adicionar pessoa',
  remover: 'Remover pessoa',
  contador: (quantidade, maximo) => `${quantidade} de ${maximo} pessoas`,
  limiteAtingido: 'Limite atingido.',
  minimoAtingido: 'Precisa de uma pessoa.',
  adicionado: (numero) => `Pessoa ${numero} adicionada.`,
  removido: (numero) => `Pessoa ${numero} removida.`,
}

function montarLista(inicial: string[], maximo = 3, desabilitado = false) {
  const Hospedeiro = defineComponent({
    setup() {
      const itens = ref(inicial.map((nome, indice) => ({ chave: `k${indice}`, nome })))
      let sequencia = inicial.length
      return () =>
        h(
          ListaRepetivel<{ chave: string; nome: string }>,
          {
            itens: itens.value,
            chave: (item: { chave: string }) => item.chave,
            textos: TEXTOS,
            maximo,
            desabilitado,
            onAdicionar: () => {
              sequencia += 1
              itens.value.push({ chave: `k${sequencia}`, nome: '' })
            },
            onRemover: (indice: number) => {
              itens.value.splice(indice, 1)
            },
          },
          {
            default: ({ item }: { item: { nome: string } }) => h('input', { value: item.nome, 'data-teste': 'entrada' }),
          },
        )
    },
  })
  return mount(Hospedeiro, { global, attachTo: document.body })
}

describe('ResumoContagem', () => {
  const itens: ItemContagem[] = [
    { chave: 'pessoas', valor: 1234, rotulo: 'pessoas', detalhe: '1.200 adultos e 34 crianças' },
    { chave: 'confirmadas', valor: 0, rotulo: 'confirmadas', destaque: true },
  ]

  it('[COMPONENTE] lista números formatados em pt-BR com rótulo, detalhe e destaque', () => {
    wrapper = mount(ResumoContagem, { props: { itens, rotulo: 'Totais' }, slots: { rodape: '12 convites' }, global })

    expect(wrapper.get('section').attributes('aria-label')).toBe('Totais')
    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.get('[data-teste="contagem-pessoas"]').text()).toContain('1.234')
    expect(wrapper.get('[data-teste="contagem-pessoas"]').text()).toContain('1.200 adultos e 34 crianças')
    expect(wrapper.get('[data-teste="contagem-confirmadas"]').classes()).toContain('resumo-contagem__item--destaque')
    expect(wrapper.text()).toContain('12 convites')
  })

  it('[COMPONENTE] sem rodapé não renderiza o parágrafo de complemento', () => {
    wrapper = mount(ResumoContagem, { props: { itens, rotulo: 'Totais' }, global })

    expect(wrapper.find('.resumo-contagem__rodape').exists()).toBe(false)
  })
})

describe('ListaRepetivel', () => {
  it('[COMPONENTE] numera blocos com legend, mostra contador e dica de mínimo com um item', () => {
    wrapper = montarLista(['Ana'])

    expect(wrapper.get('legend').text()).toBe('Pessoa 1')
    expect(wrapper.get('[data-teste="contador-itens"]').text()).toBe('1 de 3 pessoas')
    expect(wrapper.get('[data-teste="remover-item"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-teste="dica-minimo"]').text()).toBe('Precisa de uma pessoa.')
  })

  it('[COMPONENTE] adicionar cria bloco, anuncia e leva o foco ao novo campo', async () => {
    wrapper = montarLista(['Ana'])

    await wrapper.get('[data-teste="adicionar-item"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-teste="item-repetivel"]')).toHaveLength(2)
    expect(wrapper.get('[data-teste="anuncio-lista"]').text()).toBe('Pessoa 2 adicionada.')
    const entradas = wrapper.findAll('[data-teste="entrada"]')
    expect(document.activeElement).toBe(entradas[1]?.element)
  })

  it('[COMPONENTE] no limite desabilita adicionar e mostra a dica de limite', () => {
    wrapper = montarLista(['Ana', 'Bia', 'Caio'])

    expect(wrapper.get('[data-teste="adicionar-item"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-teste="dica-limite"]').text()).toBe('Limite atingido.')
  })

  it('[COMPONENTE] remover tira o bloco, anuncia e foca o bloco anterior', async () => {
    wrapper = montarLista(['Ana', 'Bia', 'Caio'])

    const botoes = wrapper.findAll('[data-teste="remover-item"]')
    expect(botoes[2]?.attributes('aria-label')).toBe('Remover pessoa: Pessoa 3')
    await botoes[2]!.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-teste="item-repetivel"]')).toHaveLength(2)
    expect(wrapper.get('[data-teste="anuncio-lista"]').text()).toBe('Pessoa 3 removida.')
    expect(document.activeElement).toBe(wrapper.findAll('[data-teste="entrada"]')[1]?.element)
  })

  it('[COMPONENTE] desabilitada esconde remover e bloqueia adicionar', () => {
    wrapper = montarLista(['Ana', 'Bia'], 30, true)

    expect(wrapper.find('[data-teste="remover-item"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="adicionar-item"]').attributes('disabled')).toBeDefined()
  })
})

describe('CampoSugestoes', () => {
  it('[COMPONENTE] liga id, aria-describedby, aria-invalid e maxlength no input e aceita texto livre', async () => {
    wrapper = mount(CampoSugestoes, {
      props: { id: 'grupo', sugestoes: ['Família da noiva'], invalido: true, descritoPor: 'grupo-erro', maximo: 60, modelValue: '' },
      global,
      attachTo: document.body,
    })

    const entrada = wrapper.get('input#grupo')
    expect(entrada.attributes('aria-describedby')).toBe('grupo-erro')
    expect(entrada.attributes('aria-invalid')).toBe('true')
    expect(entrada.attributes('maxlength')).toBe('60')

    await entrada.setValue('Colegas de trabalho')
    const emitidos = wrapper.emitted('update:modelValue') ?? []
    expect(emitidos[emitidos.length - 1]).toEqual(['Colegas de trabalho'])
  })

  it('[COMPONENTE] filtra sugestões sem diferenciar acento e caixa', async () => {
    wrapper = mount(CampoSugestoes, {
      props: { id: 'grupo', sugestoes: ['Família da noiva', 'Amigos do noivo', 'Padrinhos'], modelValue: '' },
      global,
      attachTo: document.body,
    })

    wrapper.findComponent({ name: 'AutoComplete' }).vm.$emit('complete', { originalEvent: new Event('input'), query: 'FAMILIA' })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'AutoComplete' }).props('suggestions')).toEqual(['Família da noiva'])
  })

  it('[COMPONENTE] botão de sugestões tem nome acessível padrão e personalizável', () => {
    wrapper = mount(CampoSugestoes, { props: { id: 'grupo', sugestoes: [], modelValue: '' }, global })

    const botao = wrapper.get('button')
    expect(botao.attributes('aria-label')).toBe('Mostrar sugestões')
    expect(botao.attributes('aria-haspopup')).toBe('listbox')

    wrapper.unmount()
    wrapper = mount(CampoSugestoes, {
      props: { id: 'grupo', sugestoes: [], modelValue: '', rotuloBotaoSugestoes: 'Mostrar grupos já usados' },
      global,
    })
    expect(wrapper.get('button').attributes('aria-label')).toBe('Mostrar grupos já usados')
  })

  it('[COMPONENTE] desabilitado bloqueia o input', () => {
    wrapper = mount(CampoSugestoes, { props: { id: 'grupo', sugestoes: [], desabilitado: true, modelValue: 'Padrinhos' }, global })

    expect(wrapper.get('input#grupo').attributes('disabled')).toBeDefined()
  })
})
