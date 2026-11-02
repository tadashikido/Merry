import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'

import type { useOperadorAutenticacaoStore } from '@/stores/operadorAutenticacao'

type StoreOperador = ReturnType<typeof useOperadorAutenticacaoStore>

export function requerOperador(rota: Pick<RouteLocationNormalized, 'matched'>): boolean {
  return rota.matched.some((registro) => registro.meta.requerOperador === true)
}

export function somenteVisitanteOperador(rota: RouteLocationNormalized): boolean {
  return rota.meta.somenteVisitanteOperador === true
}

export function rotaEntradaOperador(destino?: string): RouteLocationRaw {
  return destino && destino !== '/operador'
    ? { name: 'operador-entrar', query: { destino } }
    : { name: 'operador-entrar' }
}

export function instalarGuardaOperador(roteador: Router, store: StoreOperador): void {
  roteador.beforeEach(async (destino) => {
    if (!requerOperador(destino) && !somenteVisitanteOperador(destino)) {
      return true
    }

    await store.garantirSessaoVerificada()

    if (requerOperador(destino) && !store.autenticado) {
      return rotaEntradaOperador(destino.fullPath)
    }

    if (somenteVisitanteOperador(destino) && store.autenticado) {
      return { name: 'operador-area' }
    }

    return true
  })
}
