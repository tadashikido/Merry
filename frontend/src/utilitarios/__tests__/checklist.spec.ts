import { describe, expect, it } from 'vitest'

import { TEXTOS_CHECKLIST, TEXTOS_ITEM_MODELO, TEXTOS_MODELOS_CHECKLIST, descreverPrazoRelativo } from '@/textos/checklist'
import {
  agruparPorMarco,
  descricaoModelo,
  diasAntesDoCasamento,
  diasComSentido,
  diasValidos,
  marcoPorDias,
  nomeModelo,
  sentidoDosDias,
} from '@/utilitarios/checklist'

describe('utilitários do checklist', () => {
  it.each([
    [400, 'dozeMeses'],
    [365, 'dozeMeses'],
    [364, 'seisMeses'],
    [180, 'seisMeses'],
    [179, 'tresMeses'],
    [90, 'tresMeses'],
    [89, 'trintaDias'],
    [30, 'trintaDias'],
    [29, 'retaFinal'],
    [1, 'retaFinal'],
    [0, 'noDia'],
    [-1, 'depois'],
    [null, 'semPrazo'],
  ] as const)('[UNITÁRIO] %s dias antes cai no marco %s', (dias, marco) => {
    expect(marcoPorDias(dias)).toBe(marco)
  })

  it('[UNITÁRIO] calcula a distância em dias de calendário até o casamento', () => {
    expect(diasAntesDoCasamento('2027-12-12', '2026-12-12')).toBe(365)
    expect(diasAntesDoCasamento('2027-12-12', '2027-12-12')).toBe(0)
    expect(diasAntesDoCasamento('2027-12-12', '2027-12-27')).toBe(-15)
    expect(diasAntesDoCasamento('2027-03-28', '2027-03-27')).toBe(1)
    expect(diasAntesDoCasamento('2027-12-12', null)).toBeNull()
    expect(diasAntesDoCasamento('2027-12-12', '12/12/2027')).toBeNull()
  })

  it('[UNITÁRIO] agrupa na ordem dos marcos e omite marcos vazios', () => {
    const itens = [
      { nome: 'depois', dias: -3 },
      { nome: 'buffet', dias: 365 },
      { nome: 'prova', dias: 30 },
      { nome: 'local', dias: 400 },
      { nome: 'sem', dias: null },
    ]

    const grupos = agruparPorMarco(itens, (item) => item.dias)

    expect(grupos.map((grupo) => grupo.marco)).toEqual(['dozeMeses', 'trintaDias', 'depois', 'semPrazo'])
    expect(grupos[0]!.itens.map((item) => item.nome)).toEqual(['buffet', 'local'])
    expect(agruparPorMarco([], () => 0)).toEqual([])
  })

  it('[UNITÁRIO] converte dias e sentido sem pedir número negativo', () => {
    expect(diasComSentido(15, 'depois')).toBe(-15)
    expect(diasComSentido(180, 'antes')).toBe(180)
    expect(sentidoDosDias(-15)).toBe('depois')
    expect(sentidoDosDias(0)).toBe('antes')
  })

  it('[UNITÁRIO] valida os dias conforme o sentido', () => {
    expect(diasValidos(0, 'antes')).toBeNull()
    expect(diasValidos(1095, 'antes')).toBeNull()
    expect(diasValidos(1096, 'antes')).toBe(TEXTOS_ITEM_MODELO.erroDias)
    expect(diasValidos(365, 'depois')).toBeNull()
    expect(diasValidos(366, 'depois')).toBe(TEXTOS_ITEM_MODELO.erroDias)
    expect(diasValidos(0, 'depois')).toBe(TEXTOS_ITEM_MODELO.erroDias)
    expect(diasValidos(2.5, 'antes')).toBe(TEXTOS_ITEM_MODELO.erroDias)
    expect(diasValidos(null, 'antes')).toBe(TEXTOS_ITEM_MODELO.erroDiasObrigatorio)
  })

  it('[UNITÁRIO] valida nome e descrição do modelo', () => {
    expect(nomeModelo('')).toBeNull()
    expect(nomeModelo('  A  ')).toBe(TEXTOS_MODELOS_CHECKLIST.erroNomeTamanho)
    expect(nomeModelo('x'.repeat(81))).toBe(TEXTOS_MODELOS_CHECKLIST.erroNomeTamanho)
    expect(nomeModelo('Casamento no campo')).toBeNull()
    expect(descricaoModelo('d'.repeat(501))).toBe(TEXTOS_MODELOS_CHECKLIST.erroDescricaoTamanho)
    expect(descricaoModelo('d'.repeat(500))).toBeNull()
  })

  it('[UNITÁRIO] descreve prazos relativos e plurais em pt-BR', () => {
    expect(descreverPrazoRelativo(180)).toBe('180 dias antes')
    expect(descreverPrazoRelativo(1)).toBe('1 dia antes')
    expect(descreverPrazoRelativo(0)).toBe('No dia do casamento')
    expect(descreverPrazoRelativo(-15)).toBe('15 dias depois')
    expect(descreverPrazoRelativo(1095)).toBe('1.095 dias antes')
    expect(TEXTOS_CHECKLIST.progresso(1, 1)).toBe('1 de 1 concluída')
    expect(TEXTOS_CHECKLIST.progresso(16, 26)).toBe('16 de 26 concluídas')
    expect(TEXTOS_CHECKLIST.previaCriar(1)).toBe('Vai criar 1 tarefa.')
    expect(TEXTOS_CHECKLIST.previaExistentes(24)).toBe('24 já estão no checklist.')
    expect(TEXTOS_CHECKLIST.toastRecalculado(1)).toBe('Prazo de 1 tarefa recalculado.')
    expect(TEXTOS_CHECKLIST.toastRecalculado(3)).toBe('Prazos de 3 tarefas recalculados.')
    expect(TEXTOS_MODELOS_CHECKLIST.itens(1)).toBe('1 item')
    expect(TEXTOS_MODELOS_CHECKLIST.confirmarExclusaoTexto(0)).not.toContain('itens')
  })
})
