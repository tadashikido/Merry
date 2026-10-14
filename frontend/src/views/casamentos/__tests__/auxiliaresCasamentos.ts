import { defineComponent, h } from 'vue'
import { RouterView } from 'vue-router'
import type { Mock } from 'vitest'

import { SESSAO_EXEMPLO, respostaJson, respostaProblema } from '@/__tests__/auxiliaresAutenticacao'
import type { CasamentoDto, CasamentoResumoDto } from '@/tipos/casamentos'

export const ID_CASAMENTO = '11111111-1111-4111-8111-111111111111'
export const ID_OUTRO = '22222222-2222-4222-8222-222222222222'

export const RaizRotas = defineComponent({ render: () => h(RouterView) })

export function resumoCasamento(dados: Partial<CasamentoResumoDto> = {}): CasamentoResumoDto {
  return {
    id: ID_CASAMENTO,
    nomePrimeiraPessoa: 'Ana Beatriz',
    nomeSegundaPessoa: 'Bruno',
    data: '2027-05-15',
    horario: '16:30',
    localCerimonia: 'Capela São José',
    convidadosEstimados: 150,
    fase: 'RetaFinal',
    diasRestantes: 42,
    arquivado: false,
    ...dados,
  }
}

export function casamentoCompleto(dados: Partial<CasamentoDto> = {}): CasamentoDto {
  return {
    ...resumoCasamento(),
    localRecepcao: null,
    observacoes: 'Flores brancas',
    arquivadoEm: null,
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    dataLimiteRsvp: null,
    dataLimiteRsvpEfetiva: '2027-05-05',
    ...dados,
  }
}

export type Rota = (url: string, init: RequestInit | undefined) => Response | undefined

export function rotearFetch(fetchSimulado: Mock<typeof fetch>, ...rotas: Rota[]) {
  fetchSimulado.mockImplementation(async (entrada, init) => {
    const url = String(entrada)
    if (url === '/api/autenticacao/renovar') {
      return respostaJson(SESSAO_EXEMPLO)
    }
    for (const rota of rotas) {
      const resposta = rota(url, init)
      if (resposta) {
        return resposta
      }
    }
    return respostaProblema(404, { title: 'Recurso não encontrado.' })
  })
}

export function quando(metodo: string, url: string, resposta: () => Response): Rota {
  return (urlChamada, init) => ((init?.method ?? 'GET') === metodo && urlChamada === url ? resposta() : undefined)
}

export function chamadas(fetchSimulado: Mock<typeof fetch>, metodo: string, url: string) {
  return fetchSimulado.mock.calls.filter(([entrada, init]) => String(entrada) === url && (init?.method ?? 'GET') === metodo)
}
