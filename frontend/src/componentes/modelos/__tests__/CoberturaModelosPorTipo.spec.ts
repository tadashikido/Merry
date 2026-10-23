import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CoberturaModelosPorTipo from '@/componentes/modelos/CoberturaModelosPorTipo.vue'
import { TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import { TEXTOS_MODELOS_POR_TIPO } from '@/textos/modelos'
import type { TipoEvento } from '@/tipos/eventos'

const TIPO_DESCONHECIDO = 'Formatura' as unknown as TipoEvento

function montar(modelos: { tipoEvento: TipoEvento | null; sugerido: boolean }[], reaproveitamento: readonly string[] = TEXTOS_MODELOS_CHECKLIST.reaproveitamento) {
  return mount(CoberturaModelosPorTipo, { props: { modelos, recurso: 'checklist', reaproveitamento } })
}

function linhas(wrapper: ReturnType<typeof montar>) {
  return wrapper.findAll('[data-teste="cobertura-tipo"]').map((linha) => ({
    tipo: linha.attributes('data-tipo'),
    rotulo: linha.get('dt').text(),
    quantidade: linha.get('[data-teste="cobertura-quantidade"]').text(),
    apoio: linha.get('[data-teste="cobertura-apoio"]').text(),
  }))
}

describe('CoberturaModelosPorTipo', () => {
  it('[COMPONENTE] os 4 tipos com quantidade disponível e apoio de cada situação', () => {
    const wrapper = montar([
      { tipoEvento: 'Casamento', sugerido: true },
      { tipoEvento: 'QuinzeAnos', sugerido: false },
      { tipoEvento: TIPO_DESCONHECIDO, sugerido: true },
      { tipoEvento: null, sugerido: false },
    ])

    expect(wrapper.get('h2').text()).toBe(TEXTOS_MODELOS_POR_TIPO.coberturaTitulo)
    expect(wrapper.text()).toContain('O que a equipe vê ao aplicar o checklist.')
    expect(linhas(wrapper)).toEqual([
      { tipo: 'Casamento', rotulo: 'Casamentos', quantidade: '2 modelos', apoio: 'Inclui o sugerido para casamento.' },
      { tipo: 'QuinzeAnos', rotulo: 'Festas de 15 anos', quantidade: '2 modelos', apoio: 'Inclui 1 só deste tipo.' },
      { tipo: 'Aniversario', rotulo: 'Aniversários', quantidade: '1 modelo', apoio: TEXTOS_MODELOS_POR_TIPO.soQualquer },
      { tipo: 'Comemoracao', rotulo: 'Comemorações', quantidade: '1 modelo', apoio: TEXTOS_MODELOS_POR_TIPO.soQualquer },
    ])
  })

  it('[COMPONENTE] sugeridos de cada tipo usam o termo do tipo', () => {
    const wrapper = montar([
      { tipoEvento: 'QuinzeAnos', sugerido: true },
      { tipoEvento: 'Aniversario', sugerido: true },
      { tipoEvento: 'Comemoracao', sugerido: true },
    ])

    const apoios = linhas(wrapper).map((linha) => linha.apoio)
    expect(apoios).toEqual([TEXTOS_MODELOS_POR_TIPO.nenhum, 'Inclui o sugerido para festa de 15 anos.', 'Inclui o sugerido para aniversário.', 'Inclui o sugerido para comemoração.'])
    expect(wrapper.find('[data-teste="cobertura-tipo"][data-tipo="Casamento"]').classes()).toContain('cobertura__tipo--sem-modelo')
  })

  it('[COMPONENTE] bloco de reaproveitamento com título e frases do recurso; some sem frases', () => {
    const wrapper = montar([{ tipoEvento: null, sugerido: false }])
    const bloco = wrapper.get('[data-teste="reaproveitamento-modelos"]')
    expect(bloco.get('h3').text()).toBe(TEXTOS_MODELOS_POR_TIPO.reaproveitamentoTitulo)
    expect(bloco.findAll('li').map((item) => item.text())).toEqual([...TEXTOS_MODELOS_CHECKLIST.reaproveitamento])
    expect(bloco.get('ul').attributes('aria-labelledby')).toBe(bloco.get('h3').attributes('id'))

    const semFrases = montar([{ tipoEvento: null, sugerido: false }], [])
    expect(semFrases.find('[data-teste="reaproveitamento-modelos"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilo só por @container, sem @media nem espaçamento solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../CoberturaModelosPorTipo.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).toContain('container: cobertura-modelos / inline-size')
    expect(estilo).toContain('@container cobertura-modelos (min-width: 36rem)')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('--p-espaco-')
  })
})
