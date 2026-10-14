export const CATEGORIAS_FORNECEDOR = [
  'Buffet',
  'EspacoLocal',
  'Decoracao',
  'Fotografia',
  'Filmagem',
  'Musica',
  'BoloDoces',
  'ConvitesPapelaria',
  'Beleza',
  'Vestuario',
  'IluminacaoSom',
  'Transporte',
  'Seguranca',
  'CerimonialApoio',
  'Outros',
] as const
export type CategoriaFornecedor = (typeof CATEGORIAS_FORNECEDOR)[number]

export const SITUACOES_LISTAGEM_FORNECEDORES = ['ativos', 'arquivados'] as const
export type SituacaoListagemFornecedores = (typeof SITUACOES_LISTAGEM_FORNECEDORES)[number]

export interface FornecedorResumoDto {
  id: string
  categoria: CategoriaFornecedor
  nomeEmpresa: string
  responsavel: string | null
  telefone: string | null
  email: string | null
  site: string | null
  instagram: string | null
  arquivado: boolean
  atualizadoEm: string
}

export interface FornecedorDto extends FornecedorResumoDto {
  observacoes: string | null
  arquivadoEm: string | null
  criadoEm: string
}

export interface SalvarFornecedorRequest {
  categoria: CategoriaFornecedor
  nomeEmpresa: string
  responsavel: string | null
  telefone: string | null
  email: string | null
  site: string | null
  instagram: string | null
  observacoes: string | null
}

export interface ContatoFornecedor {
  telefone: string | null
  email: string | null
  site: string | null
  instagram: string | null
}
