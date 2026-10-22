import type { RouteLocationRaw } from 'vue-router'

import type { NomeIcone } from '@/design/icones'
import type { DataCalendario } from '@/tipos/eventos'

export interface ItemRail {
  rotulo: string
  icone: NomeIcone
  rota: RouteLocationRaw
  prefixoAtivo: string
  prefixosAdicionais?: string[]
}

export type GrupoModuloEvento = 'planejar' | 'pessoas' | 'dinheiroDocumentos' | 'execucao'

export interface ModuloEvento {
  chave: string
  grupo: GrupoModuloEvento
  rotulo: string
  icone: NomeIcone
  rota: string
  rotasRelacionadas?: string[]
}

export interface IndicadorModulo {
  texto: string
  rotuloAcessivel: string
}

export interface ItemNavegacaoEvento {
  chave: string
  rotulo: string
  icone: NomeIcone
  rota: RouteLocationRaw
  ativo: boolean
  indicador?: IndicadorModulo
}

export interface GrupoNavegacaoEvento {
  chave: GrupoModuloEvento
  rotulo: string
  itens: ItemNavegacaoEvento[]
}

export interface ContextoEvento {
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string | null
  data: DataCalendario
  diasRestantes: number
}

export type ContextoVisual = 'assessoria' | 'anfitriao'

export interface NivelTrilha {
  chave: string
  rotulo: string | null
  rota: RouteLocationRaw
}

export interface OpcaoSeletorEvento {
  id: string
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string | null
  rotulo: string
  data: DataCalendario
  diasRestantes: number
}
