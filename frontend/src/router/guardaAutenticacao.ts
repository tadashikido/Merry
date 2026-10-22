import { watch } from 'vue'
import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'

import type { useAutenticacaoStore } from '@/stores/autenticacao'

type StoreAutenticacao = ReturnType<typeof useAutenticacaoStore>

export function requerAutenticacao(rota: RouteLocationNormalized): boolean {
  return rota.meta.requerAutenticacao === true
}

export function somenteVisitante(rota: RouteLocationNormalized): boolean {
  return rota.meta.somenteVisitante === true
}

export function somenteAssessoria(rota: Pick<RouteLocationNormalized, 'matched'>): boolean {
  return rota.matched.some((registro) => registro.meta.somenteAssessoria === true)
}

export function destinoDoAnfitriao(rota: RouteLocationNormalized, eventoId: string | null): RouteLocationRaw | null {
  if (rota.name !== 'inicio' && !somenteAssessoria(rota)) {
    return null
  }
  return eventoId ? { name: 'evento', params: { id: eventoId } } : null
}

export function rotaDeEntrada(destino?: string): RouteLocationRaw {
  return destino && destino !== '/' ? { name: 'entrar', query: { destino } } : { name: 'entrar' }
}

export function instalarGuardaAutenticacao(roteador: Router, store: StoreAutenticacao): void {
  roteador.beforeEach(async (destino) => {
    if (!requerAutenticacao(destino) && !somenteVisitante(destino)) {
      return true
    }

    await store.garantirSessaoVerificada()

    if (requerAutenticacao(destino) && !store.autenticado) {
      return rotaDeEntrada(destino.fullPath)
    }

    if (somenteVisitante(destino) && store.autenticado) {
      return { name: 'inicio' }
    }

    if (store.ehAnfitriao) {
      return destinoDoAnfitriao(destino, store.eventoDoAnfitriao) ?? true
    }

    return true
  })

  watch(
    () => store.autenticado,
    (autenticado) => {
      const atual = roteador.currentRoute.value
      if (autenticado || !requerAutenticacao(atual)) {
        return
      }
      const destino = store.avisoEntrada === 'sessaoTerminou' ? atual.fullPath : undefined
      void roteador.replace(rotaDeEntrada(destino))
    },
  )
}
