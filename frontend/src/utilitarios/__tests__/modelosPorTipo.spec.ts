import { describe, expect, it } from 'vitest'

import type { TipoEvento } from '@/tipos/eventos'
import { agruparModelosPorTipo, coberturaPorTipo, modelosDoTipo, situacaoComumCobertura } from '@/utilitarios/modelosPorTipo'

interface Modelo {
  id: string
  tipoEvento: TipoEvento | null
  sugerido: boolean
}

const TIPO_DESCONHECIDO = 'Formatura' as unknown as TipoEvento

function modelo(id: string, tipoEvento: TipoEvento | null, sugerido = false): Modelo {
  return { id, tipoEvento, sugerido }
}

describe('agruparModelosPorTipo', () => {
  it('[UNITÁRIO] ordena os grupos pelos tipos, depois qualquer tipo, depois outros', () => {
    const lista = [
      modelo('proprio', null),
      modelo('formatura', TIPO_DESCONHECIDO, true),
      modelo('aniversario', 'Aniversario', true),
      modelo('casamento', 'Casamento', true),
      modelo('quinze', 'QuinzeAnos', true),
      modelo('comemoracao', 'Comemoracao', true),
    ]

    const grupos = agruparModelosPorTipo(lista)

    expect(grupos.map((grupo) => grupo.chave)).toEqual(['Casamento', 'QuinzeAnos', 'Aniversario', 'Comemoracao', 'qualquer', 'outros'])
    expect(grupos.map((grupo) => grupo.tipo)).toEqual(['Casamento', 'QuinzeAnos', 'Aniversario', 'Comemoracao', null, null])
    expect(grupos[grupos.length - 1]!.modelos.map((item) => item.id)).toEqual(['formatura'])
  })

  it('[UNITÁRIO] omite grupos vazios e preserva a ordem da API dentro do grupo', () => {
    const lista = [modelo('b', null), modelo('casamento', 'Casamento', true), modelo('a', null)]

    const grupos = agruparModelosPorTipo(lista)

    expect(grupos.map((grupo) => grupo.chave)).toEqual(['Casamento', 'qualquer'])
    expect(grupos[1]!.modelos.map((item) => item.id)).toEqual(['b', 'a'])
    expect(agruparModelosPorTipo([])).toEqual([])
  })
})

describe('coberturaPorTipo', () => {
  it('[UNITÁRIO] conta para cada tipo o mesmo que o painel de aplicação oferece', () => {
    const lista = [
      modelo('casamento', 'Casamento', true),
      modelo('quinze-proprio', 'QuinzeAnos', false),
      modelo('formatura', TIPO_DESCONHECIDO, true),
      modelo('p1', null),
      modelo('p2', null),
    ]

    const cobertura = coberturaPorTipo(lista)

    expect(cobertura).toEqual([
      { tipo: 'Casamento', disponiveis: 3, especificos: 1, temSugerido: true },
      { tipo: 'QuinzeAnos', disponiveis: 3, especificos: 1, temSugerido: false },
      { tipo: 'Aniversario', disponiveis: 2, especificos: 0, temSugerido: false },
      { tipo: 'Comemoracao', disponiveis: 2, especificos: 0, temSugerido: false },
    ])
    for (const item of cobertura) {
      expect(item.disponiveis).toBe(modelosDoTipo(lista, item.tipo).length)
    }
  })

  it('[UNITÁRIO] sem modelos todos os tipos ficam zerados', () => {
    expect(coberturaPorTipo([]).every((item) => item.disponiveis === 0 && !item.temSugerido)).toBe(true)
  })
})

describe('situacaoComumCobertura', () => {
  it('[UNITÁRIO] devolve a situação quando todos os tipos coincidem e nulo quando algum difere', () => {
    const iguais = coberturaPorTipo([modelo('c', 'Casamento', true), modelo('q', 'QuinzeAnos', true), modelo('a', 'Aniversario', true), modelo('m', 'Comemoracao', true), modelo('p', null)])
    expect(situacaoComumCobertura(iguais)).toEqual({ tipo: 'Casamento', disponiveis: 2, especificos: 1, temSugerido: true })

    const diferentes = coberturaPorTipo([modelo('c', 'Casamento', true), modelo('p', null)])
    expect(situacaoComumCobertura(diferentes)).toBeNull()

    const soQualquer = coberturaPorTipo([modelo('p', null), modelo('f', TIPO_DESCONHECIDO)])
    expect(situacaoComumCobertura(soQualquer)).toMatchObject({ disponiveis: 1, especificos: 0, temSugerido: false })
    expect(situacaoComumCobertura([])).toBeNull()
  })
})
