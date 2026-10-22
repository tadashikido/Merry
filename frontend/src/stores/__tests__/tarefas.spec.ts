import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { corpoDaChamada, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { listaTarefas, pendenciasExemplo, tarefaExemplo } from '@/__tests__/auxiliaresTarefas'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { ROTA_PENDENCIAS_TAREFAS, caminhoTarefas, useTarefasStore } from '@/stores/tarefas'

const ID = '11111111-1111-4111-8111-111111111111'
const OUTRO = '22222222-2222-4222-8222-222222222222'

let fetchSimulado: ReturnType<typeof simularFetch>

beforeEach(() => {
  setActivePinia(createPinia())
  fetchSimulado = simularFetch()
})

afterEach(() => {
  registrarProvedorAutenticacao(null)
})

describe('useTarefasStore', () => {
  it('[UNITÁRIO] monta as rotas codificando os identificadores', () => {
    expect(caminhoTarefas(ID)).toBe(`/api/eventos/${ID}/tarefas`)
    expect(caminhoTarefas(ID, 't/1', 'status')).toBe(`/api/eventos/${ID}/tarefas/t%2F1/status`)
    expect(ROTA_PENDENCIAS_TAREFAS).toBe('/api/tarefas/pendencias')
  })

  it('[UNITÁRIO] carrega a lista e descarta respostas de outro evento', async () => {
    const store = useTarefasStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(listaTarefas([tarefaExemplo()])))

    await store.carregar(ID)

    expect(store.eventoId).toBe(ID)
    expect(store.lista?.tarefas).toHaveLength(1)
    expect(store.carregando).toBe(false)
    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(`/api/eventos/${ID}/tarefas`)

    let liberar: (valor: Response) => void = () => {}
    fetchSimulado.mockReturnValueOnce(new Promise<Response>((resolver) => (liberar = resolver)))
    const primeira = store.carregar(OUTRO)
    fetchSimulado.mockResolvedValueOnce(respostaJson(listaTarefas([])))
    await store.carregar(ID)
    liberar(respostaJson(listaTarefas([tarefaExemplo({ id: 'x' })])))
    await primeira

    expect(store.eventoId).toBe(ID)
    expect(store.lista?.tarefas).toEqual([])
  })

  it('[UNITÁRIO] cria, atualiza, muda status e remove mantendo a lista coerente', async () => {
    const store = useTarefasStore()
    const original = tarefaExemplo()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(listaTarefas([original])))
      .mockResolvedValueOnce(respostaJson(tarefaExemplo({ id: 't2', titulo: 'Nova' }), 201))
      .mockResolvedValueOnce(respostaJson(listaTarefas([original, tarefaExemplo({ id: 't2', titulo: 'Nova' })])))
      .mockResolvedValueOnce(respostaJson(tarefaExemplo({ status: 'Concluida', concluidaPor: 'Assessoria', concluidaEm: '2026-09-30T12:00:00Z' })))
      .mockResolvedValueOnce(respostaJson(listaTarefas([tarefaExemplo({ status: 'Concluida' }), tarefaExemplo({ id: 't2' })])))
      .mockResolvedValueOnce(respostaVazia())
      .mockResolvedValueOnce(respostaJson(listaTarefas([tarefaExemplo({ status: 'Concluida' })])))

    await store.carregar(ID)
    const criada = await store.criar(ID, { titulo: 'Nova', descricao: null, responsavel: 'Anfitriao', categoria: 'Geral', prazo: null })
    expect(criada.ok).toBe(true)
    expect(fetchSimulado.mock.calls[1]![1]?.method).toBe('POST')
    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual({ titulo: 'Nova', descricao: null, responsavel: 'Anfitriao', categoria: 'Geral', prazo: null })
    await Promise.resolve()
    await new Promise((resolver) => setTimeout(resolver, 0))

    const status = await store.alterarStatus(ID, 't1', 'Concluida')
    expect(status.ok).toBe(true)
    expect(fetchSimulado.mock.calls[3]![1]?.method).toBe('PATCH')
    expect(String(fetchSimulado.mock.calls[3]![0])).toBe(`/api/eventos/${ID}/tarefas/t1/status`)
    expect(corpoDaChamada(fetchSimulado.mock.calls[3]!)).toEqual({ status: 'Concluida' })
    expect(store.lista?.tarefas.find((tarefa) => tarefa.id === 't1')?.status).toBe('Concluida')
    await new Promise((resolver) => setTimeout(resolver, 0))

    const remocao = await store.remover(ID, 't2')
    expect(remocao.ok).toBe(true)
    expect(fetchSimulado.mock.calls[5]![1]?.method).toBe('DELETE')
    expect(store.lista?.tarefas.map((tarefa) => tarefa.id)).toEqual(['t1'])
  })

  it('[UNITÁRIO] atualizar envia PUT com o corpo completo', async () => {
    const store = useTarefasStore()
    fetchSimulado.mockResolvedValueOnce(respostaJson(tarefaExemplo({ titulo: 'Editada' })))

    const resultado = await store.atualizar(ID, 't1', { titulo: 'Editada', descricao: 'd', responsavel: 'Assessoria', categoria: 'Cerimonia', prazo: '2027-01-01' })

    expect(resultado.ok).toBe(true)
    expect(fetchSimulado.mock.calls[0]![1]?.method).toBe('PUT')
    expect(corpoDaChamada(fetchSimulado.mock.calls[0]!)).toMatchObject({ titulo: 'Editada', categoria: 'Cerimonia', prazo: '2027-01-01' })
  })

  it('[SEGURANÇA] traduz 403, 404, 422, 400 e falha de rede sem lançar', async () => {
    const store = useTarefasStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaProblema(403))
      .mockResolvedValueOnce(respostaProblema(404, { title: 'Recurso não encontrado.' }))
      .mockResolvedValueOnce(respostaProblema(422, { detail: 'Este evento está arquivado. Restaure para voltar a editar.' }))
      .mockResolvedValueOnce(respostaProblema(400, { errors: { Titulo: ['Use entre 2 e 160 caracteres.'] } }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const proibido = await store.criar(ID, { titulo: 'x', descricao: null, responsavel: 'Assessoria', categoria: 'Geral', prazo: null })
    const naoEncontrado = await store.alterarStatus(ID, 't1', 'Concluida')
    const regra = await store.remover(ID, 't1')
    const validacao = await store.atualizar(ID, 't1', { titulo: 'A', descricao: null, responsavel: 'Assessoria', categoria: 'Geral', prazo: null })
    await store.carregar(ID)

    expect(proibido.ok ? null : proibido.falha.tipo).toBe('semPermissao')
    expect(naoEncontrado.ok ? null : naoEncontrado.falha.tipo).toBe('naoEncontrado')
    expect(regra.ok ? null : regra.falha.mensagem).toBe('Este evento está arquivado. Restaure para voltar a editar.')
    expect(validacao.ok ? null : validacao.falha.errosCampos.titulo).toBe('Use entre 2 e 160 caracteres.')
    expect(store.falha?.tipo).toBe('conexao')
    expect(store.lista).toBeNull()
  })

  it('[UNITÁRIO] obtém uma tarefa e carrega as pendências da organização', async () => {
    const store = useTarefasStore()
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(tarefaExemplo()))
      .mockResolvedValueOnce(respostaJson(pendenciasExemplo()))
      .mockResolvedValueOnce(respostaProblema(500))

    const obtida = await store.obter(ID, 't1')
    await store.carregarPendencias()

    expect(obtida.ok && obtida.valor.id).toBe('t1')
    expect(String(fetchSimulado.mock.calls[1]![0])).toBe('/api/tarefas/pendencias')
    expect(store.pendencias?.totalAtrasadas).toBe(1)
    expect(store.falhaPendencias).toBeNull()

    await store.carregarPendencias()
    expect(store.pendencias).toBeNull()
    expect(store.falhaPendencias?.tipo).toBe('inesperado')
    expect(store.carregandoPendencias).toBe(false)
  })
})
