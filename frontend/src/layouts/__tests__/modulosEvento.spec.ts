import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { ITENS_RAIL_ASSESSORIA, itemRailAtivo, itensRailAnfitriao } from '@/layouts/menuPainel'
import { MODULOS_EVENTO, ORDEM_GRUPOS_EVENTO, gruposNavegacaoEvento, moduloAtivo } from '@/layouts/modulosEvento'
import type { ModuloEvento } from '@/layouts/tipos'
import { rotas } from '@/router'
import { somenteAssessoria } from '@/router/guardaAutenticacao'

const ID = '11111111-1111-4111-8111-111111111111'

function roteador() {
  return createRouter({ history: createMemoryHistory(), routes: rotas })
}

describe('registro de módulos do evento', () => {
  it('[UNITÁRIO] só registra módulos que existem como rota do evento', () => {
    const r = roteador()
    for (const modulo of MODULOS_EVENTO) {
      const resolvida = r.resolve({ name: modulo.rota, params: { id: ID } })
      expect(resolvida.path.startsWith(`/eventos/${ID}`)).toBe(true)
      for (const relacionada of modulo.rotasRelacionadas ?? []) {
        expect(r.hasRoute(relacionada)).toBe(true)
      }
    }
    expect(MODULOS_EVENTO.map((modulo) => modulo.chave)).toEqual(['visao-geral', 'tarefas', 'checklist', 'cronograma', 'fornecedores', 'convidados', 'confirmacoes', 'restricoes', 'mesas', 'financeiro', 'grande-dia'])
  })

  it('[UNITÁRIO] agrupa na ordem do canvas e descarta grupos sem módulo', () => {
    const grupos = gruposNavegacaoEvento(ID, 'evento', () => true)

    expect(ORDEM_GRUPOS_EVENTO).toEqual(['planejar', 'pessoas', 'dinheiroDocumentos', 'execucao'])
    expect(grupos.map((grupo) => grupo.rotulo)).toEqual(['Planejar', 'Pessoas', 'Dinheiro & documentos', 'Execução'])
    expect(grupos[0]!.itens.map((item) => item.rotulo)).toEqual(['Visão geral', 'Tarefas', 'Checklist', 'Cronograma'])
    expect(grupos[1]!.itens.map((item) => item.rotulo)).toEqual(['Fornecedores', 'Convidados', 'Confirmações', 'Restrições alimentares', 'Mesas'])
    expect(grupos[2]!.itens.map((item) => item.rotulo)).toEqual(['Financeiro'])
    expect(grupos[3]!.itens.map((item) => item.rotulo)).toEqual(['Grande Dia'])
  })

  it('[UNITÁRIO] um módulo novo num grupo vazio faz o grupo aparecer na posição certa', () => {
    const extra: ModuloEvento[] = [
      ...MODULOS_EVENTO,
      { chave: 'grande-dia', grupo: 'execucao', rotulo: 'Grande Dia', icone: 'calendario', rota: 'evento-grande-dia' },
    ]
    const grupos = gruposNavegacaoEvento(ID, null, () => true, extra)

    expect(grupos.map((grupo) => grupo.chave)).toEqual(['planejar', 'pessoas', 'dinheiroDocumentos', 'execucao'])
    expect(grupos[2]!.itens[0]!.rota).toEqual({ name: 'evento-financeiro', params: { id: ID } })
    expect(grupos[3]!.itens[0]!.rota).toEqual({ name: 'evento-grande-dia', params: { id: ID } })
  })

  it('[UNITÁRIO] marca ativo pela rota do módulo ou por uma rota relacionada', () => {
    const convidados = MODULOS_EVENTO.find((modulo) => modulo.chave === 'convidados')!

    expect(moduloAtivo(convidados, 'evento-convidados')).toBe(true)
    expect(moduloAtivo(convidados, 'convite-editar')).toBe(true)
    expect(moduloAtivo(convidados, 'convidados-importar')).toBe(true)
    expect(moduloAtivo(convidados, 'painel-confirmacoes')).toBe(false)
    expect(moduloAtivo(convidados, null)).toBe(false)
    const ativos = gruposNavegacaoEvento(ID, 'convite-novo', () => true).flatMap((grupo) => grupo.itens).filter((item) => item.ativo)
    expect(ativos.map((item) => item.chave)).toEqual(['convidados'])
  })

  it('[SEGURANÇA] o filtro dos anfitriões usa a mesma regra do guarda e nunca oferece rota da assessoria', () => {
    const r = roteador()
    const podeAnfitriao = (modulo: ModuloEvento) => !somenteAssessoria(r.resolve({ name: modulo.rota, params: { id: ID } }))
    const itens = gruposNavegacaoEvento(ID, 'evento', podeAnfitriao).flatMap((grupo) => grupo.itens)

    expect(itens.map((item) => item.chave)).toEqual(['visao-geral', 'tarefas', 'cronograma', 'fornecedores', 'convidados', 'confirmacoes', 'mesas', 'financeiro', 'grande-dia'])
    for (const item of itens) {
      expect(somenteAssessoria(r.resolve(item.rota))).toBe(false)
    }
  })
})

describe('rail global', () => {
  it('[UNITÁRIO] assessoria vê Dashboard e Eventos; anfitriões veem só o próprio evento', () => {
    expect(ITENS_RAIL_ASSESSORIA.map((item) => item.rotulo)).toEqual(['Dashboard', 'Eventos', 'Fornecedores', 'Modelos'])
    expect(itensRailAnfitriao(ID).map((item) => item.rota)).toEqual([{ name: 'evento', params: { id: ID } }])
  })

  it('[UNITÁRIO] Dashboard só é ativo na raiz e Eventos em toda a árvore /eventos', () => {
    const [dashboard, eventos] = ITENS_RAIL_ASSESSORIA

    expect(itemRailAtivo(dashboard!, '/')).toBe(true)
    expect(itemRailAtivo(dashboard!, '/eventos')).toBe(false)
    expect(itemRailAtivo(eventos!, '/eventos')).toBe(true)
    expect(itemRailAtivo(eventos!, `/eventos/${ID}/convidados`)).toBe(true)
    expect(itemRailAtivo(eventos!, '/eventos-antigos')).toBe(false)
  })
})
