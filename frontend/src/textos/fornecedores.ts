import { VOCABULARIO_TIPO_EVENTO, tiposEventoEmFrase } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import type { CategoriaFornecedor } from '@/tipos/fornecedores'

function plural(quantidade: number, singular: string, varios: string): string {
  return quantidade === 1 ? singular : varios
}

export const ROTULOS_CATEGORIA_FORNECEDOR: Record<CategoriaFornecedor, string> = {
  Buffet: 'Buffet',
  EspacoLocal: 'Espaço e local',
  Decoracao: 'Decoração',
  Fotografia: 'Fotografia',
  Filmagem: 'Filmagem',
  Musica: 'Música, DJ e banda',
  BoloDoces: 'Bolo e doces',
  ConvitesPapelaria: 'Convites e papelaria',
  Beleza: 'Beleza',
  Vestuario: 'Vestuário',
  IluminacaoSom: 'Iluminação e som',
  Transporte: 'Transporte',
  Seguranca: 'Segurança',
  CerimonialApoio: 'Cerimonial de apoio',
  Outros: 'Outros',
}

export const TEXTOS_CANAIS_CONTATO = {
  rotulo: (nome: string) => `Contatos de ${nome}`,
  ligar: (nome: string) => `Ligar para ${nome}`,
  whatsapp: (nome: string) => `WhatsApp de ${nome} (abre em nova aba)`,
  email: (nome: string) => `E-mail de ${nome}`,
  site: (nome: string) => `Site de ${nome} (abre em nova aba)`,
  instagram: (nome: string) => `Instagram de ${nome} (abre em nova aba)`,
  rotuloWhatsapp: 'WhatsApp',
} as const

export const TEXTOS_INDICE_CATEGORIAS = {
  quantidade: (quantidade: number) => `${quantidade} ${plural(quantidade, 'fornecedor', 'fornecedores')}`,
} as const

export const TEXTOS_FORNECEDORES = {
  menu: 'Fornecedores',
  titulo: 'Fornecedores',
  tituloDocumento: 'Fornecedores',
  tituloDetalhe: 'Fornecedor',
  subtitulo: 'Os contatos de confiança da assessoria, prontos para cada evento.',
  adicionar: 'Adicionar fornecedor',
  buscaRotulo: 'Buscar fornecedor',
  buscaPlaceholder: 'Buscar por empresa ou responsável',
  categoriaRotulo: 'Categoria',
  indiceRotulo: 'Categorias',
  todas: 'Todas',
  situacaoRotulo: 'Situação',
  ativos: (quantidade: number) => `Ativos ${quantidade}`,
  arquivados: (quantidade: number) => `Arquivados ${quantidade}`,
  resultados: (quantidade: number) =>
    `${quantidade} ${plural(quantidade, 'fornecedor encontrado', 'fornecedores encontrados')}`,
  listaRotulo: 'Fornecedores da assessoria',
  quantidadeGrupo: (quantidade: number) => `${quantidade} ${plural(quantidade, 'fornecedor', 'fornecedores')}`,
  vazioTitulo: 'Você ainda não possui fornecedores.',
  vazioTexto: 'Cadastre uma vez os contatos de confiança e adicione-os a cada evento, sem digitar de novo.',
  vazioArquivados: 'Nenhum fornecedor arquivado.',
  vazioArquivadosTexto: 'Os fornecedores arquivados ficam aqui e podem ser restaurados.',
  semResultado: 'Nenhum fornecedor encontrado.',
  semResultadoTexto: 'Tente outro termo ou limpe os filtros.',
  limparFiltros: 'Limpar filtros',
  erroTitulo: 'Não foi possível carregar os fornecedores.',
  erroTexto: 'Verifique sua conexão e tente de novo.',
  erroDetalheTitulo: 'Não foi possível carregar o fornecedor.',
  semAcesso: 'Só a assessoria acessa a base de fornecedores.',
  naoEncontradoTitulo: 'Fornecedor não encontrado',
  naoEncontradoTexto: 'Ele pode ter sido excluído. Volte para a lista de fornecedores.',
  voltar: 'Voltar para fornecedores',
  maisAcoes: 'Mais ações',
  maisAcoesAria: (nome: string) => `Mais ações para ${nome}`,
  editar: 'Editar',
  arquivar: 'Arquivar',
  restaurar: 'Restaurar',
  excluir: 'Excluir',
  badgeArquivado: 'Arquivado',
  contato: 'Contato',
  semContato: 'Nenhum contato cadastrado. Adicione telefone ou e-mail em Editar.',
  observacoes: 'Observações internas',
  observacoesApoio: 'Só a assessoria vê.',
  semObservacoes: 'Sem observações.',
  historicoTitulo: 'Eventos em que participou',
  historicoVazioTitulo: 'Nenhum evento ainda',
  historicoVazioTexto: 'Quando você adicionar este fornecedor a um evento, ele aparece aqui com a data e os anfitriões.',
  arquivadoFaixa: 'Este fornecedor está arquivado e não aparece na lista principal.',
  cadastro: (criadoEm: string, atualizadoEm: string) => `Cadastrado em ${criadoEm} · atualizado em ${atualizadoEm}`,
  novoTitulo: 'Novo fornecedor',
  editarTitulo: 'Editar fornecedor',
  formNovoDescricao: 'Cadastre uma vez e use em todos os eventos da assessoria.',
  grupoEmpresa: 'Empresa',
  grupoContato: 'Contato',
  grupoInterno: 'Uso interno',
  campoCategoria: 'Categoria',
  categoriaPlaceholder: 'Selecione a categoria',
  campoEmpresa: 'Nome da empresa',
  campoResponsavel: 'Responsável',
  campoResponsavelDica: 'Quem atende a assessoria.',
  campoTelefone: 'Telefone',
  campoTelefoneDica: 'Com DDD. Usamos também para o WhatsApp.',
  campoEmail: 'E-mail',
  campoSite: 'Site',
  campoSitePlaceholder: 'ex.: buffetsaojoao.com.br',
  campoInstagram: 'Instagram',
  campoInstagramPlaceholder: 'ex.: @buffetsaojoao',
  campoObservacoes: 'Observações internas',
  campoObservacoesDica: (usados: number, limite: number) =>
    `Só a assessoria vê. ${usados.toLocaleString('pt-BR')} de ${limite.toLocaleString('pt-BR')} caracteres.`,
  salvarNovo: 'Adicionar fornecedor',
  salvarEdicao: 'Salvar alterações',
  cancelar: 'Cancelar',
  erroCategoria: 'Escolha a categoria.',
  erroEmpresaObrigatoria: 'Informe o nome da empresa.',
  erroEmpresaTamanho: 'Use de 2 a 120 caracteres.',
  erroResponsavel: 'Use até 120 caracteres.',
  erroTelefone: 'Informe um telefone com DDD, só com números, espaços, parênteses ou traço.',
  erroEmail: 'Informe um e-mail válido, como nome@empresa.com.br.',
  erroSite: 'Informe um endereço de site válido, como buffetsaojoao.com.br.',
  erroInstagram: 'Use só letras, números, ponto e sublinhado (até 30).',
  erroObservacoes: 'Use até 2.000 caracteres.',
  erroConcorrencia: 'Este fornecedor foi alterado em outra tela. Recarregue para ver a versão atual.',
  erroSalvar: 'Não foi possível salvar o fornecedor. Tente de novo.',
  erroConexao: 'Sem conexão. Confira a internet e tente de novo.',
  toastAdicionado: (nome: string) => `${nome} adicionado.`,
  toastSalvo: 'Alterações salvas.',
  toastArquivado: (nome: string) => `${nome} arquivado.`,
  toastRestaurado: (nome: string) => `${nome} restaurado.`,
  toastExcluido: (nome: string) => `${nome} excluído.`,
  confirmarExclusaoTexto: 'O fornecedor sai da base da assessoria. Esta ação não pode ser desfeita.',
  excluirTitulo: (nome: string) => `Excluir “${nome}”?`,
  erroExcluir: 'Não foi possível excluir o fornecedor. Tente de novo.',
  erroArquivar: 'Não foi possível arquivar o fornecedor. Tente de novo.',
  erroRestaurar: 'Não foi possível restaurar o fornecedor. Tente de novo.',
} as const

function tiposNoPlural(tipos: readonly TipoEvento[]): string {
  const rotulos = tipos.map((tipo) => VOCABULARIO_TIPO_EVENTO[tipo].contagem.plural)
  const ultimo = rotulos.pop() ?? ''
  return rotulos.length > 0 ? `${rotulos.join(', ')} e ${ultimo}` : ultimo
}

export const TEXTOS_COBERTURA_FORNECEDORES = {
  titulo: 'Categorias essenciais',
  carteira: (descricao: string) => `Para os eventos pela frente: ${descricao}.`,
  semCarteira: () => `O que costuma ser essencial em ${tiposEventoEmFrase()}.`,
  legenda: (total: number) =>
    `de ${total.toLocaleString('pt-BR')} ${plural(total, 'categoria essencial', 'categorias essenciais')} com fornecedor ativo`,
  faltasTitulo: 'Ainda sem fornecedor',
  essencialParaEventos: (quantidade: number) =>
    `Essencial para ${quantidade.toLocaleString('pt-BR')} ${plural(quantidade, 'evento', 'eventos')} pela frente`,
  essencialEm: (tipos: readonly TipoEvento[]) =>
    tipos.length === TIPOS_EVENTO.length ? 'Essencial nos 4 tipos de evento' : `Essencial em ${tiposNoPlural(tipos)}`,
  arquivados: (quantidade: number) =>
    `${quantidade.toLocaleString('pt-BR')} ${plural(quantidade, 'arquivado', 'arquivados')} nesta categoria`,
  todas: 'Todas as categorias essenciais têm fornecedor ativo.',
  reaproveitamentoTitulo: 'Como a base é reaproveitada',
  reaproveitamento: [
    'Cadastre cada fornecedor uma vez; ele fica disponível para todos os eventos.',
    'Em cada evento, adicione-o em Fornecedores do evento com o serviço e o valor combinados.',
    'Arquive quem saiu do circuito: o histórico nos eventos continua.',
  ],
} as const
