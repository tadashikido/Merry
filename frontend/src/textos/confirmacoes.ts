import { formatarNumero } from '@/utilitarios/formatacao'

function contar(quantidade: number, singular: string, plural: string): string {
  return `${formatarNumero(quantidade)} ${quantidade === 1 ? singular : plural}`
}

export const TEXTOS_CONFIRMACOES = {
  titulo: 'Confirmações',
  tituloDocumento: (nomes: string) => `Confirmações · ${nomes}`,
  acaoAbrir: 'Confirmações',
  acaoBuffet: 'Para o buffet',
  exportarCsv: 'Baixar planilha (CSV)',
  exportarImpressao: 'Versão para impressão',
  csvBaixado: 'Planilha do buffet baixada.',
  erroExportar: 'Não foi possível gerar a planilha. Tente de novo.',
  semAcessoExportar: 'Você não tem acesso a este casamento.',
  prazoAte: (data: string) => `Respostas até ${data}`,
  prazoFaltam: (dias: number) => {
    if (dias <= 0) {
      return 'último dia'
    }
    return dias === 1 ? 'falta 1 dia' : `faltam ${formatarNumero(dias)} dias`
  },
  prazoEncerrado: (data: string) => `Prazo encerrado em ${data}`,
  prazoAcessivel: (data: string, complemento: string) => `Respostas até ${data}, ${complemento}`,
  alterarPrazo: 'Alterar prazo',
  pessoasRotulo: 'Pessoas por resposta',
  estimativaAbaixo: (quantidade: number) => `${formatarNumero(quantidade)} abaixo`,
  estimativaAcima: (quantidade: number) => `${formatarNumero(quantidade)} acima`,
  estimativaIgual: 'igual à estimativa',
  caminhoTitulo: 'Caminho dos convites',
  caminhoAcessivel: (total: number, partes: string) => `${contar(total, 'convite', 'convites')}: ${partes}`,
  naoEnviados: 'Não enviados',
  enviados: 'Enviados',
  visualizados: 'Visualizados',
  respondidos: (respondidos: number, aguardando: number) =>
    `${contar(respondidos, 'respondido', 'respondidos')} · ${formatarNumero(aguardando)} aguardando resposta`,
  semConvitesBarra: 'Nenhum convite para mostrar.',
  verRestricoes: 'Ver restrições por pessoa',
  semRestricoes: 'Nenhuma restrição informada pelos confirmados.',
  erroRestricoes: 'Não foi possível carregar as restrições.',
  pendentesTitulo: 'Aguardando resposta',
  pendentesVazio: 'Todos os convites responderam.',
  pendentesRotulo: 'Convites aguardando resposta',
  buscaPendentes: 'Buscar convite ou pessoa',
  colunaConvite: 'Convite',
  colunaEnvio: 'Envio',
  colunaPendentes: 'Sem resposta',
  pessoasPendentes: (pendentes: number, total: number) => `${formatarNumero(pendentes)} de ${formatarNumero(total)} sem resposta`,
  vazioTitulo: 'Nenhum convite ainda',
  vazioTexto: 'Cadastre os convites para acompanhar as confirmações aqui.',
  adicionarConvite: 'Adicionar convite',
  importarPlanilha: 'Importar planilha',
  erroCarregar: 'Não foi possível carregar as confirmações.',
  semAcesso: 'Você não tem acesso a este casamento.',
  naoEncontradoTitulo: 'Casamento não encontrado',
  naoEncontradoTexto: 'Ele pode ter sido removido ou pertencer a outra assessoria.',
  voltarCasamentos: 'Voltar aos casamentos',
  avisoArquivado: 'Casamento arquivado: dá para consultar e exportar, mas não enviar convites.',
} as const

export const TEXTOS_FICHA_BUFFET = {
  titulo: (nomes: string) => `Ficha para o buffet · ${nomes}`,
  imprimir: 'Imprimir',
  voltar: 'Voltar às confirmações',
  acoesRotulo: 'Ações da ficha',
  gerado: (dataHora: string) => `Gerada em ${dataHora}`,
  contagem: 'Contagem',
  adultos: 'Adultos',
  criancas: 'Crianças',
  total: 'Total confirmado',
  pendentes: (quantidade: number) => `${contar(quantidade, 'pessoa ainda', 'pessoas ainda')} sem resposta.`,
  restricoes: 'Restrições alimentares',
  outrasRestricoes: 'Outras restrições',
  necessidadesEspeciais: 'Necessidades especiais',
  semRestricoes: 'Nenhuma restrição informada pelos confirmados.',
  restricoesPorPessoa: 'Restrições por pessoa',
  colunaNome: 'Nome',
  colunaConvite: 'Convite',
  colunaRestricao: 'Restrição',
  ilegiveis: (quantidade: number) => `${contar(quantidade, 'restrição não pôde', 'restrições não puderam')} ser lidas. Fale com o suporte.`,
  dadosExcluidos: (data: string) => `As restrições deste casamento foram apagadas em ${data} pela política de privacidade.`,
  confirmados: (convites: number) => `Confirmados por convite (${formatarNumero(convites)})`,
  crianca: 'criança',
  acompanhante: 'acompanhante',
  necessidade: (texto: string) => `necessidade especial: ${texto}`,
  semConfirmados: 'Ainda não há confirmados.',
  rodape: 'Documento sem telefones ou e-mails dos convidados. Contém informação de saúde: compartilhe só com a equipe do buffet.',
  erroCarregar: 'Não foi possível montar a ficha.',
} as const

export const TEXTOS_CSV_BUFFET = {
  casamento: 'Casamento',
  data: 'Data',
  horario: 'Horário',
  local: 'Local da recepção',
  geradoEm: 'Gerado em',
  contagem: 'Contagem',
  quantidade: 'Quantidade',
  adultos: 'Adultos confirmados',
  criancas: 'Crianças confirmadas',
  total: 'Total confirmado',
  pendentes: 'Pessoas sem resposta',
  restricao: 'Restrição alimentar',
  outrasRestricoes: 'Outras restrições',
  necessidadesEspeciais: 'Necessidades especiais',
  cabecalhoLista: ['Convite', 'Pessoa', 'Faixa etária', 'Acompanhante', 'Restrições alimentares', 'Necessidade especial'],
  adulto: 'Adulto',
  crianca: 'Criança',
  sim: 'Sim',
  nao: 'Não',
  aviso: 'Sem telefones ou e-mails. Contém informação de saúde: compartilhe só com a equipe do buffet.',
} as const

export const TEXTOS_PREVIA_RSVP = {
  acao: 'Pré-visualizar convite',
  faixa: 'Pré-visualização da assessoria: esta abertura não conta como visualizada. Respostas enviadas aqui valem para o convite.',
} as const
