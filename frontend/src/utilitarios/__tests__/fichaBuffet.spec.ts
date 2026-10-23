import { describe, expect, it } from 'vitest'

import { exportacaoExemplo } from '@/__tests__/auxiliaresConfirmacoes'
import { ORIENTACAO_TIPO_RESTRICAO, TEXTOS_PREPARO_BUFFET } from '@/textos/dadosSensiveis'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import { cabecalhoFichaEvento, origemDaFicha, origemInterna, type RotaResolvida } from '@/utilitarios/fichaBuffet'
import { faixaConfirmacao } from '@/utilitarios/painelConfirmacoes'
import { conferenciaBuffet } from '@/utilitarios/preparoBuffet'

const ID = '11111111-1111-4111-8111-111111111111'
const EXPORTACAO = exportacaoExemplo().evento

function evento(tipo: string, localCerimonia: string | null = 'Salão Aurora', localRecepcao: string | null = 'Igreja Matriz') {
  return { tipo: tipo as TipoEvento, localCerimonia, localRecepcao }
}

const ROTULOS_ESPERADOS: Record<TipoEvento, string> = {
  Casamento: 'Casamento',
  QuinzeAnos: 'Festa de 15 anos',
  Aniversario: 'Aniversário',
  Comemoracao: 'Comemoração',
}

describe('cabecalhoFichaEvento', () => {
  it.each(TIPOS_EVENTO)('[UNIT] %s mostra o tipo e rotula horário e locais pelo vocabulário', (tipo) => {
    const cabecalho = cabecalhoFichaEvento(EXPORTACAO, evento(tipo))
    const vocabulario = VOCABULARIO_TIPO_EVENTO[tipo]

    expect(cabecalho.tipo).toBe(tipo)
    expect(cabecalho.tipoRotulo).toBe(ROTULOS_ESPERADOS[tipo])
    expect(cabecalho.detalhes).toEqual([
      { chave: 'data', rotulo: 'Data', valor: 'sábado, 22 de maio de 2027' },
      { chave: 'horario', rotulo: vocabulario.horario, valor: '16:30' },
      { chave: 'localPrincipal', rotulo: vocabulario.locais.principal, valor: 'Salão Aurora' },
      { chave: 'localSecundario', rotulo: vocabulario.locais.secundario, valor: 'Igreja Matriz' },
    ])
  })

  it('[UNIT] quinze anos não fala de cerimônia nem recepção', () => {
    const texto = JSON.stringify(cabecalhoFichaEvento(EXPORTACAO, evento('QuinzeAnos')))

    expect(texto).toContain('Horário da festa')
    expect(texto).toContain('"Festa"')
    expect(texto).toContain('Outro local')
    expect(texto).not.toMatch(/cerim|recep|casamento/i)
  })

  it('[UNIT] tipo desconhecido omite a linha de tipo e usa rótulos neutros, nunca casamento', () => {
    const cabecalho = cabecalhoFichaEvento(EXPORTACAO, evento('Corporativo'))

    expect(cabecalho.tipo).toBeNull()
    expect(cabecalho.tipoRotulo).toBeNull()
    expect(cabecalho.detalhes.map((detalhe) => detalhe.rotulo)).toEqual(['Data', 'Horário do evento', 'Local', 'Outro local'])
    expect(JSON.stringify(cabecalho)).not.toMatch(/cerim|recep|casamento/i)
  })

  it('[UNIT] sem evento carregado usa o local do DTO com rótulo neutro', () => {
    const cabecalho = cabecalhoFichaEvento(EXPORTACAO, null)

    expect(cabecalho.tipoRotulo).toBeNull()
    expect(cabecalho.detalhes).toEqual([
      { chave: 'data', rotulo: 'Data', valor: 'sábado, 22 de maio de 2027' },
      { chave: 'horario', rotulo: 'Horário do evento', valor: '16:30' },
      { chave: 'localPrincipal', rotulo: 'Local', valor: 'Espaço Jardim' },
    ])
  })

  it('[UNIT] omite horário e locais vazios e o secundário igual ao principal', () => {
    const cabecalho = cabecalhoFichaEvento({ ...EXPORTACAO, horario: null }, evento('Casamento', 'Espaço Jardim', ' espaço jardim '))

    expect(cabecalho.detalhes.map((detalhe) => detalhe.chave)).toEqual(['data', 'localPrincipal'])
    expect(cabecalhoFichaEvento(EXPORTACAO, evento('Aniversario', '  ', null)).detalhes.map((detalhe) => detalhe.chave)).toEqual([
      'data',
      'horario',
    ])
  })
})

describe('origemDaFicha', () => {
  function resolver(nome: string, id: string) {
    return (): RotaResolvida => ({ name: nome, params: { id } })
  }

  it('[UNIT] volta às restrições quando a página anterior é a de restrições do mesmo evento', () => {
    expect(origemDaFicha(`/eventos/${ID}/restricoes-alimentares`, ID, resolver('restricoes-alimentares', ID))).toBe('restricoes')
  })

  it('[SEGURANÇA] ignora outro evento, outra rota, endereço externo e valor inválido', () => {
    expect(origemDaFicha('/eventos/x/restricoes-alimentares', ID, resolver('restricoes-alimentares', 'outro'))).toBe('confirmacoes')
    expect(origemDaFicha(`/eventos/${ID}/convidados`, ID, resolver('evento-convidados', ID))).toBe('confirmacoes')
    expect(origemDaFicha('//malicioso.example/restricoes', ID, resolver('restricoes-alimentares', ID))).toBe('confirmacoes')
    expect(origemDaFicha('https://malicioso.example', ID, resolver('restricoes-alimentares', ID))).toBe('confirmacoes')
    expect(origemDaFicha(null, ID, resolver('restricoes-alimentares', ID))).toBe('confirmacoes')
    expect(origemDaFicha(42, ID, resolver('restricoes-alimentares', ID))).toBe('confirmacoes')
    expect(
      origemDaFicha('/qualquer', ID, () => {
        throw new Error('rota inválida')
      }),
    ).toBe('confirmacoes')
  })
})

describe('origemInterna', () => {
  const PERMITIDAS = ['evento-mesas', 'painel-confirmacoes'] as const

  function resolver(nome: string, id: string) {
    return (): RotaResolvida => ({ name: nome, params: { id } })
  }

  it('[UNIT] devolve a rota permitida quando a página anterior é do mesmo evento', () => {
    expect(origemInterna(`/eventos/${ID}/confirmacoes`, ID, resolver('painel-confirmacoes', ID), PERMITIDAS, 'evento-mesas')).toBe('painel-confirmacoes')
    expect(origemInterna(`/eventos/${ID}/mesas`, ID, resolver('evento-mesas', ID), PERMITIDAS, 'evento-mesas')).toBe('evento-mesas')
  })

  it('[SEGURANÇA] cai no padrão para rota fora da lista, outro evento, endereço externo ou erro', () => {
    expect(origemInterna(`/eventos/${ID}/restricoes-alimentares`, ID, resolver('restricoes-alimentares', ID), PERMITIDAS, 'evento-mesas')).toBe('evento-mesas')
    expect(origemInterna('/eventos/x/confirmacoes', ID, resolver('painel-confirmacoes', 'outro'), PERMITIDAS, 'evento-mesas')).toBe('evento-mesas')
    expect(origemInterna('//malicioso.example/confirmacoes', ID, resolver('painel-confirmacoes', ID), PERMITIDAS, 'evento-mesas')).toBe('evento-mesas')
    expect(origemInterna(undefined, ID, resolver('painel-confirmacoes', ID), PERMITIDAS, 'evento-mesas')).toBe('evento-mesas')
    expect(
      origemInterna('/qualquer', ID, () => {
        throw new Error('rota inválida')
      }, PERMITIDAS, 'evento-mesas'),
    ).toBe('evento-mesas')
  })
})

describe('conferenciaBuffet', () => {
  const restricoes = {
    porTipo: [
      { tipo: 'SemGluten' as const, quantidade: 2 },
      { tipo: 'AlergiaAmendoimCastanhas' as const, quantidade: 1 },
      { tipo: 'Vegana' as const, quantidade: 0 },
    ],
    outrasRestricoes: 1,
    necessidadesEspeciais: 2,
    dadosExcluidosEm: null,
  }

  it.each(TIPOS_EVENTO)('[UNIT] %s orienta só os tipos confirmados com os doces do tipo', (tipo) => {
    const conferencia = conferenciaBuffet(restricoes, tipo)
    const doces = VOCABULARIO_TIPO_EVENTO[tipo].cardapio.doces

    expect(conferencia.orientacoes).toEqual([
      { tipo: 'SemGluten', rotulo: TEXTOS_PREPARO_BUFFET.itemContagem('Sem glúten', 2), texto: ORIENTACAO_TIPO_RESTRICAO.SemGluten(doces) },
      {
        tipo: 'AlergiaAmendoimCastanhas',
        rotulo: TEXTOS_PREPARO_BUFFET.itemContagem('Alergia a amendoim ou castanhas', 1),
        texto: ORIENTACAO_TIPO_RESTRICAO.AlergiaAmendoimCastanhas(doces),
      },
    ])
    expect(conferencia.alergia).toBe(true)
    expect(conferencia.outras).toBe(1)
    expect(conferencia.necessidades).toBe(2)
  })

  it('[UNIT] tipo desconhecido usa a sobremesa e sem alergia não alerta', () => {
    const conferencia = conferenciaBuffet({ ...restricoes, porTipo: [{ tipo: 'SemLactose', quantidade: 1 }] }, null)

    expect(conferencia.orientacoes[0]!.texto).toContain('a sobremesa')
    expect(conferencia.alergia).toBe(false)
  })

  it('[SEGURANÇA] dados apagados pela política não geram orientação nem alerta', () => {
    expect(conferenciaBuffet({ ...restricoes, dadosExcluidosEm: '2027-06-01T12:00:00Z' }, 'Casamento')).toEqual({
      orientacoes: [],
      alergia: false,
      outras: 0,
      necessidades: 0,
    })
  })
})

describe('faixaConfirmacao', () => {
  it('[UNIT] máximo soma confirmadas e quem ainda não respondeu', () => {
    expect(faixaConfirmacao(4, 2)).toEqual({ confirmadas: 4, maximo: 6, semResposta: 2 })
    expect(faixaConfirmacao(0, 0)).toEqual({ confirmadas: 0, maximo: 0, semResposta: 0 })
  })
})
