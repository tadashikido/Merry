import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import CabecalhoDocumentoEvento from '../CabecalhoDocumentoEvento.vue'
import type { CabecalhoFichaEvento } from '@/utilitarios/fichaBuffet'

const global = { plugins: [PrimeVue] }

const CABECALHO: CabecalhoFichaEvento = {
  tipo: 'Casamento',
  tipoRotulo: 'Casamento',
  detalhes: [
    { chave: 'data', rotulo: 'Data', valor: 'sábado, 12 de dezembro de 2026' },
    { chave: 'horario', rotulo: 'Horário da cerimônia', valor: '16:30' },
    { chave: 'localPrincipal', rotulo: 'Cerimônia', valor: 'Capela São José' },
  ],
}

function montar(props: Partial<InstanceType<typeof CabecalhoDocumentoEvento>['$props']> = {}) {
  return mount(CabecalhoDocumentoEvento, {
    global,
    props: {
      documento: 'Mapa de mesas',
      gerado: 'Gerado em 02/11/2026 às 10:05',
      nomes: 'Ana & Bruno',
      cabecalho: CABECALHO,
      rotuloDetalhes: 'Dados do evento',
      prefixoTeste: 'mapa',
      ...props,
    },
  })
}

function estilo(): string {
  const fonte = readFileSync(resolve(__dirname, '../CabecalhoDocumentoEvento.vue'), 'utf-8').replace(/\r\n/g, '\n')
  return fonte.slice(fonte.indexOf('<style scoped>'))
}

describe('CabecalhoDocumentoEvento', () => {
  it('[COMPONENTE] identifica documento, geração, tipo, anfitriões e detalhes rotulados com o prefixo de teste', () => {
    const wrapper = montar()

    expect(wrapper.element.tagName).toBe('HEADER')
    expect(wrapper.get('.cabecalho-documento__nome').text()).toBe('Mapa de mesas')
    expect(wrapper.get('.cabecalho-documento__gerado').text()).toBe('Gerado em 02/11/2026 às 10:05')
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.get('h1').text()).toBe('Ana & Bruno')
    const tipo = wrapper.get('[data-teste="mapa-tipo"]')
    expect(tipo.classes()).toContain('etiqueta-tipo')
    expect(tipo.text()).toBe('Casamento')
    const detalhes = wrapper.get('[data-teste="mapa-detalhes"]')
    expect(detalhes.element.tagName).toBe('DL')
    expect(detalhes.attributes('aria-label')).toBe('Dados do evento')
    expect(detalhes.findAll('.cabecalho-documento__detalhe')).toHaveLength(3)
    expect(detalhes.get('[data-teste="mapa-detalhe-horario"] dt').text()).toBe('Horário da cerimônia')
    expect(detalhes.get('[data-teste="mapa-detalhe-horario"] dd').text()).toBe('16:30')
  })

  it('[COMPONENTE] tipo desconhecido não mostra etiqueta e cabeçalho nulo não mostra detalhes', () => {
    const semTipo = montar({ cabecalho: { tipo: null, tipoRotulo: null, detalhes: CABECALHO.detalhes } })
    expect(semTipo.find('[data-teste="mapa-tipo"]').exists()).toBe(false)
    expect(semTipo.find('[data-teste="mapa-detalhes"]').exists()).toBe(true)

    const nulo = montar({ cabecalho: null, prefixoTeste: 'ficha' })
    expect(nulo.find('[data-teste="ficha-tipo"]').exists()).toBe(false)
    expect(nulo.find('dl').exists()).toBe(false)
    expect(nulo.get('h1').text()).toBe('Ana & Bruno')
  })

  it('[SEGURANÇA] aviso de manuseio aparece como nota no cabeçalho e conteúdo é texto, nunca HTML', () => {
    const wrapper = montar({ aviso: 'Contém informação de saúde: compartilhe só com a equipe do buffet.', nomes: '<img src=x onerror=alert(1)>' })

    const aviso = wrapper.get('[data-teste="mapa-aviso"]')
    expect(aviso.attributes('role')).toBe('note')
    expect(aviso.text()).toBe('Contém informação de saúde: compartilhe só com a equipe do buffet.')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('h1').text()).toBe('<img src=x onerror=alert(1)>')
    expect(montar().find('[data-teste="mapa-aviso"]').exists()).toBe(false)
  })

  it('[COMPONENTE] "Gerado em" com algarismos alinhados e pares rótulo/valor fora de flex', () => {
    const css = estilo()

    expect(css).toMatch(/\.cabecalho-documento__gerado \{[^}]*font-variant-numeric: lining-nums tabular-nums/)
    expect(css).toMatch(/\.cabecalho-documento__detalhe \{[^}]*display: block/)
    expect(css).not.toMatch(/\.cabecalho-documento__detalhe \{[^}]*display: (flex|grid)/)
    expect(css).toMatch(/\.cabecalho-documento__detalhe dt \{[^}]*--p-fonte-tamanho-rotulo[^}]*text-transform: uppercase/)
  })

  it('[COMPONENTE] DS v2: @container próprio, impressão monocromática e sem valores soltos', () => {
    const css = estilo()
    const impressao = css.slice(css.indexOf('@media print'))

    expect(css).toContain('container: cabecalho-documento / inline-size')
    expect(css).toContain('@container cabecalho-documento (min-width: 36rem)')
    expect(css.match(/@media [^{]+/g)?.map((regra) => regra.trim())).toEqual(['@media print'])
    expect(impressao).toMatch(/\.cabecalho-documento \{\s*break-inside: avoid/)
    expect(impressao).toMatch(/\.cabecalho-documento__tipo \{\s*color: var\(--p-cor-texto\);\s*background: none;\s*border: 1px solid var\(--p-cor-texto\);/)
    expect(impressao).toMatch(/\.cabecalho-documento__gerado,[\s\S]*?color: var\(--p-cor-texto\)/)
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i)
    expect(css.replace(/1px (solid|dotted)/g, '')).not.toMatch(/\d+(px|mm|pt)\b/)
    expect(css).not.toContain('--p-espaco-')
  })
})
