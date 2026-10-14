import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaCasamento, type FalhaCasamento, type ResultadoCasamento } from '@/stores/casamentos'
import type {
  ItemModeloChecklistDto,
  ModeloChecklistDto,
  ModeloChecklistResumoDto,
  SalvarItemModeloChecklistRequest,
  SalvarModeloChecklistRequest,
} from '@/tipos/checklist'

export const ROTA_MODELOS_CHECKLIST = '/api/modelos-checklist'

export function caminhoModelo(modeloId?: string, itemId?: string): string {
  const base = modeloId ? `${ROTA_MODELOS_CHECKLIST}/${encodeURIComponent(modeloId)}` : ROTA_MODELOS_CHECKLIST
  if (!modeloId || itemId === undefined) {
    return base
  }
  return itemId ? `${base}/itens/${encodeURIComponent(itemId)}` : `${base}/itens`
}

async function executar<T>(acao: () => Promise<T>): Promise<ResultadoCasamento<T>> {
  try {
    return { ok: true, valor: await acao() }
  } catch (erro) {
    return { ok: false, falha: interpretarFalhaCasamento(erro) }
  }
}

export const useModelosChecklistStore = defineStore('modelosChecklist', () => {
  const lista = ref<ModeloChecklistResumoDto[] | null>(null)
  const carregandoLista = ref(false)
  const falhaLista = ref<FalhaCasamento | null>(null)

  const atual = ref<ModeloChecklistDto | null>(null)
  const carregandoAtual = ref(false)
  const falhaAtual = ref<FalhaCasamento | null>(null)

  async function listar(): Promise<void> {
    carregandoLista.value = true
    falhaLista.value = null
    try {
      lista.value = await requisitar<ModeloChecklistResumoDto[]>(ROTA_MODELOS_CHECKLIST)
    } catch (erro) {
      lista.value = null
      falhaLista.value = interpretarFalhaCasamento(erro)
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
      atual.value = await requisitar<ModeloChecklistDto>(caminhoModelo(modeloId))
    } catch (erro) {
      atual.value = null
      falhaAtual.value = interpretarFalhaCasamento(erro)
    } finally {
      carregandoAtual.value = false
    }
  }

  async function recarregarSilenciosamente(modeloId: string): Promise<void> {
    if (atual.value?.id !== modeloId) {
      return
    }
    try {
      atual.value = await requisitar<ModeloChecklistDto>(caminhoModelo(modeloId))
    } catch {
      return
    }
  }

  function obter(modeloId: string): Promise<ResultadoCasamento<ModeloChecklistDto>> {
    return executar(() => requisitar<ModeloChecklistDto>(caminhoModelo(modeloId)))
  }

  async function criar(dados: SalvarModeloChecklistRequest): Promise<ResultadoCasamento<ModeloChecklistDto>> {
    const resultado = await executar(() =>
      requisitar<ModeloChecklistDto>(ROTA_MODELOS_CHECKLIST, { metodo: 'POST', corpo: dados }),
    )
    if (resultado.ok) {
      atual.value = resultado.valor
      lista.value = null
    }
    return resultado
  }

  async function atualizar(modeloId: string, dados: SalvarModeloChecklistRequest): Promise<ResultadoCasamento<ModeloChecklistDto>> {
    const resultado = await executar(() =>
      requisitar<ModeloChecklistDto>(caminhoModelo(modeloId), { metodo: 'PUT', corpo: dados }),
    )
    if (resultado.ok) {
      atual.value = resultado.valor
      lista.value = null
    }
    return resultado
  }

  async function remover(modeloId: string): Promise<ResultadoCasamento<null>> {
    const resultado = await executar(() => requisitar<void>(caminhoModelo(modeloId), { metodo: 'DELETE' }))
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
    dados: SalvarItemModeloChecklistRequest,
  ): Promise<ResultadoCasamento<ItemModeloChecklistDto>> {
    const resultado = await executar(() =>
      requisitar<ItemModeloChecklistDto>(caminhoModelo(modeloId, ''), { metodo: 'POST', corpo: dados }),
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
    dados: SalvarItemModeloChecklistRequest,
  ): Promise<ResultadoCasamento<ItemModeloChecklistDto>> {
    const resultado = await executar(() =>
      requisitar<ItemModeloChecklistDto>(caminhoModelo(modeloId, itemId), { metodo: 'PUT', corpo: dados }),
    )
    if (resultado.ok) {
      void recarregarSilenciosamente(modeloId)
    }
    return resultado
  }

  async function removerItem(modeloId: string, itemId: string): Promise<ResultadoCasamento<null>> {
    const resultado = await executar(() => requisitar<void>(caminhoModelo(modeloId, itemId), { metodo: 'DELETE' }))
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
    criarItem,
    atualizarItem,
    removerItem,
    limpar,
  }
})
