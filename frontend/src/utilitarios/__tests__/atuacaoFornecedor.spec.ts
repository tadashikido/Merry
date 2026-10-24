import { describe, expect, it } from 'vitest'

import { TEXTOS_ATUACAO_FORNECEDOR } from '@/textos/fornecedores'
import type { TipoEvento } from '@/tipos/eventos'
import type { ParticipacaoFornecedorDto, StatusFornecedorEvento } from '@/tipos/fornecedoresEvento'
import { resumirAtuacaoFornecedor, tiposDasParticipacoes } from '@/utilitarios/atuacaoFornecedor'
import { essencialidadeDaCategoria } from '@/utilitarios/coberturaFornecedores'
import { resumoEvento } from '@/views/eventos/__tests__/auxiliaresEventos'

const HOJE = '2026-10-23'
const TIPO_DESCONHECIDO = 'Formatura' as unknown as TipoEvento

function participacao(
  eventoId: string,
  dataEvento: string,
  status: StatusFornecedorEvento = 'Contratado',
  eventoArquivado = false,
): ParticipacaoFornecedorDto {
  return { eventoId, nomePrimeiraPessoa: `Pessoa ${eventoId}`, nomeSegundaPessoa: null, dataEvento, eventoArquivado, status }
}

function evento(id: string, tipo: TipoEvento, diasRestantes = 30) {
  return resumoEvento({ id, tipo, diasRestantes })
}

describe('resumirAtuacaoFornecedor', () => {
  const PARTICIPACOES = [
    participacao('a', '2027-03-10', 'EmNegociacao'),
    participacao('b', '2026-12-05'),
    participacao('c', '2026-05-02'),
    participacao('d', '2025-08-20', 'Contratado', true),
    participacao('e', '2026-11-01', 'Cancelado'),
  ]
  const CARTEIRA = [evento('a', 'Casamento'), evento('b', 'QuinzeAnos'), evento('c', 'QuinzeAnos', -20), evento('e', 'Aniversario')]

  it('[UNITÁRIO] conta total, contratados, pela frente com o próximo e a última atuação realizada', () => {
    const resumo = resumirAtuacaoFornecedor(PARTICIPACOES, CARTEIRA, HOJE)

    expect(resumo.total).toBe(5)
    expect(resumo.contratados).toBe(3)
    expect(resumo.pelaFrente).toBe(2)
    expect(resumo.proximo?.eventoId).toBe('b')
    expect(resumo.ultimaAtuacao).toBe('2026-05-02')
  })

  it('[UNITÁRIO] distribui por tipo só as não canceladas e conta as sem tipo identificado', () => {
    const resumo = resumirAtuacaoFornecedor(PARTICIPACOES, CARTEIRA, HOJE)

    expect(resumo.porTipo).toEqual([
      { tipo: 'Casamento', quantidade: 1 },
      { tipo: 'QuinzeAnos', quantidade: 2 },
    ])
    expect(resumo.semTipo).toBe(1)
    expect(resumo.tiposConhecidos).toBe(true)
  })

  it('[UNITÁRIO] evento de hoje conta como pela frente; arquivado futuro e cancelado não contam', () => {
    const resumo = resumirAtuacaoFornecedor(
      [participacao('x', HOJE, 'Cotacao'), participacao('y', '2027-01-01', 'Contratado', true), participacao('z', '2027-02-01', 'Cancelado')],
      [],
      HOJE,
    )

    expect(resumo.pelaFrente).toBe(1)
    expect(resumo.proximo?.eventoId).toBe('x')
    expect(resumo.ultimaAtuacao).toBeNull()
  })

  it.each([
    ['carteira indisponível', null],
    ['carteira só com tipo desconhecido', [evento('a', TIPO_DESCONHECIDO)]],
  ])('[UNITÁRIO] com %s não identifica tipos e marca tiposConhecidos falso', (_rotulo, eventos) => {
    const resumo = resumirAtuacaoFornecedor(PARTICIPACOES, eventos, HOJE)

    expect(resumo.porTipo).toEqual([])
    expect(resumo.tiposConhecidos).toBe(false)
    expect(resumo.total).toBe(5)
  })

  it('[UNITÁRIO] sem participações devolve tudo zerado', () => {
    expect(resumirAtuacaoFornecedor([], CARTEIRA, HOJE)).toEqual({
      total: 0,
      contratados: 0,
      pelaFrente: 0,
      proximo: null,
      ultimaAtuacao: null,
      porTipo: [],
      semTipo: 0,
      tiposConhecidos: true,
    })
  })

  it('[SEGURANÇA] só associa tipo a eventos presentes nas participações devolvidas pelo servidor', () => {
    const tipos = tiposDasParticipacoes([participacao('a', '2027-01-01')], [evento('a', 'Aniversario'), evento('outro', 'Casamento')])

    expect([...tipos.entries()]).toEqual([['a', 'Aniversario']])
  })
})

describe('essencialidadeDaCategoria', () => {
  it('[UNITÁRIO] conta os eventos pela frente para os quais a categoria é essencial', () => {
    const carteira = [evento('1', 'Casamento'), evento('2', 'Casamento'), evento('3', 'Aniversario'), evento('4', 'Comemoracao', -3)]

    expect(essencialidadeDaCategoria('Decoracao', carteira)).toEqual({ daCarteira: true, tipos: ['Casamento', 'Aniversario'], eventos: 3 })
    expect(essencialidadeDaCategoria('Beleza', carteira)).toEqual({ daCarteira: true, tipos: ['Casamento'], eventos: 2 })
  })

  it('[UNITÁRIO] categoria fora das essenciais da carteira devolve lista vazia', () => {
    expect(essencialidadeDaCategoria('Musica', [evento('1', 'Comemoracao')])).toEqual({ daCarteira: true, tipos: [], eventos: 0 })
  })

  it.each([
    ['sem carteira', null],
    ['só tipo desconhecido', [evento('1', TIPO_DESCONHECIDO)]],
  ])('[UNITÁRIO] %s usa os 4 tipos sociais', (_rotulo, eventos) => {
    const essencialidade = essencialidadeDaCategoria('Buffet', eventos)

    expect(essencialidade.daCarteira).toBe(false)
    expect(essencialidade.tipos).toEqual(['Casamento', 'QuinzeAnos', 'Aniversario', 'Comemoracao'])
    expect(TEXTOS_ATUACAO_FORNECEDOR.essencialTipos('Buffet', essencialidade.tipos)).toBe('Buffet costuma ser essencial nos 4 tipos de evento.')
  })

  it('[UNITÁRIO] textos por tipo não tratam casamento como regra geral', () => {
    expect(TEXTOS_ATUACAO_FORNECEDOR.essencialTipos('Iluminação e som', ['QuinzeAnos'])).toBe(
      'Iluminação e som costuma ser essencial em festas de 15 anos.',
    )
    expect(TEXTOS_ATUACAO_FORNECEDOR.essencialTipos('Beleza', ['Casamento', 'QuinzeAnos'])).toBe(
      'Beleza costuma ser essencial em casamentos e festas de 15 anos.',
    )
    expect(TEXTOS_ATUACAO_FORNECEDOR.naoEssencial('Transporte')).not.toMatch(/casamento/i)
  })
})
