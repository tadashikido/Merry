import type { RouteLocationRaw } from 'vue-router'

import type { NomeIcone } from '@/design/icones'
import type { DataCalendario } from '@/tipos/casamentos'

export interface ItemRail {
  rotulo: string
  icone: NomeIcone
  rota: RouteLocationRaw
  prefixoAtivo: string
  prefixosAdicionais?: string[]
}

export type GrupoModuloCasamento = 'planejar' | 'pessoas' | 'dinheiroDocumentos' | 'execucao'

export interface ModuloCasamento {
  chave: string
  grupo: GrupoModuloCasamento
  rotulo: string
  icone: NomeIcone
  rota: string
  rotasRelacionadas?: string[]
}

export interface IndicadorModulo {
  texto: string
  rotuloAcessivel: string
}

export interface ItemNavegacaoCasamento {
  chave: string
  rotulo: string
  icone: NomeIcone
  rota: RouteLocationRaw
  ativo: boolean
  indicador?: IndicadorModulo
}

export interface GrupoNavegacaoCasamento {
  chave: GrupoModuloCasamento
  rotulo: string
  itens: ItemNavegacaoCasamento[]
}

export interface ContextoCasamento {
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
  data: DataCalendario
  diasRestantes: number
}

export type ContextoVisual = 'assessoria' | 'casal'

export interface NivelTrilha {
  chave: string
  rotulo: string | null
  rota: RouteLocationRaw
}

export interface OpcaoSeletorCasamento {
  id: string
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
  rotulo: string
  data: DataCalendario
  diasRestantes: number
}
