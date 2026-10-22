export type ChavePassoOnboarding = 'anfitriaoConvidado' | 'checklistAplicado' | 'convidadosCadastrados' | 'convitesEnviados'

export interface ProximosPassosEventoDto {
  anfitriaoConvidado: boolean
  checklistAplicado: boolean
  convidadosCadastrados: boolean
  convitesEnviados: boolean
  todosConcluidos: boolean
}
