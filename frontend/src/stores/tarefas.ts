import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaEvento, ROTA_EVENTOS, type FalhaEvento, type ResultadoEvento } from '@/stores/eventos'
import type {
  ListaTarefasDto,
  PendenciasTarefasDto,
  SalvarTarefaRequest,
  StatusTarefa,
  TarefaDto,
} from '@/tipos/tarefas'

export const ROTA_PENDENCIAS_TAREFAS = '/api/tarefas/pendencias'

export function caminhoTarefas(eventoId: string, tarefaId?: string, acao?: string): string {
  const base = `${ROTA_EVENTOS}/${encodeURIComponent(eventoId)}/tarefas`
  const comTarefa = tarefaId ? `${base}/${encodeURIComponent(tarefaId)}` : base
  return acao ? `${comTarefa}/${acao}` : comTarefa
}

export const useTarefasStore = defineStore('tarefas', () => {
  const eventoId = ref<string | null>(null)
  const lista = ref<ListaTarefasDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaEvento | null>(null)

  const pendencias = ref<PendenciasTarefasDto | null>(null)
  const carregandoPendencias = ref(false)
  const falhaPendencias = ref<FalhaEvento | null>(null)

  async function carregar(id: string): Promise<void> {
    if (eventoId.value !== id) {
      lista.value = null
    }
    eventoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<ListaTarefasDto>(caminhoTarefas(id))
      if (eventoId.value === id) {
        lista.value = resposta
      }
    } catch (erro) {
      if (eventoId.value === id) {
        lista.value = null
        falha.value = interpretarFalhaEvento(erro)
      }
    } finally {
      if (eventoId.value === id) {
        carregando.value = false
      }
    }
  }

  async function recarregarSilenciosamente(id: string): Promise<void> {
    if (eventoId.value !== id) {
      return
    }
    try {
      const resposta = await requisitar<ListaTarefasDto>(caminhoTarefas(id))
      if (eventoId.value === id) {
        lista.value = resposta
      }
    } catch {
      return
    }
  }

  function substituir(id: string, tarefa: TarefaDto) {
    if (eventoId.value !== id || !lista.value) {
      return
    }
    const indice = lista.value.tarefas.findIndex((item) => item.id === tarefa.id)
    if (indice >= 0) {
      lista.value.tarefas.splice(indice, 1, tarefa)
    }
  }

  async function obter(id: string, tarefaId: string): Promise<ResultadoEvento<TarefaDto>> {
    try {
      return { ok: true, valor: await requisitar<TarefaDto>(caminhoTarefas(id, tarefaId)) }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function criar(id: string, dados: SalvarTarefaRequest): Promise<ResultadoEvento<TarefaDto>> {
    try {
      const tarefa = await requisitar<TarefaDto>(caminhoTarefas(id), { metodo: 'POST', corpo: dados })
      void recarregarSilenciosamente(id)
      return { ok: true, valor: tarefa }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function atualizar(id: string, tarefaId: string, dados: SalvarTarefaRequest): Promise<ResultadoEvento<TarefaDto>> {
    try {
      const tarefa = await requisitar<TarefaDto>(caminhoTarefas(id, tarefaId), { metodo: 'PUT', corpo: dados })
      substituir(id, tarefa)
      void recarregarSilenciosamente(id)
      return { ok: true, valor: tarefa }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function alterarStatus(id: string, tarefaId: string, status: StatusTarefa): Promise<ResultadoEvento<TarefaDto>> {
    try {
      const tarefa = await requisitar<TarefaDto>(caminhoTarefas(id, tarefaId, 'status'), {
        metodo: 'PATCH',
        corpo: { status },
      })
      substituir(id, tarefa)
      void recarregarSilenciosamente(id)
      return { ok: true, valor: tarefa }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function remover(id: string, tarefaId: string): Promise<ResultadoEvento<null>> {
    try {
      await requisitar<void>(caminhoTarefas(id, tarefaId), { metodo: 'DELETE' })
      if (eventoId.value === id && lista.value) {
        lista.value.tarefas = lista.value.tarefas.filter((tarefa) => tarefa.id !== tarefaId)
      }
      void recarregarSilenciosamente(id)
      return { ok: true, valor: null }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function carregarPendencias(): Promise<void> {
    carregandoPendencias.value = true
    falhaPendencias.value = null
    try {
      pendencias.value = await requisitar<PendenciasTarefasDto>(ROTA_PENDENCIAS_TAREFAS)
    } catch (erro) {
      pendencias.value = null
      falhaPendencias.value = interpretarFalhaEvento(erro)
    } finally {
      carregandoPendencias.value = false
    }
  }

  return {
    eventoId,
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
