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
import { useExclusoesAdiadasStore } from '@/stores/exclusoesAdiadas'
import type { MapaMesasDto, MesaDto, SalvarMesaRequest } from '@/tipos/mesas'

export function caminhoMesas(casamentoId: string, ...segmentos: string[]): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/mesas`
  return segmentos.length === 0 ? base : `${base}/${segmentos.map(encodeURIComponent).join('/')}`
}

export function escopoMesas(casamentoId: string): string {
  return `mesas:${casamentoId}`
}

export function ocultarMesas(mapa: MapaMesasDto, ids: Set<string>): MapaMesasDto {
  const removidas = mapa.mesas.filter((mesa) => ids.has(mesa.id))
  if (removidas.length === 0) {
    return mapa
  }
  const desalocadas = mapa.pessoas.filter((pessoa) => pessoa.mesaId !== null && ids.has(pessoa.mesaId)).length
  return {
    ...mapa,
    mesas: mapa.mesas.filter((mesa) => !ids.has(mesa.id)),
    pessoas: mapa.pessoas.map((pessoa) =>
      pessoa.mesaId !== null && ids.has(pessoa.mesaId) ? { ...pessoa, mesaId: null } : pessoa,
    ),
    totais: {
      ...mapa.totais,
      mesas: mapa.totais.mesas - removidas.length,
      capacidadeTotal: mapa.totais.capacidadeTotal - removidas.reduce((soma, mesa) => soma + mesa.capacidade, 0),
      acomodados: mapa.totais.acomodados - desalocadas,
      lugaresLivres:
        mapa.totais.lugaresLivres - removidas.reduce((soma, mesa) => soma + Math.max(mesa.capacidade - mesa.ocupacao, 0), 0),
      semMesa: mapa.totais.semMesa + desalocadas,
    },
  }
}

async function executar<T>(acao: () => Promise<T>): Promise<ResultadoCasamento<T>> {
  try {
    return { ok: true, valor: await acao() }
  } catch (erro) {
    return { ok: false, falha: interpretarFalhaCasamento(erro) }
  }
}

export const useMesasStore = defineStore('mesas', () => {
  const exclusoes = useExclusoesAdiadasStore()
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
        mapa.value = ocultarPendentes(id, resposta)
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

  function ocultarPendentes(id: string, atual: MapaMesasDto): MapaMesasDto {
    return ocultarMesas(atual, exclusoes.chavesPendentes(escopoMesas(id)))
  }

  function aplicarMapa(id: string, novo: MapaMesasDto) {
    if (casamentoId.value === id) {
      mapa.value = ocultarPendentes(id, novo)
    }
  }

  function efetivarPendentes(id: string): Promise<void> {
    return exclusoes.efetivarEscopo(escopoMesas(id))
  }

  async function aposFalha<T>(id: string, resultado: ResultadoCasamento<T>): Promise<ResultadoCasamento<T>> {
    if (!resultado.ok && (resultado.falha.tipo === 'conflito' || resultado.falha.tipo === 'regra')) {
      await carregar(id)
    }
    return resultado
  }

  async function criarMesa(id: string, dados: SalvarMesaRequest): Promise<ResultadoCasamento<MesaDto>> {
    await efetivarPendentes(id)
    const resultado = await executar(() => requisitar<MesaDto>(caminhoMesas(id), { metodo: 'POST', corpo: dados }))
    if (resultado.ok) {
      await carregar(id)
    }
    return resultado
  }

  async function atualizarMesa(id: string, mesaId: string, dados: SalvarMesaRequest): Promise<ResultadoCasamento<MesaDto>> {
    await efetivarPendentes(id)
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

  async function recarregarSeAtual(id: string): Promise<void> {
    if (casamentoId.value === id) {
      await carregar(id)
    }
  }

  function removerMesaComDesfazer(id: string, mesaId: string, aoFalhar?: (falha: FalhaCasamento) => void) {
    let falhaEfetivacao: FalhaCasamento | null = null
    exclusoes.agendar({
      escopo: escopoMesas(id),
      chave: mesaId,
      efetivar: async () => {
        const resultado = await executar(() => requisitar<void>(caminhoMesas(id, mesaId), { metodo: 'DELETE' }))
        if (!resultado.ok) {
          falhaEfetivacao = resultado.falha
        }
        await recarregarSeAtual(id)
        return resultado.ok
      },
      aoFalhar: () => {
        if (falhaEfetivacao) {
          aoFalhar?.(falhaEfetivacao)
        }
      },
    })
    if (casamentoId.value === id && mapa.value) {
      mapa.value = ocultarPendentes(id, mapa.value)
    }
  }

  async function desfazerRemocaoMesa(id: string, mesaId: string): Promise<boolean> {
    if (!exclusoes.desfazer(escopoMesas(id), mesaId)) {
      return false
    }
    await recarregarSeAtual(id)
    return true
  }

  function concluirRemocaoMesa(id: string, mesaId: string): Promise<void> {
    return exclusoes.efetivar(escopoMesas(id), mesaId)
  }

  async function sentar(id: string, mesaId: string, convidadosIds: string[]): Promise<ResultadoCasamento<MapaMesasDto>> {
    await efetivarPendentes(id)
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
    await efetivarPendentes(id)
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
    await efetivarPendentes(id)
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
    removerMesaComDesfazer,
    desfazerRemocaoMesa,
    concluirRemocaoMesa,
    sentar,
    retirar,
    dispensarAvisos,
    limpar,
  }
})
