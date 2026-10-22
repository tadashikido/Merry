export const SITUACOES_ACESSO_ANFITRIAO = ['Pendente', 'Expirado', 'Ativo'] as const

export type SituacaoAcessoAnfitriao = (typeof SITUACOES_ACESSO_ANFITRIAO)[number]

export interface AcessoAnfitriaoDto {
  id: string
  nome: string
  email: string
  situacao: SituacaoAcessoAnfitriao
  convidadoEm: string
  conviteExpiraEm: string
  aceitoEm: string | null
}

export interface ConvidarAnfitriaoRequest {
  nome: string
  email: string
}

export interface ConviteAcessoAnfitriaoDto {
  nome: string
  email: string
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
  organizacao: string
  expiraEm: string
}

export const LIMITE_ACESSOS_ANFITRIAO = 2
