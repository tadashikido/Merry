import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ComoAplicarModelo from '@/componentes/modelos/ComoAplicarModelo.vue'

const PASSOS = ['Abra uma festa de 15 anos e entre em Checklist.', 'Toque em Aplicar checklist.', 'Cada item vira uma tarefa.']

describe('ComoAplicarModelo', () => {
  it('[COMPONENTE] seção rotulada pelo título com os passos em lista ordenada e a nota', () => {
    const wrapper = mount(ComoAplicarModelo, { props: { titulo: 'Como aplicar num evento', passos: PASSOS, nota: 'Itens já aplicados não se repetem.' } })

    const secao = wrapper.get('section[data-teste="como-aplicar-modelo"]')
    const titulo = wrapper.get('h2')
    expect(titulo.text()).toBe('Como aplicar num evento')
    expect(secao.attributes('aria-labelledby')).toBe(titulo.attributes('id'))
    const passos = wrapper.findAll('ol > li[data-teste="passo-aplicar-modelo"]')
    expect(passos.map((passo) => passo.get('.como-aplicar__texto').text())).toEqual(PASSOS)
    expect(passos[0]!.get('.como-aplicar__numero').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('[data-teste="nota-aplicar-modelo"]').text()).toBe('Itens já aplicados não se repetem.')
  })

  it('[COMPONENTE] sem nota não renderiza o parágrafo', () => {
    const wrapper = mount(ComoAplicarModelo, { props: { titulo: 'Como aplicar', passos: PASSOS } })

    expect(wrapper.find('[data-teste="nota-aplicar-modelo"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilo usa contêiner próprio, ritmo e nenhum @media', () => {
    const fonte = readFileSync(resolve(__dirname, '../ComoAplicarModelo.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).toContain('container: como-aplicar / inline-size')
    expect(estilo).toContain('@container como-aplicar (min-width: 40rem)')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('--p-espaco-')
  })
})
