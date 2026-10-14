import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaCasamento, ROTA_CASAMENTOS, type FalhaCasamento, type ResultadoCasamento } from '@/stores/casamentos'
import type {
  ListaTarefasDto,
  PendenciasTarefasDto,
  SalvarTarefaRequest,
  StatusTarefa,
  TarefaDto,
} from '@/tipos/tarefas'

export const ROTA_PENDENCIAS_TAREFAS = '/api/tarefas/pendencias'

export function caminhoTarefas(casamentoId: string, tarefaId?: string, acao?: string): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/tarefas`
  const comTarefa = tarefaId ? `${base}/${encodeURIComponent(tarefaId)}` : base
  return acao ? `${comTarefa}/${acao}` : comTarefa
}

export const useTarefasStore = defineStore('tarefas', () => {
  const casamentoId = ref<string | null>(null)
  const lista = ref<ListaTarefasDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaCasamento | null>(null)

  const pendencias = ref<PendenciasTarefasDto | null>(null)
  const carregandoPendencias = ref(false)
  const falhaPendencias = ref<FalhaCasamento | null>(null)

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      lista.value = null
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<ListaTarefasDto>(caminhoTarefas(id))
      if (casamentoId.value === id) {
        lista.value = resposta
      }
    } catch (erro) {
      if (casamentoId.value === id) {
        lista.value = null
        falha.value = interpretarFalhaCasamento(erro)
      }
    } finally {
      if (casamentoId.value === id) {
        carregando.value = false
      }
    }
  }

  async function recarregarSilenciosamente(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      return
    }
    try {
      const resposta = await requisitar<ListaTarefasDto>(caminhoTarefas(id))
      if (casamentoId.value === id) {
        lista.value = resposta
      }
    } catch {
      return
    }
  }

  function substituir(id: string, tarefa: TarefaDto) {
    if (casamentoId.value !== id || !lista.value) {
      return
    }
    const indice = lista.value.tarefas.findIndex((item) => item.id === tarefa.id)
    if (indice >= 0) {
      lista.value.tarefas.splice(indice, 1, tarefa)
    }
  }

  async function obter(id: string, tarefaId: string): Promise<ResultadoCasamento<TarefaDto>> {
    try {
      return { ok: true, valor: await requisitar<TarefaDto>(caminhoTarefas(id, tarefaId)) }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function criar(id: string, dados: SalvarTarefaRequest): Promise<ResultadoCasamento<TarefaDto>> {
    try {
      const tarefa = await requisitar<TarefaDto>(caminhoTarefas(id), { metodo: 'POST', corpo: dados })
      void recarregarSilenciosamente(id)
      return { ok: true, valor: tarefa }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function atualizar(id: string, tarefaId: string, dados: SalvarTarefaRequest): Promise<ResultadoCasamento<TarefaDto>> {
    try {
      const tarefa = await requisitar<TarefaDto>(caminhoTarefas(id, tarefaId), { metodo: 'PUT', corpo: dados })
      substituir(id, tarefa)
      void recarregarSilenciosamente(id)
      return { ok: true, valor: tarefa }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function alterarStatus(id: string, tarefaId: string, status: StatusTarefa): Promise<ResultadoCasamento<TarefaDto>> {
    try {
      const tarefa = await requisitar<TarefaDto>(caminhoTarefas(id, tarefaId, 'status'), {
        metodo: 'PATCH',
        corpo: { status },
      })
      substituir(id, tarefa)
      void recarregarSilenciosamente(id)
      return { ok: true, valor: tarefa }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function remover(id: string, tarefaId: string): Promise<ResultadoCasamento<null>> {
    try {
      await requisitar<void>(caminhoTarefas(id, tarefaId), { metodo: 'DELETE' })
      if (casamentoId.value === id && lista.value) {
        lista.value.tarefas = lista.value.tarefas.filter((tarefa) => tarefa.id !== tarefaId)
      }
      void recarregarSilenciosamente(id)
      return { ok: true, valor: null }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function carregarPendencias(): Promise<void> {
    carregandoPendencias.value = true
    falhaPendencias.value = null
    try {
      pendencias.value = await requisitar<PendenciasTarefasDto>(ROTA_PENDENCIAS_TAREFAS)
    } catch (erro) {
      pendencias.value = null
      falhaPendencias.value = interpretarFalhaCasamento(erro)
    } finally {
      carregandoPendencias.value = false
    }
  }

  return {
    casamentoId,
    lista,
    carregando,
    falha,
    pendencias,
    carregandoPendencias,
    falhaPendencias,
    carregar,
    obter,
    criar,
    atualizar,
    alterarStatus,
    remover,
    carregarPendencias,
  }
})
