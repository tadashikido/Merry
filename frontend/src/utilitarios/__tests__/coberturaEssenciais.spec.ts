import { describe, expect, it } from 'vitest'

import { vinculoExemplo } from '@/__tests__/auxiliaresFornecedoresEvento'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { CATEGORIAS_FORNECEDOR, type CategoriaFornecedor } from '@/tipos/fornecedores'
import { TIPOS_EVENTO } from '@/tipos/eventos'
import type { FornecedorEventoDto, StatusFornecedorEvento } from '@/tipos/fornecedoresEvento'
import { coberturaEssenciais } from '@/utilitarios/fornecedoresEvento'

function vinculo(categoria: CategoriaFornecedor, status: StatusFornecedorEvento, id = `${categoria}-${status}`): FornecedorEventoDto {
  return vinculoExemplo({ id, status, fornecedor: { ...vinculoExemplo().fornecedor, id: `f-${id}`, categoria } })
}

describe('coberturaEssenciais', () => {
  it('[UNITÁRIO] cada tipo de evento tem essenciais válidas, sem repetição', () => {
    for (const tipo of TIPOS_EVENTO) {
      const essenciais = VOCABULARIO_TIPO_EVENTO[tipo].fornecedoresEssenciais
      expect(essenciais.length).toBeGreaterThan(0)
      expect(new Set(essenciais).size).toBe(essenciais.length)
      expect(essenciais.every((categoria) => CATEGORIAS_FORNECEDOR.includes(categoria))).toBe(true)
      expect(essenciais).not.toContain('Outros')
    }
    expect(VOCABULARIO_TIPO_EVENTO.Casamento.fornecedoresEssenciais).toContain('ConvitesPapelaria')
    expect(VOCABULARIO_TIPO_EVENTO.QuinzeAnos.fornecedoresEssenciais).toContain('IluminacaoSom')
    expect(VOCABULARIO_TIPO_EVENTO.Aniversario.fornecedoresEssenciais).toHaveLength(6)
    expect(VOCABULARIO_TIPO_EVENTO.Comemoracao.fornecedoresEssenciais).toHaveLength(4)
  })

  it('[UNITÁRIO] situação usa o status mais avançado e ignora vínculos cancelados', () => {
    const cobertura = coberturaEssenciais(
      [
        vinculo('Buffet', 'Cotacao'),
        vinculo('Buffet', 'Contratado'),
        vinculo('Fotografia', 'Cotacao'),
        vinculo('Fotografia', 'EmNegociacao'),
        vinculo('Decoracao', 'Cancelado'),
        vinculo('Transporte', 'Cotacao'),
      ],
      ['EspacoLocal', 'Buffet', 'Fotografia', 'Decoracao'],
    )

    expect(cobertura.itens).toEqual([
      { categoria: 'EspacoLocal', situacao: 'SemFornecedor' },
      { categoria: 'Decoracao', situacao: 'SemFornecedor' },
      { categoria: 'Fotografia', situacao: 'EmNegociacao' },
      { categoria: 'Buffet', situacao: 'Contratado' },
    ])
    expect(cobertura.contratadas).toBe(1)
    expect(cobertura.total).toBe(4)
    expect(cobertura.emCotacao).toBe(3)
    expect(cobertura.emNegociacao).toBe(1)
  })

  it('[UNITÁRIO] sem vínculos todas ficam sem fornecedor na ordem do vocabulário', () => {
    const essenciais = VOCABULARIO_TIPO_EVENTO.Aniversario.fornecedoresEssenciais
    const cobertura = coberturaEssenciais([], essenciais)

    expect(cobertura.itens.map((item) => item.categoria)).toEqual([...essenciais])
    expect(cobertura.itens.every((item) => item.situacao === 'SemFornecedor')).toBe(true)
    expect(cobertura.contratadas).toBe(0)
    expect(cobertura.emCotacao + cobertura.emNegociacao).toBe(0)
  })

  it('[UNITÁRIO] ordena por situação e mantém a ordem do vocabulário dentro de cada grupo; ignora essenciais repetidas', () => {
    const cobertura = coberturaEssenciais(
      [vinculo('Decoracao', 'Cotacao'), vinculo('EspacoLocal', 'Cotacao'), vinculo('Fotografia', 'Contratado')],
      ['EspacoLocal', 'Buffet', 'Decoracao', 'Fotografia', 'Buffet'],
    )

    expect(cobertura.total).toBe(4)
    expect(cobertura.itens.map((item) => item.categoria)).toEqual(['Buffet', 'EspacoLocal', 'Decoracao', 'Fotografia'])
  })
})
