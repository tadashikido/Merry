import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import ListagemDados from '@/componentes/base/ListagemDados.vue'
import type { ColunaListagem } from '@/componentes/base/tipos'
import { MENSAGENS_PADRAO } from '@/textos/mensagens'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'

const colunas: ColunaListagem<Record<string, unknown>>[] = [
  { campo: 'nome', titulo: 'Nome', principal: true },
  { campo: 'grupo', titulo: 'Grupo' },
]

const convidados: Record<string, unknown>[] = [
  { id: 1, nome: 'Ana Souza', grupo: 'Família da noiva' },
  { id: 2, nome: 'Carlos Lima', grupo: null },
]

function montar(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(ListagemDados, {
    props: { itens: convidados, colunas, chave: 'id', rotulo: 'Convidados', ...props },
    slots,
    global: { plugins: [[PrimeVue, { unstyled: true }]] },
  })
}

describe('ListagemDados', () => {
  it('[COMPONENTE] exibe tabela com colunas e travessão para valor ausente', async () => {
    simularMatchMedia(false)
    const wrapper = montar()
    await nextTick()

    const tabela = wrapper.get('[data-teste="listagem-tabela"]')
    expect(tabela.findAll('th').map((th) => th.text())).toEqual(['Nome', 'Grupo'])
    expect(tabela.findAll('tbody tr')).toHaveLength(2)
    expect(tabela.text()).toContain('Ana Souza')
    expect(tabela.findAll('tbody tr')[1]?.text()).toContain('—')
    expect(wrapper.get('section').attributes('aria-label')).toBe('Convidados')
  })

  it('[COMPONENTE] exibe cartões no celular com a coluna principal como título', async () => {
    simularMatchMedia(true)
    const wrapper = montar()
    await nextTick()

    const cartoes = wrapper.get('[data-teste="listagem-cartoes"]')
    expect(cartoes.findAll('li')).toHaveLength(2)
    expect(cartoes.get('.listagem__cartao-titulo').text()).toBe('Ana Souza')
    expect(cartoes.get('dt').text()).toBe('Grupo')
    expect(wrapper.find('[data-teste="listagem-tabela"]').exists()).toBe(false)
  })

  it('[COMPONENTE] exibe skeleton e desabilita a busca enquanto carrega', () => {
    simularMatchMedia(false)
    const wrapper = montar({ carregando: true })

    expect(wrapper.find('[data-teste="estado-carregando"]').exists()).toBe(true)
    expect(wrapper.get('[data-teste="busca-listagem"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-teste="listagem-tabela"]').exists()).toBe(false)
  })

  it('[COMPONENTE] simula falha de rede exibindo erro e repassando nova tentativa', async () => {
    simularMatchMedia(false)
    const wrapper = montar({ erro: 'Verifique sua conexão e tente novamente.' })

    expect(wrapper.get('[data-teste="estado-erro"]').text()).toContain('Verifique sua conexão e tente novamente.')
    await wrapper.get('[data-teste="tentar-novamente"]').trigger('click')
    expect(wrapper.emitted('tentar-novamente')).toHaveLength(1)
  })

  it('[COMPONENTE] exibe estado vazio com convite à ação quando não há itens', () => {
    simularMatchMedia(false)
    const wrapper = montar(
      { itens: [], tituloVazio: 'Nenhum convidado ainda' },
      { 'acao-vazio': '<button type="button">Adicionar convidado</button>' },
    )

    const vazio = wrapper.get('[data-teste="estado-vazio"]')
    expect(vazio.text()).toContain('Nenhum convidado ainda')
    expect(vazio.get('button').text()).toBe('Adicionar convidado')
    expect(wrapper.find('[data-teste="limpar-filtros"]').exists()).toBe(false)
  })

  it('[COMPONENTE] diferencia busca sem resultado e limpa filtros', async () => {
    simularMatchMedia(false)
    const wrapper = montar({ itens: [], busca: 'zzz', filtrosAtivos: true })

    expect(wrapper.get('[data-teste="estado-vazio"]').text()).toContain(MENSAGENS_PADRAO.semResultadoTitulo)
    await wrapper.get('[data-teste="limpar-filtros"]').trigger('click')

    expect(wrapper.emitted('limpar-filtros')).toHaveLength(1)
    expect(wrapper.emitted('update:busca')?.slice(-1)[0]).toEqual([''])
  })

  it('[COMPONENTE] emite a busca digitada com rótulo acessível', async () => {
    simularMatchMedia(false)
    const wrapper = montar()

    const campo = wrapper.get('[data-teste="busca-listagem"]')
    expect(wrapper.get(`label[for="${campo.attributes('id')}"]`).text()).toBe('Buscar')
    await campo.setValue('Ana')
    expect(wrapper.emitted('update:busca')?.slice(-1)[0]).toEqual(['Ana'])
  })

  it('[COMPONENTE] oculta a barra de busca quando desativada', () => {
    simularMatchMedia(false)
    const wrapper = montar({ comBusca: false })

    expect(wrapper.find('[data-teste="busca-listagem"]').exists()).toBe(false)
  })
})

describe('ListagemDados no design system v2', () => {
  it('[COMPONENTE] filtros principais ficam numa faixa própria acima da barra de busca', async () => {
    simularMatchMedia(false)
    const wrapper = montar({}, { 'filtros-principais': '<div data-teste="pilulas">Pílulas</div>', filtros: '<div data-teste="outro">Fase</div>' })
    await nextTick()

    const faixa = wrapper.get('.listagem__filtros-principais')
    expect(faixa.find('[data-teste="pilulas"]').exists()).toBe(true)
    expect(wrapper.get('.listagem__barra').find('[data-teste="pilulas"]').exists()).toBe(false)
    const ordem = wrapper.findAll('.listagem__filtros-principais, .listagem__barra').map((item) => item.classes()[0])
    expect(ordem).toEqual(['listagem__filtros-principais', 'listagem__barra'])
  })

  it('[COMPONENTE] sem filtros principais não renderiza a faixa', async () => {
    simularMatchMedia(false)
    const wrapper = montar()
    await nextTick()

    expect(wrapper.find('.listagem__filtros-principais').exists()).toBe(false)
  })
})
