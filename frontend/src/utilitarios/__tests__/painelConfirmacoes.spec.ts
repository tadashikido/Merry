import { describe, expect, it } from 'vitest'

import { filtrarPendentes, segmentosEnvio, textoEstimativa } from '@/utilitarios/painelConfirmacoes'

describe('painelConfirmacoes', () => {
  it('[UNITÁRIO] monta os segmentos na ordem do caminho do convite', () => {
    const segmentos = segmentosEnvio({ total: 60, naoEnviados: 4, enviados: 11, visualizados: 45, respondidos: 38, aguardandoResposta: 22 })

    expect(segmentos.map((segmento) => [segmento.chave, segmento.valor, segmento.tom])).toEqual([
      ['naoEnviados', 4, 'neutro'],
      ['enviados', 11, 'informacao'],
      ['visualizados', 45, 'marca'],
    ])
  })

  it('[UNITÁRIO] compara pessoas com a estimativa', () => {
    expect(textoEstimativa(132, 150)).toBe('132 de 150 estimados · 18 abaixo')
    expect(textoEstimativa(160, 150)).toBe('160 de 150 estimados · 10 acima')
    expect(textoEstimativa(150, 150)).toBe('150 de 150 estimados · igual à estimativa')
    expect(textoEstimativa(10, null)).toBeNull()
  })

  it('[UNITÁRIO] filtra pendentes por convite ou pessoa sem diferenciar acentos', () => {
    const pendentes = [
      { nome: 'Família Souza', pessoasPendentes: ['Célia Souza'] },
      { nome: 'Família Lima', pessoasPendentes: ['Bia Lima', 'Rafael'] },
    ]

    expect(filtrarPendentes(pendentes, 'celia').map((pendente) => pendente.nome)).toEqual(['Família Souza'])
    expect(filtrarPendentes(pendentes, 'LIMA').map((pendente) => pendente.nome)).toEqual(['Família Lima'])
    expect(filtrarPendentes(pendentes, '  ')).toHaveLength(2)
    expect(filtrarPendentes(pendentes, 'xyz')).toEqual([])
  })
})
