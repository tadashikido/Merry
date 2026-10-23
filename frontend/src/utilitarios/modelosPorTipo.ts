import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import { ehTipoEvento } from '@/textos/tiposEvento'

export interface ModeloComTipo {
  tipoEvento: TipoEvento | null
}

export interface ModeloComTipoESugestao extends ModeloComTipo {
  sugerido: boolean
}

export type ChaveGrupoModelos = TipoEvento | 'qualquer' | 'outros'

export interface GrupoModelos<T> {
  chave: ChaveGrupoModelos
  tipo: TipoEvento | null
  modelos: T[]
}

export interface CoberturaTipoModelos {
  tipo: TipoEvento
  disponiveis: number
  especificos: number
  temSugerido: boolean
}

export function modelosDoTipo<T extends ModeloComTipo>(lista: readonly T[], tipo: TipoEvento | null | undefined): T[] {
  return lista.filter((modelo) => modelo.tipoEvento === null || !tipo || modelo.tipoEvento === tipo)
}

export function agruparModelosPorTipo<T extends ModeloComTipo>(lista: readonly T[]): GrupoModelos<T>[] {
  const grupos: GrupoModelos<T>[] = TIPOS_EVENTO.map((tipo) => ({
    chave: tipo,
    tipo,
    modelos: lista.filter((modelo) => modelo.tipoEvento === tipo),
  }))
  grupos.push({ chave: 'qualquer', tipo: null, modelos: lista.filter((modelo) => modelo.tipoEvento === null) })
  grupos.push({
    chave: 'outros',
    tipo: null,
    modelos: lista.filter((modelo) => modelo.tipoEvento !== null && !ehTipoEvento(modelo.tipoEvento)),
  })
  return grupos.filter((grupo) => grupo.modelos.length > 0)
}

export function coberturaPorTipo<T extends ModeloComTipoESugestao>(lista: readonly T[]): CoberturaTipoModelos[] {
  return TIPOS_EVENTO.map((tipo) => {
    const especificos = lista.filter((modelo) => modelo.tipoEvento === tipo)
    return {
      tipo,
      disponiveis: modelosDoTipo(lista, tipo).length,
      especificos: especificos.length,
      temSugerido: especificos.some((modelo) => modelo.sugerido),
    }
  })
}
