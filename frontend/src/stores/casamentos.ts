import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { ErroApi, requisitar } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import type { CasamentoDto, CasamentoResumoDto, SalvarCasamentoRequest, SituacaoListagemCasamentos } from '@/tipos/casamentos'

export const ROTA_CASAMENTOS = '/api/casamentos'
export const LIMITE_PROXIMOS = 6

export type TipoFalhaCasamento = 'validacao' | 'regra' | 'naoEncontrado' | 'semPermissao' | 'conflito' | 'conexao' | 'inesperado'

export interface FalhaCasamento {
  tipo: TipoFalhaCasamento
  mensagem: string | null
  errosCampos: Record<string, string>
}

export type ResultadoCasamento<T> = { ok: true; valor: T } | { ok: false; falha: FalhaCasamento }

function nomeCampo(chave: string): string {
  const semPrefixo = chave.replace(/^\$\./, '')
  return semPrefixo.charAt(0).toLowerCase() + semPrefixo.slice(1)
}

export function interpretarFalhaCasamento(falha: unknown): FalhaCasamento {
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

function caminhoCasamento(id: string, acao?: string): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(id)}`
  return acao ? `${base}/${acao}` : base
}

export const useCasamentosStore = defineStore('casamentos', () => {
  const itens = ref<CasamentoResumoDto[]>([])
  const situacao = ref<SituacaoListagemCasamentos>('Ativos')
  const carregando = ref(false)
  const falha = ref<FalhaCasamento | null>(null)
  const carregado = ref(false)

  const atual = ref<CasamentoDto | null>(null)
  const carregandoAtual = ref(false)
  const falhaAtual = ref<FalhaCasamento | null>(null)

  const proximos = computed(() =>
    situacao.value === 'Ativos'
      ? itens.value.filter((casamento) => !casamento.arquivado && casamento.diasRestantes >= 0).slice(0, LIMITE_PROXIMOS)
      : [],
  )

  async function carregar(novaSituacao: SituacaoListagemCasamentos = situacao.value): Promise<void> {
    situacao.value = novaSituacao
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<CasamentoResumoDto[]>(`${ROTA_CASAMENTOS}?situacao=${novaSituacao}`)
      if (situacao.value === novaSituacao) {
        itens.value = resposta
        carregado.value = true
      }
    } catch (erro) {
      if (situacao.value === novaSituacao) {
        itens.value = []
        falha.value = interpretarFalhaCasamento(erro)
      }
    } finally {
      if (situacao.value === novaSituacao) {
        carregando.value = false
      }
    }
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
      atual.value = await requisitar<CasamentoDto>(caminhoCasamento(id))
    } catch (erro) {
      atual.value = null
      falhaAtual.value = interpretarFalhaCasamento(erro)
    } finally {
      carregandoAtual.value = false
    }
  }

  async function executar(acao: () => Promise<CasamentoDto>): Promise<ResultadoCasamento<CasamentoDto>> {
    try {
      const casamento = await acao()
      atual.value = casamento
      substituirNaLista(casamento)
      return { ok: true, valor: casamento }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  function substituirNaLista(casamento: CasamentoDto) {
    const pertenceASituacao = casamento.arquivado === (situacao.value === 'Arquivados')
    const indice = itens.value.findIndex((item) => item.id === casamento.id)
    if (indice >= 0 && !pertenceASituacao) {
      itens.value.splice(indice, 1)
    } else if (indice >= 0) {
      itens.value.splice(indice, 1, casamento)
    }
  }

  function criar(request: SalvarCasamentoRequest): Promise<ResultadoCasamento<CasamentoDto>> {
    return executar(() => requisitar<CasamentoDto>(ROTA_CASAMENTOS, { metodo: 'POST', corpo: request }))
  }

  function atualizar(id: string, request: SalvarCasamentoRequest): Promise<ResultadoCasamento<CasamentoDto>> {
    return executar(() => requisitar<CasamentoDto>(caminhoCasamento(id), { metodo: 'PUT', corpo: request }))
  }

  function arquivar(id: string): Promise<ResultadoCasamento<CasamentoDto>> {
    return executar(() => requisitar<CasamentoDto>(caminhoCasamento(id, 'arquivar'), { metodo: 'POST' }))
  }

  function restaurar(id: string): Promise<ResultadoCasamento<CasamentoDto>> {
    return executar(() => requisitar<CasamentoDto>(caminhoCasamento(id, 'restaurar'), { metodo: 'POST' }))
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
    proximos,
    carregar,
    obter,
    criar,
    atualizar,
    arquivar,
    restaurar,
    definirPercentualChecklist,
    limpar,
  }
})
