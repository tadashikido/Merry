import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import ItemTarefa from '@/componentes/base/ItemTarefa.vue'
import BlocoPendenciasTarefas from '@/componentes/tarefas/BlocoPendenciasTarefas.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import { pendenciasExemplo, pendenteExemplo } from '@/__tests__/auxiliaresTarefas'
import { createMemoryHistory, createRouter } from 'vue-router'
import { rotas } from '@/router'

await precarregarRotas('entrar')

function montarItem(props: Record<string, unknown> = {}) {
  return mount(ItemTarefa, {
    props: { titulo: 'Assinar contrato', rotuloAlternar: 'Concluir: Assinar contrato', ...props },
    global: { plugins: [[PrimeVue, { unstyled: true }]] },
  })
}

describe('ItemTarefa', () => {
  it('[COMPONENTE] anel é um botão com rótulo acessível e estado pressionado', async () => {
    const wrapper = montarItem({ metadados: ['Anfitriões', 'venceu há 3 dias'], badge: { texto: 'Atrasada', variante: 'erro' } })
    const anel = wrapper.get('[data-teste="alternar-tarefa"]')

    expect(anel.element.tagName).toBe('BUTTON')
    expect(anel.attributes('aria-label')).toBe('Concluir: Assinar contrato')
    expect(anel.attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('[data-teste="metadados-tarefa"]').text()).toBe('Anfitriões · venceu há 3 dias')
    expect(wrapper.get('[data-teste="badge-status"]').attributes('data-variante')).toBe('erro')
    expect(wrapper.text()).toContain('Atrasada')

    await anel.trigger('click')
    expect(wrapper.emitted('alternar')).toHaveLength(1)
  })

  it('[COMPONENTE] concluída fica pressionada e riscada', () => {
    const wrapper = montarItem({ concluida: true, rotuloAlternar: 'Reabrir: Assinar contrato' })

    expect(wrapper.get('[data-teste="alternar-tarefa"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.classes()).toContain('item-tarefa--concluida')
  })

  it('[COMPONENTE] cancelada, somente leitura ou em andamento não emite alternar', async () => {
    for (const props of [{ cancelada: true }, { podeAlternar: false }, { alternando: true }]) {
      const wrapper = montarItem(props)
      const anel = wrapper.get('[data-teste="alternar-tarefa"]')

      expect(anel.attributes('aria-disabled')).toBe('true')
      await anel.trigger('click')
      expect(wrapper.emitted('alternar')).toBeUndefined()
    }
  })

  it('[COMPONENTE] descrição aparece truncada com o texto completo no título e sem badge quando nulo', () => {
    const wrapper = montarItem({ descricao: 'Contrato enviado por e-mail' })

    expect(wrapper.get('.item-tarefa__descricao').attributes('title')).toBe('Contrato enviado por e-mail')
    expect(wrapper.find('[data-teste="badge-status"]').exists()).toBe(false)
  })
})

describe('MenuAcoes somente ícone', () => {
  it('[COMPONENTE] esconde o rótulo visível e mantém nome acessível', () => {
    const wrapper = mount(MenuAcoes, {
      props: { itens: [{ chave: 'editar', rotulo: 'Editar' }], rotulo: 'Mais ações', rotuloAcessivel: 'Mais ações: Assinar', somenteIcone: true },
      global: { plugins: [[PrimeVue, { unstyled: true }]] },
    })
    const botao = wrapper.get('[data-teste="menu-acoes"]')

    expect(botao.attributes('aria-label')).toBe('Mais ações: Assinar')
    expect(botao.attributes('title')).toBe('Mais ações')
    expect(botao.text()).not.toContain('Mais ações')
  })
})

describe('BlocoPendenciasTarefas', () => {
  async function montarBloco(props: Record<string, unknown>) {
    const roteador = createRouter({ history: createMemoryHistory(), routes: rotas })
    await roteador.push('/entrar')
    return mount(BlocoPendenciasTarefas, {
      props: { pendencias: null, ...props },
      global: { plugins: [roteador, [PrimeVue, { unstyled: true }]] },
    })
  }

  it('[COMPONENTE] mostra totais, até 5 itens por grupo e link com a situação', async () => {
    const atrasadas = Array.from({ length: 7 }, (_, indice) => pendenteExemplo({ id: `a${indice}`, titulo: `Atrasada ${indice}` }))
    const wrapper = await montarBloco({ pendencias: pendenciasExemplo({ totalAtrasadas: 7, eventosComAtraso: 4, atrasadas }) })

    expect(wrapper.get('[data-teste="total-atrasadas"]').text()).toBe('7')
    expect(wrapper.text()).toContain('atrasadas em 4 eventos')
    expect(wrapper.get('[data-teste="grupo-pendencias-atrasadas"]').findAll('[data-teste="item-pendencia"]')).toHaveLength(5)
    expect(wrapper.text()).toContain('Mais 2')
    const link = wrapper.get('[data-teste="grupo-pendencias-atrasadas"] a')
    expect(link.attributes('href')).toBe('/eventos/11111111-1111-4111-8111-111111111111/tarefas?situacao=atrasadas')
    expect(wrapper.get('[data-teste="grupo-pendencias-semana"]').text()).toContain('hoje')
    expect(wrapper.get('[data-teste="grupo-pendencias-atrasadas"]').text()).toContain('Luísa & Pedro')
  })

  it('[COMPONENTE] sem pendências mostra estado positivo; com erro oferece nova tentativa', async () => {
    const vazio = await montarBloco({ pendencias: pendenciasExemplo({ totalAtrasadas: 0, totalEstaSemana: 0, atrasadas: [], estaSemana: [] }) })
    expect(vazio.get('[data-teste="pendencias-vazio"]').text()).toBe('Nenhuma tarefa atrasada ou para esta semana.')

    const comErro = await montarBloco({ comErro: true })
    expect(comErro.get('[role="alert"]').text()).toContain('Não foi possível carregar as tarefas.')
    await comErro.get('[data-teste="tentar-pendencias"]').trigger('click')
    expect(comErro.emitted('tentarNovamente')).toHaveLength(1)
  })
})
