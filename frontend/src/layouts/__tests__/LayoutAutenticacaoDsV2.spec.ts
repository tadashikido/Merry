import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, object]] }
const fonteLayout = readFileSync(resolve(__dirname, '../LayoutAutenticacao.vue'), 'utf-8')
const estiloLayout = fonteLayout.slice(fonteLayout.indexOf('<style'))

function regra(seletor: string, css = estiloLayout) {
  const inicio = css.indexOf(`${seletor} {`)
  expect(inicio, `regra ${seletor}`).toBeGreaterThanOrEqual(0)
  return css.slice(inicio, css.indexOf('}', inicio))
}

describe('LayoutAutenticacao no design system v2', () => {
  it('[COMPONENTE] a faixa de marca do celular usa o logotipo para fundo escuro', () => {
    const wrapper = mount(LayoutAutenticacao, { props: { titulo: 'Entrar' }, global })

    const marca = wrapper.get('header .layout-autenticacao__marca')
    expect(marca.classes()).toContain('marca--fundo-escuro')
    expect(marca.find('.marca__nome').exists()).toBe(true)
  })

  it('[UNITÁRIO] a faixa de marca é meia-noite em qualquer largura, sem depender do contêiner largo', () => {
    const base = regra('.layout-autenticacao__editorial')
    expect(base).toContain('background: var(--p-cor-rail)')
    expect(base).toContain('color: var(--p-cor-lateral-escura-texto)')
    expect(base).not.toContain('border-bottom')
  })

  it('[COMPONENTE] o apoio do título usa o estilo editorial do DS: Fraunces itálico na cor de apoio', () => {
    const wrapper = mount(LayoutAutenticacao, {
      props: { titulo: 'Entrar', descricao: 'Use o e-mail e a senha da sua conta.' },
      global,
    })

    expect(wrapper.get('.layout-autenticacao__descricao').text()).toBe('Use o e-mail e a senha da sua conta.')
    const descricao = regra('.layout-autenticacao__descricao')
    expect(descricao).toContain('font-family: var(--p-fonte-serif)')
    expect(descricao).toContain('font-style: italic')
    expect(descricao).toContain('font-size: var(--p-fonte-tamanho-apoio-editorial)')
    expect(descricao).toContain('color: var(--p-cor-texto-apoio)')
  })

  it('[UNITÁRIO] o título sobe para o tamanho de página (44) só por contêiner', () => {
    expect(estiloLayout).toMatch(/@container aplicacao \(min-width: 40rem\)[\s\S]*font-size: var\(--p-fonte-tamanho-pagina\)/)
  })

  it('[UNITÁRIO] a casca não usa hex solto nem @media de largura', () => {
    expect(estiloLayout).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(estiloLayout).not.toMatch(/@media[^{]*width/)
  })

  it('[COMPONENTE] marca em destaque e lema ficam juntos no painel interno do cabeçalho escuro', () => {
    const wrapper = mount(LayoutAutenticacao, { props: { titulo: 'Crie a conta da sua assessoria' }, global })

    const painel = wrapper.get('header .layout-autenticacao__painel')
    expect(painel.find('.layout-autenticacao__logo').exists()).toBe(true)
    expect(painel.find('[data-teste="tipos-atendidos"]').exists()).toBe(true)
    expect(wrapper.get('header').element.firstElementChild?.classList).toContain('layout-autenticacao__marca')
  })

  it('[UNITÁRIO] no contêiner largo o fundo escuro acompanha a altura da página e só o painel interno fica fixo', () => {
    const largo = estiloLayout.slice(estiloLayout.indexOf('@container aplicacao (min-width: 64rem)'))
    const cabecalho = regra('.layout-autenticacao__editorial', largo)
    expect(cabecalho).toContain('min-height: 100vh')
    expect(cabecalho).not.toContain('position: sticky')
    expect(cabecalho).not.toMatch(/(^|\s)height: 100vh/)

    const painel = regra('.layout-autenticacao__painel', largo)
    expect(painel).toContain('position: sticky')
    expect(painel).toContain('top: 0')
    expect(painel).toContain('height: 100vh')
  })
})
