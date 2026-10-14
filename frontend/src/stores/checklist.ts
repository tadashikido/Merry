import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import {
  interpretarFalhaCasamento,
  ROTA_CASAMENTOS,
  useCasamentosStore,
  type FalhaCasamento,
  type ResultadoCasamento,
} from '@/stores/casamentos'
import { useTarefasStore } from '@/stores/tarefas'
import type { AplicacaoModeloChecklistDto, ChecklistCasamentoDto, RecalculoPrazosDto } from '@/tipos/checklist'
import type { StatusTarefa, TarefaDto } from '@/tipos/tarefas'

export function caminhoChecklist(casamentoId: string, acao?: string): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/checklist`
  return acao ? `${base}/${acao}` : base
}

export const useChecklistStore = defineStore('checklist', () => {
  const casamentoId = ref<string | null>(null)
  const dados = ref<ChecklistCasamentoDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaCasamento | null>(null)

  const casamentos = useCasamentosStore()
  const tarefas = useTarefasStore()

  function aplicarPercentual(id: string, checklist: ChecklistCasamentoDto) {
    casamentos.definirPercentualChecklist(id, checklist.progresso.percentual)
  }

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      dados.value = null
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<ChecklistCasamentoDto>(caminhoChecklist(id))
      if (casamentoId.value === id) {
        dados.value = resposta
        aplicarPercentual(id, resposta)
      }
    } catch (erro) {
      if (casamentoId.value === id) {
        dados.value = null
        falha.value = interpretarFalhaCasamento(erro)
      }
    } finally {
      if (casamentoId.value === id) {
        carregando.value = false
      }
    }
  }

  async function recarregarSilenciosamente(id: string): Promise<void> {
    try {
      const resposta = await requisitar<ChecklistCasamentoDto>(caminhoChecklist(id))
      aplicarPercentual(id, resposta)
      if (casamentoId.value === id) {
        dados.value = resposta
      }
    } catch {
      return
    }
  }

  async function previa(id: string, modeloId: string): Promise<ResultadoCasamento<AplicacaoModeloChecklistDto>> {
    try {
      const caminho = `${caminhoChecklist(id, 'previa')}?modeloId=${encodeURIComponent(modeloId)}`
      return { ok: true, valor: await requisitar<AplicacaoModeloChecklistDto>(caminho) }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function aplicar(id: string, modeloId: string): Promise<ResultadoCasamento<AplicacaoModeloChecklistDto>> {
    try {
      const resultado = await requisitar<AplicacaoModeloChecklistDto>(caminhoChecklist(id, 'aplicacoes'), {
        metodo: 'POST',
        corpo: { modeloId },
      })
      casamentos.definirPercentualChecklist(id, resultado.progresso.percentual)
      await recarregarSilenciosamente(id)
      return { ok: true, valor: resultado }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function consultarRecalculo(id: string): Promise<ResultadoCasamento<RecalculoPrazosDto>> {
    try {
      return { ok: true, valor: await requisitar<RecalculoPrazosDto>(caminhoChecklist(id, 'recalculo-prazos')) }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function recalcular(id: string): Promise<ResultadoCasamento<RecalculoPrazosDto>> {
    try {
      const resultado = await requisitar<RecalculoPrazosDto>(caminhoChecklist(id, 'recalculo-prazos'), { metodo: 'POST' })
      if (casamentoId.value === id) {
        await recarregarSilenciosamente(id)
      }
      return { ok: true, valor: resultado }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function alterarStatus(id: string, tarefaId: string, status: StatusTarefa): Promise<ResultadoCasamento<TarefaDto>> {
    const resultado = await tarefas.alterarStatus(id, tarefaId, status)
    if (resultado.ok && casamentoId.value === id && dados.value) {
      const indice = dados.value.tarefas.findIndex((tarefa) => tarefa.id === tarefaId)
      if (indice >= 0) {
        dados.value.tarefas.splice(indice, 1, resultado.valor)
      }
      void recarregarSilenciosamente(id)
    }
    return resultado
  }

  return {
    casamentoId,
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
