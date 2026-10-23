import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import OrientacaoFormularioModelo from '@/componentes/modelos/OrientacaoFormularioModelo.vue'
import { TEXTOS_MODELOS_POR_TIPO } from '@/textos/modelos'
import type { TipoEvento } from '@/tipos/eventos'

const DICAS = ['Na descrição, conte quando usar.', 'Os itens entram no detalhe.']
const TIPO_DESCONHECIDO = 'Formatura' as unknown as TipoEvento

function montar(props: Partial<InstanceType<typeof OrientacaoFormularioModelo>['$props']> = {}) {
  return mount(OrientacaoFormularioModelo, {
    props: { recurso: 'checklist', rotuloSugerido: 'Sugerido', dicas: DICAS, ...props },
  })
}

describe('OrientacaoFormularioModelo', () => {
  it('[COMPONENTE] criação mostra modelo da assessoria para qualquer evento, sem contagem', () => {
    const wrapper = montar({ contagem: '3 itens' })

    expect(wrapper.get('[data-teste="selo-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.origemAssessoria)
    expect(wrapper.get('[data-teste="onde-aparece-modelo"]').text()).toBe('Na lista ao aplicar o checklist de qualquer evento.')
    expect(wrapper.get('[data-teste="nota-onde-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.novoParaQualquerTipo)
    expect(wrapper.find('[data-teste="contagem-modelo"]').exists()).toBe(false)
  })

  it('[COMPONENTE] seções rotuladas por h2 próprios, exemplos dos 4 tipos e dicas', () => {
    const wrapper = montar()

    for (const teste of ['onde-modelo', 'bom-modelo']) {
      const secao = wrapper.get(`section[data-teste="${teste}"]`)
      expect(secao.attributes('aria-labelledby')).toBe(secao.get('h2').attributes('id'))
    }
    const exemplos = wrapper.findAll('[data-teste="exemplos-nome-modelo"] > div')
    expect(exemplos.map((exemplo) => [exemplo.get('dt').text(), exemplo.get('dd').text()])).toEqual([
      ['Casamento', 'Casamento no campo'],
      ['15 anos', '15 anos com baile'],
      ['Aniversário', 'Aniversário infantil'],
      ['Comemoração', 'Bodas de prata'],
    ])
    expect(wrapper.findAll('[data-teste="dicas-modelo"] li').map((li) => li.text())).toEqual(DICAS)
    expect(wrapper.find('a, button').exists()).toBe(false)
  })

  it.each([
    ['Casamento', 'Sugerido para casamento', 'Na lista ao aplicar o checklist de cada casamento.'],
    ['QuinzeAnos', 'Sugerido para festa de 15 anos', 'Na lista ao aplicar o checklist de cada festa de 15 anos.'],
    ['Aniversario', 'Sugerido para aniversário', 'Na lista ao aplicar o checklist de cada aniversário.'],
    ['Comemoracao', 'Sugerido para comemoração', 'Na lista ao aplicar o checklist de cada comemoração.'],
  ] as const)('[COMPONENTE] edição de sugerido %s mostra selo, onde aparece e contagem do tipo', (tipo, selo, onde) => {
    const wrapper = montar({ edicao: true, tipo, sugerido: true, contagem: '12 itens' })

    expect(wrapper.get('[data-teste="selo-modelo"]').text()).toBe(selo)
    expect(wrapper.get('[data-teste="onde-aparece-modelo"]').text()).toBe(onde)
    expect(wrapper.get('[data-teste="contagem-modelo"]').text()).toBe('12 itens')
    expect(wrapper.get('[data-teste="nota-onde-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.edicaoNaoMudaAplicados('checklist'))
  })

  it('[COMPONENTE] edição de modelo próprio (tipo nulo) fala de qualquer evento, sem casamento nem comemoração', () => {
    const wrapper = montar({ edicao: true, tipo: null, sugerido: false, contagem: '1 item' })

    expect(wrapper.get('[data-teste="selo-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.origemAssessoria)
    expect(wrapper.get('[data-teste="onde-modelo"]').text()).not.toMatch(/casamento|comemoração/i)
    expect(wrapper.get('[data-teste="onde-aparece-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.notaQualquer('checklist'))
  })

  it('[COMPONENTE] edição de tipo desconhecido usa selo padrão e nota de tipo não reconhecido', () => {
    const wrapper = montar({ edicao: true, tipo: TIPO_DESCONHECIDO, sugerido: true, contagem: '2 itens' })

    expect(wrapper.get('[data-teste="selo-modelo"]').text()).toBe('Sugerido')
    expect(wrapper.get('[data-teste="onde-aparece-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.notaOutros)
    expect(wrapper.get('[data-teste="onde-modelo"]').text()).not.toMatch(/casamento|comemoração/i)
  })

  it('[UNITÁRIO] estilo usa contêiner próprio, sem @media nem espaçamento solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../OrientacaoFormularioModelo.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).toContain('container: orientacao-modelo / inline-size')
    expect(estilo).toContain('@container orientacao-modelo (min-width: 36rem)')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('--p-espaco-')
    expect(estilo).not.toContain('sticky')
  })
})
