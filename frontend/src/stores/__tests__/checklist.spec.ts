import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import {
  ID_ITEM,
  ID_MODELO,
  aplicacaoExemplo,
  checklistExemplo,
  itemModelo,
  modeloCompleto,
  resumoModelo,
  tarefaChecklist,
} from '@/__tests__/auxiliaresChecklist'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useEventosStore } from '@/stores/eventos'
import { caminhoChecklist, useChecklistStore } from '@/stores/checklist'
import { ROTA_MODELOS_CHECKLIST, caminhoModelo, useModelosChecklistStore } from '@/stores/modelosChecklist'
import { eventoCompleto } from '@/views/eventos/__tests__/auxiliaresEventos'

const ID = '11111111-1111-4111-8111-111111111111'

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
})

describe('useModelosChecklistStore', () => {
  it('[UNITÁRIO] monta as rotas de modelos e itens codificando os identificadores', () => {
    expect(ROTA_MODELOS_CHECKLIST).toBe('/api/modelos-checklist')
    expect(caminhoModelo('m/1')).toBe('/api/modelos-checklist/m%2F1')
    expect(caminhoModelo('m1', '')).toBe('/api/modelos-checklist/m1/itens')
    expect(caminhoModelo('m1', 'i/1')).toBe('/api/modelos-checklist/m1/itens/i%2F1')
  })

  it('[UNITÁRIO] lista modelos e guarda a falha de permissão', async () => {
    const store = useModelosChecklistStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson([resumoModelo()])).mockResolvedValueOnce(respostaProblema(403, { title: 'Proibido' }))

    await store.listar()
    expect(store.lista).toEqual([resumoModelo()])

    await store.listar()
    expect(store.lista).toBeNull()
    expect(store.falhaLista?.tipo).toBe('semPermissao')
  })

  it('[UNITÁRIO] cria modelo e itens, recarrega o atual e remove item localmente', async () => {
    const store = useModelosChecklistStore()
    const modelo = modeloCompleto([])
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(modelo, 201))
      .mockResolvedValueOnce(respostaJson(itemModelo(), 201))
      .mockResolvedValueOnce(respostaJson(modeloCompleto([itemModelo()])))
      .mockResolvedValueOnce(respostaVazia())
      .mockResolvedValueOnce(respostaJson(modeloCompleto([])))

    const criado = await store.criar({ nome: 'Checklist essencial', descricao: null })
    expect(criado.ok).toBe(true)
    expect(store.atual?.id).toBe(ID_MODELO)

    const item = await store.criarItem(ID_MODELO, {
      titulo: 'Reservar local',
      descricao: null,
      responsavel: 'Assessoria',
      categoria: 'Cerimonia',
      diasAntesDoEvento: 365,
    })
    expect(item.ok).toBe(true)
    expect(String(fetchSimulado.mock.calls[1]![0])).toBe(`/api/modelos-checklist/${ID_MODELO}/itens`)
    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toMatchObject({ diasAntesDoEvento: 365 })
    await Promise.resolve()
    await Promise.resolve()

    const remocao = await store.removerItem(ID_MODELO, ID_ITEM)
    expect(remocao.ok).toBe(true)
    expect(store.atual?.itens).toEqual([])
    expect(fetchSimulado.mock.calls[3]![1]?.method).toBe('DELETE')
  })

  it('[UNITÁRIO] devolve a falha de regra ao salvar e mantém o estado', async () => {
    const store = useModelosChecklistStore()
    fetchSimulado.mockResolvedValueOnce(respostaProblema(422, { title: 'Regra', detail: 'Já existe um modelo com esse nome.' }))

    const resultado = await store.criar({ nome: 'Duplicado', descricao: null })

    expect(resultado).toMatchObject({ ok: false, falha: { tipo: 'regra', mensagem: 'Já existe um modelo com esse nome.' } })
    expect(store.atual).toBeNull()
  })

  it('[UNITÁRIO] remove o modelo da lista', async () => {
    const store = useModelosChecklistStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson([resumoModelo(), resumoModelo({ id: 'outro', nome: 'Outro' })])).mockResolvedValueOnce(respostaVazia())
    await store.listar()

    await store.remover(ID_MODELO)

    expect(store.lista?.map((modelo) => modelo.id)).toEqual(['outro'])
  })
})

describe('useChecklistStore', () => {
  it('[UNITÁRIO] carrega o checklist e atualiza o percentual do evento atual', async () => {
    const eventos = useEventosStore()
    eventos.atual = eventoCompleto({ id: ID })
    const store = useChecklistStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(checklistExemplo([tarefaChecklist({ status: 'Concluida' }), tarefaChecklist({ id: 't2' })])))

    await store.carregar(ID)

    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(caminhoChecklist(ID))
    expect(store.dados?.progresso.percentual).toBe(50)
    expect(eventos.atual?.percentualChecklist).toBe(50)
  })

  it('[UNITÁRIO] prévia e aplicação usam as rotas do evento e recarregam', async () => {
    const eventos = useEventosStore()
    eventos.atual = eventoCompleto({ id: ID })
    const store = useChecklistStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(aplicacaoExemplo({ tarefasCriadas: 2 })))
      .mockResolvedValueOnce(respostaJson(aplicacaoExemplo({ progresso: { percentual: 0, concluidas: 0, consideradas: 2, canceladas: 0, total: 2 } })))
      .mockResolvedValueOnce(respostaJson(checklistExemplo([tarefaChecklist(), tarefaChecklist({ id: 't2' })])))

    const previa = await store.previa(ID, 'm 1')
    const aplicacao = await store.aplicar(ID, ID_MODELO)

    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(`${caminhoChecklist(ID, 'previa')}?modeloId=m%201`)
    expect(previa.ok && previa.valor.tarefasCriadas).toBe(2)
    expect(aplicacao.ok).toBe(true)
    expect(String(fetchSimulado.mock.calls[1]![0])).toBe(caminhoChecklist(ID, 'aplicacoes'))
    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual({ modeloId: ID_MODELO })
    expect(eventos.atual?.percentualChecklist).toBe(0)
  })

  it('[UNITÁRIO] traduz 409 e 422 da aplicação', async () => {
    const store = useChecklistStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaProblema(409, { title: 'O checklist mudou em outra tela.' }))
      .mockResolvedValueOnce(respostaProblema(422, { title: 'Regra', detail: 'Este evento passaria de 500 tarefas.' }))

    const conflito = await store.aplicar(ID, ID_MODELO)
    const limite = await store.aplicar(ID, ID_MODELO)

    expect(!conflito.ok && conflito.falha.tipo).toBe('conflito')
    expect(!limite.ok && limite.falha.mensagem).toBe('Este evento passaria de 500 tarefas.')
  })

  it('[UNITÁRIO] consulta e executa o recálculo de prazos', async () => {
    const store = useChecklistStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson({ tarefas: 3 })).mockResolvedValueOnce(respostaJson({ tarefas: 3 }))

    const consulta = await store.consultarRecalculo(ID)
    const recalculo = await store.recalcular(ID)

    expect(consulta.ok && consulta.valor.tarefas).toBe(3)
    expect(recalculo.ok && recalculo.valor.tarefas).toBe(3)
    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(caminhoChecklist(ID, 'recalculo-prazos'))
    expect(fetchSimulado.mock.calls[1]![1]?.method).toBe('POST')
  })

  it('[UNITÁRIO] alterar status substitui a tarefa no checklist', async () => {
    const store = useChecklistStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(checklistExemplo([tarefaChecklist()])))
      .mockResolvedValueOnce(respostaJson(tarefaChecklist({ status: 'Concluida' })))
      .mockResolvedValue(respostaJson(checklistExemplo([tarefaChecklist({ status: 'Concluida' })])))
    await store.carregar(ID)

    const resultado = await store.alterarStatus(ID, 't1', 'Concluida')

    expect(resultado.ok).toBe(true)
    expect(store.dados?.tarefas[0]?.status).toBe('Concluida')
    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual({ status: 'Concluida' })
  })

  it('[UNITÁRIO] falha de rede vira estado de erro', async () => {
    const store = useChecklistStore()
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await store.carregar(ID)

    expect(store.dados).toBeNull()
    expect(store.falha?.tipo).toBe('conexao')
  })
})
