import type { RouteLocationRaw } from 'vue-router'
import type { NomeIcone } from '@/design/icones'

export type VarianteStatus = 'neutro' | 'sucesso' | 'alerta' | 'erro' | 'informacao'

export const ICONES_STATUS: Record<VarianteStatus, NomeIcone> = {
  neutro: 'ponto',
  sucesso: 'concluir',
  alerta: 'prazo',
  erro: 'alerta',
  informacao: 'informacao',
}

export interface ItemTrilha {
  chave: string
  rotulo: string
  rota: RouteLocationRaw | null
}

export interface ColunaListagem<T> {
  campo: keyof T & string
  titulo: string
  ordenavel?: boolean
  largura?: string
  principal?: boolean
  ocultarNoTablet?: boolean
}

export interface ItemDetalhe {
  rotulo: string
  valor: string | number | null | undefined
  multilinha?: boolean
}

export interface ItemContagem {
  chave: string
  valor: number
  rotulo: string
  detalhe?: string
  destaque?: boolean
}

export interface TextosListaRepetivel {
  rotuloItem: (numero: number) => string
  adicionar: string
  remover: string
  contador: (quantidade: number, maximo: number) => string
  limiteAtingido: string
  minimoAtingido: string
  adicionado: (numero: number) => string
  removido: (numero: number) => string
}

export interface TextosEnvioArquivo {
  rotulo: string
  instrucao: string
  botao: string
  trocar: string
  limites: string
  carregando: string
}

export interface ProblemaItemLinha {
  tipo: string
  rotuloTipo: string
  variante: VarianteStatus
  campo?: string | null
  mensagem: string
}

export interface ItemProblemaLinha {
  linha: number
  titulo: string
  problemas: ProblemaItemLinha[]
}

export interface FiltroProblemaLinha {
  tipo: string
  rotulo: string
}

export interface TextosListaProblemas {
  rotulo: string
  filtro: string
  todos: string
  linha: (numero: number) => string
  mostrarMais: (quantidade: number) => string
  vazio: string
}

export interface ItemMenuAcoes {
  chave: string
  rotulo: string
  icone?: string
  perigoso?: boolean
  desabilitado?: boolean
}

export interface LinhaCardapio {
  chave: string
  rotulo: string
  valor: number
}

export type TomSegmento = 'neutro' | 'informacao' | 'marca'

export interface SegmentoProgresso {
  chave: string
  rotulo: string
  valor: number
  tom: TomSegmento
}

export type SituacaoLugar = 'vazio' | 'pendente' | 'expirado' | 'ativo'

export interface PassoPrimeiroAcesso {
  chave: string
  rotulo: string
  concluido: boolean
}

export interface MarcoRegua {
  chave: string
  rotulo: string
  complemento?: string | null
  detalhe?: string | null
  concluido?: boolean
}

export interface ItemIndiceCategorias<C extends string = string> {
  chave: C
  rotulo: string
  quantidade: number
}

export interface AbaSecao {
  chave: string
  rotulo: string
  rota: RouteLocationRaw
}
