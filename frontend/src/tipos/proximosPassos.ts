export type ChavePassoOnboarding = 'casalConvidado' | 'checklistAplicado' | 'convidadosCadastrados' | 'convitesEnviados'

export interface ProximosPassosCasamentoDto {
  casalConvidado: boolean
  checklistAplicado: boolean
  convidadosCadastrados: boolean
  convitesEnviados: boolean
  todosConcluidos: boolean
}
