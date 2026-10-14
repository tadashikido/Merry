import { ref } from 'vue'
import { defineStore } from 'pinia'

import { ErroApi, requisitar } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import type { ResponderRsvpRequest, RsvpPublicoDto } from '@/tipos/rsvp'

export const ROTA_RSVP = '/api/rsvp'

export type TipoFalhaRsvp = 'linkInativo' | 'muitasTentativas' | 'regra' | 'conflito' | 'validacao' | 'conexao' | 'inesperado'

export interface FalhaRsvp {
  tipo: TipoFalhaRsvp
  mensagem: string | null
}

export type ResultadoRsvp = { ok: true; valor: RsvpPublicoDto } | { ok: false; falha: FalhaRsvp }

export function interpretarFalhaRsvp(falha: unknown): FalhaRsvp {
  if (!(falha instanceof ErroApi)) {
    return { tipo: 'inesperado', mensagem: null }
  }
  switch (falha.status) {
    case 0:
      return { tipo: 'conexao', mensagem: falha.message }
    case 400:
      return { tipo: 'validacao', mensagem: null }
    case 404:
      return { tipo: 'linkInativo', mensagem: null }
    case 409:
      return { tipo: 'conflito', mensagem: null }
    case 422:
      return { tipo: 'regra', mensagem: falha.detalhes?.detail ?? falha.message }
    case 429:
      return { tipo: 'muitasTentativas', mensagem: null }
    default:
      return { tipo: 'inesperado', mensagem: null }
  }
}

export interface OpcoesConsultaRsvp {
  preVisualizacao?: boolean
}

async function sessaoDaEquipe(): Promise<boolean> {
  const autenticacao = useAutenticacaoStore()
  try {
    await autenticacao.garantirSessaoVerificada()
  } catch {
    return false
  }
  return autenticacao.autenticado
}

export const useRsvpStore = defineStore('rsvp', () => {
  const dados = ref<RsvpPublicoDto | null>(null)
  const carregando = ref(false)
  const enviando = ref(false)
  const falha = ref<FalhaRsvp | null>(null)

  async function consultar(token: string, opcoes: OpcoesConsultaRsvp = {}): Promise<void> {
    carregando.value = true
    falha.value = null
    try {
      const anonima = opcoes.preVisualizacao ? !(await sessaoDaEquipe()) : true
      dados.value = await requisitar<RsvpPublicoDto>(`${ROTA_RSVP}/consulta`, {
        metodo: 'POST',
        corpo: { token },
        anonima,
      })
    } catch (erro) {
      dados.value = null
      falha.value = interpretarFalhaRsvp(erro)
    } finally {
      carregando.value = false
    }
  }

  async function responder(request: ResponderRsvpRequest): Promise<ResultadoRsvp> {
    enviando.value = true
    try {
      const valor = await requisitar<RsvpPublicoDto>(`${ROTA_RSVP}/resposta`, {
        metodo: 'PUT',
        corpo: request,
        anonima: true,
      })
      dados.value = valor
      return { ok: true, valor }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaRsvp(erro) }
    } finally {
      enviando.value = false
    }
  }

  function limpar() {
    dados.value = null
    carregando.value = false
    enviando.value = false
    falha.value = null
  }

  return { dados, carregando, enviando, falha, consultar, responder, limpar }
})
