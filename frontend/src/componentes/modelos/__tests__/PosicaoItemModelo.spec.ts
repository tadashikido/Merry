import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ExemplosItemModelo from '@/componentes/modelos/ExemplosItemModelo.vue'
import PosicaoItemModelo from '@/componentes/modelos/PosicaoItemModelo.vue'
import { TEXTOS_ITEM_MODELO } from '@/textos/checklist'
import type { ItemModeloChecklistDto } from '@/tipos/checklist'
import type { TipoEvento } from '@/tipos/eventos'

const TIPO_DESCONHECIDO = 'Formatura' as unknown as TipoEvento

function item(id: string, titulo: string, diasAntesDoEvento: number): ItemModeloChecklistDto {
  return { id, titulo, descricao: null, responsavel: 'Assessoria', categoria: 'Geral', diasAntesDoEvento }
}

const ITENS = [item('a', 'Definir orçamento', 400), item('b', 'Contratar o buffet', 200), item('c', 'Fechar a decoração', 185), item('d', 'Prova final', 15)]

describe('PosicaoItemModelo', () => {
  it.each([
    ['Casamento', 'Cerca de 6 meses antes do casamento', 'antes do casamento'],
    ['QuinzeAnos', 'Cerca de 6 meses antes da festa de 15 anos', 'antes da festa de 15 anos'],
    ['Aniversario', 'Cerca de 6 meses antes do aniversário', 'antes do aniversário'],
    ['Comemoracao', 'Cerca de 6 meses antes da comemoração', 'antes da comemoração'],
  ] as const)('[COMPONENTE] %s traduz a prévia e a régua para o tipo', (tipo, previa, complemento) => {
    const wrapper = mount(PosicaoItemModelo, { props: { itens: ITENS, dias: 180, tipo, titulo: 'Escolher o vestido' } })

    expect(wrapper.get('[data-teste="previa-prazo-item"]').text()).toBe(previa)
    const atual = wrapper.get('[data-teste="marco-item-seisMeses"]')
    expect(atual.classes()).toContain('posicao-item__marco--atual')
    expect(atual.text()).toContain(complemento)
    expect(atual.text()).toContain(TEXTOS_ITEM_MODELO.esteItemEntraAqui)
  })

  it.each([
    ['nulo', null],
    ['desconhecido', TIPO_DESCONHECIDO],
  ] as const)('[COMPONENTE] tipo %s fala do evento, nunca de casamento ou comemoração', (_, tipo) => {
    const wrapper = mount(PosicaoItemModelo, { props: { itens: ITENS, dias: 0, tipo } })

    expect(wrapper.get('[data-teste="previa-prazo-item"]').text()).toBe('No dia do evento')
    expect(wrapper.text()).not.toMatch(/casamento|comemoração/i)
  })

  it('[COMPONENTE] lista os vizinhos do marco com o item atual na posição do prazo', () => {
    const wrapper = mount(PosicaoItemModelo, { props: { itens: ITENS, dias: 190, tipo: 'Casamento', titulo: 'Escolher o vestido' } })

    const linhas = wrapper.findAll('[data-teste="itens-marco-atual"] > li').map((linha) => linha.attributes('data-teste'))
    expect(linhas).toEqual(['vizinho-item', 'este-item', 'vizinho-item'])
    expect(wrapper.get('[data-teste="este-item"]').text()).toContain('Escolher o vestido (este item)')
    expect(wrapper.get('[data-teste="este-item"]').text()).toContain('190 dias antes')
    expect(wrapper.get('[data-teste="marco-item-seisMeses"] [data-teste="contagem-marco-item"]').text()).toBe('3 itens')
  })

  it('[COMPONENTE] item em edição não aparece como vizinho e sem título usa "Este item"', () => {
    const wrapper = mount(PosicaoItemModelo, { props: { itens: ITENS, dias: 200, itemId: 'b', tipo: 'Casamento' } })

    expect(wrapper.text()).not.toContain('Contratar o buffet')
    expect(wrapper.get('[data-teste="este-item"]').text()).toContain(TEXTOS_ITEM_MODELO.esteItem)
  })

  it('[COMPONENTE] sem dias válidos não destaca marco e pede os dias', () => {
    const wrapper = mount(PosicaoItemModelo, { props: { itens: ITENS, dias: null, tipo: 'QuinzeAnos' } })

    expect(wrapper.get('[data-teste="previa-prazo-item"]').text()).toBe(TEXTOS_ITEM_MODELO.posicaoSemDias)
    expect(wrapper.find('.posicao-item__marco--atual').exists()).toBe(false)
    expect(wrapper.find('[data-teste="este-item"]').exists()).toBe(false)
  })

  it('[COMPONENTE] notas de primeiro item, alcance e marco sem outros itens', () => {
    expect(mount(PosicaoItemModelo, { props: { itens: [], dias: 30 } }).get('[data-teste="nota-alcance-item"]').text()).toBe(TEXTOS_ITEM_MODELO.primeiroItem)
    expect(mount(PosicaoItemModelo, { props: { itens: ITENS, dias: 500 } }).get('[data-teste="nota-alcance-item"]').text()).toBe(TEXTOS_ITEM_MODELO.ampliaPrimeiro)
    const sozinho = mount(PosicaoItemModelo, { props: { itens: ITENS, dias: 0 } })
    expect(sozinho.get('[data-teste="sozinho-no-marco"]').text()).toBe(TEXTOS_ITEM_MODELO.sozinhoNoMarco)
  })

  it('[COMPONENTE] "e mais N" quando o marco tem mais de 4 vizinhos', () => {
    const muitos = [200, 199, 198, 197, 196, 195].map((dias, indice) => item(`m${indice}`, `Item ${indice}`, dias))
    const wrapper = mount(PosicaoItemModelo, { props: { itens: muitos, dias: 190 } })

    expect(wrapper.findAll('[data-teste="vizinho-item"]')).toHaveLength(4)
    expect(wrapper.get('[data-teste="mais-no-marco"]').text()).toBe(TEXTOS_ITEM_MODELO.maisNoMarco(2))
  })

  it('[UNITÁRIO] estilo usa @container, sem @media nem espaçamento solto', () => {
    for (const arquivo of ['../PosicaoItemModelo.vue', '../ExemplosItemModelo.vue']) {
      const fonte = readFileSync(resolve(__dirname, arquivo), 'utf-8')
      const estilo = fonte.slice(fonte.indexOf('<style'))
      expect(estilo).not.toContain('@media')
      expect(estilo).not.toContain('--p-espaco-')
      expect(fonte).not.toContain('v-html')
    }
  })
})

describe('ExemplosItemModelo', () => {
  it.each([
    ['Casamento', 'um casamento', 'Reservar o local da cerimônia'],
    ['QuinzeAnos', 'uma festa de 15 anos', 'Escolher o vestido da valsa'],
    ['Aniversario', 'um aniversário', 'Reservar o espaço da festa'],
    ['Comemoracao', 'uma comemoração', 'Reservar o espaço'],
  ] as const)('[COMPONENTE] %s mostra 3 exemplos do tipo com prazo', (tipo, indefinido, primeiro) => {
    const wrapper = mount(ExemplosItemModelo, { props: { tipo } })

    expect(wrapper.get('[data-teste="apoio-exemplos-item"]').text()).toBe(TEXTOS_ITEM_MODELO.exemplosApoioTipo(indefinido))
    const exemplos = wrapper.findAll('[data-teste="exemplo-item"]')
    expect(exemplos).toHaveLength(3)
    expect(exemplos[0]!.text()).toContain(primeiro)
    expect(wrapper.find('[data-teste="tipo-exemplo-item"]').exists()).toBe(false)
  })

  it.each([
    ['nulo', null],
    ['desconhecido', TIPO_DESCONHECIDO],
  ] as const)('[COMPONENTE] tipo %s mostra um exemplo por tipo, com prazo do evento', (_, tipo) => {
    const wrapper = mount(ExemplosItemModelo, { props: { tipo } })

    expect(wrapper.get('[data-teste="apoio-exemplos-item"]').text()).toBe(TEXTOS_ITEM_MODELO.exemplosApoioQualquer)
    expect(wrapper.findAll('[data-teste="tipo-exemplo-item"]').map((tipoExemplo) => tipoExemplo.text())).toEqual(['Casamento', '15 anos', 'Aniversário', 'Comemoração'])
    for (const exemplo of wrapper.findAll('[data-teste="exemplo-item"]')) {
      expect(exemplo.text()).toMatch(/do evento$/)
    }
    expect(wrapper.find('a, button').exists()).toBe(false)
  })
})
