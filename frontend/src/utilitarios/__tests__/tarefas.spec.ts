import { describe, expect, it } from 'vitest'

import { tarefaExemplo } from '@/__tests__/auxiliaresTarefas'
import {
  agruparPorHorizonte,
  badgeTarefa,
  contagemSituacao,
  descreverConclusao,
  descreverPrazo,
  descricaoTarefa,
  filtrarTarefas,
  horizonteTarefa,
  metadadosTarefa,
  prazoTarefa,
  tituloTarefa,
} from '@/utilitarios/tarefas'

const atrasada = tarefaExemplo({ id: 'a', atrasada: true, diasParaPrazo: -3, prazo: '2026-09-27', responsavel: 'Casal', categoria: 'Documentos' })
const semana = tarefaExemplo({ id: 's', venceNaSemana: true, diasParaPrazo: 2, prazo: '2026-10-02' })
const hoje = tarefaExemplo({ id: 'h', venceNaSemana: true, diasParaPrazo: 0, prazo: '2026-09-30', status: 'EmAndamento' })
const adiante = tarefaExemplo({ id: 'd', diasParaPrazo: 40, prazo: '2026-11-09', categoria: 'Geral' })
const semPrazo = tarefaExemplo({ id: 'n', prazo: null, diasParaPrazo: null })
const concluida = tarefaExemplo({ id: 'c', status: 'Concluida', concluidaEm: '2026-09-28T15:00:00Z', concluidaPor: 'Casal', responsavel: 'Casal' })
const cancelada = tarefaExemplo({ id: 'x', status: 'Cancelada' })
const todas = [atrasada, semana, hoje, adiante, semPrazo, concluida, cancelada]

describe('filtros de tarefas', () => {
  it('[UNITÁRIO] filtra por situação usando os cálculos do servidor', () => {
    const ids = (situacao: Parameters<typeof filtrarTarefas>[1]['situacao']) =>
      filtrarTarefas(todas, { situacao, responsavel: 'Todos', categoria: 'Todas' }).map((tarefa) => tarefa.id)

    expect(ids('abertas')).toEqual(['a', 's', 'h', 'd', 'n'])
    expect(ids('atrasadas')).toEqual(['a'])
    expect(ids('semana')).toEqual(['s', 'h'])
    expect(ids('concluidas')).toEqual(['c'])
    expect(ids('canceladas')).toEqual(['x'])
    expect(ids('todas')).toHaveLength(7)
  })

  it('[UNITÁRIO] combina responsável e categoria', () => {
    expect(filtrarTarefas(todas, { situacao: 'todas', responsavel: 'Casal', categoria: 'Todas' }).map((tarefa) => tarefa.id)).toEqual(['a', 'c'])
    expect(filtrarTarefas(todas, { situacao: 'abertas', responsavel: 'Todos', categoria: 'Documentos' }).map((tarefa) => tarefa.id)).toEqual(['a'])
    expect(filtrarTarefas(todas, { situacao: 'abertas', responsavel: 'Assessoria', categoria: 'Documentos' })).toEqual([])
  })

  it('[UNITÁRIO] agrupa abertas por horizonte na ordem do que fazer primeiro e omite grupos vazios', () => {
    const grupos = agruparPorHorizonte([semPrazo, adiante, semana, atrasada, hoje])

    expect(grupos.map((grupo) => grupo.horizonte)).toEqual(['atrasadas', 'semana', 'adiante', 'semPrazo'])
    expect(grupos[1]!.tarefas.map((tarefa) => tarefa.id)).toEqual(['s', 'h'])
    expect(grupos[1]!.rotulo).toBe('Esta semana · 2')
    expect(agruparPorHorizonte([adiante]).map((grupo) => grupo.horizonte)).toEqual(['adiante'])
    expect(horizonteTarefa(semPrazo)).toBe('semPrazo')
  })

  it('[UNITÁRIO] só mostra contagem nas opções de atraso e semana', () => {
    const resumo = { abertas: 5, atrasadas: 1, estaSemana: 2, concluidas: 1, canceladas: 1, total: 7 }

    expect(contagemSituacao(resumo, 'atrasadas')).toBe(1)
    expect(contagemSituacao(resumo, 'semana')).toBe(2)
    expect(contagemSituacao(resumo, 'abertas')).toBeNull()
    expect(contagemSituacao(null, 'atrasadas')).toBeNull()
  })
})

describe('textos derivados da tarefa', () => {
  it('[UNITÁRIO] descreve o prazo em frases e sem recalcular datas', () => {
    expect(descreverPrazo(atrasada)).toBe('venceu há 3 dias')
    expect(descreverPrazo(tarefaExemplo({ diasParaPrazo: -1 }))).toBe('venceu há 1 dia')
    expect(descreverPrazo(hoje)).toBe('vence hoje')
    expect(descreverPrazo(tarefaExemplo({ diasParaPrazo: 1 }))).toBe('vence amanhã')
    expect(descreverPrazo(semana)).toBe('vence em 2 dias · 02/10/2026')
    expect(descreverPrazo(semPrazo)).toBe('sem prazo')
    expect(descreverPrazo(cancelada)).toBe('prazo 10/01/2027')
  })

  it('[UNITÁRIO] badge: atraso em erro, semana em alerta, "A fazer" no prazo sem badge', () => {
    expect(badgeTarefa(atrasada)).toEqual({ texto: 'Atrasada', variante: 'erro' })
    expect(badgeTarefa(semana)).toEqual({ texto: 'Esta semana', variante: 'alerta' })
    expect(badgeTarefa(hoje)).toEqual({ texto: 'Vence hoje', variante: 'alerta' })
    expect(badgeTarefa(adiante)).toBeNull()
    expect(badgeTarefa(tarefaExemplo({ status: 'EmAndamento' }))).toEqual({ texto: 'Em andamento', variante: 'informacao' })
    expect(badgeTarefa(concluida)).toEqual({ texto: 'Concluída', variante: 'sucesso' })
    expect(badgeTarefa(cancelada)).toEqual({ texto: 'Cancelada', variante: 'neutro' })
  })

  it('[UNITÁRIO] conclusão fala com o casal por "vocês" e com a assessoria pelo papel', () => {
    expect(descreverConclusao(concluida, true)).toBe('Concluída por vocês em 28/09/2026')
    expect(descreverConclusao(concluida, false)).toBe('Concluída pelo casal em 28/09/2026')
    expect(descreverConclusao(tarefaExemplo({ status: 'Concluida', concluidaEm: '2026-09-28T15:00:00Z', concluidaPor: 'Assessoria' }), true)).toBe(
      'Concluída pela assessoria em 28/09/2026',
    )
    expect(descreverConclusao(atrasada, false)).toBeNull()
  })

  it('[UNITÁRIO] metadados: assessoria vê responsável e categoria; casal vê só o prazo', () => {
    expect(metadadosTarefa(atrasada, false)).toEqual(['Casal', 'venceu há 3 dias', 'Documentos'])
    expect(metadadosTarefa(adiante, false)).toEqual(['Assessoria', 'vence em 40 dias · 09/11/2026'])
    expect(metadadosTarefa(atrasada, true)).toEqual(['venceu há 3 dias'])
  })
})

describe('validação do formulário de tarefa', () => {
  it('[UNITÁRIO] título, descrição e prazo seguem os limites do backend', () => {
    expect(tituloTarefa('')).toBeNull()
    expect(tituloTarefa(' a ')).toBe('Use entre 2 e 160 caracteres.')
    expect(tituloTarefa('ab')).toBeNull()
    expect(tituloTarefa('x'.repeat(161))).toBe('Use entre 2 e 160 caracteres.')
    expect(descricaoTarefa('d'.repeat(2000))).toBeNull()
    expect(descricaoTarefa('d'.repeat(2001))).toBe('Use até 2.000 caracteres.')
    expect(prazoTarefa('')).toBeNull()
    expect(prazoTarefa('2027-01-10')).toBeNull()
    expect(prazoTarefa('1999-12-31')).toBe('Informe um prazo entre 2000 e 2100.')
    expect(prazoTarefa('2101-01-01')).toBe('Informe um prazo entre 2000 e 2100.')
    expect(prazoTarefa('10/01/2027')).toBe('Informe um prazo entre 2000 e 2100.')
  })
})
