export const SITUACOES_ACESSO_CASAL = ['Pendente', 'Expirado', 'Ativo'] as const

export type SituacaoAcessoCasal = (typeof SITUACOES_ACESSO_CASAL)[number]

export interface AcessoCasalDto {
  id: string
  nome: string
  email: string
  situacao: SituacaoAcessoCasal
  convidadoEm: string
  conviteExpiraEm: string
  aceitoEm: string | null
}

export interface ConvidarCasalRequest {
  nome: string
  email: string
}

export interface ConviteAcessoCasalDto {
  nome: string
  email: string
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string
  organizacao: string
  expiraEm: string
}

export const LIMITE_ACESSOS_CASAL = 2
