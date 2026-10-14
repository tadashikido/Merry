function contar(quantidade: number, singular: string, plural: string): string {
  return `${quantidade.toLocaleString('pt-BR')} ${quantidade === 1 ? singular : plural}`
}

function juntar(partes: string[]): string {
  return partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`
}

export const TEXTOS_DUPLICACAO_CASAMENTO = {
  titulo: 'Duplicar casamento',
  descricao: 'Comece com o roteiro de um casamento que já funcionou.',
  acaoDuplicar: 'Duplicar',
  acaoDuplicarAcessivel: (nomes: string) => `Duplicar ${nomes}`,
  acaoAPartirDeOutro: 'A partir de outro casamento',
  origemRotulo: 'A partir de',
  trocarOrigem: 'Trocar',
  trocarOrigemAcessivel: 'Trocar o casamento de origem',
  seletorOrigem: 'Casamento de origem',
  seletorOrigemDica: 'O novo casamento leva as tarefas e os fornecedores dele.',
  seletorPlaceholder: 'Escolha um casamento',
  opcaoOrigem: (nomes: string, data: string, arquivado: boolean) => (arquivado ? `${nomes}, ${data} (arquivado)` : `${nomes}, ${data}`),
  origemObrigatoria: 'Escolha o casamento de origem.',
  grupoNovoCasal: 'O novo casal',
  grupoLevar: 'Vai para o casamento novo',
  opcaoTarefasTitulo: 'Tarefas e checklist',
  opcaoTarefasDetalhe: (doChecklist: number) =>
    doChecklist > 0
      ? `${contar(doChecklist, 'do checklist', 'do checklist')}; os prazos acompanham a nova data. Entram como "A fazer".`
      : 'Os prazos acompanham a nova data. Entram como "A fazer".',
  opcaoTarefasVazia: 'Nenhuma tarefa para levar.',
  tarefasCanceladas: (quantidade: number) =>
    quantidade === 1 ? '1 cancelada fica de fora.' : `${quantidade.toLocaleString('pt-BR')} canceladas ficam de fora.`,
  opcaoFornecedoresTitulo: 'Fornecedores',
  opcaoFornecedoresDetalhe: 'Entram em cotação, com serviço e valor orçado.',
  opcaoFornecedoresVazia: 'Nenhum fornecedor para levar.',
  fornecedoresIgnorados: (quantidade: number) =>
    quantidade === 1
      ? '1 fica de fora (cancelado ou arquivado).'
      : `${quantidade.toLocaleString('pt-BR')} ficam de fora (cancelados ou arquivados).`,
  opcaoCronogramaTitulo: 'Cronograma do dia',
  opcaoCronogramaDetalhe: 'Mesmos horários em relação à cerimônia, sem notas internas.',
  opcaoCronogramaVazia: 'Nenhum item no cronograma para levar.',
  cronogramaSemFornecedores: 'Sem "Fornecedores", os itens vão sem fornecedor vinculado.',
  quantidadeItensCronograma: (quantidade: number) => contar(quantidade, 'item do cronograma', 'itens do cronograma'),
  quantidadeTarefas: (quantidade: number) => contar(quantidade, 'tarefa', 'tarefas'),
  quantidadeFornecedores: (quantidade: number) => contar(quantidade, 'fornecedor', 'fornecedores'),
  nascemAtrasadas: (quantidade: number) =>
    quantidade === 1
      ? '1 tarefa nasce atrasada pela nova data.'
      : `${quantidade.toLocaleString('pt-BR')} tarefas nascem atrasadas pela nova data.`,
  semData: 'Informe a data para ver os prazos.',
  resumoPrevia: (tarefas: number, fornecedores: number, itensCronograma = 0) => {
    const partes = [
      ...(tarefas > 0 ? [contar(tarefas, 'tarefa', 'tarefas')] : []),
      ...(fornecedores > 0 ? [contar(fornecedores, 'fornecedor', 'fornecedores')] : []),
      ...(itensCronograma > 0 ? [contar(itensCronograma, 'item do cronograma', 'itens do cronograma')] : []),
    ]
    if (partes.length === 0) {
      return 'Nada além dos dados do novo casal vai para o casamento novo.'
    }
    return `${juntar(partes)} ${tarefas + fornecedores + itensCronograma === 1 ? 'vai' : 'vão'} para o casamento novo.`
  },
  ficaCom: (nomes: string) => `Fica com ${nomes}`,
  ficaItens: [
    'Convidados, convites e respostas do RSVP',
    'Acesso do casal',
    'Observações do casamento',
    'Valores fechados, contratos e pagamentos',
  ],
  acaoCriar: 'Criar casamento',
  sucesso: (tarefas: number, fornecedores: number, itensCronograma = 0) => {
    const partes = [
      ...(tarefas > 0 ? [contar(tarefas, 'tarefa', 'tarefas')] : []),
      ...(fornecedores > 0 ? [contar(fornecedores, 'fornecedor', 'fornecedores')] : []),
      ...(itensCronograma > 0 ? [contar(itensCronograma, 'item do cronograma', 'itens do cronograma')] : []),
    ]
    return partes.length === 0 ? 'Casamento criado.' : `Casamento criado com ${juntar(partes)}.`
  },
  erroPrevia: 'Não foi possível calcular a prévia.',
  tentarDeNovo: 'Tentar de novo',
  vazioTitulo: 'Ainda não há casamento para usar como ponto de partida.',
  vazioTexto: 'Cadastre o primeiro casamento; depois ele pode ser duplicado.',
  erroOrigensTitulo: 'Não foi possível carregar os casamentos',
  semPermissao: 'Você não tem permissão para criar casamentos.',
} as const
