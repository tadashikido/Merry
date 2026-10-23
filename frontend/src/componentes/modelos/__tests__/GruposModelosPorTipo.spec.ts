import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import GruposModelosPorTipo from '@/componentes/modelos/GruposModelosPorTipo.vue'
import { TEXTOS_MODELOS_POR_TIPO } from '@/textos/modelos'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'

interface Modelo {
  id: string
  nome: string
  tipoEvento: TipoEvento | null
}

const TIPO_DESCONHECIDO = 'Formatura' as unknown as TipoEvento

const TITULOS: Record<TipoEvento, string> = {
  Casamento: 'Casamentos',
  QuinzeAnos: 'Festas de 15 anos',
  Aniversario: 'Aniversários',
  Comemoracao: 'Comemorações',
}

const NOTAS: Record<TipoEvento, string> = {
  Casamento: 'Na lista ao aplicar o checklist de cada casamento.',
  QuinzeAnos: 'Na lista ao aplicar o checklist de cada festa de 15 anos.',
  Aniversario: 'Na lista ao aplicar o checklist de cada aniversário.',
  Comemoracao: 'Na lista ao aplicar o checklist de cada comemoração.',
}

function montar(modelos: Modelo[], recurso = 'checklist') {
  return mount(GruposModelosPorTipo, {
    props: { modelos, recurso, testeItem: 'modelo-teste' },
    slots: { modelo: '<template #modelo="{ modelo }"><span class="nome">{{ modelo.nome }}</span></template>' },
  })
}

describe('GruposModelosPorTipo', () => {
  it('[COMPONENTE] um grupo por tipo com título, quantidade e onde aparece, para os 4 tipos', () => {
    const wrapper = montar(TIPOS_EVENTO.map((tipo) => ({ id: tipo, nome: `Modelo ${tipo}`, tipoEvento: tipo })))

    const grupos = wrapper.findAll('[data-teste="grupo-modelos"]')
    expect(grupos).toHaveLength(4)
    TIPOS_EVENTO.forEach((tipo, indice) => {
      const grupo = grupos[indice]!
      expect(grupo.attributes('data-grupo')).toBe(tipo)
      expect(grupo.get('h2').text()).toBe(TITULOS[tipo])
      expect(grupo.get('[data-teste="grupo-modelos-quantidade"]').text()).toBe('1 modelo')
      expect(grupo.get('[data-teste="grupo-modelos-nota"]').text()).toBe(NOTAS[tipo])
      expect(grupo.attributes('aria-labelledby')).toBe(grupo.get('h2').attributes('id'))
      expect(grupo.get('[data-teste="modelo-teste"]').text()).toBe(`Modelo ${tipo}`)
      expect(grupo.classes()).not.toContain('grupos-modelos__grupo--varios')
    })
    expect(wrapper.text()).not.toMatch(/casal|noiv/i)
  })

  it('[COMPONENTE] modelos sem tipo e de tipo desconhecido têm grupos próprios, sem cair em casamento', () => {
    const wrapper = montar([
      { id: 'p1', nome: 'Evento no campo', tipoEvento: null },
      { id: 'p2', nome: 'Restaurante', tipoEvento: null },
      { id: 'f1', nome: 'Formatura', tipoEvento: TIPO_DESCONHECIDO },
    ])

    const grupos = wrapper.findAll('[data-teste="grupo-modelos"]')
    expect(grupos.map((grupo) => grupo.attributes('data-grupo'))).toEqual(['qualquer', 'outros'])
    expect(grupos[0]!.get('h2').text()).toBe(TEXTOS_MODELOS_POR_TIPO.grupoQualquerTitulo)
    expect(grupos[0]!.get('[data-teste="grupo-modelos-quantidade"]').text()).toBe('2 modelos')
    expect(grupos[0]!.get('[data-teste="grupo-modelos-nota"]').text()).toBe('Na lista ao aplicar o checklist de qualquer evento.')
    expect(grupos[0]!.classes()).toContain('grupos-modelos__grupo--varios')
    expect(grupos[1]!.get('h2').text()).toBe(TEXTOS_MODELOS_POR_TIPO.grupoOutrosTitulo)
    expect(grupos[1]!.get('[data-teste="grupo-modelos-nota"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.notaOutros)
    expect(wrapper.text()).not.toMatch(/casamento/i)
  })

  it('[COMPONENTE] o recurso entra na frase do grupo (reaproveitável no cronograma)', () => {
    const wrapper = montar([{ id: 'q', nome: 'Roteiro', tipoEvento: 'QuinzeAnos' }], 'cronograma')

    expect(wrapper.get('[data-teste="grupo-modelos-nota"]').text()).toBe('Na lista ao aplicar o cronograma de cada festa de 15 anos.')
  })

  it('[UNITÁRIO] estilo só por @container, sem @media nem espaçamento solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../GruposModelosPorTipo.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).toContain('container: grupos-modelos / inline-size')
    expect(estilo).toContain('@container grupos-modelos (min-width: 46rem)')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('--p-espaco-')
  })
})
