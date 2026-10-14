import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaCasamento, ROTA_CASAMENTOS, type FalhaCasamento, type ResultadoCasamento } from '@/stores/casamentos'
import type { CronogramaDto, ItemCronogramaDto, SalvarItemCronogramaRequest } from '@/tipos/cronograma'
import type { AplicacaoModeloCronogramaDto, RecalculoHorariosDto } from '@/tipos/modelosCronograma'

export function caminhoCronograma(casamentoId: string, itemId?: string): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/cronograma`
  return itemId ? `${base}/${encodeURIComponent(itemId)}` : base
}

export const useCronogramaStore = defineStore('cronograma', () => {
  const casamentoId = ref<string | null>(null)
  const cronograma = ref<CronogramaDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaCasamento | null>(null)

  async function buscar(id: string): Promise<void> {
    const resposta = await requisitar<CronogramaDto>(caminhoCronograma(id))
    if (casamentoId.value === id) {
      cronograma.value = resposta
    }
  }

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      cronograma.value = null
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null

    try {
      await buscar(id)
    } catch (erro) {
      if (casamentoId.value === id) {
        cronograma.value = null
        falha.value = interpretarFalhaCasamento(erro)
      }
    } finally {
      if (casamentoId.value === id) {
        carregando.value = false
      }
    }
  }

  async function recarregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      return
    }
    try {
      await buscar(id)
    } catch {
      return
    }
  }

  async function criar(id: string, dados: SalvarItemCronogramaRequest): Promise<ResultadoCasamento<ItemCronogramaDto>> {
    try {
      const item = await requisitar<ItemCronogramaDto>(caminhoCronograma(id), { metodo: 'POST', corpo: dados })
      await recarregar(id)
      return { ok: true, valor: item }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function atualizar(
    id: string,
    itemId: string,
    dados: SalvarItemCronogramaRequest,
  ): Promise<ResultadoCasamento<ItemCronogramaDto>> {
    try {
      const item = await requisitar<ItemCronogramaDto>(caminhoCronograma(id, itemId), { metodo: 'PUT', corpo: dados })
      await recarregar(id)
      return { ok: true, valor: item }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function remover(id: string, itemId: string): Promise<ResultadoCasamento<null>> {
    try {
      await requisitar<void>(caminhoCronograma(id, itemId), { metodo: 'DELETE' })
      if (casamentoId.value === id && cronograma.value) {
        cronograma.value = {
          ...cronograma.value,
          itens: cronograma.value.itens.filter((item) => item.id !== itemId),
        }
      }
      await recarregar(id)
      return { ok: true, valor: null }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  async function executar<T>(acao: () => Promise<T>): Promise<ResultadoCasamento<T>> {
    try {
      return { ok: true, valor: await acao() }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  function previa(id: string, modeloId: string): Promise<ResultadoCasamento<AplicacaoModeloCronogramaDto>> {
    return executar(() =>
      requisitar<AplicacaoModeloCronogramaDto>(`${caminhoCronograma(id)}/previa?modeloId=${encodeURIComponent(modeloId)}`),
    )
  }

  async function aplicar(id: string, modeloId: string): Promise<ResultadoCasamento<AplicacaoModeloCronogramaDto>> {
    const resultado = await executar(() =>
      requisitar<AplicacaoModeloCronogramaDto>(`${caminhoCronograma(id)}/aplicacoes`, { metodo: 'POST', corpo: { modeloId } }),
    )
    if (resultado.ok) {
      await recarregar(id)
    }
    return resultado
  }

  function consultarRecalculo(id: string): Promise<ResultadoCasamento<RecalculoHorariosDto>> {
    return executar(() => requisitar<RecalculoHorariosDto>(`${caminhoCronograma(id)}/recalculo-horarios`))
  }

  async function recalcular(id: string): Promise<ResultadoCasamento<RecalculoHorariosDto>> {
    const resultado = await executar(() =>
      requisitar<RecalculoHorariosDto>(`${caminhoCronograma(id)}/recalculo-horarios`, { metodo: 'POST' }),
    )
    if (resultado.ok) {
      await recarregar(id)
    }
    return resultado
  }

  return {
    casamentoId,
    cronograma,
    carregando,
    falha,
    carregar,
    recarregar,
    criar,
    atualizar,
    remover,
    previa,
    aplicar,
    consultarRecalculo,
    recalcular,
  }
})
