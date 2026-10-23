import { describe, expect, it } from 'vitest'

import { itemGrandeDia } from '@/__tests__/auxiliaresGrandeDia'
import { contatosDoMomento, fornecedoresDoDia, momentoPrincipal } from '@/utilitarios/grandeDia'

const foto = { nomeEmpresa: 'Lume Fotografia', categoria: 'Fotografia', contato: 'Bruno', telefone: '11912345678' }
const buffet = { nomeEmpresa: 'Sabor Buffet', categoria: 'Buffet', contato: null, telefone: null }
const coral = { nomeEmpresa: 'Coral Harmonia', categoria: 'Musica', contato: 'Carla', telefone: '11987654321' }

describe('momentoPrincipal', () => {
  it('[UNITÁRIO] calcula quantos minutos faltam para o horário principal', () => {
    expect(momentoPrincipal(16 * 60 + 10, '16:30')).toEqual({ minutos: 20, horario: '16:30' })
    expect(momentoPrincipal(16 * 60 + 34, '16:30:00')).toEqual({ minutos: -4, horario: '16:30' })
  })

  it('[UNITÁRIO] na véspera conta o dia inteiro até o horário', () => {
    expect(momentoPrincipal(-60, '16:30')?.minutos).toBe(16 * 60 + 30 + 60)
  })

  it('[UNITÁRIO] sem horário principal não há momento', () => {
    expect(momentoPrincipal(600, null)).toBeNull()
    expect(momentoPrincipal(600, 'inválido')).toBeNull()
  })
})

describe('fornecedoresDoDia', () => {
  const itens = [
    itemGrandeDia({ id: 'b', inicio: '13:00', fornecedor: buffet, situacao: 'Feito', status: 'Concluido' }),
    itemGrandeDia({ id: 'c', inicio: '16:30', fornecedor: coral, situacao: 'Agora' }),
    itemGrandeDia({ id: 'mk', inicio: '16:00', fornecedor: foto, situacao: 'Agora' }),
    itemGrandeDia({ id: 'f', inicio: '17:15', fornecedor: foto, situacao: 'Proximo' }),
    itemGrandeDia({ id: 'r', inicio: '18:00', fornecedor: buffet, situacao: 'Depois' }),
    itemGrandeDia({ id: 'x', inicio: '19:00', fornecedor: null, situacao: 'Depois' }),
  ]

  it('[UNITÁRIO] agrupa por fornecedor, ordena Agora → Próximo → Depois e usa o próximo horário pendente', () => {
    const lista = fornecedoresDoDia(itens, 'c')

    expect(lista.map((fornecedor) => fornecedor.nomeEmpresa)).toEqual(['Lume Fotografia', 'Coral Harmonia', 'Sabor Buffet'])
    expect(lista[0]).toMatchObject({ situacao: 'Agora', inicio: '16:00', noCartaoAgora: false, encerrado: false })
    expect(lista[1]).toMatchObject({ situacao: 'Agora', noCartaoAgora: true })
    expect(lista[2]).toMatchObject({ situacao: null, inicio: '18:00', encerrado: false })
  })

  it('[UNITÁRIO] fornecedor só com itens feitos fica por último como encerrado', () => {
    const lista = fornecedoresDoDia([
      itemGrandeDia({ id: 'b', inicio: '13:00', fornecedor: buffet, situacao: 'Feito' }),
      itemGrandeDia({ id: 'r', inicio: '18:00', fornecedor: foto, situacao: 'Depois' }),
    ])

    expect(lista.map((fornecedor) => fornecedor.nomeEmpresa)).toEqual(['Lume Fotografia', 'Sabor Buffet'])
    expect(lista[1]).toMatchObject({ encerrado: true, inicio: '13:00' })
  })

  it('[UNITÁRIO] contatos do momento trazem Agora e Próximo sem repetir o fornecedor do cartão Agora', () => {
    const contatos = contatosDoMomento(fornecedoresDoDia(itens, 'c'))

    expect(contatos.map((fornecedor) => fornecedor.nomeEmpresa)).toEqual(['Lume Fotografia'])
  })

  it('[UNITÁRIO] sem fornecedores no roteiro a lista é vazia', () => {
    expect(fornecedoresDoDia([itemGrandeDia({ fornecedor: null })])).toEqual([])
  })
})
