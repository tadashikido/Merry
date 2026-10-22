export interface MetaTrilha {
  rotulo?: string
  pai?: string
  evento?: true
}

declare module 'vue-router' {
  interface RouteMeta {
    trilha?: MetaTrilha
  }
}
