import { describe, expect, it } from 'vitest'

import { itemModeloCronograma } from '@/__tests__/auxiliaresModelosCronograma'
import { TEXTOS_MODELOS_CRONOGRAMA } from '@/textos/modelosCronograma'
import {
  agruparItensModeloPorDia,
  alcanceDoModelo,
  equipeDoModelo,
  posicoesNoMomento,
  minutosDesdeCerimonia,
  opcaoLocalDoItem,
  posicaoDe,
  posicaoItemNoModeloCronograma,
  posicaoNaReferencia,
  regraDescricaoModeloCronograma,
  regraHorarioReferencia,
  regraNomeModeloCronograma,
} from '@/utilitarios/modelosCronograma'

describe('utilitários de modelos de cronograma', () => {
  it('[UNITÁRIO] posição absoluta considera véspera e dia seguinte', () => {
    expect(posicaoDe('Vespera', '19:00')).toBe(-300)
    expect(posicaoDe('DiaDoEvento', '16:00')).toBe(960)
    expect(posicaoDe('DiaSeguinte', '01:00')).toBe(1500)
    expect(posicaoDe('DiaDoEvento', '25:00')).toBeNull()
  })

  it('[UNITÁRIO] minutos desde a cerimônia usam o horário de referência', () => {
    expect(minutosDesdeCerimonia('DiaDoEvento', '10:00', '16:00')).toBe(-360)
    expect(minutosDesdeCerimonia('Vespera', '19:00', '16:00')).toBe(-1260)
    expect(minutosDesdeCerimonia('DiaSeguinte', '01:00', '16:00')).toBe(540)
    expect(minutosDesdeCerimonia('DiaDoEvento', '', '16:00')).toBeNull()
    expect(minutosDesdeCerimonia('DiaDoEvento', '10:00', 'x')).toBeNull()
  })

  it('[UNITÁRIO] posição na referência devolve dia e horário e limita à janela', () => {
    expect(posicaoNaReferencia(-360, '16:00')).toEqual({ dia: 'DiaDoEvento', inicio: '10:00' })
    expect(posicaoNaReferencia(-1260, '16:00')).toEqual({ dia: 'Vespera', inicio: '19:00' })
    expect(posicaoNaReferencia(540, '16:00')).toEqual({ dia: 'DiaSeguinte', inicio: '01:00' })
    expect(posicaoNaReferencia(2879, '23:00')).toEqual({ dia: 'DiaSeguinte', inicio: '23:59' })
    expect(posicaoNaReferencia(0, '')).toBeNull()
  })

  it('[UNITÁRIO] opção de local vem da referência ou "Outro"', () => {
    expect(opcaoLocalDoItem(itemModeloCronograma({ referenciaLocal: 'Recepcao', local: null }))).toBe('Recepcao')
    expect(opcaoLocalDoItem(itemModeloCronograma({ referenciaLocal: null, local: 'Hotel' }))).toBe('Outro')
  })

  it('[UNITÁRIO] agrupa itens por dia na ordem véspera, dia, dia seguinte, sem grupos vazios', () => {
    const grupos = agruparItensModeloPorDia([
      itemModeloCronograma({ id: 'b', dia: 'DiaSeguinte' }),
      itemModeloCronograma({ id: 'a', dia: 'Vespera' }),
    ])

    expect(grupos.map((grupo) => grupo.dia)).toEqual(['Vespera', 'DiaSeguinte'])
  })

  it('[UNITÁRIO] regras de nome, descrição e horário de referência', () => {
    expect(regraNomeModeloCronograma('A')).toBe(TEXTOS_MODELOS_CRONOGRAMA.erroNomeTamanho)
    expect(regraNomeModeloCronograma('  Roteiro  ')).toBeNull()
    expect(regraNomeModeloCronograma('')).toBeNull()
    expect(regraNomeModeloCronograma('a'.repeat(81))).toBe(TEXTOS_MODELOS_CRONOGRAMA.erroNomeTamanho)
    expect(regraDescricaoModeloCronograma('a'.repeat(501))).toBe(TEXTOS_MODELOS_CRONOGRAMA.erroDescricaoTamanho)
    expect(regraDescricaoModeloCronograma('ok')).toBeNull()
    expect(regraHorarioReferencia('16:00')).toBeNull()
    expect(regraHorarioReferencia('24:00')).toBe(TEXTOS_MODELOS_CRONOGRAMA.erroHorario)
    expect(regraHorarioReferencia('')).toBe(TEXTOS_MODELOS_CRONOGRAMA.erroHorario)
  })

  it('[UNITÁRIO] alcance vai do primeiro início ao fim mais tardio, com dia e horário pela referência', () => {
    const itens = [
      itemModeloCronograma({ minutosDesdeCerimonia: -1260, duracaoMinutos: 60 }),
      itemModeloCronograma({ minutosDesdeCerimonia: 0, duracaoMinutos: 60 }),
      itemModeloCronograma({ minutosDesdeCerimonia: 300, duracaoMinutos: 300 }),
    ]

    expect(alcanceDoModelo(itens, '16:00')).toEqual({
      comeca: { minutos: -1260, dia: 'Vespera', horario: '19:00' },
      termina: { minutos: 600, dia: 'DiaSeguinte', horario: '02:00' },
      duracaoMinutos: 1860,
    })
    expect(alcanceDoModelo([itemModeloCronograma({ minutosDesdeCerimonia: 0, duracaoMinutos: null })], '20:00')).toEqual({
      comeca: { minutos: 0, dia: 'DiaDoEvento', horario: '20:00' },
      termina: { minutos: 0, dia: 'DiaDoEvento', horario: '20:00' },
      duracaoMinutos: null,
    })
    expect(alcanceDoModelo([], '16:00')).toBeNull()
    expect(alcanceDoModelo(itens, 'xx')).toBeNull()
  })

  it('[UNITÁRIO] conta itens antes, na hora e depois do momento principal', () => {
    const itens = [-120, -30, 0, 90, 240].map((minutos) => itemModeloCronograma({ minutosDesdeCerimonia: minutos }))

    expect(posicoesNoMomento(itens)).toEqual({ antes: 2, naHora: 1, depois: 2 })
    expect(posicoesNoMomento([])).toEqual({ antes: 0, naHora: 0, depois: 0 })
  })

  it('[UNITÁRIO] equipe agrupa categorias por quantidade, responsáveis sem repetir e itens sem ninguém', () => {
    const itens = [
      itemModeloCronograma({ categoriaFornecedor: 'Musica', responsavel: null }),
      itemModeloCronograma({ categoriaFornecedor: 'Musica', responsavel: ' equipe de beleza ' }),
      itemModeloCronograma({ categoriaFornecedor: 'Buffet', responsavel: 'Equipe de beleza' }),
      itemModeloCronograma({ categoriaFornecedor: 'Beleza', responsavel: 'Assessoria' }),
      itemModeloCronograma({ categoriaFornecedor: null, responsavel: '  ' }),
      itemModeloCronograma({ categoriaFornecedor: null, responsavel: null }),
    ]

    const equipe = equipeDoModelo(itens)

    expect(equipe.categorias).toEqual([
      { categoria: 'Musica', quantidade: 2 },
      { categoria: 'Beleza', quantidade: 1 },
      { categoria: 'Buffet', quantidade: 1 },
    ])
    expect(equipe.responsaveis).toEqual(['Assessoria', 'equipe de beleza'])
    expect(equipe.semNinguem).toBe(2)
    expect(equipeDoModelo([])).toEqual({ categorias: [], responsaveis: [], semNinguem: 0 })
  })

  it('[UNITÁRIO] posição do item agrupa por dia com o item incluído e vizinhos por horário', () => {
    const itens = [
      itemModeloCronograma({ id: 'v', minutosDesdeCerimonia: -1260, dia: 'Vespera', inicio: '19:00', duracaoMinutos: 60, termino: '20:00' }),
      itemModeloCronograma({ id: 'a', minutosDesdeCerimonia: -360, inicio: '10:00', duracaoMinutos: 240, termino: '14:00' }),
      itemModeloCronograma({ id: 'b', minutosDesdeCerimonia: -60, inicio: '15:00', duracaoMinutos: null, termino: null }),
      itemModeloCronograma({ id: 'c', minutosDesdeCerimonia: 0, inicio: '16:00', duracaoMinutos: 60, termino: '17:00' }),
      itemModeloCronograma({ id: 'd', minutosDesdeCerimonia: 300, inicio: '21:00', duracaoMinutos: null, termino: null }),
    ]
    const posicao = posicaoItemNoModeloCronograma(
      itens,
      { dia: 'DiaDoEvento', minutos: 420, inicio: '23:00', termino: '01:00', terminaEmOutroDia: true },
      null,
      2,
    )

    expect(posicao.dia).toBe('DiaDoEvento')
    expect(posicao.dias).toEqual([
      { dia: 'Vespera', quantidade: 1, intervalo: 'das 19:00 às 20:00', atual: false },
      { dia: 'DiaDoEvento', quantidade: 5, intervalo: 'das 10:00 às 01:00 do dia seguinte', atual: true },
    ])
    expect(posicao.vizinhos.map((item) => item.id)).toEqual(['c', 'd'])
    expect(posicao.maisNoDia).toBe(2)
    expect(posicao.ampliaFim).toBe(true)
    expect(posicao.ampliaComeco).toBe(false)
    expect(posicao.outrosItens).toBe(5)
  })

  it('[UNITÁRIO] posição exclui o item em edição, cria o dia novo e sem início não marca dia', () => {
    const itens = [
      itemModeloCronograma({ id: 'a', minutosDesdeCerimonia: -360, inicio: '10:00', duracaoMinutos: null, termino: null }),
      itemModeloCronograma({ id: 'b', minutosDesdeCerimonia: 0, inicio: '16:00', duracaoMinutos: null, termino: null }),
    ]
    const vespera = posicaoItemNoModeloCronograma(
      itens,
      { dia: 'Vespera', minutos: -1260, inicio: '19:00', termino: null, terminaEmOutroDia: false },
      'b',
    )
    expect(vespera.dias.map((dia) => [dia.dia, dia.quantidade, dia.atual])).toEqual([
      ['Vespera', 1, true],
      ['DiaDoEvento', 1, false],
    ])
    expect(vespera.vizinhos).toEqual([])
    expect(vespera.ampliaComeco).toBe(true)
    expect(vespera.outrosItens).toBe(1)

    const semInicio = posicaoItemNoModeloCronograma(itens, null)
    expect(semInicio.dia).toBeNull()
    expect(semInicio.dias.every((dia) => !dia.atual)).toBe(true)
    expect(semInicio.vizinhos).toEqual([])
    expect(semInicio.ampliaComeco || semInicio.ampliaFim).toBe(false)

    const vazio = posicaoItemNoModeloCronograma([], { dia: 'DiaDoEvento', minutos: 0, inicio: '16:00', termino: null, terminaEmOutroDia: false })
    expect(vazio.outrosItens).toBe(0)
    expect(vazio.dias).toEqual([{ dia: 'DiaDoEvento', quantidade: 1, intervalo: 'às 16:00', atual: true }])
  })
})
