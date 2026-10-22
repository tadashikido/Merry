import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import {
  interpretarFalhaEvento,
  ROTA_EVENTOS,
  useEventosStore,
  type FalhaEvento,
  type ResultadoEvento,
} from '@/stores/eventos'
import { useTarefasStore } from '@/stores/tarefas'
import type { AplicacaoModeloChecklistDto, ChecklistEventoDto, RecalculoPrazosDto } from '@/tipos/checklist'
import type { StatusTarefa, TarefaDto } from '@/tipos/tarefas'

export function caminhoChecklist(eventoId: string, acao?: string): string {
  const base = `${ROTA_EVENTOS}/${encodeURIComponent(eventoId)}/checklist`
  return acao ? `${base}/${acao}` : base
}

export const useChecklistStore = defineStore('checklist', () => {
  const eventoId = ref<string | null>(null)
  const dados = ref<ChecklistEventoDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaEvento | null>(null)

  const eventos = useEventosStore()
  const tarefas = useTarefasStore()

  function aplicarPercentual(id: string, checklist: ChecklistEventoDto) {
    eventos.definirPercentualChecklist(id, checklist.progresso.percentual)
  }

  async function carregar(id: string): Promise<void> {
    if (eventoId.value !== id) {
      dados.value = null
    }
    eventoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<ChecklistEventoDto>(caminhoChecklist(id))
      if (eventoId.value === id) {
        dados.value = resposta
        aplicarPercentual(id, resposta)
      }
    } catch (erro) {
      if (eventoId.value === id) {
        dados.value = null
        falha.value = interpretarFalhaEvento(erro)
      }
    } finally {
      if (eventoId.value === id) {
        carregando.value = false
      }
    }
  }

  async function recarregarSilenciosamente(id: string): Promise<void> {
    try {
      const resposta = await requisitar<ChecklistEventoDto>(caminhoChecklist(id))
      aplicarPercentual(id, resposta)
      if (eventoId.value === id) {
        dados.value = resposta
      }
    } catch {
      return
    }
  }

  async function previa(id: string, modeloId: string): Promise<ResultadoEvento<AplicacaoModeloChecklistDto>> {
    try {
      const caminho = `${caminhoChecklist(id, 'previa')}?modeloId=${encodeURIComponent(modeloId)}`
      return { ok: true, valor: await requisitar<AplicacaoModeloChecklistDto>(caminho) }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function aplicar(id: string, modeloId: string): Promise<ResultadoEvento<AplicacaoModeloChecklistDto>> {
    try {
      const resultado = await requisitar<AplicacaoModeloChecklistDto>(caminhoChecklist(id, 'aplicacoes'), {
        metodo: 'POST',
        corpo: { modeloId },
      })
      eventos.definirPercentualChecklist(id, resultado.progresso.percentual)
      await recarregarSilenciosamente(id)
      return { ok: true, valor: resultado }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function consultarRecalculo(id: string): Promise<ResultadoEvento<RecalculoPrazosDto>> {
    try {
      return { ok: true, valor: await requisitar<RecalculoPrazosDto>(caminhoChecklist(id, 'recalculo-prazos')) }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function recalcular(id: string): Promise<ResultadoEvento<RecalculoPrazosDto>> {
    try {
      const resultado = await requisitar<RecalculoPrazosDto>(caminhoChecklist(id, 'recalculo-prazos'), { metodo: 'POST' })
      if (eventoId.value === id) {
        await recarregarSilenciosamente(id)
      }
      return { ok: true, valor: resultado }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function alterarStatus(id: string, tarefaId: string, status: StatusTarefa): Promise<ResultadoEvento<TarefaDto>> {
    const resultado = await tarefas.alterarStatus(id, tarefaId, status)
    if (resultado.ok && eventoId.value === id && dados.value) {
      const indice = dados.value.tarefas.findIndex((tarefa) => tarefa.id === tarefaId)
      if (indice >= 0) {
        dados.value.tarefas.splice(indice, 1, resultado.valor)
      }
      void recarregarSilenciosamente(id)
    }
    return resultado
  }

  return {
    eventoId,
    dados,
    carregando,
    falha,
    carregar,
    previa,
    aplicar,
    consultarRecalculo,
    recalcular,
    alterarStatus,
  }
})
