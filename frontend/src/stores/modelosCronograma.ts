import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaEvento, ROTA_EVENTOS, type FalhaEvento, type ResultadoEvento } from '@/stores/eventos'
import type {
  ItemModeloCronogramaDto,
  ModeloCronogramaDto,
  ModeloCronogramaResumoDto,
  SalvarItemModeloCronogramaRequest,
  SalvarModeloCronogramaRequest,
} from '@/tipos/modelosCronograma'

export const ROTA_MODELOS_CRONOGRAMA = '/api/modelos-cronograma'

export function caminhoModeloCronograma(modeloId?: string, itemId?: string): string {
  const base = modeloId ? `${ROTA_MODELOS_CRONOGRAMA}/${encodeURIComponent(modeloId)}` : ROTA_MODELOS_CRONOGRAMA
  if (!modeloId || itemId === undefined) {
    return base
  }
  return itemId ? `${base}/itens/${encodeURIComponent(itemId)}` : `${base}/itens`
}

async function executar<T>(acao: () => Promise<T>): Promise<ResultadoEvento<T>> {
  try {
    return { ok: true, valor: await acao() }
  } catch (erro) {
    return { ok: false, falha: interpretarFalhaEvento(erro) }
  }
}

export const useModelosCronogramaStore = defineStore('modelosCronograma', () => {
  const lista = ref<ModeloCronogramaResumoDto[] | null>(null)
  const carregandoLista = ref(false)
  const falhaLista = ref<FalhaEvento | null>(null)

  const atual = ref<ModeloCronogramaDto | null>(null)
  const carregandoAtual = ref(false)
  const falhaAtual = ref<FalhaEvento | null>(null)

  async function listar(): Promise<void> {
    carregandoLista.value = true
    falhaLista.value = null
    try {
      lista.value = await requisitar<ModeloCronogramaResumoDto[]>(ROTA_MODELOS_CRONOGRAMA)
    } catch (erro) {
      lista.value = null
      falhaLista.value = interpretarFalhaEvento(erro)
    } finally {
      carregandoLista.value = false
    }
  }

  async function carregar(modeloId: string): Promise<void> {
    if (atual.value?.id !== modeloId) {
      atual.value = null
    }
    carregandoAtual.value = true
    falhaAtual.value = null
    try {
      atual.value = await requisitar<ModeloCronogramaDto>(caminhoModeloCronograma(modeloId))
    } catch (erro) {
      atual.value = null
      falhaAtual.value = interpretarFalhaEvento(erro)
    } finally {
      carregandoAtual.value = false
    }
  }

  async function recarregarSilenciosamente(modeloId: string): Promise<void> {
    if (atual.value?.id !== modeloId) {
      return
    }
    try {
      atual.value = await requisitar<ModeloCronogramaDto>(caminhoModeloCronograma(modeloId))
    } catch {
      return
    }
  }

  function obter(modeloId: string): Promise<ResultadoEvento<ModeloCronogramaDto>> {
    return executar(() => requisitar<ModeloCronogramaDto>(caminhoModeloCronograma(modeloId)))
  }

  async function criar(dados: SalvarModeloCronogramaRequest): Promise<ResultadoEvento<ModeloCronogramaDto>> {
    const resultado = await executar(() =>
      requisitar<ModeloCronogramaDto>(ROTA_MODELOS_CRONOGRAMA, { metodo: 'POST', corpo: dados }),
    )
    if (resultado.ok) {
      atual.value = resultado.valor
      lista.value = null
    }
    return resultado
  }

  async function atualizar(modeloId: string, dados: SalvarModeloCronogramaRequest): Promise<ResultadoEvento<ModeloCronogramaDto>> {
    const resultado = await executar(() =>
      requisitar<ModeloCronogramaDto>(caminhoModeloCronograma(modeloId), { metodo: 'PUT', corpo: dados }),
    )
    if (resultado.ok) {
      atual.value = resultado.valor
      lista.value = null
    }
    return resultado
  }

  async function salvarDoEvento(
    eventoId: string,
    dados: SalvarModeloCronogramaRequest,
  ): Promise<ResultadoEvento<ModeloCronogramaDto>> {
    const resultado = await executar(() =>
      requisitar<ModeloCronogramaDto>(`${ROTA_EVENTOS}/${encodeURIComponent(eventoId)}/cronograma/modelos`, {
        metodo: 'POST',
        corpo: dados,
      }),
    )
    if (resultado.ok) {
      atual.value = resultado.valor
      lista.value = null
    }
    return resultado
  }

  async function remover(modeloId: string): Promise<ResultadoEvento<null>> {
    const resultado = await executar(() => requisitar<void>(caminhoModeloCronograma(modeloId), { metodo: 'DELETE' }))
    if (!resultado.ok) {
      return resultado
    }
    if (lista.value) {
      lista.value = lista.value.filter((modelo) => modelo.id !== modeloId)
    }
    if (atual.value?.id === modeloId) {
      atual.value = null
    }
    return { ok: true, valor: null }
  }

  async function criarItem(
    modeloId: string,
    dados: SalvarItemModeloCronogramaRequest,
  ): Promise<ResultadoEvento<ItemModeloCronogramaDto>> {
    const resultado = await executar(() =>
      requisitar<ItemModeloCronogramaDto>(caminhoModeloCronograma(modeloId, ''), { metodo: 'POST', corpo: dados }),
    )
    if (resultado.ok) {
      lista.value = null
      void recarregarSilenciosamente(modeloId)
    }
    return resultado
  }

  async function atualizarItem(
    modeloId: string,
    itemId: string,
    dados: SalvarItemModeloCronogramaRequest,
  ): Promise<ResultadoEvento<ItemModeloCronogramaDto>> {
    const resultado = await executar(() =>
      requisitar<ItemModeloCronogramaDto>(caminhoModeloCronograma(modeloId, itemId), { metodo: 'PUT', corpo: dados }),
    )
    if (resultado.ok) {
      void recarregarSilenciosamente(modeloId)
    }
    return resultado
  }

  async function removerItem(modeloId: string, itemId: string): Promise<ResultadoEvento<null>> {
    const resultado = await executar(() => requisitar<void>(caminhoModeloCronograma(modeloId, itemId), { metodo: 'DELETE' }))
    if (!resultado.ok) {
      return resultado
    }
    if (atual.value?.id === modeloId) {
      atual.value = { ...atual.value, itens: atual.value.itens.filter((item) => item.id !== itemId) }
    }
    lista.value = null
    void recarregarSilenciosamente(modeloId)
    return { ok: true, valor: null }
  }

  function limpar() {
    lista.value = null
    carregandoLista.value = false
    falhaLista.value = null
    atual.value = null
    carregandoAtual.value = false
    falhaAtual.value = null
  }

  return {
    lista,
    carregandoLista,
    falhaLista,
    atual,
    carregandoAtual,
    falhaAtual,
    listar,
    carregar,
    obter,
    criar,
    atualizar,
    remover,
    salvarDoEvento,
    criarItem,
    atualizarItem,
    removerItem,
    limpar,
  }
})
