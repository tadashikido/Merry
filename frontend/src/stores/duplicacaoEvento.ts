import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { ROTA_EVENTOS, interpretarFalhaEvento, useEventosStore, type ResultadoEvento } from '@/stores/eventos'
import type { EventoResumoDto, DataCalendario } from '@/tipos/eventos'
import type { DuplicacaoEventoDto, DuplicarEventoRequest, PreviaDuplicacaoDto } from '@/tipos/duplicacaoEvento'

export function caminhoDuplicacao(origemId: string, acao?: 'previa'): string {
  const base = `${ROTA_EVENTOS}/${encodeURIComponent(origemId)}/duplicacao`
  return acao ? `${base}/${acao}` : base
}

export const useDuplicacaoEventoStore = defineStore('duplicacaoEvento', () => {
  async function executar<T>(acao: () => Promise<T>): Promise<ResultadoEvento<T>> {
    try {
      return { ok: true, valor: await acao() }
    } catch (erro) {
      return { ok: false, falha: interpretarFalhaEvento(erro) }
    }
  }

  function listarOrigens(): Promise<ResultadoEvento<EventoResumoDto[]>> {
    return executar(async () => {
      const [ativos, arquivados] = await Promise.all([
        requisitar<EventoResumoDto[]>(`${ROTA_EVENTOS}?situacao=Ativos`),
        requisitar<EventoResumoDto[]>(`${ROTA_EVENTOS}?situacao=Arquivados`),
      ])
      return [...ativos, ...arquivados].sort((a, b) => b.data.localeCompare(a.data))
    })
  }

  function previa(origemId: string, data: DataCalendario | null): Promise<ResultadoEvento<PreviaDuplicacaoDto>> {
    const consulta = data ? `?data=${encodeURIComponent(data)}` : ''
    return executar(() => requisitar<PreviaDuplicacaoDto>(`${caminhoDuplicacao(origemId, 'previa')}${consulta}`))
  }

  async function duplicar(
    origemId: string,
    request: DuplicarEventoRequest,
  ): Promise<ResultadoEvento<DuplicacaoEventoDto>> {
    const resultado = await executar(() =>
      requisitar<DuplicacaoEventoDto>(caminhoDuplicacao(origemId), { metodo: 'POST', corpo: request }),
    )
    if (resultado.ok) {
      const eventos = useEventosStore()
      eventos.atual = resultado.valor.evento
      eventos.invalidarAtivos()
    }
    return resultado
  }

  return { listarOrigens, previa, duplicar }
})
