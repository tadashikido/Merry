import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h } from 'vue'

import ItemModeloChecklist from '@/componentes/base/ItemModeloChecklist.vue'
import ProgressoChecklist from '@/componentes/base/ProgressoChecklist.vue'
import ReguaMarcos from '@/componentes/base/ReguaMarcos.vue'
import NavegacaoCasamento from '@/layouts/NavegacaoCasamento.vue'
import { gruposNavegacaoCasamento } from '@/layouts/modulosCasamento'

const Vazia = defineComponent({ render: () => h('div') })
const ID = '11111111-1111-4111-8111-111111111111'

let montado: VueWrapper | undefined

afterEach(() => {
  montado?.unmount()
  montado = undefined
  document.body.innerHTML = ''
})

describe('ProgressoChecklist', () => {
  it('[COMPONENTE] mostra percentual editorial, frase e barra acessível', () => {
    montado = mount(ProgressoChecklist, { props: { percentual: 62, concluidas: 16, consideradas: 26, canceladas: 1 } })

    expect(montado.get('[data-teste="percentual-checklist"]').text()).toBe('62%')
    expect(montado.get('[data-teste="frase-progresso"]').text()).toBe('16 de 26 concluídas')
    expect(montado.text()).toContain('1 cancelada fica fora da conta')
    const barra = montado.get('[data-teste="barra-checklist"]')
    expect(barra.attributes('role')).toBe('progressbar')
    expect(barra.attributes('aria-valuenow')).toBe('62')
    expect(barra.attributes('aria-valuetext')).toBe('62% concluído, 16 de 26 tarefas')
    expect(barra.attributes('aria-labelledby')).toBeTruthy()
    expect(barra.get('span').attributes('style')).toContain('62%')
  })

  it('[COMPONENTE] sem checklist mostra o estado vazio sem número', () => {
    montado = mount(ProgressoChecklist, { props: { percentual: null, concluidas: 0, consideradas: 0 } })

    expect(montado.find('[data-teste="percentual-checklist"]').exists()).toBe(false)
    expect(montado.text()).toContain('Sem checklist ainda')
    expect(montado.classes()).toContain('progresso-checklist--vazio')
    expect(montado.get('[data-teste="barra-checklist"]').attributes('aria-valuenow')).toBe('0')
  })
})

describe('ReguaMarcos', () => {
  it('[COMPONENTE] renderiza marcos em lista ordenada com títulos que rotulam o conteúdo', () => {
    montado = mount(ReguaMarcos, {
      props: {
        rotulo: 'Itens por marco',
        marcos: [
          { chave: 'dozeMeses', rotulo: '12 meses', complemento: 'antes ou mais', detalhe: '2 itens', concluido: true },
          { chave: 'trintaDias', rotulo: '30 dias', complemento: 'antes' },
        ],
      },
      slots: {
        marco: `<template #marco="{ marco, idTitulo }"><ul :aria-labelledby="idTitulo" :data-marco="marco.chave"><li>item</li></ul></template>`,
      },
    })

    const lista = montado.get('ol')
    expect(lista.attributes('aria-label')).toBe('Itens por marco')
    const marcos = montado.findAll('li.regua__marco')
    expect(marcos).toHaveLength(2)
    expect(marcos[0]!.classes()).toContain('regua__marco--concluido')
    expect(marcos[1]!.classes()).not.toContain('regua__marco--concluido')
    const titulo = marcos[0]!.get('h2')
    expect(titulo.text()).toContain('12 meses')
    expect(titulo.text()).toContain('antes ou mais')
    expect(marcos[0]!.text()).toContain('2 itens')
    expect(montado.get('[data-marco="dozeMeses"]').attributes('aria-labelledby')).toBe(titulo.attributes('id'))
    expect(marcos[0]!.get('.regua__no').attributes('aria-hidden')).toBe('true')
  })
})

describe('ItemModeloChecklist', () => {
  it('[COMPONENTE] mostra título, prazo relativo, metadados, descrição e ações', () => {
    montado = mount(ItemModeloChecklist, {
      props: { titulo: 'Contratar buffet', prazoRelativo: '365 dias antes', metadados: ['Assessoria', 'Fornecedores'], descricao: 'Três orçamentos' },
      slots: { acoes: '<button type="button">Mais ações</button>' },
    })

    expect(montado.element.tagName).toBe('LI')
    expect(montado.get('[data-teste="titulo-item-modelo"]').text()).toBe('Contratar buffet')
    expect(montado.get('[data-teste="prazo-item-modelo"]').text()).toBe('365 dias antes')
    expect(montado.text()).toContain('Fornecedores')
    expect(montado.text()).toContain('Três orçamentos')
    expect(montado.find('button').exists()).toBe(true)
  })
})

describe('NavegacaoCasamento com indicador', () => {
  it('[COMPONENTE] mostra o percentual do checklist com texto acessível', async () => {
    const roteador = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/casamentos/:id', name: 'casamento', component: Vazia },
        { path: '/casamentos/:id/tarefas', name: 'casamento-tarefas', component: Vazia },
        { path: '/casamentos/:id/checklist', name: 'casamento-checklist', component: Vazia },
        { path: '/casamentos/:id/cronograma', name: 'casamento-cronograma', component: Vazia },
        { path: '/casamentos/:id/fornecedores', name: 'casamento-fornecedores', component: Vazia },
        { path: '/casamentos/:id/convidados', name: 'casamento-convidados', component: Vazia },
        { path: '/casamentos/:id/confirmacoes', name: 'painel-confirmacoes', component: Vazia },
        { path: '/casamentos/:id/restricoes-alimentares', name: 'restricoes-alimentares', component: Vazia },
        { path: '/casamentos/:id/mesas', name: 'casamento-mesas', component: Vazia },
        { path: '/casamentos/:id/financeiro', name: 'casamento-financeiro', component: Vazia },
        { path: '/casamentos/:id/grande-dia', name: 'casamento-grande-dia', component: Vazia },
      ],
    })
    await roteador.push(`/casamentos/${ID}/checklist`)
    await roteador.isReady()
    const grupos = gruposNavegacaoCasamento(ID, 'casamento-checklist', () => true, undefined, {
      checklist: { texto: '80%', rotuloAcessivel: '80% concluído' },
    })

    montado = mount(NavegacaoCasamento, {
      props: { casamento: null, grupos },
      global: { plugins: [roteador] },
    })

    const itens = montado.findAll('[data-teste="item-casamento"]')
    const checklist = itens.find((item) => item.text().startsWith('Checklist'))!
    expect(checklist.attributes('aria-current')).toBe('page')
    expect(checklist.get('[data-teste="indicador-modulo"]').text()).toContain('80%')
    expect(checklist.get('.somente-leitor-tela').text()).toBe(', 80% concluído')
    expect(montado.findAll('[data-teste="indicador-modulo"]')).toHaveLength(1)
  })
})
