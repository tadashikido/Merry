export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  traceId?: string
  errors?: Record<string, string[]>
  campo?: string
}

export interface InformacoesSistemaDto {
  nome: string
  versao: string
}

export interface OrganizacaoResumoDto {
  id: string
  nome: string
}

export type PapelUsuario = 'Dono' | 'Anfitriao'

export interface UsuarioAutenticadoDto {
  id: string
  nome: string
  email: string
  papel: PapelUsuario | string
  organizacao: OrganizacaoResumoDto
  eventoId?: string | null
}

export interface SessaoDto {
  tokenAcesso: string
  expiraEm: string
  usuario: UsuarioAutenticadoDto
}

export interface CadastroOrganizacaoRequest {
  nomeAssessoria: string
  nome: string
  email: string
  senha: string
}

export interface EntrarRequest {
  email: string
  senha: string
}

export interface SolicitacaoRecuperacaoDto {
  mensagem: string
}
