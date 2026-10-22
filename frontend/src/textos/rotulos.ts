export const ROTULOS_ACOES = {
  salvar: 'Salvar',
  cancelar: 'Cancelar',
  excluir: 'Excluir',
  editar: 'Editar',
  adicionar: 'Adicionar',
  voltar: 'Voltar',
  buscar: 'Buscar',
  mostrarSugestoes: 'Mostrar sugestões',
  limparFiltros: 'Limpar filtros',
  tentarNovamente: 'Tentar novamente',
  fechar: 'Fechar',
  abrirMenu: 'Abrir menu',
  desfazer: 'Desfazer',
  fecharMenu: 'Fechar menu',
} as const

export const ROTULOS_NAVEGACAO = {
  pularConteudo: 'Pular para o conteúdo',
  navegacaoGlobal: 'Navegação global',
  modulosEvento: 'Módulos do evento',
  rotuloEvento: 'Evento',
  quandoEvento: (data: string, contagem: string) => `${data} · ${contagem.charAt(0).toLowerCase()}${contagem.slice(1)}`,
  trilha: 'Você está em',
  trocarEvento: 'Trocar de evento',
  buscarEvento: 'Buscar anfitriões',
  nenhumEvento: 'Nenhum anfitrião encontrado',
  eventoGenerico: 'Evento',
} as const

export const ROTULOS_LISTAGEM = {
  acoes: 'Ações',
} as const

export const ROTULOS_CAMPOS = {
  obrigatorio: 'obrigatório',
  placeholderBusca: 'Buscar por nome',
} as const

export const VALOR_AUSENTE = '—'

export const ROTULOS_GRUPOS_EVENTO = {
  planejar: 'Planejar',
  pessoas: 'Pessoas',
  dinheiroDocumentos: 'Dinheiro & documentos',
  execucao: 'Execução',
} as const

export const ROTULOS_MODULOS_EVENTO = {
  visaoGeral: 'Visão geral',
  tarefas: 'Tarefas',
  checklist: 'Checklist',
  cronograma: 'Cronograma',
  convidados: 'Convidados',
  confirmacoes: 'Confirmações',
  restricoes: 'Restrições alimentares',
  mesas: 'Mesas',
  fornecedores: 'Fornecedores',
  financeiro: 'Financeiro',
  grandeDia: 'Grande Dia',
} as const

export const NOME_PRODUTO = 'Celebri'
