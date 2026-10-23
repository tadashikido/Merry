import { describe, expect, it } from 'vitest'

import { avisoExemplo, CONVITE_SOUZA, mapaExemplo, mesaExemplo, MESA_ANFITRIOES, pessoaMesa } from '@/__tests__/auxiliaresMesas'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { TIPOS_EVENTO } from '@/tipos/eventos'
import { linhasCsvMesas } from '@/utilitarios/exportacaoMesas'
import {
  descreverAviso,
  descreverDivisao,
  GRUPO_SEM_GRUPO,
  rotuloMesa,
  rotuloMesaPorId,
  semMesaPorGrupo,
  situacaoFechamentoMesas,
} from '@/utilitarios/mesas'

describe('fechamento das mesas', () => {
  it('[UNITÁRIO] calcula faltas, sobras e a projeção com quem ainda não respondeu', () => {
    const mapa = mapaExemplo()

    const situacao = situacaoFechamentoMesas(mapa, 4)

    expect(situacao).toMatchObject({
      lugares: 7,
      confirmados: 5,
      semMesa: 3,
      faltamLugares: 0,
      sobramLugares: 2,
      maximo: 9,
      faltariamSeTodosVierem: 2,
      completas: 0,
      vazias: 1,
      criancasSemMesa: 1,
      convitesDivididos: 1,
    })
    expect(situacao.mesaEspecial?.id).toBe(MESA_ANFITRIOES)
  })

  it('[UNITÁRIO] faltam lugares quando os sem mesa passam dos lugares livres', () => {
    const mapa = mapaExemplo({ mesas: [mesaExemplo({ capacidade: 2, ocupacao: 2 })], pessoas: [pessoaMesa({ id: 'a', nome: 'A' }), pessoaMesa({ id: 'b', nome: 'B' })] })
    const situacao = situacaoFechamentoMesas({ ...mapa, totais: { ...mapa.totais, lugaresLivres: 0, semMesa: 2 } }, null)

    expect(situacao.faltamLugares).toBe(2)
    expect(situacao.sobramLugares).toBe(0)
    expect(situacao.completas).toBe(1)
    expect(situacao.mesaEspecial).toBeNull()
  })

  it('[UNITÁRIO] sem pendentes ou com falha nos totais não há projeção', () => {
    expect(situacaoFechamentoMesas(mapaExemplo(), null).maximo).toBeNull()
    expect(situacaoFechamentoMesas(mapaExemplo(), 0).maximo).toBeNull()
    expect(situacaoFechamentoMesas(mapaExemplo(), 0).faltariamSeTodosVierem).toBeNull()
  })

  it('[UNITÁRIO] agrupa só quem está sem mesa pela chave do filtro, maiores primeiro e "Sem grupo" por último', () => {
    const pessoas = [
      pessoaMesa({ id: '1', nome: 'A', grupo: 'Amigos' }),
      pessoaMesa({ id: '2', nome: 'B', grupo: null }),
      pessoaMesa({ id: '3', nome: 'C', grupo: 'Família' }),
      pessoaMesa({ id: '4', nome: 'D', grupo: 'família ' }),
      pessoaMesa({ id: '5', nome: 'E', grupo: 'Corte', mesaId: MESA_ANFITRIOES }),
      pessoaMesa({ id: '6', nome: 'F', grupo: '  ' }),
    ]

    expect(semMesaPorGrupo(pessoas)).toEqual([
      { chave: 'familia', rotulo: 'Família', quantidade: 2 },
      { chave: 'amigos', rotulo: 'Amigos', quantidade: 1 },
      { chave: GRUPO_SEM_GRUPO, rotulo: 'Sem grupo', quantidade: 2 },
    ])
  })

  it.each(TIPOS_EVENTO)('[UNITÁRIO] rótulo da mesa especial sem nome usa o termo do tipo %s', (tipo) => {
    const termo = VOCABULARIO_TIPO_EVENTO[tipo].mesaEspecial
    const mesa = { numero: 1, nome: null, especial: true }

    expect(rotuloMesa(mesa, termo)).toBe(termo)
    expect(rotuloMesa({ ...mesa, nome: 'Família' }, termo)).toBe('Mesa 1 · Família')
    expect(rotuloMesaPorId([{ id: 'm', ...mesa }], 'm', termo)).toBe(termo)
  })

  it('[UNITÁRIO] avisos, divisão e CSV aceitam o termo do tipo sem mudar o padrão', () => {
    const termo = VOCABULARIO_TIPO_EVENTO.QuinzeAnos.mesaEspecial
    const aviso = avisoExemplo({ mesaNumero: 1, mesaNome: null, mesaEspecial: true, resposta: 'Recusado' })

    expect(descreverAviso(aviso, termo)).toBe('recusou, saiu da Mesa da debutante')
    expect(descreverAviso(aviso)).toBe('recusou, saiu da Mesa dos anfitriões')
    const mapa = mapaExemplo()
    expect(descreverDivisao(mapa.pessoas, mapa.mesas, CONVITE_SOUZA, termo)).toBe('Família Souza: 1 na Mesa da debutante, 2 sem mesa.')
    expect(linhasCsvMesas(mapa, termo)[0]?.[0]).toBe('Mesa da debutante')
    expect(linhasCsvMesas(mapa)[0]?.[0]).toBe('Mesa dos anfitriões')
  })
})
