import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createMemoryHistory, createRouter } from 'vue-router'

import CartaoModelo from '@/componentes/base/CartaoModelo.vue'
import EtiquetaTipo from '@/componentes/base/EtiquetaTipo.vue'
import CoberturaModelosPorTipo from '@/componentes/modelos/CoberturaModelosPorTipo.vue'
import { PARES_CONTRASTE, atendeContraste } from '@/design/contraste'
import { TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import type { TipoEvento } from '@/tipos/eventos'

function lerEstilo(caminho: string): string {
  const fonte = readFileSync(resolve(__dirname, caminho), 'utf-8')
  return fonte.slice(fonte.indexOf('<style'))
}

async function montarCartao(props: Record<string, unknown> = {}) {
  const roteador = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/modelos/:modeloId', name: 'detalhe', component: { template: '<div />' } },
    ],
  })
  await roteador.push('/')
  await roteador.isReady()
  const wrapper = mount(CartaoModelo, {
    props: {
      nome: 'Checklist essencial',
      descricao: null,
      rota: { name: 'detalhe', params: { modeloId: 'm1' } },
      contagem: '26 itens',
      sugerido: true,
      rotuloSugerido: 'Sugerido para casamento',
      acoes: [],
      rotuloAcoes: 'Mais ações',
      rotuloAcessivelAcoes: 'Mais ações para Checklist essencial',
      ...props,
    },
    global: { plugins: [roteador, [PrimeVue, { unstyled: true }] as [typeof PrimeVue, object]] },
  })
  await flushPromises()
  return wrapper
}

describe('CartaoModelo no DS v2', () => {
  it.each([
    ['Casamento', 'rose'],
    ['QuinzeAnos', 'orquidea'],
    ['Aniversario', 'tangerina'],
    ['Comemoracao', 'champanhe'],
  ] as const)('[COMPONENTE] %s mostra tile e selo sugerido no tom %s com centelha', async (tipo, tom) => {
    const wrapper = await montarCartao({ tipo })

    expect(wrapper.get('[data-teste="tile-tipo"]').attributes('data-tom')).toBe(tom)
    const selo = wrapper.get('[data-teste="selo-sugerido"]')
    expect(selo.attributes('data-tom')).toBe(tom)
    expect(selo.text()).toBe('Sugerido para casamento')
    expect(selo.find('.ie-centelha').exists()).toBe(true)
  })

  it('[COMPONENTE] tipo nulo ou desconhecido fica neutro; sem a prop tipo não há tile', async () => {
    expect((await montarCartao({ tipo: null })).get('[data-teste="tile-tipo"]').attributes('data-tom')).toBe('neutro')
    expect((await montarCartao({ tipo: 'Formatura' as unknown as TipoEvento })).get('[data-teste="tile-tipo"]').attributes('data-tom')).toBe('neutro')
    const semTipo = await montarCartao()
    expect(semTipo.find('[data-teste="tile-tipo"]').exists()).toBe(false)
    expect(semTipo.get('[data-teste="selo-sugerido"]').attributes('data-tom')).toBe('neutro')
  })

  it('[COMPONENTE] destaca o número da contagem sem mudar o texto; texto sem número fica inteiro', async () => {
    const wrapper = await montarCartao({ contagem: '1.234 itens' })
    const contagem = wrapper.get('[data-teste="contagem-modelo"]')
    expect(contagem.text()).toBe('1.234 itens')
    expect(contagem.get('strong.cartao-modelo__numero').text()).toBe('1.234')

    const semNumero = (await montarCartao({ contagem: 'Nenhum item' })).get('[data-teste="contagem-modelo"]')
    expect(semNumero.text()).toBe('Nenhum item')
    expect(semNumero.find('strong').exists()).toBe(false)
  })

  it('[UNITÁRIO] cartão usa a superfície global com sombra e número em Fraunces', async () => {
    const wrapper = await montarCartao()
    expect(wrapper.get('article').classes()).toEqual(expect.arrayContaining(['cartao-modelo', 'cartao']))
    const estilo = lerEstilo('../../base/CartaoModelo.vue')
    expect(estilo).toMatch(/\.cartao-modelo__numero\s*\{[^}]*font-family: var\(--p-fonte-display\)/)
    expect(estilo).toMatch(/\.cartao-modelo__link\s*\{[^}]*color: var\(--p-cor-titulo\)/)
  })
})

describe('EtiquetaTipo com ícone próprio', () => {
  it('[COMPONENTE] icone substitui o ícone do tom', () => {
    const wrapper = mount(EtiquetaTipo, { props: { tipo: 'Casamento', comIcone: true, icone: 'centelha', rotulo: 'Sugerido' } })
    expect(wrapper.find('.ie-centelha').exists()).toBe(true)
    expect(wrapper.find('.ie-aneis').exists()).toBe(false)
  })
})

describe('CoberturaModelosPorTipo como lateral escura', () => {
  it('[COMPONENTE] cada tipo tem ponto na cor do tipo', () => {
    const wrapper = mount(CoberturaModelosPorTipo, {
      props: { modelos: [{ tipoEvento: 'Casamento', sugerido: true }], recurso: 'checklist', reaproveitamento: TEXTOS_MODELOS_CHECKLIST.reaproveitamento },
    })
    const linhas = wrapper.findAll('[data-teste="cobertura-tipo"]')
    expect(linhas.map((linha) => linha.classes().find((classe) => classe.startsWith('tom-tipo--')))).toEqual(['tom-tipo--rose', 'tom-tipo--orquidea', 'tom-tipo--tangerina', 'tom-tipo--champanhe'])
    expect(linhas.every((linha) => linha.find('[data-teste="cobertura-ponto"]').attributes('aria-hidden') === 'true')).toBe(true)
    expect(wrapper.classes()).not.toContain('cartao')
  })

  it('[UNITÁRIO] fundo, texto e divisórias da lateral escura só por tokens', () => {
    const estilo = lerEstilo('../CoberturaModelosPorTipo.vue')
    expect(estilo).toMatch(/\.cobertura\s*\{[^}]*background: var\(--p-cor-lateral-escura\)/)
    expect(estilo).toMatch(/\.cobertura__ponto\s*\{[^}]*background: var\(--tom-viva\)/)
    expect(estilo).toContain('var(--p-cor-lateral-escura-divisoria)')
    expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgba\(/)
  })

  it('[UNITÁRIO] ponto viva de cada tom atinge 3:1 sobre a lateral escura', () => {
    const pares = PARES_CONTRASTE.filter((par) => par.descricao.includes('ponto viva sobre a lateral escura'))
    expect(pares.length).toBeGreaterThanOrEqual(4)
    expect(pares.filter((par) => !atendeContraste(par))).toEqual([])
  })
})

describe('AbasSecao segmentada', () => {
  it('[UNITÁRIO] trilho com aba ativa em superfície e sombra suave, sem sublinhado', () => {
    const estilo = lerEstilo('../../base/AbasSecao.vue')
    expect(estilo).toMatch(/\.abas-secao__lista\s*\{[^}]*background: var\(--p-cor-trilho\)/)
    expect(estilo).toMatch(/\.abas-secao__aba--ativa,\s*\.abas-secao__aba--ativa:hover\s*\{[^}]*background: var\(--p-cor-superficie\);[^}]*box-shadow: var\(--p-sombra-suave\)/)
    expect(estilo).toMatch(/min-height: var\(--p-dimensao-alvo-toque\)/)
    expect(estilo).not.toContain('border-bottom')
  })
})
