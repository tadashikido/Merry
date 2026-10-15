import type { ChavePassoOnboarding } from '@/tipos/proximosPassos'

export interface PassoOnboarding {
  chave: ChavePassoOnboarding
  rotulo: string
  descricao: string
  acao: string
}

export const PASSOS_ONBOARDING: readonly PassoOnboarding[] = [
  {
    chave: 'casalConvidado',
    rotulo: 'Convidar o casal',
    descricao: 'Dê ao casal acesso para acompanhar o casamento e cuidar dos convidados.',
    acao: 'Convidar o casal',
  },
  {
    chave: 'checklistAplicado',
    rotulo: 'Aplicar o checklist',
    descricao: 'Gere as tarefas do casamento a partir de um modelo de checklist.',
    acao: 'Aplicar checklist',
  },
  {
    chave: 'convidadosCadastrados',
    rotulo: 'Cadastrar convidados',
    descricao: 'Adicione os convites um a um ou importe a lista do casal.',
    acao: 'Cadastrar convidados',
  },
  {
    chave: 'convitesEnviados',
    rotulo: 'Enviar convites',
    descricao: 'Envie o link de confirmação de presença para os convidados.',
    acao: 'Enviar convites',
  },
]

export const PASSO_DADOS_CASAMENTO = 'Dados do casamento'

export const PASSOS_PRIMEIRO_ACESSO: readonly string[] = [
  PASSO_DADOS_CASAMENTO,
  ...PASSOS_ONBOARDING.map((passo) => passo.rotulo),
]

export const TEXTOS_PROXIMOS_PASSOS = {
  titulo: 'Próximos passos',
  progresso: (faltam: number, total: number) =>
    faltam === 1
      ? 'Falta só 1 passo para deixar o casamento pronto.'
      : `Faltam ${faltam} de ${total} para deixar o casamento pronto.`,
  dispensar: 'Dispensar',
  dispensarAcessivel: 'Dispensar próximos passos deste casamento',
  dispensado: 'Próximos passos dispensados neste casamento.',
  concluido: '(concluído)',
  erro: 'Não foi possível carregar os próximos passos.',
} as const
