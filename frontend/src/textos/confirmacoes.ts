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
  semAcessoExportar: 'Você não tem acesso a este evento.',
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
  vazioTexto:
    'Quando os convites saírem, aqui aparecem quem respondeu, quem falta lembrar e quantas pessoas contar para o buffet e as mesas.',
  adicionarConvite: 'Adicionar convite',
  importarPlanilha: 'Importar planilha',
  erroCarregar: 'Não foi possível carregar as confirmações.',
  semAcesso: 'Você não tem acesso a este evento.',
  naoEncontradoTitulo: 'Evento não encontrado',
  naoEncontradoTexto: 'Ele pode ter sido removido ou pertencer a outra assessoria.',
  voltarEventos: 'Voltar aos eventos',
  avisoArquivado: 'Evento arquivado: dá para consultar e exportar, mas não enviar convites.',
} as const

export const TEXTOS_PROXIMOS_PASSOS_CONFIRMACOES = {
  titulo: 'Para fechar as confirmações',
  prazoAntes: (dias: number, contracaoDe: string) =>
    dias === 0
      ? `O prazo de respostas fecha no dia ${contracaoDe}.`
      : `O prazo de respostas fecha ${contar(dias, 'dia', 'dias')} antes ${contracaoDe}.`,
  numerosRotulo: 'Pessoas para o buffet e as mesas',
  confirmadas: (quantidade: number) => (quantidade === 1 ? 'confirmada' : 'confirmadas'),
  confirmadasAcessivel: (quantidade: number) => contar(quantidade, 'pessoa confirmada', 'pessoas confirmadas'),
  maximo: 'se todos que faltam vierem',
  maximoAcessivel: (quantidade: number) => `até ${contar(quantidade, 'pessoa', 'pessoas')} se todos que faltam vierem`,
  numeroFechado: 'Número fechado: ninguém falta responder.',
  passosRotulo: 'Passos para cobrar respostas',
  aEnviar: (quantidade: number) => `${contar(quantidade, 'convite', 'convites')} para enviar`,
  aEnviarApoio: (quantidade: number) => (quantidade === 1 ? 'Ainda não saiu. Envie pela lista.' : 'Ainda não saíram. Envie pela lista.'),
  semLembrete: (quantidade: number) => `${contar(quantidade, 'convite', 'convites')} sem lembrete`,
  visualizaram: (quantidade: number) =>
    `${formatarNumero(quantidade)} já ${quantidade === 1 ? 'abriu' : 'abriram'} o convite; um lembrete costuma bastar.`,
  semLembreteApoio: 'Use “Cobrar pendentes” para lembrar um por um.',
  jaLembrados: (quantidade: number) => contar(quantidade, 'convite já lembrado', 'convites já lembrados'),
  jaLembradosApoio: 'Se o prazo estiver perto, vale um contato direto.',
  lembradosHoje: (quantidade: number) => `${contar(quantidade, 'lembrete enviado', 'lembretes enviados')} hoje.`,
  todosResponderam: 'Todos responderam. O número já pode ir para o buffet e para as mesas.',
  prazoEncerrado: (pessoas: number) =>
    `O prazo terminou com ${contar(pessoas, 'pessoa', 'pessoas')} sem resposta. Feche os números com quem respondeu e combine uma margem com o buffet.`,
  semPassos: 'Os convites sem resposta já foram enviados. Acompanhe pela lista.',
  mesas: (mesaEspecial: string) => `Com os confirmados, distribua as mesas, começando pela ${mesaEspecial.toLocaleLowerCase('pt-BR')}.`,
  organizarMesas: 'Organizar as mesas',
} as const

export const TEXTOS_COBRANCA = {
  acaoAbrir: (quantidade: number) => `Cobrar pendentes (${formatarNumero(quantidade)})`,
  titulo: 'Cobrar pendentes',
  apoio: (dataLimite: string) => `Convites enviados que ainda não responderam. Prazo: ${dataLimite}.`,
  resumo: (paraCobrar: number, cobradosHoje: number) =>
    `${formatarNumero(paraCobrar)} para cobrar · ${contar(cobradosHoje, 'cobrado hoje', 'cobrados hoje')}`,
  buscaPlaceholder: 'Buscar convite ou pessoa',
  buscaRotulo: 'Buscar na fila de cobrança',
  filaRotulo: 'Convites para cobrar',
  falta: (nomes: string) => `Falta: ${nomes}`,
  nuncaCobrado: 'Nunca cobrado',
  cobradoAgora: 'Cobrado agora há pouco',
  cobradoHoje: (hora: string) => `Cobrado hoje às ${hora}`,
  cobradoOntem: 'Cobrado ontem',
  cobradoDias: (dias: number) => `Cobrado há ${formatarNumero(dias)} dias`,
  quantidade: (quantidade: number) => `(${contar(quantidade, 'lembrete', 'lembretes')})`,
  abrirWhatsApp: 'Abrir WhatsApp',
  copiarLembrete: 'Copiar lembrete',
  marcarEnviado: 'Marcar lembrete enviado',
  verLembrete: 'Ver lembrete',
  ocultarLembrete: 'Ocultar lembrete',
  previaLink: '[link do convite]',
  lembreteCopiado: 'Lembrete copiado.',
  lembreteRegistrado: 'Lembrete registrado.',
  anuncioRegistrado: (nome: string) => `Lembrete registrado para ${nome}.`,
  naoCobravel: 'Este convite já respondeu ou não pode mais ser cobrado. A lista foi atualizada.',
  semPermissao: 'Você não tem permissão para cobrar convites deste evento.',
  semConexao: 'Sem conexão. Verifique a internet e tente de novo.',
  erroGenerico: 'Não foi possível registrar o lembrete. Tente de novo.',
  vazioTitulo: 'Ninguém para cobrar agora',
  vazioTexto: 'Todos os convites enviados já responderam ou ainda não foram enviados.',
  vazioBusca: (termo: string) => `Nenhum convite encontrado para “${termo}”.`,
  prazoEncerrado: 'Lembretes ficam disponíveis só até a data limite.',
  fechar: 'Fechar',
  mensagemLembrete: (dados: {
    nomeConvite: string
    nomes: string
    data: string
    dataLimite: string
    url: string
  }) =>
    `Oi, ${dados.nomeConvite}! Passando para lembrar da confirmação de presença no evento de ${dados.nomes}, em ${dados.data}. Responda até ${dados.dataLimite} pelo link: ${dados.url}`,
} as const

export const TEXTOS_FICHA_BUFFET = {
  titulo: (nomes: string) => `Ficha para o buffet · ${nomes}`,
  documento: 'Ficha para o buffet',
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
  ilegiveis: (quantidade: number) =>
    `${contar(quantidade, 'restrição não pôde ser lida', 'restrições não puderam ser lidas')}. Fale com o suporte.`,
  dadosExcluidos: (data: string) => `As restrições deste evento foram apagadas em ${data} pela política de privacidade.`,
  confirmados: (convites: number) => `Confirmados por convite (${formatarNumero(convites)})`,
  crianca: 'criança',
  acompanhante: 'acompanhante',
  necessidade: (texto: string) => `necessidade especial: ${texto}`,
  semConfirmados: 'Ainda não há confirmados.',
  rodape: 'Documento sem telefones ou e-mails dos convidados. Contém informação de saúde: compartilhe só com a equipe do buffet.',
  erroCarregar: 'Não foi possível montar a ficha.',
} as const

export const TEXTOS_CSV_BUFFET = {
  evento: 'Evento',
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
