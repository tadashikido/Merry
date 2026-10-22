import type { ChavePassoOnboarding } from '@/tipos/proximosPassos'

export interface PassoOnboarding {
  chave: ChavePassoOnboarding
  rotulo: string
  descricao: string
  acao: string
}

export const PASSOS_ONBOARDING: readonly PassoOnboarding[] = [
  {
    chave: 'anfitriaoConvidado',
    rotulo: 'Convidar os anfitriões',
    descricao: 'Dê aos anfitriões acesso para acompanhar o evento e cuidar dos convidados.',
    acao: 'Convidar os anfitriões',
  },
  {
    chave: 'checklistAplicado',
    rotulo: 'Aplicar o checklist',
    descricao: 'Gere as tarefas do evento a partir de um modelo de checklist.',
    acao: 'Aplicar checklist',
  },
  {
    chave: 'convidadosCadastrados',
    rotulo: 'Cadastrar convidados',
    descricao: 'Adicione os convites um a um ou importe a lista dos anfitriões.',
    acao: 'Cadastrar convidados',
  },
  {
    chave: 'convitesEnviados',
    rotulo: 'Enviar convites',
    descricao: 'Envie o link de confirmação de presença para os convidados.',
    acao: 'Enviar convites',
  },
]

export const PASSO_DADOS_EVENTO = 'Dados do evento'

export const PASSOS_PRIMEIRO_ACESSO: readonly string[] = [
  PASSO_DADOS_EVENTO,
  ...PASSOS_ONBOARDING.map((passo) => passo.rotulo),
]

export const TEXTOS_PROXIMOS_PASSOS = {
  titulo: 'Próximos passos',
  progresso: (faltam: number, total: number) =>
    faltam === 1
      ? 'Falta só 1 passo para deixar o evento pronto.'
      : `Faltam ${faltam} de ${total} para deixar o evento pronto.`,
  dispensar: 'Dispensar',
  dispensarAcessivel: 'Dispensar próximos passos deste evento',
  dispensado: 'Próximos passos dispensados neste evento.',
  concluido: '(concluído)',
  erro: 'Não foi possível carregar os próximos passos.',
} as const
