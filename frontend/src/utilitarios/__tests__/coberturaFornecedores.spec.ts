import { describe, expect, it } from 'vitest'

import { resumoFornecedor } from '@/__tests__/auxiliaresFornecedores'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import type { CategoriaFornecedor } from '@/tipos/fornecedores'
import { descreverSituacaoCategoria } from '@/textos/fornecedores'
import { coberturaDaCarteira, eventosDaCarteira, situacaoCategoriaNaBase } from '@/utilitarios/coberturaFornecedores'
import { resumoEvento } from '@/views/eventos/__tests__/auxiliaresEventos'

const TIPO_DESCONHECIDO = 'Formatura' as unknown as TipoEvento

function fornecedor(categoria: CategoriaFornecedor, arquivado = false) {
  return resumoFornecedor({ id: `${categoria}-${String(arquivado)}`, categoria, arquivado })
}

let sequencia = 0
function evento(tipo: TipoEvento, diasRestantes = 30, arquivado = false) {
  sequencia += 1
  return resumoEvento({ id: `evento-${sequencia}`, tipo, diasRestantes, arquivado })
}

describe('eventosDaCarteira', () => {
  it('[UNITÁRIO] fica só com eventos ativos, pela frente e de tipo conhecido', () => {
    const lista = [
      evento('Casamento'),
      evento('Aniversario', 0),
      evento('QuinzeAnos', -1),
      evento('Comemoracao', 10, true),
      evento(TIPO_DESCONHECIDO),
    ]
    expect(eventosDaCarteira(lista).map((item) => item.tipo)).toEqual(['Casamento', 'Aniversario'])
  })
})

describe('coberturaDaCarteira', () => {
  it('[UNITÁRIO] sem eventos considera os 4 tipos e a união das essenciais na ordem das categorias', () => {
    const cobertura = coberturaDaCarteira([], null)
    const uniao = new Set(TIPOS_EVENTO.flatMap((tipo) => VOCABULARIO_TIPO_EVENTO[tipo].fornecedoresEssenciais))

    expect(cobertura.daCarteira).toBe(false)
    expect(cobertura.porTipo).toEqual([])
    expect(cobertura.tipos).toEqual([...TIPOS_EVENTO])
    expect(cobertura.essenciais).toBe(uniao.size)
    expect(cobertura.cobertas).toBe(0)
    expect(cobertura.faltando[0]?.categoria).toBe('Buffet')
    expect(cobertura.faltando.find((item) => item.categoria === 'EspacoLocal')?.tipos).toEqual([...TIPOS_EVENTO])
    expect(cobertura.faltando.find((item) => item.categoria === 'Filmagem')?.tipos).toEqual(['Casamento', 'QuinzeAnos'])
    expect(cobertura.faltando.every((item) => item.eventos === 0)).toBe(true)
  })

  it('[UNITÁRIO] com só tipos desconhecidos ou eventos passados cai na regra dos 4 tipos', () => {
    expect(coberturaDaCarteira([], [evento(TIPO_DESCONHECIDO)]).daCarteira).toBe(false)
    expect(coberturaDaCarteira([], [evento('Casamento', -5)]).tipos).toEqual([...TIPOS_EVENTO])
  })

  it('[UNITÁRIO] carteira de casamentos e aniversário conta eventos por categoria e ordena as faltas', () => {
    const fornecedores = [fornecedor('Buffet'), fornecedor('Fotografia'), fornecedor('Musica'), fornecedor('Transporte')]
    const eventos = [evento('Casamento'), evento('Casamento'), evento('Aniversario')]
    const cobertura = coberturaDaCarteira(fornecedores, eventos)

    expect(cobertura.daCarteira).toBe(true)
    expect(cobertura.porTipo).toEqual([
      { tipo: 'Casamento', quantidade: 2 },
      { tipo: 'Aniversario', quantidade: 1 },
    ])
    expect(cobertura.essenciais).toBe(10)
    expect(cobertura.cobertas).toBe(3)
    expect(cobertura.faltando.map((item) => [item.categoria, item.eventos])).toEqual([
      ['EspacoLocal', 3],
      ['Decoracao', 3],
      ['BoloDoces', 3],
      ['Filmagem', 2],
      ['ConvitesPapelaria', 2],
      ['Beleza', 2],
      ['Vestuario', 2],
    ])
  })

  it('[UNITÁRIO] carteira de 15 anos e comemoração inclui Iluminação e som e não cobra Convites', () => {
    const cobertura = coberturaDaCarteira([fornecedor('Filmagem')], [evento('QuinzeAnos'), evento('Comemoracao')])
    const categorias = cobertura.faltando.map((item) => item.categoria)

    expect(cobertura.tipos).toEqual(['QuinzeAnos', 'Comemoracao'])
    expect(categorias).toContain('IluminacaoSom')
    expect(categorias).not.toContain('ConvitesPapelaria')
    expect(categorias).not.toContain('Filmagem')
    expect(cobertura.faltando.find((item) => item.categoria === 'IluminacaoSom')).toMatchObject({ eventos: 1, tipos: ['QuinzeAnos'] })
    expect(cobertura.faltando.find((item) => item.categoria === 'Buffet')).toMatchObject({ eventos: 2 })
  })

  it('[UNITÁRIO] arquivados não cobrem a categoria e são contados na falta', () => {
    const cobertura = coberturaDaCarteira(
      [fornecedor('Decoracao', true), resumoFornecedor({ id: 'outro', categoria: 'Decoracao', arquivado: true })],
      [evento('Comemoracao')],
    )
    expect(cobertura.faltando.find((item) => item.categoria === 'Decoracao')).toMatchObject({ arquivados: 2 })
  })

  it('[UNITÁRIO] tudo coberto deixa a lista de faltas vazia', () => {
    const categorias = VOCABULARIO_TIPO_EVENTO.Aniversario.fornecedoresEssenciais
    const cobertura = coberturaDaCarteira(categorias.map((categoria) => fornecedor(categoria)), [evento('Aniversario')])
    expect(cobertura.faltando).toEqual([])
    expect(cobertura.cobertas).toBe(cobertura.essenciais)
  })
})

describe('situacaoCategoriaNaBase', () => {
  const base = [
    resumoFornecedor({ id: 'a', categoria: 'Decoracao' }),
    resumoFornecedor({ id: 'b', categoria: 'Decoracao' }),
    resumoFornecedor({ id: 'c', categoria: 'Decoracao', arquivado: true }),
    resumoFornecedor({ id: 'd', categoria: 'Buffet' }),
  ]

  it('[UNITÁRIO] conta só ativos da categoria e exclui o fornecedor em edição', () => {
    expect(situacaoCategoriaNaBase('Decoracao', base, null).ativos).toBe(2)
    expect(situacaoCategoriaNaBase('Decoracao', base, null, 'a')).toMatchObject({ ativos: 1, outros: true })
    expect(situacaoCategoriaNaBase('Fotografia', base, null)).toMatchObject({ ativos: 0, outros: false })
    expect(situacaoCategoriaNaBase('Decoracao', null, null).ativos).toBeNull()
  })

  it('[UNITÁRIO] essencialidade vem da carteira com tipos conhecidos', () => {
    const carteira = [evento('Casamento'), evento('QuinzeAnos'), evento('Aniversario', -5)]
    expect(situacaoCategoriaNaBase('Beleza', base, carteira).essencialidade).toEqual({
      daCarteira: true,
      tipos: ['Casamento', 'QuinzeAnos'],
      eventos: 2,
    })
  })
})

describe('descreverSituacaoCategoria', () => {
  it.each([
    ['carteira essencial, nenhum ativo', situacaoCategoriaNaBase('Decoracao', [], [evento('Casamento'), evento('Aniversario')]), 'Essencial para 2 eventos pela frente; nenhum fornecedor ativo ainda.'],
    ['carteira fora das essenciais', situacaoCategoriaNaBase('IluminacaoSom', [fornecedor('IluminacaoSom')], [evento('Comemoracao')]), 'Fora das categorias essenciais dos eventos pela frente; já tem 1 fornecedor ativo.'],
    ['sem carteira, 4 tipos', situacaoCategoriaNaBase('Buffet', [fornecedor('Buffet'), resumoFornecedor({ id: 'x', categoria: 'Buffet' })], null), 'Essencial nos 4 tipos de evento; já tem 2 fornecedores ativos.'],
    ['tipo desconhecido, só alguns tipos', situacaoCategoriaNaBase('Beleza', null, [evento(TIPO_DESCONHECIDO)]), 'Essencial em casamentos e festas de 15 anos.'],
    ['sem carteira e não essencial', situacaoCategoriaNaBase('Transporte', null, null), 'Fora das categorias essenciais dos 4 tipos de evento.'],
    ['edição sem outros', situacaoCategoriaNaBase('Buffet', [resumoFornecedor({ id: 'eu', categoria: 'Buffet' })], null, 'eu'), 'Essencial nos 4 tipos de evento; nenhum outro fornecedor ativo.'],
    ['edição com outros', situacaoCategoriaNaBase('Buffet', [resumoFornecedor({ id: 'eu', categoria: 'Buffet' }), fornecedor('Buffet'), resumoFornecedor({ id: 'y', categoria: 'Buffet' })], null, 'eu'), 'Essencial nos 4 tipos de evento; já tem 2 outros ativos.'],
  ])('[UNITÁRIO] %s', (_rotulo, situacao, esperado) => {
    expect(descreverSituacaoCategoria(situacao)).toBe(esperado)
  })
})
