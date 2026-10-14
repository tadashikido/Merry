import { describe, expect, it } from 'vitest'

import type { ConviteDto, ConvidadoDto, TotaisConvidadosDto } from '@/tipos/convidados'
import {
  GRUPO_NENHUM,
  GRUPO_TODOS,
  chaveGrupo,
  filtrarConvites,
  filtrosAtivos,
  listarGrupos,
} from '@/utilitarios/filtroConvidados'
import { complementoResumoConvidados, itensResumoConvidados } from '@/utilitarios/resumoConvidados'
import { formatarTelefone, normalizarTelefone, telefoneValido } from '@/utilitarios/telefone'
import { emailConvidado, grupoConvite, nomePessoa, telefone, textoOuNulo } from '@/utilitarios/validacaoConvidados'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'

function pessoa(nome: string, dados: Partial<ConvidadoDto> = {}): ConvidadoDto {
  return {
    id: `id-${nome}`,
    nome,
    telefone: null,
    email: null,
    faixaEtaria: 'Adulto',
    resposta: 'Pendente',
    acompanhante: false, possuiRestricao: false,
    ...dados,
  }
}

function convite(nome: string, grupo: string | null, convidados: ConvidadoDto[]): ConviteDto {
  return {
    id: `convite-${nome}`,
    nome,
    grupo,
    limiteAcompanhantes: 0,
    statusEnvio: 'NaoEnviado',
    convidados,
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: null,
  }
}

const CONVITES: ConviteDto[] = [
  convite('Família Souza', 'Família da noiva', [
    pessoa('Carla Souza', { resposta: 'Confirmado', telefone: '11987654321', email: 'carla@exemplo.com' }),
    pessoa('Pedro Souza', { faixaEtaria: 'Crianca' }),
  ]),
  convite('Marcos Lima', null, [pessoa('Marcos Lima', { resposta: 'Recusado' })]),
  convite('Turma do futebol', 'amigos do NOIVO', [pessoa('João'), pessoa('Zé Souza', { resposta: 'Confirmado' })]),
  convite('Padrinhos', 'Amigos do noivo', [pessoa('Rita')]),
]

const SEM_FILTRO = { busca: '', grupo: GRUPO_TODOS, resposta: null }

describe('telefone', () => {
  it.each([
    ['(11) 98765-4321', '(11) 98765-4321'],
    ['1133334444', '(11) 3333-4444'],
    ['+5511987654321', '+55 (11) 98765-4321'],
    ['+12125550100', '+12125550100'],
    ['', ''],
    [null, ''],
  ])('[UNITÁRIO] formata %s como %s', (entrada, esperado) => {
    expect(formatarTelefone(entrada)).toBe(esperado)
  })

  it('[UNITÁRIO] normaliza para dígitos preservando o + inicial', () => {
    expect(normalizarTelefone(' (11) 98765-4321 ')).toBe('11987654321')
    expect(normalizarTelefone('+55 11 98765 4321')).toBe('+5511987654321')
    expect(normalizarTelefone('  ')).toBeNull()
  })

  it.each([
    ['(11) 98765-4321', true],
    ['', true],
    ['123', false],
    ['1234567890123456', false],
    ['11 9876-abcd', false],
    ['11+987654321', false],
  ])('[UNITÁRIO] valida %s como %s, com a mesma regra do backend', (entrada, esperado) => {
    expect(telefoneValido(entrada)).toBe(esperado)
  })
})

describe('validacaoConvidados', () => {
  it('[UNITÁRIO] nome da pessoa entre 2 e 120 caracteres, vazio fica para a regra de obrigatório', () => {
    expect(nomePessoa('')).toBeNull()
    expect(nomePessoa(' A ')).toBe(TEXTOS_CONVIDADOS.erroNome)
    expect(nomePessoa('a'.repeat(121))).toBe(TEXTOS_CONVIDADOS.erroNome)
    expect(nomePessoa('Ana')).toBeNull()
  })

  it('[UNITÁRIO] grupo até 60, telefone e e-mail com mensagens próprias', () => {
    expect(grupoConvite('g'.repeat(61))).toBe(TEXTOS_CONVIDADOS.erroGrupo)
    expect(grupoConvite('Amigos')).toBeNull()
    expect(telefone('123')).toBe(TEXTOS_CONVIDADOS.erroTelefone)
    expect(telefone('')).toBeNull()
    expect(emailConvidado('ana@')).not.toBeNull()
    expect(emailConvidado(`${'a'.repeat(250)}@x.com`)).not.toBeNull()
    expect(emailConvidado('ana@exemplo.com')).toBeNull()
  })

  it('[UNITÁRIO] textoOuNulo colapsa espaços e devolve nulo quando vazio', () => {
    expect(textoOuNulo('  Família   da noiva ')).toBe('Família da noiva')
    expect(textoOuNulo('   ')).toBeNull()
  })
})

describe('filtroConvidados', () => {
  it('[UNITÁRIO] agrupa grupos ignorando acento, caixa e espaços; sem grupo separado', () => {
    const { grupos, temSemGrupo } = listarGrupos(CONVITES)

    expect(grupos.map((grupo) => grupo.rotulo)).toEqual(['amigos do NOIVO', 'Família da noiva'])
    expect(temSemGrupo).toBe(true)
    expect(chaveGrupo('  Amigos   do Noivo ')).toBe(chaveGrupo('amigos do noivo'))
    expect(chaveGrupo('')).toBe(GRUPO_NENHUM)
  })

  it('[UNITÁRIO] sem filtros mostra todos os convites com todas as pessoas', () => {
    const resultado = filtrarConvites(CONVITES, SEM_FILTRO)

    expect(resultado).toHaveLength(4)
    expect(resultado[0]?.convidadosVisiveis).toHaveLength(2)
    expect(filtrosAtivos(SEM_FILTRO)).toBe(false)
  })

  it('[UNITÁRIO] filtra por grupo normalizado e por "Sem grupo"', () => {
    const amigos = filtrarConvites(CONVITES, { ...SEM_FILTRO, grupo: chaveGrupo('Amigos do noivo') })
    const semGrupo = filtrarConvites(CONVITES, { ...SEM_FILTRO, grupo: GRUPO_NENHUM })

    expect(amigos.map((item) => item.convite.nome)).toEqual(['Turma do futebol', 'Padrinhos'])
    expect(semGrupo.map((item) => item.convite.nome)).toEqual(['Marcos Lima'])
  })

  it('[UNITÁRIO] filtro de resposta mostra só as pessoas daquela resposta e conta as ocultas', () => {
    const resultado = filtrarConvites(CONVITES, { ...SEM_FILTRO, resposta: 'Confirmado' })

    expect(resultado.map((item) => item.convite.nome)).toEqual(['Família Souza', 'Turma do futebol'])
    expect(resultado[0]?.convidadosVisiveis.map((item) => item.nome)).toEqual(['Carla Souza'])
    expect(resultado[0]?.convidadosOcultos).toBe(1)
    expect(filtrosAtivos({ ...SEM_FILTRO, resposta: 'Confirmado' })).toBe(true)
  })

  it('[UNITÁRIO] busca sem acento em nome do convite, nome, e-mail e telefone formatado', () => {
    expect(filtrarConvites(CONVITES, { ...SEM_FILTRO, busca: 'SOUZA' }).map((item) => item.convite.nome)).toEqual([
      'Família Souza',
      'Turma do futebol',
    ])
    expect(filtrarConvites(CONVITES, { ...SEM_FILTRO, busca: 'familia' })).toHaveLength(1)
    expect(filtrarConvites(CONVITES, { ...SEM_FILTRO, busca: 'carla@exemplo' })).toHaveLength(1)
    expect(filtrarConvites(CONVITES, { ...SEM_FILTRO, busca: '98765-4321' })).toHaveLength(1)
    expect(filtrarConvites(CONVITES, { ...SEM_FILTRO, busca: 'ninguém' })).toHaveLength(0)
  })

  it('[UNITÁRIO] combina grupo, resposta e busca (critério de aceite CA-10)', () => {
    const resultado = filtrarConvites(CONVITES, {
      busca: 'souza',
      grupo: chaveGrupo('Amigos do noivo'),
      resposta: 'Confirmado',
    })

    expect(resultado).toHaveLength(1)
    expect(resultado[0]?.convidadosVisiveis.map((item) => item.nome)).toEqual(['Zé Souza'])
    expect(resultado[0]?.convidadosOcultos).toBe(1)
  })
})

describe('resumoConvidados', () => {
  const totais: TotaisConvidadosDto = {
    convites: 3,
    pessoas: 7,
    adultos: 5,
    criancas: 2,
    acompanhantesPermitidos: 3,
    confirmados: { adultos: 3, criancas: 1, total: 4 },
    pendentes: { adultos: 2, criancas: 0, total: 2 },
    recusados: { adultos: 0, criancas: 1, total: 1 },
  }

  it('[UNITÁRIO] monta os quatro números com plural correto e destaque em confirmadas', () => {
    const itens = itensResumoConvidados(totais)

    expect(itens.map((item) => [item.valor, item.rotulo, item.detalhe])).toEqual([
      [7, 'pessoas', '5 adultos e 2 crianças'],
      [4, 'confirmadas', '3 adultos e 1 criança'],
      [2, 'pendentes', '2 adultos e 0 crianças'],
      [1, 'recusada', '0 adultos e 1 criança'],
    ])
    expect(itens.filter((item) => item.destaque).map((item) => item.chave)).toEqual(['confirmadas'])
  })

  it('[UNITÁRIO] rodapé traz convites, acompanhantes e a comparação com a estimativa quando existe', () => {
    expect(complementoResumoConvidados(totais, 150)).toBe('3 convites · até 3 acompanhantes · 7 de 150 estimados')
    expect(complementoResumoConvidados({ ...totais, convites: 1, acompanhantesPermitidos: 0 }, null)).toBe('1 convite')
  })
})
