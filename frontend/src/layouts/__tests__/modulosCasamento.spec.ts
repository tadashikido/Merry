import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { ITENS_RAIL_ASSESSORIA, itemRailAtivo, itensRailCasal } from '@/layouts/menuPainel'
import { MODULOS_CASAMENTO, ORDEM_GRUPOS_CASAMENTO, gruposNavegacaoCasamento, moduloAtivo } from '@/layouts/modulosCasamento'
import type { ModuloCasamento } from '@/layouts/tipos'
import { rotas } from '@/router'
import { somenteAssessoria } from '@/router/guardaAutenticacao'

const ID = '11111111-1111-4111-8111-111111111111'

function roteador() {
  return createRouter({ history: createMemoryHistory(), routes: rotas })
}

describe('registro de módulos do casamento', () => {
  it('[UNITÁRIO] só registra módulos que existem como rota do casamento', () => {
    const r = roteador()
    for (const modulo of MODULOS_CASAMENTO) {
      const resolvida = r.resolve({ name: modulo.rota, params: { id: ID } })
      expect(resolvida.path.startsWith(`/casamentos/${ID}`)).toBe(true)
      for (const relacionada of modulo.rotasRelacionadas ?? []) {
        expect(r.hasRoute(relacionada)).toBe(true)
      }
    }
    expect(MODULOS_CASAMENTO.map((modulo) => modulo.chave)).toEqual(['visao-geral', 'tarefas', 'checklist', 'cronograma', 'fornecedores', 'convidados', 'confirmacoes', 'restricoes', 'mesas', 'financeiro', 'grande-dia'])
  })

  it('[UNITÁRIO] agrupa na ordem do canvas e descarta grupos sem módulo', () => {
    const grupos = gruposNavegacaoCasamento(ID, 'casamento', () => true)

    expect(ORDEM_GRUPOS_CASAMENTO).toEqual(['planejar', 'pessoas', 'dinheiroDocumentos', 'execucao'])
    expect(grupos.map((grupo) => grupo.rotulo)).toEqual(['Planejar', 'Pessoas', 'Dinheiro & documentos', 'Execução'])
    expect(grupos[0]!.itens.map((item) => item.rotulo)).toEqual(['Visão geral', 'Tarefas', 'Checklist', 'Cronograma'])
    expect(grupos[1]!.itens.map((item) => item.rotulo)).toEqual(['Fornecedores', 'Convidados', 'Confirmações', 'Restrições alimentares', 'Mesas'])
    expect(grupos[2]!.itens.map((item) => item.rotulo)).toEqual(['Financeiro'])
    expect(grupos[3]!.itens.map((item) => item.rotulo)).toEqual(['Grande Dia'])
  })

  it('[UNITÁRIO] um módulo novo num grupo vazio faz o grupo aparecer na posição certa', () => {
    const extra: ModuloCasamento[] = [
      ...MODULOS_CASAMENTO,
      { chave: 'grande-dia', grupo: 'execucao', rotulo: 'Grande Dia', icone: 'calendario', rota: 'casamento-grande-dia' },
    ]
    const grupos = gruposNavegacaoCasamento(ID, null, () => true, extra)

    expect(grupos.map((grupo) => grupo.chave)).toEqual(['planejar', 'pessoas', 'dinheiroDocumentos', 'execucao'])
    expect(grupos[2]!.itens[0]!.rota).toEqual({ name: 'casamento-financeiro', params: { id: ID } })
    expect(grupos[3]!.itens[0]!.rota).toEqual({ name: 'casamento-grande-dia', params: { id: ID } })
  })

  it('[UNITÁRIO] marca ativo pela rota do módulo ou por uma rota relacionada', () => {
    const convidados = MODULOS_CASAMENTO.find((modulo) => modulo.chave === 'convidados')!

    expect(moduloAtivo(convidados, 'casamento-convidados')).toBe(true)
    expect(moduloAtivo(convidados, 'convite-editar')).toBe(true)
    expect(moduloAtivo(convidados, 'convidados-importar')).toBe(true)
    expect(moduloAtivo(convidados, 'painel-confirmacoes')).toBe(false)
    expect(moduloAtivo(convidados, null)).toBe(false)
    const ativos = gruposNavegacaoCasamento(ID, 'convite-novo', () => true).flatMap((grupo) => grupo.itens).filter((item) => item.ativo)
    expect(ativos.map((item) => item.chave)).toEqual(['convidados'])
  })

  it('[SEGURANÇA] o filtro do casal usa a mesma regra do guarda e nunca oferece rota da assessoria', () => {
    const r = roteador()
    const podeCasal = (modulo: ModuloCasamento) => !somenteAssessoria(r.resolve({ name: modulo.rota, params: { id: ID } }))
    const itens = gruposNavegacaoCasamento(ID, 'casamento', podeCasal).flatMap((grupo) => grupo.itens)

    expect(itens.map((item) => item.chave)).toEqual(['visao-geral', 'tarefas', 'cronograma', 'fornecedores', 'convidados', 'confirmacoes', 'mesas', 'financeiro', 'grande-dia'])
    for (const item of itens) {
      expect(somenteAssessoria(r.resolve(item.rota))).toBe(false)
    }
  })
})

describe('rail global', () => {
  it('[UNITÁRIO] assessoria vê Dashboard e Casamentos; casal vê só o próprio casamento', () => {
    expect(ITENS_RAIL_ASSESSORIA.map((item) => item.rotulo)).toEqual(['Dashboard', 'Casamentos', 'Fornecedores', 'Modelos'])
    expect(itensRailCasal(ID).map((item) => item.rota)).toEqual([{ name: 'casamento', params: { id: ID } }])
  })

  it('[UNITÁRIO] Dashboard só é ativo na raiz e Casamentos em toda a árvore /casamentos', () => {
    const [dashboard, casamentos] = ITENS_RAIL_ASSESSORIA

    expect(itemRailAtivo(dashboard!, '/')).toBe(true)
    expect(itemRailAtivo(dashboard!, '/casamentos')).toBe(false)
    expect(itemRailAtivo(casamentos!, '/casamentos')).toBe(true)
    expect(itemRailAtivo(casamentos!, `/casamentos/${ID}/convidados`)).toBe(true)
    expect(itemRailAtivo(casamentos!, '/casamentos-antigos')).toBe(false)
  })
})
