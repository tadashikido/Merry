import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import PrimeVue from 'primevue/config'
import type { RouteLocationNormalized } from 'vue-router'

import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import LugarAcesso from '@/componentes/base/LugarAcesso.vue'
import ParLugares from '@/componentes/base/ParLugares.vue'
import { itensRailAnfitriao } from '@/layouts/menuPainel'
import { gruposNavegacaoEvento } from '@/layouts/modulosEvento'
import { destinoDoAnfitriao, somenteAssessoria } from '@/router/guardaAutenticacao'
import { TEXTOS_AREA_ANFITRIAO } from '@/textos/acessoAnfitriao'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, object]] }

afterEach(() => {
  document.body.innerHTML = ''
})

function rota(nome: string, somenteDaAssessoria = false): RouteLocationNormalized {
  return {
    name: nome,
    matched: [{ meta: somenteDaAssessoria ? { somenteAssessoria: true } : {} }],
  } as unknown as RouteLocationNormalized
}

describe('LugarAcesso', () => {
  it('[COMPONENTE] lugar ocupado mostra nome, e-mail, situação com texto e detalhe', () => {
    const wrapper = mount(LugarAcesso, {
      props: { situacao: 'ativo', titulo: 'Lívia Moraes', subtitulo: 'livia@exemplo.com', rotuloSituacao: 'Com acesso', detalhe: 'Ativo desde 30/09/2026' },
      slots: { acoes: () => h('button', 'Ação') },
      global,
    })

    expect(wrapper.attributes('role')).toBe('listitem')
    expect(wrapper.attributes('data-situacao')).toBe('ativo')
    expect(wrapper.attributes('aria-labelledby')).toBe(wrapper.get('.lugar-acesso__titulo').attributes('id'))
    expect(wrapper.text()).toContain('Lívia Moraes')
    expect(wrapper.text()).toContain('livia@exemplo.com')
    expect(wrapper.get('[data-teste="badge-status"]').attributes('data-variante')).toBe('sucesso')
    expect(wrapper.get('[data-teste="lugar-detalhe"]').text()).toBe('Ativo desde 30/09/2026')
    expect(wrapper.find('.lugar-acesso__acoes button').exists()).toBe(true)
  })

  it.each([
    ['pendente', 'informacao'],
    ['expirado', 'alerta'],
  ] as const)('[COMPONENTE] situação %s usa a variante %s', (situacao, variante) => {
    const wrapper = mount(LugarAcesso, { props: { situacao, titulo: 'Rafael', rotuloSituacao: 'Situação' }, global })

    expect(wrapper.get('[data-teste="badge-status"]').attributes('data-variante')).toBe(variante)
  })

  it('[COMPONENTE] lugar vazio não mostra status e aceita conteúdo próprio', () => {
    const wrapper = mount(LugarAcesso, {
      props: { situacao: 'vazio', titulo: 'Lugar disponível', rotuloSituacao: 'Ignorado' },
      slots: { default: () => h('form', { 'data-teste': 'formulario' }) },
      global,
    })

    expect(wrapper.classes()).toContain('lugar-acesso--vazio')
    expect(wrapper.find('[data-teste="badge-status"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="formulario"]').exists()).toBe(true)
    expect(wrapper.find('.lugar-acesso__acoes').exists()).toBe(false)
  })
})

describe('ParLugares', () => {
  it('[COMPONENTE] agrupa dois lugares em lista rotulada com o "&" decorativo', () => {
    const wrapper = mount(ParLugares, {
      props: { rotulo: 'Lugares de acesso dos anfitriões' },
      slots: { primeiro: () => h('div', { role: 'listitem' }, 'A'), segundo: () => h('div', { role: 'listitem' }, 'B') },
      global,
    })

    expect(wrapper.attributes('role')).toBe('list')
    expect(wrapper.attributes('aria-label')).toBe('Lugares de acesso dos anfitriões')
    expect(wrapper.get('.par-lugares__e').attributes('aria-hidden')).toBe('true')
    expect(wrapper.findAll('[role="listitem"]').map((item) => item.text())).toEqual(['A', 'B'])
  })
})

describe('DialogoConfirmacao perigoso', () => {
  it('[COMPONENTE] usa o botão destrutivo só quando pedido', async () => {
    const props = { visivel: true, titulo: 'Revogar?', mensagem: 'Texto', rotuloConfirmar: 'Revogar acesso', rotuloCancelar: 'Cancelar' }
    const comum = mount(DialogoConfirmacao, { props, global, attachTo: document.body })
    await flushPromises()
    const botaoComum = document.body.querySelector('[data-teste="dialogo-confirmacao-confirmar"]')!
    expect(botaoComum.className).not.toContain('danger')
    comum.unmount()

    const perigoso = mount(DialogoConfirmacao, { props: { ...props, perigoso: true }, global, attachTo: document.body })
    await flushPromises()
    const botao = document.body.querySelector('[data-teste="dialogo-confirmacao-confirmar"]')!
    expect(botao.outerHTML).toMatch(/danger/)
    perigoso.unmount()
  })
})

describe('navegação reduzida dos anfitriões', () => {
  it('[UNITÁRIO] rail dos anfitriões tem só o próprio evento e a navegação do evento só tarefas, convidados e confirmações além da visão geral', () => {
    const rail = itensRailAnfitriao('c1')
    expect(rail.map((item) => item.rotulo)).toEqual([TEXTOS_AREA_ANFITRIAO.menuNossoEvento])
    expect(JSON.stringify(rail[0]!.rota)).toContain('c1')

    const grupos = gruposNavegacaoEvento('c1', 'evento', (modulo) => !['restricoes-alimentares', 'evento-checklist'].includes(modulo.rota))
    const itens = grupos.flatMap((grupo) => grupo.itens)
    expect(itens.map((item) => item.rotulo)).toEqual(['Visão geral', 'Tarefas', 'Cronograma', 'Fornecedores', TEXTOS_AREA_ANFITRIAO.menuConvidados, TEXTOS_AREA_ANFITRIAO.menuConfirmacoes, 'Mesas', 'Financeiro', 'Grande Dia'])
    expect(itens.every((item) => JSON.stringify(item.rota).includes('c1'))).toBe(true)
  })

  it('[SEGURANÇA] redireciona os anfitriões do início e das rotas da assessoria', () => {
    expect(somenteAssessoria(rota('eventos', true))).toBe(true)
    expect(destinoDoAnfitriao(rota('inicio'), 'c1')).toEqual({ name: 'evento', params: { id: 'c1' } })
    expect(destinoDoAnfitriao(rota('restricoes-alimentares', true), 'c1')).toEqual({ name: 'evento', params: { id: 'c1' } })
    expect(destinoDoAnfitriao(rota('evento-convidados'), 'c1')).toBeNull()
    expect(destinoDoAnfitriao(rota('eventos', true), null)).toBeNull()
  })
})
