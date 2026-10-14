import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import {
  interpretarFalhaCasamento,
  ROTA_CASAMENTOS,
  type FalhaCasamento,
  type ResultadoCasamento,
} from '@/stores/casamentos'
import type { MapaMesasDto, MesaDto, SalvarMesaRequest } from '@/tipos/mesas'

export function caminhoMesas(casamentoId: string, ...segmentos: string[]): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/mesas`
  return segmentos.length === 0 ? base : `${base}/${segmentos.map(encodeURIComponent).join('/')}`
}

async function executar<T>(acao: () => Promise<T>): Promise<ResultadoCasamento<T>> {
  try {
    return { ok: true, valor: await acao() }
  } catch (erro) {
    return { ok: false, falha: interpretarFalhaCasamento(erro) }
  }
}

export const useMesasStore = defineStore('mesas', () => {
  const casamentoId = ref<string | null>(null)
  const mapa = ref<MapaMesasDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaCasamento | null>(null)

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      mapa.value = null
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<MapaMesasDto>(caminhoMesas(id))
      if (casamentoId.value === id) {
        mapa.value = resposta
      }
    } catch (erro) {
      if (casamentoId.value === id) {
        mapa.value = null
        falha.value = interpretarFalhaCasamento(erro)
      }
    } finally {
      if (casamentoId.value === id) {
        carregando.value = false
      }
    }
  }

  function aplicarMapa(id: string, novo: MapaMesasDto) {
    if (casamentoId.value === id) {
      mapa.value = novo
    }
  }

  async function aposFalha<T>(id: string, resultado: ResultadoCasamento<T>): Promise<ResultadoCasamento<T>> {
    if (!resultado.ok && (resultado.falha.tipo === 'conflito' || resultado.falha.tipo === 'regra')) {
      await carregar(id)
    }
    return resultado
  }

  async function criarMesa(id: string, dados: SalvarMesaRequest): Promise<ResultadoCasamento<MesaDto>> {
    const resultado = await executar(() => requisitar<MesaDto>(caminhoMesas(id), { metodo: 'POST', corpo: dados }))
    if (resultado.ok) {
      await carregar(id)
    }
    return resultado
  }

  async function atualizarMesa(id: string, mesaId: string, dados: SalvarMesaRequest): Promise<ResultadoCasamento<MesaDto>> {
    const resultado = await executar(() =>
      requisitar<MesaDto>(caminhoMesas(id, mesaId), { metodo: 'PUT', corpo: dados }),
    )
    if (resultado.ok) {
      await carregar(id)
    } else if (resultado.falha.tipo === 'conflito') {
      await carregar(id)
    }
    return resultado
  }

  async function removerMesa(id: string, mesaId: string): Promise<ResultadoCasamento<null>> {
    const resultado = await executar(() => requisitar<void>(caminhoMesas(id, mesaId), { metodo: 'DELETE' }))
    if (resultado.ok) {
      await carregar(id)
      return { ok: true, valor: null }
    }
    return aposFalha(id, resultado)
  }

  async function sentar(id: string, mesaId: string, convidadosIds: string[]): Promise<ResultadoCasamento<MapaMesasDto>> {
    const resultado = await executar(() =>
      requisitar<MapaMesasDto>(caminhoMesas(id, mesaId, 'pessoas'), { metodo: 'POST', corpo: { convidadosIds } }),
    )
    if (resultado.ok) {
      aplicarMapa(id, resultado.valor)
      return resultado
    }
    return aposFalha(id, resultado)
  }

  async function retirar(id: string, convidadosIds: string[]): Promise<ResultadoCasamento<MapaMesasDto>> {
    const resultado = await executar(() =>
      requisitar<MapaMesasDto>(caminhoMesas(id, 'retirada'), { metodo: 'POST', corpo: { convidadosIds } }),
    )
    if (resultado.ok) {
      aplicarMapa(id, resultado.valor)
      return resultado
    }
    return aposFalha(id, resultado)
  }

  async function dispensarAvisos(id: string, convidadosIds: string[]): Promise<ResultadoCasamento<MapaMesasDto>> {
    const resultado = await executar(() =>
      requisitar<MapaMesasDto>(caminhoMesas(id, 'avisos-saida', 'dispensa'), { metodo: 'POST', corpo: { convidadosIds } }),
    )
    if (resultado.ok) {
      aplicarMapa(id, resultado.valor)
      return resultado
    }
    return aposFalha(id, resultado)
  }

  function limpar() {
    casamentoId.value = null
    mapa.value = null
    carregando.value = false
    falha.value = null
  }

  const autenticacao = useAutenticacaoStore()
  watch(
    () => autenticacao.usuario?.organizacao.id ?? null,
    (organizacaoAtual, organizacaoAnterior) => {
      if (organizacaoAtual !== organizacaoAnterior) {
        limpar()
      }
    },
  )

  return {
    casamentoId,
    mapa,
    carregando,
    falha,
    carregar,
    criarMesa,
    atualizarMesa,
    removerMesa,
    sentar,
    retirar,
    dispensarAvisos,
    limpar,
  }
})
