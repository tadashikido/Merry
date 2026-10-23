import { describe, expect, it } from 'vitest'

import type { ItemModeloChecklistDto } from '@/tipos/checklist'
import { aproximarDias, descreverPrazoAproximado, posicaoItemNoModelo } from '@/utilitarios/prazoModelo'

function item(id: string, diasAntesDoEvento: number): ItemModeloChecklistDto {
  return { id, titulo: `Item ${id}`, descricao: null, responsavel: 'Assessoria', categoria: 'Geral', diasAntesDoEvento }
}

describe('prazoModelo', () => {
  it.each([
    [1, { unidade: 'dia', quantidade: 1, exato: true }],
    [13, { unidade: 'dia', quantidade: 13, exato: true }],
    [14, { unidade: 'semana', quantidade: 2, exato: true }],
    [20, { unidade: 'semana', quantidade: 3, exato: false }],
    [60, { unidade: 'mes', quantidade: 2, exato: false }],
    [180, { unidade: 'mes', quantidade: 6, exato: false }],
    [365, { unidade: 'ano', quantidade: 1, meses: 0, exato: false }],
    [550, { unidade: 'ano', quantidade: 1, meses: 6, exato: false }],
  ] as const)('[UNITÁRIO] aproxima %i dias', (dias, esperado) => {
    expect(aproximarDias(dias)).toMatchObject(esperado)
    expect(aproximarDias(-dias)).toMatchObject(esperado)
  })

  it.each([
    [180, 'da festa de 15 anos', 'Cerca de 6 meses antes da festa de 15 anos'],
    [3, 'do aniversário', '3 dias antes do aniversário'],
    [1, 'do casamento', '1 dia antes do casamento'],
    [21, 'da comemoração', '3 semanas antes da comemoração'],
    [400, 'do casamento', 'Cerca de 1 ano e 1 mês antes do casamento'],
    [730, 'do evento', 'Cerca de 2 anos antes do evento'],
    [-15, 'do evento', 'Cerca de 2 semanas depois do evento'],
    [0, 'da festa de 15 anos', 'No dia da festa de 15 anos'],
  ] as const)('[UNITÁRIO] descreve %i dias %s', (dias, contracao, esperado) => {
    expect(descreverPrazoAproximado(dias, contracao)).toBe(esperado)
  })

  it('[UNITÁRIO] posição conta o item no marco, exclui o item em edição e ordena vizinhos', () => {
    const itens = [item('a', 400), item('b', 200), item('c', 190), item('d', 185), item('e', 181), item('f', 250), item('editado', 180), item('g', 30)]
    const posicao = posicaoItemNoModelo(itens, 184, 'editado')

    expect(posicao.marco).toBe('seisMeses')
    expect(posicao.marcos).toEqual([
      { marco: 'dozeMeses', quantidade: 1, atual: false },
      { marco: 'seisMeses', quantidade: 6, atual: true },
      { marco: 'trintaDias', quantidade: 1, atual: false },
    ])
    expect(posicao.vizinhos.map((vizinho) => vizinho.id)).toEqual(['b', 'c', 'd', 'e'])
    expect(posicao.maisNoMarco).toBe(1)
    expect(posicao.outrosItens).toBe(7)
    expect(posicao.ampliaPrimeiro).toBe(false)
    expect(posicao.ampliaUltimo).toBe(false)
  })

  it('[UNITÁRIO] posição sem dias mostra só os marcos do modelo', () => {
    const posicao = posicaoItemNoModelo([item('a', 30), item('b', 0)], null)

    expect(posicao.marco).toBeNull()
    expect(posicao.marcos.map((marco) => marco.marco)).toEqual(['trintaDias', 'noDia'])
    expect(posicao.marcos.every((marco) => !marco.atual)).toBe(true)
    expect(posicao.vizinhos).toEqual([])
  })

  it('[UNITÁRIO] indica quando o item amplia o primeiro ou o último prazo', () => {
    const itens = [item('a', 90), item('b', 10)]

    expect(posicaoItemNoModelo(itens, 500).ampliaPrimeiro).toBe(true)
    expect(posicaoItemNoModelo(itens, -5).ampliaUltimo).toBe(true)
    expect(posicaoItemNoModelo([], 30)).toMatchObject({ outrosItens: 0, ampliaPrimeiro: false, alcance: null })
  })
})
