import type { ComputedRef, InjectionKey } from 'vue'
import type { RouteLocationRaw, RouteParamsGeneric, RouteRecordNormalized } from 'vue-router'

import { MODULOS_CASAMENTO, moduloAtivo } from './modulosCasamento'
import type { ModuloCasamento, NivelTrilha } from './tipos'
import '@/router/metaRota'

export const CHAVE_TRILHA: InjectionKey<ComputedRef<NivelTrilha[]>> = Symbol('trilha')

export const LIMITE_NIVEIS_TRILHA = 6

export const LIMITE_BUSCA_CASAMENTO = 8

export interface OpcoesTrilha {
  ehCasal: boolean
  rotuloCasamento: string | null
}

function nomesParametros(caminho: string): string[] {
  return Array.from(caminho.matchAll(/:(\w+)/g), (correspondencia) => correspondencia[1] ?? '').filter((nome) => nome !== '')
}

function parametrosDoNivel(registro: RouteRecordNormalized, parametros: RouteParamsGeneric): RouteParamsGeneric {
  const selecionados: RouteParamsGeneric = {}
  for (const nome of nomesParametros(registro.path)) {
    const valor = parametros[nome]
    if (valor !== undefined) {
      selecionados[nome] = valor
    }
  }
  return selecionados
}

export function montarTrilha(
  nomeRota: string | null,
  parametros: RouteParamsGeneric,
  buscarRegistro: (nome: string) => RouteRecordNormalized | undefined,
  opcoes: OpcoesTrilha,
): NivelTrilha[] {
  const niveis: NivelTrilha[] = []
  const visitados = new Set<string>()
  let nomeAtual = nomeRota

  while (nomeAtual && !visitados.has(nomeAtual) && niveis.length < LIMITE_NIVEIS_TRILHA) {
    visitados.add(nomeAtual)
    const registro = buscarRegistro(nomeAtual)
    const meta = registro?.meta.trilha
    if (!registro || !meta) {
      break
    }
    const ehAtual = niveis.length === 0
    if (ehAtual || !(opcoes.ehCasal && registro.meta.somenteAssessoria === true)) {
      niveis.unshift({
        chave: nomeAtual,
        rotulo: meta.casamento ? opcoes.rotuloCasamento : (meta.rotulo ?? null),
        rota: { name: nomeAtual, params: parametrosDoNivel(registro, parametros) },
      })
    }
    nomeAtual = meta.pai ?? null
  }

  return niveis
}

export function destinoTrocaCasamento(
  nomeRota: string | null,
  novoId: string,
  modulos: ModuloCasamento[] = MODULOS_CASAMENTO,
): RouteLocationRaw {
  const modulo = modulos.find((candidato) => moduloAtivo(candidato, nomeRota))
  return { name: modulo?.rota ?? 'casamento', params: { id: novoId } }
}
