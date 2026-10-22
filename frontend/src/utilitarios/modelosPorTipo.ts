import type { TipoEvento } from '@/tipos/eventos'

export interface ModeloComTipo {
  tipoEvento: TipoEvento | null
}

export function modelosDoTipo<T extends ModeloComTipo>(lista: readonly T[], tipo: TipoEvento | null | undefined): T[] {
  return lista.filter((modelo) => modelo.tipoEvento === null || !tipo || modelo.tipoEvento === tipo)
}
