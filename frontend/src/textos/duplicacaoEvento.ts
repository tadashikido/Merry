function contar(quantidade: number, singular: string, plural: string): string {
  return `${quantidade.toLocaleString('pt-BR')} ${quantidade === 1 ? singular : plural}`
}

function juntar(partes: string[]): string {
  return partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`
}

export const TEXTOS_DUPLICACAO_EVENTO = {
  titulo: 'Duplicar evento',
  descricao: 'Comece com o roteiro de um evento que já funcionou.',
  acaoDuplicar: 'Duplicar',
  acaoDuplicarAcessivel: (nomes: string) => `Duplicar ${nomes}`,
  acaoAPartirDeOutro: 'A partir de outro evento',
  origemRotulo: 'A partir de',
  trocarOrigem: 'Trocar',
  trocarOrigemAcessivel: 'Trocar o evento de origem',
  seletorOrigem: 'Evento de origem',
  seletorOrigemDica: 'O evento novo leva as tarefas, os fornecedores e o cronograma dele, e é do mesmo tipo.',
  seletorPlaceholder: 'Escolha um evento',
  opcaoOrigem: (nomes: string, tipo: string, data: string, arquivado: boolean) =>
    arquivado ? `${nomes} (${tipo}, ${data}, arquivado)` : `${nomes} (${tipo}, ${data})`,
  tipoHerdado: (indefinido: string) => `O evento novo será ${indefinido}, como o de origem.`,
  origemObrigatoria: 'Escolha o evento de origem.',
  grupoLevar: 'Vai para o evento novo',
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
  opcaoCronogramaDetalhe: (relativoAoMomento: string) => `Mesmos horários em relação ${relativoAoMomento}, sem notas internas.`,
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
      return 'Nada além dos dados dos novos anfitriões vai para o evento novo.'
    }
    return `${juntar(partes)} ${tarefas + fornecedores + itensCronograma === 1 ? 'vai' : 'vão'} para o evento novo.`
  },
  ficaCom: (nomes: string) => `Fica com ${nomes}`,
  ficaItens: [
    'Convidados, convites e respostas do RSVP',
    'Acesso dos anfitriões',
    'Observações do evento',
    'Valores fechados, contratos e pagamentos',
  ],
  acaoCriar: 'Criar evento',
  sucesso: (tarefas: number, fornecedores: number, itensCronograma = 0) => {
    const partes = [
      ...(tarefas > 0 ? [contar(tarefas, 'tarefa', 'tarefas')] : []),
      ...(fornecedores > 0 ? [contar(fornecedores, 'fornecedor', 'fornecedores')] : []),
      ...(itensCronograma > 0 ? [contar(itensCronograma, 'item do cronograma', 'itens do cronograma')] : []),
    ]
    return partes.length === 0 ? 'Evento criado.' : `Evento criado com ${juntar(partes)}.`
  },
  erroPrevia: 'Não foi possível calcular a prévia.',
  tentarDeNovo: 'Tentar de novo',
  vazioTitulo: 'Ainda não há evento para usar como ponto de partida.',
  vazioTexto: 'Cadastre o primeiro evento; depois ele pode ser duplicado.',
  erroOrigensTitulo: 'Não foi possível carregar os eventos',
  semPermissao: 'Você não tem permissão para criar eventos.',
  resumoTitulo: 'Como fica o evento novo',
  resumoTipo: 'Tipo',
  resumoTipoDetalhe: 'Herdado do evento de origem.',
  resumoData: 'Data',
  resumoTarefas: 'Tarefas',
  resumoFornecedores: 'Fornecedores',
  resumoCronograma: 'Cronograma',
  resumoCalculando: 'Calculando',
  vaoTarefas: (quantidade: number) => `${contar(quantidade, 'tarefa', 'tarefas')} ${quantidade === 1 ? 'vai' : 'vão'}`,
  vaoFornecedores: (quantidade: number) => `${contar(quantidade, 'fornecedor', 'fornecedores')} ${quantidade === 1 ? 'vai' : 'vão'}`,
  vaoItensCronograma: (quantidade: number) => `${contar(quantidade, 'item', 'itens')} ${quantidade === 1 ? 'vai' : 'vão'}`,
  naoVao: 'Não vão',
  nadaParaLevar: 'Nada para levar',
  canceladasDeFora: (quantidade: number) =>
    quantidade === 1 ? '1 cancelada fica de fora' : `${quantidade.toLocaleString('pt-BR')} canceladas ficam de fora`,
  ignoradosDeFora: (quantidade: number) =>
    quantidade === 1 ? '1 fica de fora' : `${quantidade.toLocaleString('pt-BR')} ficam de fora`,
  atrasadasCurto: (quantidade: number) =>
    quantidade === 1 ? '1 nasce atrasada' : `${quantidade.toLocaleString('pt-BR')} nascem atrasadas`,
  comoFuncionaTitulo: 'Como a duplicação funciona',
  comoFuncionaItens: [
    {
      chave: 'mesmo-tipo',
      titulo: 'O mesmo tipo',
      texto: 'O evento novo é do mesmo tipo do de origem: casamento gera casamento, festa de 15 anos gera festa de 15 anos.',
      teste: 'como-funciona-tipo',
    },
    {
      chave: 'o-que-vai',
      titulo: 'O que vai',
      texto: 'Tarefas e checklist, fornecedores e cronograma do dia. Você escolhe o que levar.',
      teste: 'como-funciona-vai',
    },
    {
      chave: 'o-que-fica',
      titulo: 'O que fica',
      texto: 'Convidados, respostas, acesso dos anfitriões e valores fechados continuam só no evento de origem.',
      teste: 'como-funciona-fica',
    },
  ],
} as const
