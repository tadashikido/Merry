import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaEvento, ROTA_EVENTOS, type FalhaEvento, type ResultadoEvento } from '@/stores/eventos'
import { useExclusoesAdiadasStore } from '@/stores/exclusoesAdiadas'
import type { CronogramaDto, ItemCronogramaDto, SalvarItemCronogramaRequest } from '@/tipos/cronograma'
import type { AplicacaoModeloCronogramaDto, RecalculoHorariosDto } from '@/tipos/modelosCronograma'

export function caminhoCronograma(eventoId: string, itemId?: string): string {
  const base = `${ROTA_EVENTOS}/${encodeURIComponent(eventoId)}/cronograma`
  return itemId ? `${base}/${encodeURIComponent(itemId)}` : base
}

export function escopoCronograma(eventoId: string): string {
  return `cronograma:${eventoId}`
}

export function ocultarItens(cronograma: CronogramaDto, ids: Set<string>): CronogramaDto {
  if (!cronograma.itens.some((item) => ids.has(item.id))) {
    return cronograma
  }
  return { ...cronograma, itens: cronograma.itens.filter((item) => !ids.has(item.id)) }
}

export const useCronogramaStore = defineStore('cronograma', () => {
  const exclusoes = useExclusoesAdiadasStore()
  const eventoId = ref<string | null>(null)
  const cronograma = ref<CronogramaDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaEvento | null>(null)

  async function buscar(id: string): Promise<void> {
    const resposta = await requisitar<CronogramaDto>(caminhoCronograma(id))
    if (eventoId.value === id) {
      cronograma.value = ocultarItens(resposta, exclusoes.chavesPendentes(escopoCronograma(id)))
    }
  }

  async function carregar(id: string): Promise<void> {
    if (eventoId.value !== id) {
      cronograma.value = null
    }
    eventoId.value = id
    carregando.value = true
    falha.value = null

    try {
      await buscar(id)
    } catch (erro) {
      if (eventoId.value === id) {
        cronograma.value = null
        falha.value = interpretarFalhaEvento(erro)
      }
    } finally {
      if (eventoId.value === id) {
        carregando.value = false
      }
    }
  }

  async function recarregar(id: string): Promise<void> {
    if (eventoId.value !== id) {
      return
    }
    try {
      await buscar(id)
    } catch {
      return
    }
  }

  function efetivarPendentes(id: string): Promise<void> {
    return exclusoes.efetivarEscopo(escopoCronograma(id))
  }

  async function criar(id: string, dados: SalvarItemCronogramaRequest): Promise<ResultadoEvento<ItemCronogramaDto>> {
    await efetivarPendentes(id)
    try {
      const item = await requisitar<ItemCronogramaDto>(caminhoCronograma(id), { metodo: 'POST', corpo: dados })
      await recarregar(id)
      return { ok: true, valor: item }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function atualizar(
    id: string,
    itemId: string,
    dados: SalvarItemCronogramaRequest,
  ): Promise<ResultadoEvento<ItemCronogramaDto>> {
    await efetivarPendentes(id)
    try {
      const item = await requisitar<ItemCronogramaDto>(caminhoCronograma(id, itemId), { metodo: 'PUT', corpo: dados })
      await recarregar(id)
      return { ok: true, valor: item }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function remover(id: string, itemId: string): Promise<ResultadoEvento<null>> {
    try {
      await requisitar<void>(caminhoCronograma(id, itemId), { metodo: 'DELETE' })
      if (eventoId.value === id && cronograma.value) {
        cronograma.value = {
          ...cronograma.value,
          itens: cronograma.value.itens.filter((item) => item.id !== itemId),
        }
      }
      await recarregar(id)
      return { ok: true, valor: null }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  async function executar<T>(acao: () => Promise<T>): Promise<ResultadoEvento<T>> {
    try {
      return { ok: true, valor: await acao() }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  function removerComDesfazer(id: string, itemId: string, aoFalhar?: (falha: FalhaEvento) => void) {
    let falhaEfetivacao: FalhaEvento | null = null
    exclusoes.agendar({
      escopo: escopoCronograma(id),
      chave: itemId,
      efetivar: async () => {
        const resultado = await executar(() => requisitar<void>(caminhoCronograma(id, itemId), { metodo: 'DELETE', manterAtiva: true }))
        if (!resultado.ok) {
          falhaEfetivacao = resultado.falha
        }
        await recarregar(id)
        return resultado.ok
      },
      aoFalhar: () => {
        if (falhaEfetivacao) {
          aoFalhar?.(falhaEfetivacao)
        }
      },
    })
    if (eventoId.value === id && cronograma.value) {
      cronograma.value = ocultarItens(cronograma.value, exclusoes.chavesPendentes(escopoCronograma(id)))
    }
  }

  async function desfazerRemocao(id: string, itemId: string): Promise<boolean> {
    if (!exclusoes.desfazer(escopoCronograma(id), itemId)) {
      return false
    }
    await recarregar(id)
    return true
  }

  function concluirRemocao(id: string, itemId: string): Promise<void> {
    return exclusoes.efetivar(escopoCronograma(id), itemId)
  }

  function previa(id: string, modeloId: string): Promise<ResultadoEvento<AplicacaoModeloCronogramaDto>> {
    return executar(() =>
      requisitar<AplicacaoModeloCronogramaDto>(`${caminhoCronograma(id)}/previa?modeloId=${encodeURIComponent(modeloId)}`),
    )
  }

  async function aplicar(id: string, modeloId: string): Promise<ResultadoEvento<AplicacaoModeloCronogramaDto>> {
    await efetivarPendentes(id)
    const resultado = await executar(() =>
      requisitar<AplicacaoModeloCronogramaDto>(`${caminhoCronograma(id)}/aplicacoes`, { metodo: 'POST', corpo: { modeloId } }),
    )
    if (resultado.ok) {
      await recarregar(id)
    }
    return resultado
  }

  function consultarRecalculo(id: string): Promise<ResultadoEvento<RecalculoHorariosDto>> {
    return executar(() => requisitar<RecalculoHorariosDto>(`${caminhoCronograma(id)}/recalculo-horarios`))
  }

  async function recalcular(id: string): Promise<ResultadoEvento<RecalculoHorariosDto>> {
    await efetivarPendentes(id)
    const resultado = await executar(() =>
      requisitar<RecalculoHorariosDto>(`${caminhoCronograma(id)}/recalculo-horarios`, { metodo: 'POST' }),
    )
    if (resultado.ok) {
      await recarregar(id)
    }
    return resultado
  }

  return {
    eventoId,
    cronograma,
    carregando,
    falha,
    carregar,
    recarregar,
    criar,
    atualizar,
    remover,
    removerComDesfazer,
    desfazerRemocao,
    concluirRemocao,
    previa,
    aplicar,
    consultarRecalculo,
    recalcular,
  }
})
