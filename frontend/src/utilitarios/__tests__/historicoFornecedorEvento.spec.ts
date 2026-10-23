import { describe, expect, it } from 'vitest'

import { vinculoExemplo } from '@/__tests__/auxiliaresFornecedoresEvento'
import type { CategoriaFornecedor } from '@/tipos/fornecedores'
import type { FornecedorEventoDto, ParticipacaoFornecedorDto, StatusFornecedorEvento } from '@/tipos/fornecedoresEvento'
import { resumirParticipacoes, situacaoEssencialDaCategoria } from '@/utilitarios/fornecedoresEvento'

function vinculo(categoria: CategoriaFornecedor, status: StatusFornecedorEvento): FornecedorEventoDto {
  const id = `${categoria}-${status}`
  return vinculoExemplo({ id, status, fornecedor: { ...vinculoExemplo().fornecedor, id: `f-${id}`, categoria } })
}

function participacao(eventoId: string, status: StatusFornecedorEvento): ParticipacaoFornecedorDto {
  return { eventoId, nomePrimeiraPessoa: eventoId, nomeSegundaPessoa: null, dataEvento: '2026-01-01', eventoArquivado: false, status }
}

describe('situacaoEssencialDaCategoria', () => {
  const essenciais: CategoriaFornecedor[] = ['Buffet', 'Decoracao', 'Fotografia']

  it('[UNITÁRIO] devolve nulo para categoria que não é essencial do tipo', () => {
    expect(situacaoEssencialDaCategoria([vinculo('Transporte', 'Contratado')], essenciais, 'Transporte')).toBeNull()
  })

  it('[UNITÁRIO] usa a melhor situação da categoria e ignora cancelados', () => {
    const vinculos = [vinculo('Buffet', 'Cotacao'), vinculo('Buffet', 'Contratado'), vinculo('Decoracao', 'Cancelado'), vinculo('Fotografia', 'EmNegociacao')]
    expect(situacaoEssencialDaCategoria(vinculos, essenciais, 'Buffet')).toBe('Contratado')
    expect(situacaoEssencialDaCategoria(vinculos, essenciais, 'Decoracao')).toBe('SemFornecedor')
    expect(situacaoEssencialDaCategoria(vinculos, essenciais, 'Fotografia')).toBe('EmNegociacao')
  })
})

describe('resumirParticipacoes', () => {
  it('[UNITÁRIO] exclui o evento atual, conta contratados e limita os recentes mantendo a ordem', () => {
    const lista = [
      participacao('a', 'Contratado'),
      participacao('atual', 'Cotacao'),
      participacao('b', 'Cancelado'),
      participacao('c', 'Contratado'),
      participacao('d', 'Cotacao'),
      participacao('e', 'Contratado'),
    ]
    const resumo = resumirParticipacoes(lista, 'atual')
    expect(resumo.total).toBe(5)
    expect(resumo.contratados).toBe(3)
    expect(resumo.recentes.map((item) => item.eventoId)).toEqual(['a', 'b', 'c', 'd'])
    expect(resumo.restantes).toBe(1)
  })

  it('[UNITÁRIO] lista vazia ou só com o evento atual resulta em zero', () => {
    expect(resumirParticipacoes([], 'x')).toEqual({ total: 0, contratados: 0, recentes: [], restantes: 0 })
    expect(resumirParticipacoes([participacao('x', 'Contratado')], 'x').total).toBe(0)
  })

  it('[UNITÁRIO] respeita limite informado', () => {
    const resumo = resumirParticipacoes([participacao('a', 'Cotacao'), participacao('b', 'Cotacao')], 'z', 1)
    expect(resumo.recentes).toHaveLength(1)
    expect(resumo.restantes).toBe(1)
  })
})
