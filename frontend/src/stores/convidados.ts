import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { interpretarFalhaCasamento, ROTA_CASAMENTOS, type FalhaCasamento } from '@/stores/casamentos'
import type { ConviteDto, ListaConvitesDto, SalvarConviteRequest, TotaisConvidadosDto } from '@/tipos/convidados'
import type { LinkRsvpDto } from '@/tipos/rsvp'

export type FalhaConvidados = FalhaCasamento

export type ResultadoConvidados<T> = { ok: true; valor: T } | { ok: false; falha: FalhaConvidados }

function minusculaInicial(segmento: string): string {
  return segmento.charAt(0).toLowerCase() + segmento.slice(1)
}

export function normalizarChaveCampo(chave: string): string {
  return chave.replace(/^\$\./, '').split('.').map(minusculaInicial).join('.')
}

export function interpretarFalhaConvidados(falha: unknown): FalhaConvidados {
  const interpretada = interpretarFalhaCasamento(falha)
  const errosCampos: Record<string, string> = {}
  for (const [chave, mensagem] of Object.entries(interpretada.errosCampos)) {
    errosCampos[normalizarChaveCampo(chave)] = mensagem
  }
  return { ...interpretada, errosCampos }
}

export function rotaConvites(casamentoId: string, conviteId?: string): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/convites`
  return conviteId ? `${base}/${encodeURIComponent(conviteId)}` : base
}

export const useConvidadosStore = defineStore('convidados', () => {
  const casamentoId = ref<string | null>(null)
  const lista = ref<ListaConvitesDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaConvidados | null>(null)

  const casamentoIdTotais = ref<string | null>(null)
  const totais = ref<TotaisConvidadosDto | null>(null)
  const carregandoTotais = ref(false)
  const falhaTotais = ref<FalhaConvidados | null>(null)

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      lista.value = null
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<ListaConvitesDto>(rotaConvites(id))
      if (casamentoId.value === id) {
        lista.value = resposta
      }
    } catch (erro) {
      if (casamentoId.value === id) {
        lista.value = null
        falha.value = interpretarFalhaConvidados(erro)
      }
    } finally {
      if (casamentoId.value === id) {
        carregando.value = false
      }
    }
  }

  async function carregarTotais(id: string): Promise<void> {
    if (casamentoIdTotais.value !== id) {
      totais.value = null
    }
    casamentoIdTotais.value = id
    carregandoTotais.value = true
    falhaTotais.value = null

    try {
      const resposta = await requisitar<TotaisConvidadosDto>(`${rotaConvites(id)}/totais`)
      if (casamentoIdTotais.value === id) {
        totais.value = resposta
      }
    } catch (erro) {
      if (casamentoIdTotais.value === id) {
        totais.value = null
        falhaTotais.value = interpretarFalhaConvidados(erro)
      }
    } finally {
      if (casamentoIdTotais.value === id) {
        carregandoTotais.value = false
      }
    }
  }

  async function obter(id: string, conviteId: string): Promise<ResultadoConvidados<ConviteDto>> {
    try {
      return { ok: true, valor: await requisitar<ConviteDto>(rotaConvites(id, conviteId)) }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaConvidados(erro) }
    }
  }

  function aposAlteracao(id: string) {
    if (casamentoIdTotais.value === id) {
      totais.value = null
      casamentoIdTotais.value = null
    }
  }

  async function executar<T>(id: string, acao: () => Promise<T>): Promise<ResultadoConvidados<T>> {
    try {
      const valor = await acao()
      aposAlteracao(id)
      return { ok: true, valor }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaConvidados(erro) }
    }
  }

  function criar(id: string, request: SalvarConviteRequest): Promise<ResultadoConvidados<ConviteDto>> {
    return executar(id, () => requisitar<ConviteDto>(rotaConvites(id), { metodo: 'POST', corpo: request }))
  }

  function atualizar(id: string, conviteId: string, request: SalvarConviteRequest): Promise<ResultadoConvidados<ConviteDto>> {
    return executar(id, () => requisitar<ConviteDto>(rotaConvites(id, conviteId), { metodo: 'PUT', corpo: request }))
  }

  function remover(id: string, conviteId: string): Promise<ResultadoConvidados<void>> {
    return executar(id, () => requisitar<void>(rotaConvites(id, conviteId), { metodo: 'DELETE' }))
  }

  function substituirConvite(id: string, convite: ConviteDto) {
    if (casamentoId.value !== id || !lista.value) {
      return
    }
    lista.value = {
      ...lista.value,
      convites: lista.value.convites.map((atual) => (atual.id === convite.id ? convite : atual)),
    }
  }

  function rotaLinkRsvp(id: string, conviteId: string, acao?: string): string {
    const base = `${rotaConvites(id, conviteId)}/link-rsvp`
    return acao ? `${base}/${acao}` : base
  }

  async function tentar<T>(acao: () => Promise<T>): Promise<ResultadoConvidados<T>> {
    try {
      return { ok: true, valor: await acao() }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaConvidados(erro) }
    }
  }

  function obterOuGerarLinkRsvp(id: string, conviteId: string): Promise<ResultadoConvidados<LinkRsvpDto>> {
    return tentar(() => requisitar<LinkRsvpDto>(rotaLinkRsvp(id, conviteId), { metodo: 'POST' }))
  }

  function consultarLinkRsvp(id: string, conviteId: string): Promise<ResultadoConvidados<LinkRsvpDto>> {
    return tentar(() => requisitar<LinkRsvpDto>(rotaLinkRsvp(id, conviteId)))
  }

  function regenerarLinkRsvp(id: string, conviteId: string): Promise<ResultadoConvidados<LinkRsvpDto>> {
    return tentar(() => requisitar<LinkRsvpDto>(rotaLinkRsvp(id, conviteId, 'regenerar'), { metodo: 'POST' }))
  }

  function revogarLinkRsvp(id: string, conviteId: string): Promise<ResultadoConvidados<void>> {
    return tentar(() => requisitar<void>(rotaLinkRsvp(id, conviteId), { metodo: 'DELETE' }))
  }

  async function marcarEnviado(id: string, conviteId: string): Promise<ResultadoConvidados<ConviteDto>> {
    const resultado = await tentar(() => requisitar<ConviteDto>(`${rotaConvites(id, conviteId)}/envio`, { metodo: 'POST' }))
    if (resultado.ok) {
      substituirConvite(id, resultado.valor)
    }
    return resultado
  }

  function invalidar(id: string) {
    aposAlteracao(id)
  }

  function limpar() {
    casamentoId.value = null
    lista.value = null
    carregando.value = false
    falha.value = null
    casamentoIdTotais.value = null
    totais.value = null
    carregandoTotais.value = false
    falhaTotais.value = null
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
    lista,
    carregando,
    falha,
    casamentoIdTotais,
    totais,
    carregandoTotais,
    falhaTotais,
    carregar,
    carregarTotais,
    obter,
    criar,
    atualizar,
    remover,
    obterOuGerarLinkRsvp,
    consultarLinkRsvp,
    regenerarLinkRsvp,
    revogarLinkRsvp,
    marcarEnviado,
    invalidar,
    limpar,
  }
})
