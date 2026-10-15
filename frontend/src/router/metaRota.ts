export interface MetaTrilha {
  rotulo?: string
  pai?: string
  casamento?: true
}

declare module 'vue-router' {
  interface RouteMeta {
    trilha?: MetaTrilha
  }
}
