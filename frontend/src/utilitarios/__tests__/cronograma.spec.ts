import { describe, expect, it } from 'vitest'

import { itemCronograma } from '@/__tests__/auxiliaresCronograma'
import { TEXTOS_CRONOGRAMA } from '@/textos/cronograma'
import {
  agruparPorDia,
  contarSemResponsavel,
  descreverRelativoCerimonia,
  duracaoEntre,
  formatarDuracao,
  fornecedoresNoRoteiro,
  horarioParaMinutos,
  minutosParaHorario,
  proximoInicioSugerido,
  regraAtividade,
  regraInicio,
  regraTermino,
  responsaveisUsados,
  resumirDias,
  rotuloLinha,
  terminaNoDiaSeguinte,
  terminoDe,
  textosConflitos,
} from '@/utilitarios/cronograma'

describe('utilitários do cronograma', () => {
  it('[UNITÁRIO] converte horário em minutos e volta, normalizando a volta do dia', () => {
    expect(horarioParaMinutos('16:30')).toBe(990)
    expect(horarioParaMinutos('24:00')).toBeNull()
    expect(horarioParaMinutos('9:00')).toBeNull()
    expect(minutosParaHorario(990)).toBe('16:30')
    expect(minutosParaHorario(1560)).toBe('02:00')
    expect(minutosParaHorario(-30)).toBe('23:30')
  })

  it('[UNITÁRIO] calcula a duração entre início e término, cruzando a meia-noite', () => {
    expect(duracaoEntre('16:30', '17:15')).toBe(45)
    expect(duracaoEntre('21:30', '02:00')).toBe(270)
    expect(duracaoEntre('16:30', '16:30')).toBeNull()
    expect(duracaoEntre('16:30', '')).toBeNull()
    expect(terminaNoDiaSeguinte('21:30', '02:00')).toBe(true)
    expect(terminaNoDiaSeguinte('16:30', '17:15')).toBe(false)
  })

  it('[UNITÁRIO] deriva o término a partir da duração', () => {
    expect(terminoDe('21:30', 270)).toBe('02:00')
    expect(terminoDe('16:30', null)).toBe('')
    expect(terminoDe('', 30)).toBe('')
  })

  it('[UNITÁRIO] descreve duração e distância da cerimônia em pt-BR', () => {
    expect(formatarDuracao(45)).toBe('45 min')
    expect(formatarDuracao(120)).toBe('2 h')
    expect(formatarDuracao(-210)).toBe('3 h 30')
    expect(descreverRelativoCerimonia(-210)).toBe('3 h 30 antes da cerimônia')
    expect(descreverRelativoCerimonia(45)).toBe('45 min depois da cerimônia')
    expect(descreverRelativoCerimonia(0)).toBe(TEXTOS_CRONOGRAMA.relativoCerimonia)
    expect(descreverRelativoCerimonia(null)).toBeNull()
    expect(descreverRelativoCerimonia(-30, 'da festa')).toBe('30 min antes da festa')
    expect(descreverRelativoCerimonia(90, 'do evento')).toBe('1 h 30 depois do evento')
    expect(descreverRelativoCerimonia(0, 'da festa')).toBe('Hora da festa')
  })

  it('[UNITÁRIO] agrupa por dia na ordem véspera, dia e dia seguinte, sem grupos vazios', () => {
    const grupos = agruparPorDia([
      itemCronograma({ id: 'a', dia: 'DiaSeguinte', data: '2027-05-16' }),
      itemCronograma({ id: 'b', dia: 'Vespera', data: '2027-05-14' }),
      itemCronograma({ id: 'c' }),
    ])

    expect(grupos.map((grupo) => [grupo.dia, grupo.data, grupo.itens.map((item) => item.id)])).toEqual([
      ['Vespera', '2027-05-14', ['b']],
      ['DiaDoEvento', '2027-05-15', ['c']],
      ['DiaSeguinte', '2027-05-16', ['a']],
    ])
    expect(agruparPorDia([])).toEqual([])
  })

  it('[UNITÁRIO] textos de conflito não repetem o mesmo item com dois motivos', () => {
    const item = itemCronograma({
      conflitos: [
        { itemId: 'x', atividade: 'Retoque', inicio: '17:00', dia: 'DiaDoEvento', motivo: 'Responsavel' },
        { itemId: 'x', atividade: 'Retoque', inicio: '17:00', dia: 'DiaDoEvento', motivo: 'Fornecedor' },
      ],
    })

    expect(textosConflitos(item)).toEqual(['Conflito com Retoque, 17:00'])
  })

  it('[UNITÁRIO] rótulo acessível da linha diz o intervalo ou o instante', () => {
    expect(rotuloLinha(itemCronograma())).toBe('Editar Cerimônia, das 16:30 às 17:15')
    expect(rotuloLinha(itemCronograma({ termino: null, duracaoMinutos: null }))).toBe('Editar Cerimônia, às 16:30')
  })

  it('[UNITÁRIO] sugere responsáveis já usados sem repetir grafias', () => {
    const itens = [
      itemCronograma({ responsavel: 'Fernanda' }),
      itemCronograma({ responsavel: 'fernanda' }),
      itemCronograma({ responsavel: ' Ana ' }),
      itemCronograma({ responsavel: null }),
    ]

    expect(responsaveisUsados(itens)).toEqual(['Ana', 'Fernanda'])
  })

  it('[UNITÁRIO] próximo início sugerido é o término anterior quando válido', () => {
    expect(proximoInicioSugerido('16:30', '17:15')).toBe('17:15')
    expect(proximoInicioSugerido('16:30', '')).toBe('16:30')
  })

  it('[UNITÁRIO] regras de validação de início, término e atividade', () => {
    expect(regraInicio('')).toBe(TEXTOS_CRONOGRAMA.erroInicio)
    expect(regraInicio('25:00')).toBe(TEXTOS_CRONOGRAMA.erroHorario)
    expect(regraInicio('16:30')).toBeNull()
    const termino = regraTermino(() => '16:30')
    expect(termino('')).toBeNull()
    expect(termino('16:30')).toBe(TEXTOS_CRONOGRAMA.erroTermino)
    expect(termino('9h')).toBe(TEXTOS_CRONOGRAMA.erroHorario)
    expect(termino('17:00')).toBeNull()
    expect(regraAtividade('  ')).toBe(TEXTOS_CRONOGRAMA.erroAtividade)
    expect(regraAtividade('A')).toBe(TEXTOS_CRONOGRAMA.erroTamanhoAtividade)
    expect(regraAtividade('a'.repeat(161))).toBe(TEXTOS_CRONOGRAMA.erroTamanhoAtividade)
    expect(regraAtividade('Cerimônia')).toBeNull()
  })

  it('[UNITÁRIO] resumirDias calcula intervalo e duração, inclusive após a meia-noite', () => {
    const resumo = resumirDias([
      { dia: 'Vespera', itens: [itemCronograma({ inicio: '18:00', termino: null })] },
      {
        dia: 'DiaDoEvento',
        itens: [
          itemCronograma({ inicio: '14:00', termino: '15:00' }),
          itemCronograma({ inicio: '23:00', termino: '01:30', terminaEmOutroDia: true }),
        ],
      },
      { dia: 'DiaSeguinte', itens: [] },
    ])
    expect(resumo).toEqual([
      { dia: 'Vespera', quantidade: 1, intervalo: 'às 18:00', duracaoMinutos: null },
      { dia: 'DiaDoEvento', quantidade: 2, intervalo: 'das 14:00 às 01:30 do dia seguinte', duracaoMinutos: 690 },
    ])
  })

  it('[UNITÁRIO] fornecedoresNoRoteiro agrupa por fornecedor e ordena por nome', () => {
    const coral = { fornecedorEventoId: 'v1', nomeEmpresa: 'Coral', categoria: 'Musica' }
    const buffet = { fornecedorEventoId: 'v2', nomeEmpresa: 'Buffet', categoria: 'Buffet' }
    expect(fornecedoresNoRoteiro([{ fornecedor: coral }, { fornecedor: null }, { fornecedor: buffet }, { fornecedor: coral }])).toEqual([
      { ...buffet, quantidadeItens: 1 },
      { ...coral, quantidadeItens: 2 },
    ])
  })

  it('[UNITÁRIO] contarSemResponsavel conta itens sem responsável nem fornecedor', () => {
    const coral = { fornecedorEventoId: 'v1', nomeEmpresa: 'Coral', categoria: 'Musica' }
    expect(
      contarSemResponsavel([
        { responsavel: null, fornecedor: null },
        { responsavel: '  ', fornecedor: null },
        { responsavel: null, fornecedor: coral },
        { responsavel: 'Ana', fornecedor: null },
      ]),
    ).toBe(2)
  })
})
