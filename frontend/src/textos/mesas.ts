import { formatarNumero } from '@/utilitarios/formatacao'

function plural(quantidade: number, singular: string, varios: string): string {
  return quantidade === 1 ? singular : varios
}

function pessoas(quantidade: number): string {
  return `${formatarNumero(quantidade)} ${plural(quantidade, 'pessoa', 'pessoas')}`
}

export const TEXTOS_MESAS = {
  titulo: 'Mesas',
  tituloDocumento: (nomes: string) => `Mesas — ${nomes}`,
  resumoRotulo: 'Mesas e lugares',
  sentados: (quantidade: number) => plural(quantidade, 'sentado', 'sentados'),
  livres: (quantidade: number) => plural(quantidade, 'lugar livre', 'lugares livres'),
  semMesaTotal: 'sem mesa',
  mesasTotal: (quantidade: number) => plural(quantidade, 'mesa', 'mesas'),
  novaMesa: 'Nova mesa',
  imprimir: 'Versão para impressão',
  baixarCsv: 'Baixar planilha (CSV)',
  maisAcoes: 'Mais ações',
  csvBaixado: 'Planilha baixada.',
  secaoSemMesa: 'Sem mesa',
  secaoMesas: 'Mesas',
  contagemSemMesa: (quantidade: number) => `${formatarNumero(quantidade)} ${plural(quantidade, 'confirmado', 'confirmados')}`,
  abaSemMesa: (quantidade: number) => `Sem mesa (${formatarNumero(quantidade)})`,
  abaMesas: (quantidade: number) => `Mesas (${formatarNumero(quantidade)})`,
  abasRotulo: 'Ver pessoas sem mesa ou mesas',
  instrucao: 'Marque as pessoas e toque em Sentar em… para escolher a mesa.',
  buscaPlaceholder: 'Buscar pessoa ou convite',
  buscaRotulo: 'Buscar pessoa ou convite',
  filtroGrupo: 'Grupo',
  filtroConvite: 'Convite',
  filtroTodos: 'Todos',
  semGrupo: 'Sem grupo',
  resultados: (visiveis: number, total: number) => `${formatarNumero(visiveis)} de ${pessoas(total)}`,
  limparFiltros: 'Limpar filtros',
  vazioFiltro: 'Nenhuma pessoa encontrada com estes filtros.',
  selecionarVisiveis: 'Selecionar todos os visíveis',
  selecionarConvite: 'Selecionar convite',
  selecionarConviteAcessivel: (quantidade: number, convite: string) =>
    `Selecionar ${plural(quantidade, 'a pessoa', `as ${formatarNumero(quantidade)} pessoas`)} do convite ${convite}`,
  dicaConvite: (quantidade: number) => `Mais ${formatarNumero(quantidade)} deste convite sem mesa`,
  selecionadas: (quantidade: number) =>
    `${pessoas(quantidade)} ${plural(quantidade, 'selecionada', 'selecionadas')}`,
  limparSelecao: 'Limpar',
  sentarEm: 'Sentar em…',
  tirarDaMesa: 'Tirar da mesa',
  sentarTitulo: (quantidade: number) => `Sentar ${pessoas(quantidade)} em…`,
  sentarRotuloGrupo: 'Mesa',
  sentarConfirmar: 'Sentar aqui',
  cancelar: 'Cancelar',
  livresOpcao: (quantidade: number) => `${formatarNumero(quantidade)} ${plural(quantidade, 'livre', 'livres')}`,
  soLivres: (quantidade: number) => `Só ${formatarNumero(quantidade)} ${plural(quantidade, 'livre', 'livres')}`,
  completa: 'Completa',
  mesaAtual: 'Mesa atual',
  semMesasDialogo: 'Crie uma mesa antes de sentar pessoas.',
  rotuloMesa: (numero: number, nome: string | null) => (nome ? `Mesa ${numero} · ${nome}` : `Mesa ${numero}`),
  rotuloMesaAnfitrioes: 'Mesa dos anfitriões',
  ocupacao: (ocupados: number, lugares: number) => `${formatarNumero(ocupados)} de ${formatarNumero(lugares)}`,
  ocupacaoAcessivel: (ocupados: number, lugares: number) =>
    `${formatarNumero(ocupados)} de ${formatarNumero(lugares)} ${plural(lugares, 'lugar ocupado', 'lugares ocupados')}`,
  completaSufixo: 'completa',
  mesaVazia: 'Nenhuma pessoa nesta mesa ainda.',
  mesaSemResultado: 'Nenhuma pessoa desta mesa no filtro.',
  editarMesa: 'Editar mesa',
  excluirMesa: 'Excluir mesa',
  acoesMesa: (rotulo: string) => `Mais ações da ${rotulo}`,
  formNova: 'Nova mesa',
  formEditar: (rotulo: string) => `Editar ${rotulo}`,
  campoNumero: 'Número',
  campoNome: 'Nome (opcional)',
  dicaNomePara: (grupos: readonly string[]) => (grupos.length > 0 ? `Ex.: ${grupos.join(', ')}` : 'Ex.: Família, Amigos'),
  campoLugares: 'Lugares',
  dicaAnfitrioes: 'Aparece primeiro na lista e na impressão.',
  criarMesa: 'Criar mesa',
  salvarMesa: 'Salvar mesa',
  erroObrigatorio: 'Preencha este campo.',
  erroNumeroFaixa: 'Use um número de 1 a 999.',
  erroLugaresFaixa: 'Use de 1 a 30 lugares.',
  erroNomeTamanho: 'Use até 60 caracteres.',
  erroSalvarMesa: 'Não foi possível salvar a mesa. Tente de novo.',
  erroConflito: 'O mapa mudou enquanto você organizava. Atualizamos as mesas — confira e tente de novo.',
  erroSemPermissaoAcao: 'Você não tem permissão para alterar as mesas.',
  erroAcao: 'Não foi possível concluir. Tente de novo.',
  erroConexao: 'Sem conexão. Verifique a internet e tente de novo.',
  erroCarregar: 'Não foi possível carregar as mesas.',
  semAcesso: 'Você não tem acesso às mesas deste evento.',
  naoEncontradoTitulo: 'Evento não encontrado',
  naoEncontradoTexto: 'Ele pode ter sido removido ou o endereço está incorreto.',
  voltarEventos: 'Voltar para eventos',
  mesaCriada: (rotulo: string) => `${rotulo} criada.`,
  mesaSalva: (rotulo: string) => `${rotulo} salva.`,
  mesaExcluida: (rotulo: string) => `${rotulo} foi excluída.`,
  mesaRestaurada: (rotulo: string) => `${rotulo} restaurada.`,
  erroExcluirMesa: (rotulo: string) => `Não foi possível excluir ${rotulo}. Tente de novo.`,
  excluirConsequencia: (ocupados: number) =>
    ocupados === 0
      ? 'Esta mesa está vazia.'
      : `${plural(ocupados, 'A pessoa desta mesa volta', `As ${formatarNumero(ocupados)} pessoas desta mesa voltam`)} para sem mesa.`,
  sentadas: (quantidade: number, rotulo: string) =>
    `${pessoas(quantidade)} ${plural(quantidade, 'sentada', 'sentadas')} na ${rotulo}.`,
  retiradas: (quantidade: number) =>
    `${pessoas(quantidade)} ${plural(quantidade, 'voltou', 'voltaram')} para sem mesa.`,
  avisoTitulo: (quantidade: number) =>
    `${pessoas(quantidade)} ${plural(quantidade, 'saiu', 'saíram')} da mesa porque ${plural(quantidade, 'deixou', 'deixaram')} de confirmar presença.`,
  avisoRecusou: 'recusou',
  avisoPendente: 'voltou para sem resposta',
  avisoConfirmou: 'confirmou de novo',
  avisoSaiuDa: (rotulo: string) => `saiu da ${rotulo}`,
  avisoMesaExcluida: 'saiu de uma mesa que foi excluída',
  avisoEntendi: 'Entendi',
  avisoDispensado: 'Aviso dispensado.',
  estavaNaMesa: (rotulo: string) => `Estava na ${rotulo}`,
  conviteDividido: 'Convite dividido',
  conviteDivididoDetalhe: (convite: string, partes: string[]) => `${convite}: ${partes.join(', ')}.`,
  divididoParteMesa: (quantidade: number, rotulo: string) => `${formatarNumero(quantidade)} na ${rotulo}`,
  divididoParteSemMesa: (quantidade: number) => `${formatarNumero(quantidade)} sem mesa`,
  crianca: 'Criança',
  acompanhante: 'Acompanhante',
  vazioMesasTituloPara: (contracaoDe: string) => `Crie as mesas ${contracaoDe}`,
  referenciaSemTipo: 'do evento',
  vazioMesasTexto: 'Cadastre cada mesa com o número e os lugares. Depois, sente os confirmados em poucos toques.',
  vazioConfirmadosTitulo: 'Ninguém confirmou presença ainda',
  vazioConfirmadosTexto: 'As pessoas aparecem aqui quando confirmam.',
  verConfirmacoes: 'Ver confirmações',
  todosSentados: 'Todos os confirmados têm mesa.',
  arquivado: 'Este evento está arquivado. Restaure para voltar a organizar as mesas.',
  acaoAbrir: 'Mesas',
  semMesa: 'Sem mesa',
} as const

function lugares(quantidade: number): string {
  return `${formatarNumero(quantidade)} ${plural(quantidade, 'lugar', 'lugares')}`
}

export const TEXTOS_FECHAMENTO_MESAS = {
  titulo: 'Para fechar as mesas',
  numerosRotulo: 'Lugares e pessoas',
  faltam: (quantidade: number) =>
    `${plural(quantidade, 'Falta', 'Faltam')} ${lugares(quantidade)} para sentar todos os confirmados.`,
  bastam: (semMesa: number) =>
    `Os lugares livres bastam para ${plural(semMesa, 'o confirmado', `os ${formatarNumero(semMesa)} confirmados`)} sem mesa.`,
  todosSentados: (sobram: number) =>
    sobram > 0
      ? `Todos os confirmados têm mesa. ${plural(sobram, 'Sobra', 'Sobram')} ${lugares(sobram)}.`
      : 'Todos os confirmados têm mesa, sem lugar sobrando.',
  semMesas: (confirmados: number) =>
    `Ainda não há mesas para ${plural(confirmados, 'o confirmado', `os ${formatarNumero(confirmados)} confirmados`)}.`,
  semConfirmados: (capacidade: number) =>
    `As mesas somam ${lugares(capacidade)}. As pessoas aparecem aqui quando confirmam.`,
  lugares: (quantidade: number) => plural(quantidade, 'lugar', 'lugares'),
  lugaresAcessivel: (quantidade: number) => `${lugares(quantidade)} nas mesas`,
  confirmados: (quantidade: number) => plural(quantidade, 'confirmado', 'confirmados'),
  confirmadosAcessivel: (quantidade: number) =>
    `${formatarNumero(quantidade)} ${plural(quantidade, 'pessoa confirmada', 'pessoas confirmadas')}`,
  maximo: 'se todos que faltam vierem',
  maximoAcessivel: (quantidade: number) => `${pessoas(quantidade)} se todos que faltam vierem`,
  faltariam: (quantidade: number) => `Se todos que faltam vierem, ${plural(quantidade, 'faltaria', 'faltariam')} ${lugares(quantidade)}.`,
  cabem: 'Mesmo que todos que faltam venham, os lugares bastam.',
  observacoesRotulo: 'O que conferir nas mesas',
  especialDefinida: (termo: string, ocupados: number, capacidade: number) =>
    `${termo}: ${formatarNumero(ocupados)} de ${lugares(capacidade)} ${plural(capacidade, 'ocupado', 'ocupados')}.`,
  especialDefinidaComNome: (termo: string, rotulo: string, ocupados: number, capacidade: number) =>
    `${termo} (${rotulo}): ${formatarNumero(ocupados)} de ${lugares(capacidade)} ${plural(capacidade, 'ocupado', 'ocupados')}.`,
  especialAusente: (termo: string) =>
    `Ainda não há ${termo.charAt(0).toLocaleLowerCase('pt-BR')}${termo.slice(1)}. Ao criar ou editar uma mesa, marque “${termo}”.`,
  completas: (quantidade: number) =>
    `${formatarNumero(quantidade)} ${plural(quantidade, 'mesa completa', 'mesas completas')}`,
  vazias: (quantidade: number) =>
    `${formatarNumero(quantidade)} ${plural(quantidade, 'mesa ainda vazia', 'mesas ainda vazias')}`,
  criancas: (quantidade: number) =>
    `${formatarNumero(quantidade)} ${plural(quantidade, 'criança ainda sem mesa', 'crianças ainda sem mesa')}`,
  divididos: (quantidade: number) =>
    `${formatarNumero(quantidade)} ${plural(quantidade, 'convite dividido', 'convites divididos')} entre mesas`,
} as const

export const TEXTOS_GRUPOS_SEM_MESA = {
  titulo: 'Por grupo',
  grupoAcessivel: (grupo: string, quantidade: number) => `Ver só ${grupo}: ${formatarNumero(quantidade)} sem mesa`,
  mais: (quantidade: number) => `e mais ${formatarNumero(quantidade)}`,
  nota: 'Quem é do mesmo grupo costuma sentar junto.',
} as const

export const TEXTOS_IMPRESSAO_MESAS = {
  titulo: (nomes: string) => `Mapa de mesas — ${nomes}`,
  acoesRotulo: 'Ações do mapa de mesas',
  documento: 'Mapa de mesas',
  voltar: 'Voltar às mesas',
  voltarConfirmacoes: 'Voltar às confirmações',
  imprimir: 'Imprimir',
  gerado: (quando: string) => `Gerado em ${quando}`,
  detalhesRotulo: 'Dados do evento',
  resumoRotulo: 'Resumo das mesas',
  resumoMesas: (quantidade: number) => TEXTOS_MESAS.mesasTotal(quantidade),
  resumoLugares: (quantidade: number) => plural(quantidade, 'lugar', 'lugares'),
  resumoSentados: (quantidade: number) => TEXTOS_MESAS.sentados(quantidade),
  resumoLivres: (quantidade: number) => TEXTOS_MESAS.livres(quantidade),
  resumoSemMesa: TEXTOS_MESAS.semMesaTotal,
  livresNaMesa: (quantidade: number) => `${formatarNumero(quantidade)} ${TEXTOS_MESAS.livres(quantidade)}`,
  completa: 'Completa',
  criancasNaMesa: (quantidade: number) => `${formatarNumero(quantidade)} ${plural(quantidade, 'criança', 'crianças')}`,
  legendaRotulo: 'Como ler o mapa',
  legendaOcupado: 'lugar ocupado',
  legendaLivre: 'lugar livre',
  legendaMarcadores: '(criança) e (acompanhante) aparecem depois do nome',
  legendaEspecial: (termo: string) => `${termo}: contorno mais forte, sempre primeiro`,
  semMesas: 'Nenhuma mesa criada ainda.',
  semMesaTitulo: (quantidade: number) => `Sem mesa (${formatarNumero(quantidade)})`,
  rodape: 'Lista para organização do salão. Não contém dados de contato.',
  erroCarregar: 'Não foi possível montar o mapa de mesas.',
} as const

export const CABECALHO_CSV_MESAS = ['Mesa', 'Lugares', 'Pessoa', 'Convite', 'Faixa etária', 'Acompanhante'] as const
