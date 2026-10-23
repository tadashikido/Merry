import { describe, expect, it } from 'vitest'

import { ORIENTACAO_TIPO_RESTRICAO, TEXTOS_DADOS_SENSIVEIS, TIPOS_ALERGIA } from '@/textos/dadosSensiveis'
import { VOCABULARIO_TIPO_EVENTO, vocabularioOuNeutro } from '@/textos/tiposEvento'
import { TIPOS_RESTRICAO_ALIMENTAR, type PessoaRestricaoAlimentarDto } from '@/tipos/dadosSensiveis'
import { TIPOS_EVENTO } from '@/tipos/eventos'
import { situacaoPreparoBuffet } from '@/utilitarios/preparoBuffet'

function pessoa(dados: Partial<PessoaRestricaoAlimentarDto> = {}): PessoaRestricaoAlimentarDto {
  return {
    convidadoId: 'p1',
    conviteId: 'c1',
    nome: 'Lia',
    acompanhante: false,
    resposta: 'Confirmado',
    tipos: ['SemGluten'],
    outraRestricao: null,
    necessidadeEspecial: null,
    origemConsentimento: 'Convidado',
    consentidoEm: '2026-10-01T12:00:00Z',
    ...dados,
  }
}

describe('situacaoPreparoBuffet', () => {
  it('[UNITÁRIO] confirmadas vêm do backend e sem resposta conta só pendentes', () => {
    const situacao = situacaoPreparoBuffet({
      totalConfirmados: 3,
      porTipo: [{ tipo: 'SemGluten', quantidade: 3 }],
      pessoas: [
        pessoa(),
        pessoa({ convidadoId: 'p2', resposta: 'Pendente', tipos: ['SemLactose', 'Vegana'] }),
        pessoa({ convidadoId: 'p3', resposta: 'Pendente', tipos: ['Vegana'] }),
        pessoa({ convidadoId: 'p4', resposta: 'Pendente', tipos: [], outraRestricao: 'sem porco' }),
      ],
    })

    expect(situacao.confirmadas).toBe(3)
    expect(situacao.semResposta).toBe(3)
    expect(situacao.pendentesPorTipo).toEqual([
      { tipo: 'Vegana', quantidade: 2 },
      { tipo: 'SemLactose', quantidade: 1 },
    ])
  })

  it('[UNITÁRIO] pendentes seguem a ordem dos tipos e não contam tipo repetido duas vezes', () => {
    const situacao = situacaoPreparoBuffet({
      totalConfirmados: 0,
      porTipo: [],
      pessoas: [pessoa({ resposta: 'Pendente', tipos: ['AlergiaAmendoimCastanhas', 'Vegetariana', 'Vegetariana'] })],
    })

    expect(situacao.pendentesPorTipo).toEqual([
      { tipo: 'Vegetariana', quantidade: 1 },
      { tipo: 'AlergiaAmendoimCastanhas', quantidade: 1 },
    ])
    expect(situacao.alergiaConfirmada).toBe(false)
  })

  it('[UNITÁRIO] alergia só conta entre confirmados e tipos zerados ou desconhecidos são ignorados', () => {
    const comAlergia = situacaoPreparoBuffet({
      totalConfirmados: 2,
      porTipo: [
        { tipo: 'SemGluten', quantidade: 1 },
        { tipo: 'AlergiaFrutosDoMar', quantidade: 1 },
        { tipo: 'Vegana', quantidade: 0 },
        { tipo: 'Inexistente' as never, quantidade: 4 },
      ],
      pessoas: [],
    })

    expect(comAlergia.alergiaConfirmada).toBe(true)
    expect(comAlergia.tiposConfirmados.map((contagem) => contagem.tipo)).toEqual(['SemGluten', 'AlergiaFrutosDoMar'])

    const semAlergia = situacaoPreparoBuffet({ totalConfirmados: 1, porTipo: [{ tipo: 'Vegana', quantidade: 1 }], pessoas: [] })
    expect(semAlergia.alergiaConfirmada).toBe(false)
  })

  it('[UNITÁRIO] tipos de alergia são os dois tipos de alergia do cadastro', () => {
    expect(TIPOS_ALERGIA).toEqual(['AlergiaFrutosDoMar', 'AlergiaAmendoimCastanhas'])
  })
})

describe('orientação por tipo de restrição e vocabulário do cardápio', () => {
  it('[UNITÁRIO] cada tipo de evento define doces próprios e o neutro nunca cai em casamento', () => {
    const doces = TIPOS_EVENTO.map((tipo) => VOCABULARIO_TIPO_EVENTO[tipo].cardapio.doces)
    expect(new Set(doces).size).toBe(TIPOS_EVENTO.length)
    expect(VOCABULARIO_TIPO_EVENTO.Casamento.cardapio.doces).toBe('o bolo e os bem-casados')
    expect(VOCABULARIO_TIPO_EVENTO.QuinzeAnos.cardapio.doces).toBe('o bolo e a mesa de doces')
    expect(VOCABULARIO_TIPO_EVENTO.Aniversario.cardapio.doces).toBe('o bolo e os docinhos')
    expect(vocabularioOuNeutro(null).cardapio.doces).toBe('a sobremesa')
    expect(vocabularioOuNeutro('Corporativo' as never).cardapio.doces).not.toContain('bem-casados')
  })

  it('[UNITÁRIO] há orientação para todos os tipos de restrição, sem termo de casamento fixo', () => {
    for (const tipo of TIPOS_RESTRICAO_ALIMENTAR) {
      const texto = ORIENTACAO_TIPO_RESTRICAO[tipo]('a sobremesa')
      expect(texto.length).toBeGreaterThan(20)
      expect(texto).not.toMatch(/casamento|noiv|bem-casad/i)
    }
    expect(ORIENTACAO_TIPO_RESTRICAO.Vegana('o bolo e os docinhos')).toContain('o bolo e os docinhos')
  })

  it('[UNITÁRIO] vazio lista as opções do link a partir dos rótulos do cadastro', () => {
    expect(TEXTOS_DADOS_SENSIVEIS.vazioOpcoes).toContain('vegetariana, vegana, sem glúten')
    expect(TEXTOS_DADOS_SENSIVEIS.vazioOpcoes).toContain('alergia a amendoim ou castanhas, além de outra restrição e necessidade especial')
  })
})
