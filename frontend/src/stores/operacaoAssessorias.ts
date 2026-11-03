import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar, type ProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useOperadorAutenticacaoStore } from '@/stores/operadorAutenticacao'

export const ROTAS_OPERACAO = {
  assessorias: '/api/operador/assessorias',
  dashboard: '/api/operador/dashboard',
} as const

export interface AssessoriaResumo {
  id: string
  nome: string
  criadaEm: string
  totalEventos: number
  ultimoLoginEm: string | null
  suspensa: boolean
}

export interface DashboardOperacao {
  totalAssessorias: number
  ativas30Dias: number
  totalEventos: number
  novasNoPeriodo: number
}

export type SituacaoFiltro = 'ativa' | 'suspensa'

export type ResultadoOperacao = { ok: true } | { ok: false }

export const useOperacaoAssessoriasStore = defineStore('operacaoAssessorias', () => {
  const autenticacao = useOperadorAutenticacaoStore()
  const provedor: ProvedorAutenticacao = {
    obterToken: () => autenticacao.tokenAcesso,
    renovar: () => autenticacao.renovar(),
  }

  const assessorias = ref<AssessoriaResumo[]>([])
  const dashboard = ref<DashboardOperacao | null>(null)
  const carregando = ref(false)
  const erro = ref(false)

  async function listar(busca?: string, situacao?: SituacaoFiltro): Promise<void> {
    carregando.value = true
    erro.value = false
    try {
      const parametros = new URLSearchParams()
      if (busca) {
        parametros.set('busca', busca)
      }
      if (situacao) {
        parametros.set('situacao', situacao === 'suspensa' ? 'Suspensa' : 'Ativa')
      }
      const consulta = parametros.toString()
      assessorias.value = await requisitar<AssessoriaResumo[]>(
        `${ROTAS_OPERACAO.assessorias}${consulta ? `?${consulta}` : ''}`,
        { provedor },
      )
    } catch {
      erro.value = true
    } finally {
      carregando.value = false
    }
  }

  async function carregarDashboard(): Promise<void> {
    carregando.value = true
    erro.value = false
    try {
      dashboard.value = await requisitar<DashboardOperacao>(ROTAS_OPERACAO.dashboard, { provedor })
    } catch {
      erro.value = true
    } finally {
      carregando.value = false
    }
  }

  function suspender(id: string): Promise<ResultadoOperacao> {
    return executarAcao(`${ROTAS_OPERACAO.assessorias}/${id}/suspender`)
  }

  function reativar(id: string): Promise<ResultadoOperacao> {
    return executarAcao(`${ROTAS_OPERACAO.assessorias}/${id}/reativar`)
  }

  async function executarAcao(rota: string): Promise<ResultadoOperacao> {
    try {
      await requisitar<void>(rota, { metodo: 'POST', provedor })
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }

  return { assessorias, dashboard, carregando, erro, listar, carregarDashboard, suspender, reativar }
})
