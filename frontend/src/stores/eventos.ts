import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { ErroApi, requisitar } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import type { EventoDto, EventoResumoDto, SalvarEventoRequest, SituacaoListagemEventos } from '@/tipos/eventos'

export const ROTA_EVENTOS = '/api/eventos'
export const LIMITE_PROXIMOS = 6

export type TipoFalhaEvento = 'validacao' | 'regra' | 'naoEncontrado' | 'semPermissao' | 'conflito' | 'conexao' | 'inesperado'

export interface FalhaEvento {
  tipo: TipoFalhaEvento
  mensagem: string | null
  errosCampos: Record<string, string>
}

export type ResultadoEvento<T> = { ok: true; valor: T } | { ok: false; falha: FalhaEvento }

function nomeCampo(chave: string): string {
  const semPrefixo = chave.replace(/^\$\./, '')
  return semPrefixo.charAt(0).toLowerCase() + semPrefixo.slice(1)
}

export function interpretarFalhaEvento(falha: unknown): FalhaEvento {
  if (!(falha instanceof ErroApi)) {
    return { tipo: 'inesperado', mensagem: null, errosCampos: {} }
  }

  const errosCampos: Record<string, string> = {}
  for (const [chave, mensagens] of Object.entries(falha.detalhes?.errors ?? {})) {
    const primeira = mensagens[0]
    if (primeira) {
      errosCampos[nomeCampo(chave)] = primeira
    }
  }

  switch (falha.status) {
    case 0:
      return { tipo: 'conexao', mensagem: falha.message, errosCampos }
    case 400:
      return { tipo: 'validacao', mensagem: null, errosCampos }
    case 403:
      return { tipo: 'semPermissao', mensagem: null, errosCampos }
    case 404:
      return { tipo: 'naoEncontrado', mensagem: null, errosCampos }
    case 409:
      return { tipo: 'conflito', mensagem: falha.detalhes?.title ?? falha.message, errosCampos }
    case 422: {
      const mensagem = falha.detalhes?.detail ?? falha.message
      const campo = falha.detalhes?.campo
      if (typeof campo === 'string' && campo !== '' && mensagem) {
        errosCampos[nomeCampo(campo)] = mensagem
      }
      return { tipo: 'regra', mensagem, errosCampos }
    }
    default:
      return { tipo: 'inesperado', mensagem: null, errosCampos }
  }
}

function caminhoEvento(id: string, acao?: string): string {
  const base = `${ROTA_EVENTOS}/${encodeURIComponent(id)}`
  return acao ? `${base}/${acao}` : base
}

export const useEventosStore = defineStore('eventos', () => {
  const itens = ref<EventoResumoDto[]>([])
  const situacao = ref<SituacaoListagemEventos>('Ativos')
  const carregando = ref(false)
  const falha = ref<FalhaEvento | null>(null)
  const carregado = ref(false)

  const atual = ref<EventoDto | null>(null)
  const carregandoAtual = ref(false)
  const falhaAtual = ref<FalhaEvento | null>(null)

  const ativos = ref<EventoResumoDto[]>([])
  const ativosCarregados = ref(false)
  const carregandoAtivos = ref(false)

  const proximos = computed(() =>
    situacao.value === 'Ativos'
      ? itens.value.filter((evento) => !evento.arquivado && evento.diasRestantes >= 0).slice(0, LIMITE_PROXIMOS)
      : [],
  )

  async function carregar(novaSituacao: SituacaoListagemEventos = situacao.value): Promise<void> {
    situacao.value = novaSituacao
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<EventoResumoDto[]>(`${ROTA_EVENTOS}?situacao=${novaSituacao}`)
      if (situacao.value === novaSituacao) {
        itens.value = resposta
        carregado.value = true
      }
      if (novaSituacao === 'Ativos') {
        definirAtivos(resposta)
      }
    } catch (erro) {
      if (situacao.value === novaSituacao) {
        itens.value = []
        falha.value = interpretarFalhaEvento(erro)
      }
    } finally {
      if (situacao.value === novaSituacao) {
        carregando.value = false
      }
    }
  }

  function definirAtivos(lista: EventoResumoDto[]) {
    ativos.value = lista.filter((evento) => !evento.arquivado)
    ativosCarregados.value = true
  }

  let ativosEmAndamento: Promise<void> | null = null

  function garantirAtivos(): Promise<void> {
    if (ativosCarregados.value) {
      return Promise.resolve()
    }
    if (ativosEmAndamento) {
      return ativosEmAndamento
    }
    const promessa = buscarAtivos().finally(() => {
      if (ativosEmAndamento === promessa) {
        ativosEmAndamento = null
      }
    })
    ativosEmAndamento = promessa
    return promessa
  }

  async function buscarAtivos(): Promise<void> {
    carregandoAtivos.value = true
    try {
      const resposta = await requisitar<EventoResumoDto[]>(`${ROTA_EVENTOS}?situacao=Ativos`)
      if (ativosEmAndamento) {
        definirAtivos(resposta)
      }
    } catch {
      ativos.value = []
    } finally {
      carregandoAtivos.value = false
    }
  }

  function invalidarAtivos() {
    ativosEmAndamento = null
    ativosCarregados.value = false
  }

  let obtencaoEmAndamento: { id: string; promessa: Promise<void> } | null = null

  function obter(id: string): Promise<void> {
    if (obtencaoEmAndamento?.id === id) {
      return obtencaoEmAndamento.promessa
    }
    const promessa = buscarAtual(id).finally(() => {
      if (obtencaoEmAndamento?.promessa === promessa) {
        obtencaoEmAndamento = null
      }
    })
    obtencaoEmAndamento = { id, promessa }
    return promessa
  }

  async function buscarAtual(id: string): Promise<void> {
    carregandoAtual.value = true
    falhaAtual.value = null
    if (atual.value?.id !== id) {
      atual.value = null
    }

    try {
      atual.value = await requisitar<EventoDto>(caminhoEvento(id))
    } catch (erro) {
      atual.value = null
      falhaAtual.value = interpretarFalhaEvento(erro)
    } finally {
      carregandoAtual.value = false
    }
  }

  async function executar(acao: () => Promise<EventoDto>): Promise<ResultadoEvento<EventoDto>> {
    try {
      const evento = await acao()
      atual.value = evento
      substituirNaLista(evento)
      invalidarAtivos()
      return { ok: true, valor: evento }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  function substituirNaLista(evento: EventoDto) {
    const pertenceASituacao = evento.arquivado === (situacao.value === 'Arquivados')
    const indice = itens.value.findIndex((item) => item.id === evento.id)
    if (indice >= 0 && !pertenceASituacao) {
      itens.value.splice(indice, 1)
    } else if (indice >= 0) {
      itens.value.splice(indice, 1, evento)
    }
  }

  function criar(request: SalvarEventoRequest): Promise<ResultadoEvento<EventoDto>> {
    return executar(() => requisitar<EventoDto>(ROTA_EVENTOS, { metodo: 'POST', corpo: request }))
  }

  function atualizar(id: string, request: SalvarEventoRequest): Promise<ResultadoEvento<EventoDto>> {
    return executar(() => requisitar<EventoDto>(caminhoEvento(id), { metodo: 'PUT', corpo: request }))
  }

  function arquivar(id: string): Promise<ResultadoEvento<EventoDto>> {
    return executar(() => requisitar<EventoDto>(caminhoEvento(id, 'arquivar'), { metodo: 'POST' }))
  }

  function restaurar(id: string): Promise<ResultadoEvento<EventoDto>> {
    return executar(() => requisitar<EventoDto>(caminhoEvento(id, 'restaurar'), { metodo: 'POST' }))
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

  function definirPercentualChecklist(id: string, percentual: number | null) {
    if (atual.value?.id === id) {
      atual.value = { ...atual.value, percentualChecklist: percentual }
    }
  }

  function limpar() {
    obtencaoEmAndamento = null
    itens.value = []
    situacao.value = 'Ativos'
    carregando.value = false
    falha.value = null
    carregado.value = false
    atual.value = null
    carregandoAtual.value = false
    falhaAtual.value = null
    invalidarAtivos()
    ativos.value = []
    carregandoAtivos.value = false
  }

  return {
    itens,
    situacao,
    carregando,
    falha,
    carregado,
    atual,
    carregandoAtual,
    falhaAtual,
    ativos,
    ativosCarregados,
    carregandoAtivos,
    proximos,
    carregar,
    obter,
    garantirAtivos,
    invalidarAtivos,
    criar,
    atualizar,
    arquivar,
    restaurar,
    definirPercentualChecklist,
    limpar,
  }
})
