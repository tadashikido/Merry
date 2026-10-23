import { describe, expect, it } from 'vitest'

import { previaExemplo } from '@/__tests__/auxiliaresImportacao'
import { ERROS_COMUNS_IMPORTACAO, TEXTOS_IMPORTACAO, explicacaoColunas } from '@/textos/importacaoConvidados'
import type { ConviteDto } from '@/tipos/convidados'
import type { TipoEvento } from '@/tipos/eventos'
import type { ConvitePreVisualizadoDto } from '@/tipos/importacaoConvidados'
import {
  MARCADOR_EXEMPLO,
  gruposDoEvento,
  modeloImportacaoConvidados,
  resumirGruposImportacao,
} from '@/utilitarios/importacaoConvidados'

const GRUPOS_POR_TIPO: Record<TipoEvento, [string, string]> = {
  Casamento: ['Família', 'Padrinhos'],
  QuinzeAnos: ['Família', 'Corte'],
  Aniversario: ['Família', 'Amigos'],
  Comemoracao: ['Família', 'Amigos'],
}

function linhasDoModelo(tipo: TipoEvento | null): string[][] {
  return modeloImportacaoConvidados(tipo)
    .slice(1)
    .split('\r\n')
    .filter((linha) => linha !== '')
    .map((linha) => linha.split(';'))
}

function convitePrevia(grupo: string | null, pessoas: number, valido = true): ConvitePreVisualizadoDto {
  return {
    nome: `Convite ${grupo ?? 'sem'}`,
    grupo,
    limiteAcompanhantes: 0,
    valido,
    pessoas: Array.from({ length: pessoas }, (_, indice) => ({
      linha: indice + 2,
      nome: `Pessoa ${indice}`,
      faixaEtaria: 'Adulto' as const,
      resposta: 'Pendente' as const,
      situacao: valido ? ('Valida' as const) : ('ComErro' as const),
    })),
  }
}

function conviteEvento(id: string, grupo: string | null): ConviteDto {
  return {
    id,
    nome: `Convite ${id}`,
    grupo,
    limiteAcompanhantes: 0,
    statusEnvio: 'NaoEnviado',
    convidados: [],
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: null,
  }
}

describe('modelo de planilha por tipo de evento', () => {
  it.each(Object.entries(GRUPOS_POR_TIPO) as [TipoEvento, [string, string]][])(
    '[UNITÁRIO] %s usa os grupos do vocabulário e mantém o marcador de exemplo',
    (tipo, [primeiro, segundo]) => {
      const [cabecalho, ...exemplos] = linhasDoModelo(tipo)

      expect(cabecalho![1]).toBe('Grupo')
      expect(exemplos).toHaveLength(3)
      expect(exemplos.map((linha) => linha[1])).toEqual([primeiro, primeiro, segundo])
      expect(exemplos.every((linha) => linha[2]!.includes(MARCADOR_EXEMPLO))).toBe(true)
    },
  )

  it('[UNITÁRIO] tipo desconhecido ou nulo usa o vocabulário neutro, nunca Casamento', () => {
    const desconhecido = linhasDoModelo('Corporativo' as TipoEvento).slice(1)
    const nulo = linhasDoModelo(null).slice(1)

    expect(desconhecido.map((linha) => linha[1])).toEqual(['Família', 'Família', 'Amigos'])
    expect(nulo).toEqual(desconhecido)
    expect(modeloImportacaoConvidados(null)).not.toContain('Padrinhos')
  })

  it('[SEGURANÇA] modelo continua sem células iniciadas por fórmula', () => {
    for (const tipo of [...Object.keys(GRUPOS_POR_TIPO), null] as (TipoEvento | null)[]) {
      const celulas = linhasDoModelo(tipo).flat()
      expect(celulas.some((celula) => /^[=+\-@]/.test(celula))).toBe(false)
    }
  })
})

describe('explicação das colunas por tipo', () => {
  it.each([
    ['Casamento', 'como Família, Padrinhos ou Amigos.'],
    ['QuinzeAnos', 'como Família, Corte ou Amigos da escola.'],
    ['Aniversario', 'como Família, Amigos ou Trabalho.'],
    ['Comemoracao', 'como Família, Amigos ou Convidados de honra.'],
  ] as [TipoEvento, string][])('[UNITÁRIO] %s cita grupos do tipo na coluna Grupo', (tipo, esperado) => {
    const grupo = explicacaoColunas(tipo).find((item) => item.coluna === 'Grupo')

    expect(grupo?.texto).toContain(esperado)
  })

  it('[UNITÁRIO] nenhum texto da etapa trata casamento como conceito geral', () => {
    const textos = [
      TEXTOS_IMPORTACAO.subtitulo,
      TEXTOS_IMPORTACAO.privacidade,
      TEXTOS_IMPORTACAO.privacidadeRestricoes,
      ...ERROS_COMUNS_IMPORTACAO.flatMap((erro) => [erro.titulo, erro.texto]),
      ...explicacaoColunas(null).map((item) => item.texto),
    ].join(' ')

    expect(textos).not.toMatch(/noiv|casamento|casal|anfitri/i)
    expect(textos).not.toMatch(/só a assessoria/i)
  })

  it('[UNITÁRIO] mantém a ordem e a quantidade de colunas explicadas', () => {
    expect(explicacaoColunas('QuinzeAnos').map((item) => item.coluna)).toEqual([
      'Nome',
      'Convite',
      'Grupo',
      'Telefone',
      'Email',
      'FaixaEtaria',
      'Acompanhantes',
      'Resposta',
    ])
  })
})

describe('resumirGruposImportacao', () => {
  const doEvento = gruposDoEvento([conviteEvento('a', 'Família'), conviteEvento('b', 'Família'), conviteEvento('c', 'Amigos'), conviteEvento('d', null)])

  it('[UNITÁRIO] gruposDoEvento conta convites por grupo com o rótulo do evento', () => {
    expect([...doEvento.entries()]).toEqual([
      ['amigos', { rotulo: 'Amigos', quantidade: 1 }],
      ['familia', { rotulo: 'Família', quantidade: 2 }],
    ])
  })

  it('[UNITÁRIO] separa grupos novos e existentes pela chave normalizada e usa o rótulo do evento', () => {
    const resumo = resumirGruposImportacao(
      [convitePrevia('  FAMILIA ', 3), convitePrevia('Corte', 2), convitePrevia('Corte', 1), convitePrevia(null, 1)],
      doEvento,
    )

    expect(resumo.grupos).toEqual([
      { chave: 'corte', rotulo: 'Corte', convites: 2, pessoas: 3, existentes: 0 },
      { chave: 'familia', rotulo: 'Família', convites: 1, pessoas: 3, existentes: 2 },
    ])
    expect(resumo.semGrupo).toEqual({ convites: 1, pessoas: 1 })
    expect(resumo.comparado).toBe(true)
    expect(resumo.novos).toBe(1)
    expect(resumo.jaExistentes).toBe(1)
  })

  it('[UNITÁRIO] ignora convites que ficam de fora', () => {
    const resumo = resumirGruposImportacao([convitePrevia('Corte', 2, false), convitePrevia('Amigos', 1)], doEvento)

    expect(resumo.grupos.map((grupo) => grupo.rotulo)).toEqual(['Amigos'])
    expect(resumo.novos).toBe(0)
  })

  it('[UNITÁRIO] sem a lista do evento não compara e não marca grupo como novo', () => {
    const resumo = resumirGruposImportacao(previaExemplo().convites, null)

    expect(resumo.comparado).toBe(false)
    expect(resumo.grupos).toEqual([{ chave: 'familia da noiva', rotulo: 'Família da noiva', convites: 1, pessoas: 2, existentes: null }])
    expect(resumo.novos).toBe(0)
    expect(resumo.jaExistentes).toBe(0)
  })
})

describe('textos do bloco de grupos', () => {
  it('[UNITÁRIO] frase de resumo concorda em número', () => {
    expect(TEXTOS_IMPORTACAO.gruposResumo(1, 1)).toBe('1 grupo novo e 1 que já existe no evento.')
    expect(TEXTOS_IMPORTACAO.gruposResumo(2, 3)).toBe('2 grupos novos e 3 que já existem no evento.')
    expect(TEXTOS_IMPORTACAO.gruposResumo(3, 0)).toBe('3 grupos novos no evento.')
    expect(TEXTOS_IMPORTACAO.gruposResumo(0, 1)).toBe('O grupo já existe no evento.')
    expect(TEXTOS_IMPORTACAO.gruposResumo(0, 4)).toBe('Todos os grupos já existem no evento.')
    expect(TEXTOS_IMPORTACAO.grupoExistente(1)).toBe('já tem 1 convite')
    expect(TEXTOS_IMPORTACAO.grupoDetalhe(1, 2)).toBe('1 convite, 2 pessoas')
  })
})
