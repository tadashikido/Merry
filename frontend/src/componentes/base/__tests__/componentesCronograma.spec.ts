import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import AtalhosPreenchimento from '../AtalhosPreenchimento.vue'
import LinhaCronograma from '../LinhaCronograma.vue'

function montarLinha(props: Record<string, unknown>) {
  return mount(LinhaCronograma, {
    props: { inicio: '16:30', atividade: 'Cerimônia', ...props },
    global: { plugins: [[PrimeVue, { unstyled: true }]] },
  })
}

describe('LinhaCronograma', () => {
  it('[COMPONENTE] editável é um botão de linha inteira com rótulo completo e emite editar', async () => {
    const wrapper = montarLinha({
      termino: '17:15',
      local: 'Capela São José',
      responsavel: 'Fernanda',
      fornecedor: 'Coral Harmonia',
      instrucoes: 'Chegar antes.',
      editavel: true,
      rotulo: 'Editar Cerimônia, das 16:30 às 17:15',
    })

    const botao = wrapper.get('button[data-teste="linha-cronograma-conteudo"]')
    expect(botao.attributes('aria-label')).toBe('Editar Cerimônia, das 16:30 às 17:15')
    expect(wrapper.get('[data-teste="linha-cronograma-inicio"]').text()).toBe('16:30')
    expect(wrapper.get('[data-teste="linha-cronograma-termino"]').text()).toBe('17:15')
    expect(wrapper.get('[data-teste="linha-cronograma-local"]').text()).toContain('Capela São José')
    expect(wrapper.get('[data-teste="linha-cronograma-responsavel"]').text()).toContain('Fernanda')
    expect(wrapper.get('[data-teste="linha-cronograma-fornecedor"]').text()).toContain('Coral Harmonia')
    expect(wrapper.get('.linha-cronograma__horario').attributes('aria-hidden')).toBe('true')
    await botao.trigger('click')
    expect(wrapper.emitted('editar')).toHaveLength(1)
  })

  it('[COMPONENTE] somente leitura não é focável e lê o horário por extenso, inclusive dia seguinte', () => {
    const wrapper = montarLinha({ inicio: '21:30', termino: '02:00', terminaEmOutroDia: true, atividade: 'Pista' })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.get('.somente-leitor-tela').text()).toBe('das 21:30 às 02:00 do dia seguinte')
    expect(wrapper.get('[data-teste="linha-cronograma-termino"]').text()).toBe('02:00+1')
  })

  it('[COMPONENTE] instante sem término lê "às"', () => {
    const wrapper = montarLinha({ termino: null })

    expect(wrapper.get('.somente-leitor-tela').text()).toBe('às 16:30')
    expect(wrapper.find('[data-teste="linha-cronograma-termino"]').exists()).toBe(false)
  })

  it('[COMPONENTE] cerimônia mostra anéis e conflito mostra selo de alerta com texto', () => {
    const wrapper = montarLinha({
      ehCerimonia: true,
      relativoCerimonia: 'Hora da cerimônia',
      conflitos: ['Conflito com Retoque, 17:00'],
    })

    expect(wrapper.classes()).toContain('linha-cronograma--cerimonia')
    expect(wrapper.classes()).toContain('linha-cronograma--conflito')
    expect(wrapper.find('.linha-cronograma__anel--segundo').exists()).toBe(true)
    expect(wrapper.get('[data-teste="linha-cronograma-relativo"]').text()).toBe('Hora da cerimônia')
    const selo = wrapper.get('[data-teste="linha-cronograma-conflito"]')
    expect(selo.attributes('data-variante')).toBe('alerta')
    expect(selo.text()).toContain('Conflito com Retoque, 17:00')
  })

  it('[COMPONENTE] indica nota interna sem mostrar o texto', () => {
    const wrapper = montarLinha({ possuiNotaInterna: true })

    expect(wrapper.get('[data-teste="linha-cronograma-nota"]').text()).toBe('Nota interna')
  })
})

describe('AtalhosPreenchimento', () => {
  const opcoes = [
    { rotulo: 'Cerimônia: Capela', valor: 'Capela' },
    { rotulo: 'Recepção: Salão', valor: 'Salão' },
  ]

  it('[COMPONENTE] marca a opção do valor atual e emite o valor escolhido', async () => {
    const wrapper = mount(AtalhosPreenchimento, { props: { rotulo: 'Usar o local', opcoes, valorAtual: ' capela ' } })

    const botoes = wrapper.findAll('[data-teste="atalho-preenchimento"]')
    expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe('Usar o local')
    expect(botoes.map((botao) => botao.attributes('aria-pressed'))).toEqual(['true', 'false'])
    await botoes[1]!.trigger('click')
    expect(wrapper.emitted('escolher')).toEqual([['Salão']])
  })

  it('[COMPONENTE] sem opções não renderiza nada e desabilitado bloqueia', () => {
    expect(mount(AtalhosPreenchimento, { props: { rotulo: 'Usar o local', opcoes: [] } }).find('[role="group"]').exists()).toBe(false)
    const desabilitado = mount(AtalhosPreenchimento, { props: { rotulo: 'Usar o local', opcoes, desabilitado: true } })
    expect(desabilitado.get('[data-teste="atalho-preenchimento"]').attributes('disabled')).toBeDefined()
  })
})

describe('LinhaCronograma — detalhes lado a lado', () => {
  const fonte = readFileSync(resolve(__dirname, '../LinhaCronograma.vue'), 'utf-8')

  it('[COMPONENTE] com detalhes e complementos marca o conteúdo para a coluna de detalhes', () => {
    const wrapper = montarLinha({
      local: 'Capela São José',
      responsavel: 'Fernanda',
      instrucoes: 'Chegar antes.',
      conflitos: ['Conflito com Retoque, 17:00'],
    })

    const conteudo = wrapper.get('[data-teste="linha-cronograma-conteudo"]')
    expect(conteudo.classes()).toContain('linha-cronograma__conteudo--detalhes')
    expect(conteudo.classes()).toContain('linha-cronograma__conteudo--complementos')
    const complementos = wrapper.get('.linha-cronograma__complementos')
    expect(complementos.find('[data-teste="linha-cronograma-instrucoes"]').exists()).toBe(true)
    expect(complementos.find('[data-teste="linha-cronograma-conflito"]').exists()).toBe(true)
    expect(complementos.find('[data-teste="linha-cronograma-local"]').exists()).toBe(false)
  })

  it('[COMPONENTE] sem detalhes nem complementos não cria colunas vazias', () => {
    const wrapper = montarLinha({})

    const conteudo = wrapper.get('[data-teste="linha-cronograma-conteudo"]')
    expect(conteudo.classes()).not.toContain('linha-cronograma__conteudo--detalhes')
    expect(conteudo.classes()).not.toContain('linha-cronograma__conteudo--complementos')
    expect(wrapper.find('.linha-cronograma__complementos').exists()).toBe(false)
    expect(wrapper.find('.linha-cronograma__metadados').exists()).toBe(false)
  })

  it('[COMPONENTE] a coluna de detalhes depende da largura da própria linha via container', () => {
    expect(fonte).toMatch(/container:\s*linha-cronograma\s*\/\s*inline-size/)
    expect(fonte).toMatch(/@container linha-cronograma \(min-width: 42rem\)/)
    expect(fonte).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) minmax\(12rem, 16rem\)/)
  })
})
