import { describe, expect, it } from 'vitest'

import { avisoExemplo, CONVITE_LIMA, CONVITE_RUI, CONVITE_SOUZA, mapaExemplo, MESA_ANFITRIOES, MESA_PADRINHOS, MESA_TIOS, pessoaMesa } from '@/__tests__/auxiliaresMesas'
import { MARCA_BOM } from '@/utilitarios/csv'
import { gerarCsvMesas, linhasCsvMesas, nomeArquivoMesas } from '@/utilitarios/exportacaoMesas'
import {
  agruparPorConvite,
  chaveGrupoMesa,
  conviteDeUmaPessoa,
  convitesDivididos,
  descreverAviso,
  descreverDivisao,
  FILTRO_TODOS,
  filtrarPessoas,
  filtrosAtivos,
  GRUPO_SEM_GRUPO,
  lugaresLivres,
  mesasComPessoas,
  opcoesConvite,
  opcoesGrupo,
  opcoesSentar,
  proximoNumeroMesa,
  rotuloMesa,
  rotuloMesaPorId,
} from '@/utilitarios/mesas'
import { regraCapacidadeMesa, regraNomeMesa, regraNumeroMesa } from '@/utilitarios/validacaoMesas'

const TODOS = { busca: '', grupo: FILTRO_TODOS, convite: FILTRO_TODOS }

describe('utilitários de mesas', () => {
  it('[UNITÁRIO] rotula mesa com número, nome e mesa dos anfitriões', () => {
    expect(rotuloMesa({ numero: 3, nome: null, especial: false })).toBe('Mesa 3')
    expect(rotuloMesa({ numero: 2, nome: 'Padrinhos', especial: false })).toBe('Mesa 2 · Padrinhos')
    expect(rotuloMesa({ numero: 1, nome: null, especial: true })).toBe('Mesa dos anfitriões')
    expect(rotuloMesaPorId([{ id: 'm', numero: 4, nome: 'Tios', especial: false }], 'm')).toBe('Mesa 4 · Tios')
    expect(rotuloMesaPorId([], 'm')).toBeNull()
    expect(rotuloMesaPorId(undefined, null)).toBeNull()
  })

  it('[UNITÁRIO] filtra por busca sem acento, grupo e convite', () => {
    const { pessoas } = mapaExemplo()

    expect(filtrarPessoas(pessoas, { ...TODOS, busca: 'SOUZA' }).map((pessoa) => pessoa.nome)).toEqual(['Carla Souza', 'Pedro Souza', 'Ana Souza'])
    expect(filtrarPessoas(pessoas, { ...TODOS, busca: 'familia lima' }).map((pessoa) => pessoa.nome)).toEqual(['=Primo Zeca'])
    expect(filtrarPessoas(pessoas, { ...TODOS, grupo: chaveGrupoMesa('Amigos do trabalho') }).map((pessoa) => pessoa.nome)).toEqual(['Rui Fontes'])
    expect(filtrarPessoas(pessoas, { ...TODOS, grupo: GRUPO_SEM_GRUPO }).map((pessoa) => pessoa.nome)).toEqual(['=Primo Zeca'])
    expect(filtrarPessoas(pessoas, { ...TODOS, convite: CONVITE_RUI })).toHaveLength(1)
    expect(filtrosAtivos(TODOS)).toBe(false)
    expect(filtrosAtivos({ ...TODOS, busca: '  ' })).toBe(false)
    expect(filtrosAtivos({ ...TODOS, convite: CONVITE_RUI })).toBe(true)
  })

  it('[UNITÁRIO] monta opções de grupo (sem grupo por último) e de convite', () => {
    const { pessoas } = mapaExemplo()

    expect(opcoesGrupo(pessoas).map((opcao) => opcao.rotulo)).toEqual(['Todos', 'Amigos do trabalho', 'Família da noiva', 'Sem grupo'])
    expect(opcoesConvite(pessoas).map((opcao) => opcao.valor)).toEqual([FILTRO_TODOS, CONVITE_SOUZA, CONVITE_RUI, CONVITE_LIMA])
  })

  it('[UNITÁRIO] agrupa por convite e reconhece convite de uma pessoa só', () => {
    const grupos = agruparPorConvite(mapaExemplo().pessoas)

    expect(grupos.map((grupo) => [grupo.convite, grupo.pessoas.length])).toEqual([
      ['Família Souza', 3],
      ['Rui Fontes', 1],
      ['Família Lima', 1],
    ])
    expect(conviteDeUmaPessoa('Rui Fontes', grupos[1]!.pessoas)).toBe(true)
    expect(conviteDeUmaPessoa('Família Lima', grupos[2]!.pessoas)).toBe(false)
  })

  it('[UNITÁRIO] identifica e descreve convite dividido entre mesas', () => {
    const { pessoas, mesas } = mapaExemplo()

    expect([...convitesDivididos(pessoas)]).toEqual([CONVITE_SOUZA])
    expect(descreverDivisao(pessoas, mesas, CONVITE_SOUZA)).toBe('Família Souza: 1 na Mesa dos anfitriões, 2 sem mesa.')
    expect(descreverDivisao(pessoas, mesas, 'inexistente')).toBe('')
    const todosSemMesa = [pessoaMesa({ id: 'a', nome: 'A' }), pessoaMesa({ id: 'b', nome: 'B' })]
    expect(convitesDivididos(todosSemMesa).size).toBe(0)
  })

  it('[UNITÁRIO] associa pessoas às mesas respeitando o filtro', () => {
    const { pessoas, mesas } = mapaExemplo()
    const visiveis = filtrarPessoas(pessoas, { ...TODOS, busca: 'carla' })

    const resultado = mesasComPessoas(mesas, pessoas, visiveis)

    expect(resultado.map((item) => [item.pessoas.length, item.visiveis.length])).toEqual([
      [1, 0],
      [1, 0],
      [0, 0],
    ])
  })

  it('[UNITÁRIO] opções de "Sentar em…" só cabem quando há lugar para todos que chegam', () => {
    const { pessoas, mesas } = mapaExemplo()
    const selecionadas = pessoas.filter((pessoa) => ['p-carla', 'p-pedro', 'p-rui'].includes(pessoa.id))

    const opcoes = opcoesSentar(mesas, selecionadas)

    expect(opcoes.map((opcao) => [opcao.mesa.id, opcao.livres, opcao.cabe, opcao.atual])).toEqual([
      [MESA_ANFITRIOES, 1, false, false],
      [MESA_PADRINHOS, 2, true, false],
      [MESA_TIOS, 2, false, false],
    ])
    const soRui = opcoesSentar(mesas, selecionadas.filter((pessoa) => pessoa.id === 'p-rui'))
    expect(soRui[1]).toMatchObject({ atual: true, cabe: false })
    expect(lugaresLivres({ capacidade: 2, ocupacao: 5 })).toBe(0)
  })

  it('[UNITÁRIO] descreve o aviso de saída e a mesa excluída', () => {
    expect(descreverAviso(avisoExemplo())).toBe('recusou, saiu da Mesa 2 · Padrinhos')
    expect(descreverAviso(avisoExemplo({ resposta: 'Pendente', mesaNumero: null, mesaNome: null, mesaId: null }))).toBe(
      'voltou para sem resposta, saiu de uma mesa que foi excluída',
    )
    expect(descreverAviso(avisoExemplo({ resposta: 'Confirmado', mesaEspecial: true, mesaNome: null, mesaNumero: 1 }))).toBe(
      'confirmou de novo, saiu da Mesa dos anfitriões',
    )
  })

  it('[UNITÁRIO] sugere o próximo número livre', () => {
    expect(proximoNumeroMesa([])).toBe(1)
    expect(proximoNumeroMesa([{ numero: 1 }, { numero: 2 }, { numero: 4 }])).toBe(3)
  })

  it('[UNITÁRIO] valida número, lugares e nome como o servidor', () => {
    expect(regraNumeroMesa(null)).toBe('Preencha este campo.')
    expect(regraNumeroMesa(0)).toBe('Use um número de 1 a 999.')
    expect(regraNumeroMesa(1000)).toBe('Use um número de 1 a 999.')
    expect(regraNumeroMesa(999)).toBeNull()
    expect(regraCapacidadeMesa(undefined)).toBe('Preencha este campo.')
    expect(regraCapacidadeMesa(31)).toBe('Use de 1 a 30 lugares.')
    expect(regraCapacidadeMesa(2.5)).toBe('Use de 1 a 30 lugares.')
    expect(regraCapacidadeMesa(30)).toBeNull()
    expect(regraNomeMesa('x'.repeat(61))).toBe('Use até 60 caracteres.')
    expect(regraNomeMesa('')).toBeNull()
  })
})

describe('exportação do mapa de mesas', () => {
  it('[UNITÁRIO] gera linhas por mesa (vazia inclusive) e depois as pessoas sem mesa', () => {
    expect(linhasCsvMesas(mapaExemplo())).toEqual([
      ['Mesa dos anfitriões', 2, 'Ana Souza', 'Família Souza', 'Adulto', 'Não'],
      ['Mesa 2 · Padrinhos', 3, 'Rui Fontes', 'Rui Fontes', 'Adulto', 'Não'],
      ['Mesa 3 · Tios', 2, '', '', '', ''],
      ['Sem mesa', '', 'Carla Souza', 'Família Souza', 'Adulto', 'Não'],
      ['Sem mesa', '', 'Pedro Souza', 'Família Souza', 'Criança', 'Não'],
      ['Sem mesa', '', '=Primo Zeca', 'Família Lima', 'Adulto', 'Sim'],
    ])
  })

  it('[SEGURANÇA] CSV tem BOM, separador ponto e vírgula e neutraliza fórmulas', () => {
    const csv = gerarCsvMesas(mapaExemplo())

    expect(csv.startsWith(MARCA_BOM)).toBe(true)
    expect(csv).toContain('Mesa;Lugares;Pessoa;Convite;Faixa etária;Acompanhante\r\n')
    expect(csv).toContain("Sem mesa;;'=Primo Zeca;Família Lima;Adulto;Sim\r\n")
    expect(csv).not.toContain(';=Primo')
  })

  it('[UNITÁRIO] nome do arquivo usa os anfitriões e a data', () => {
    expect(nomeArquivoMesas({ nomePrimeiraPessoa: 'Ana Beatriz', nomeSegundaPessoa: 'Bruno', data: '2027-05-15' })).toBe(
      'mesas-ana-beatriz-e-bruno-2027-05-15.csv',
    )
  })
})
