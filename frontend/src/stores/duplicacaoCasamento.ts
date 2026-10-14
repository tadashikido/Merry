import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { ROTA_CASAMENTOS, interpretarFalhaCasamento, useCasamentosStore, type ResultadoCasamento } from '@/stores/casamentos'
import type { CasamentoResumoDto, DataCalendario } from '@/tipos/casamentos'
import type { DuplicacaoCasamentoDto, DuplicarCasamentoRequest, PreviaDuplicacaoDto } from '@/tipos/duplicacaoCasamento'

export function caminhoDuplicacao(origemId: string, acao?: 'previa'): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(origemId)}/duplicacao`
  return acao ? `${base}/${acao}` : base
}

export const useDuplicacaoCasamentoStore = defineStore('duplicacaoCasamento', () => {
  async function executar<T>(acao: () => Promise<T>): Promise<ResultadoCasamento<T>> {
    try {
      return { ok: true, valor: await acao() }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaCasamento(erro) }
    }
  }

  function listarOrigens(): Promise<ResultadoCasamento<CasamentoResumoDto[]>> {
    return executar(async () => {
      const [ativos, arquivados] = await Promise.all([
        requisitar<CasamentoResumoDto[]>(`${ROTA_CASAMENTOS}?situacao=Ativos`),
        requisitar<CasamentoResumoDto[]>(`${ROTA_CASAMENTOS}?situacao=Arquivados`),
      ])
      return [...ativos, ...arquivados].sort((a, b) => b.data.localeCompare(a.data))
    })
  }

  function previa(origemId: string, data: DataCalendario | null): Promise<ResultadoCasamento<PreviaDuplicacaoDto>> {
    const consulta = data ? `?data=${encodeURIComponent(data)}` : ''
    return executar(() => requisitar<PreviaDuplicacaoDto>(`${caminhoDuplicacao(origemId, 'previa')}${consulta}`))
  }

  async function duplicar(
    origemId: string,
    request: DuplicarCasamentoRequest,
  ): Promise<ResultadoCasamento<DuplicacaoCasamentoDto>> {
    const resultado = await executar(() =>
      requisitar<DuplicacaoCasamentoDto>(caminhoDuplicacao(origemId), { metodo: 'POST', corpo: request }),
    )
    if (resultado.ok) {
      useCasamentosStore().atual = resultado.valor.casamento
    }
    return resultado
  }

  return { listarOrigens, previa, duplicar }
})
