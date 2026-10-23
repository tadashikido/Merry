import type { TextosEnvioArquivo } from '@/componentes/base/tipos'
import type { StatusFornecedorEvento } from '@/tipos/fornecedoresEvento'
import { NOME_PRODUTO } from '@/textos/rotulos'

export const ROTULOS_STATUS_FORNECEDOR_EVENTO: Record<StatusFornecedorEvento, string> = {
  Cotacao: 'Cotação',
  EmNegociacao: 'Em negociação',
  Contratado: 'Contratado',
  Cancelado: 'Cancelado',
}

function plural(quantidade: number, singular: string, pluralTexto: string): string {
  return quantidade === 1 ? singular : pluralTexto
}

export const TEXTOS_ENVIO_CONTRATO: TextosEnvioArquivo = {
  rotulo: 'Contrato em PDF',
  instrucao: 'Arraste o contrato em PDF ou escolha o arquivo.',
  botao: 'Escolher PDF',
  trocar: 'Escolher outro PDF',
  limites: 'PDF até 10 MB.',
  carregando: 'Enviando contrato…',
}

export const TEXTOS_RESUMO_ORCAMENTO = {
  titulo: 'Orçamento',
  legenda: 'Orçado e contratado por categoria',
  contratadosDe: 'contratados de',
  orcados: 'orçados',
  apoio: (fornecedores: number, contratados: number) =>
    `${fornecedores} ${plural(fornecedores, 'fornecedor', 'fornecedores')} · ${contratados} ${plural(contratados, 'contratado', 'contratados')}`,
  colunaCategoria: 'Categoria',
  colunaContratado: 'Contratado',
  colunaOrcado: 'Orçado',
  colunaProporcao: 'Proporção contratada',
  acimaDoOrcado: (valor: string) => `${valor} acima do orçado`,
  semValores: 'Sem valores',
  total: 'Total',
  de: 'de',
} as const

export const TEXTOS_CONTRATACAO_FORNECEDORES = {
  titulo: 'Contratação',
  legenda: (total: number) =>
    `de ${total} ${plural(total, 'categoria essencial já contratada', 'categorias essenciais já contratadas')}`,
  todas: 'Todas as categorias essenciais estão contratadas.',
  listaRotulo: 'Categorias essenciais e situação',
  situacoes: {
    SemFornecedor: 'Sem fornecedor',
    Cotacao: 'Em cotação',
    EmNegociacao: 'Em negociação',
    Contratado: 'Contratado',
  },
  emConversa: (cotacao: number, negociacao: number) => {
    const partes = [
      cotacao > 0 ? `${cotacao} em cotação` : null,
      negociacao > 0 ? `${negociacao} em negociação` : null,
    ].filter((parte): parte is string => parte !== null)
    return `Em conversa: ${partes.join(' e ')}.`
  },
  nota: (indefinido: string) => `Categorias que costumam entrar em ${indefinido}. Cada evento tem as suas: use como ponto de partida.`,
} as const

export const TEXTOS_CONTRATO = {
  titulo: 'Contrato',
  antesDeSalvar: 'Depois de adicionar, anexe o contrato aqui.',
  baixar: 'Baixar',
  baixarAria: (empresa: string, tamanho: string) => `Baixar contrato de ${empresa} (PDF, ${tamanho})`,
  substituir: 'Substituir',
  remover: 'Remover contrato',
  enviadoEm: (data: string) => `Enviado em ${data}`,
  erroFormato: 'Envie o contrato em PDF.',
  erroTamanho: 'O contrato passa de 10 MB. Envie um PDF menor.',
  erroVazio: 'O arquivo está vazio. Escolha o PDF do contrato.',
  erroLimite: 'Muitos envios seguidos. Aguarde um minuto e tente de novo.',
  erroEnviar: 'Não foi possível enviar o contrato. Tente de novo.',
  erroBaixar: 'Não foi possível baixar o contrato. Tente de novo.',
  erroRemover: 'Não foi possível remover o contrato. Tente de novo.',
  toastAnexado: 'Contrato anexado.',
  toastSubstituido: 'Contrato substituído.',
  toastRemovido: 'Contrato removido.',
  confirmarRemoverTitulo: (empresa: string) => `Remover o contrato de “${empresa}”?`,
  confirmarRemoverTexto: 'O arquivo será apagado. Você pode anexar outro depois.',
  cancelar: 'Cancelar',
} as const

export const TEXTOS_FORNECEDORES_EVENTO = {
  titulo: 'Fornecedores',
  tituloDocumento: (nomes: string) => `Fornecedores · ${nomes} · ${NOME_PRODUTO}`,
  listaRotulo: 'Fornecedores do evento',
  adicionar: 'Adicionar fornecedor',
  importar: 'Importar de outro evento',
  vazioTitulo: 'Você ainda não possui fornecedores.',
  vazioTexto: 'Centralize todos os fornecedores deste evento em um só lugar.',
  vazioAnfitriaoTitulo: 'A assessoria ainda não adicionou fornecedores ao evento.',
  vazioAnfitriaoTexto: 'Quando os fornecedores forem escolhidos, eles aparecem aqui com os valores e o contrato.',
  erroTitulo: 'Não conseguimos carregar os fornecedores.',
  erroTexto: 'A conexão caiu por um instante. Nada do que você salvou foi perdido.',
  semAcesso: 'Esta área é da equipe de cerimonial.',
  naoEncontradoTitulo: 'Evento não encontrado',
  naoEncontradoAnfitriaoTitulo: 'Não encontramos este evento',
  naoEncontradoTexto: 'Ele pode ter sido removido ou você não tem acesso a ele.',
  voltarEventos: 'Voltar para eventos',
  voltarNossoEvento: 'Voltar para o nosso evento',
  arquivado: 'Este evento está arquivado. Restaure para voltar a editar.',
  rotuloOrcado: 'Orçado',
  rotuloContratado: 'Contratado',
  indicadorContrato: 'Contrato',
  fornecedorArquivado: 'Arquivado na base',
  quantidadeGrupo: (quantidade: number) => `${quantidade} ${plural(quantidade, 'fornecedor', 'fornecedores')}`,
  maisAcoes: 'Mais ações',
  maisAcoesAria: (empresa: string) => `Mais ações para ${empresa}`,
  menuEditar: 'Editar',
  menuBaixar: 'Baixar contrato',
  menuRemover: 'Remover do evento',
  confirmarRemoverTitulo: (empresa: string) => `Remover “${empresa}” deste evento?`,
  confirmarRemoverTexto: 'O vínculo, os valores e o contrato anexado serão apagados. O fornecedor continua na sua base.',
  confirmarRemover: 'Remover',
  cancelar: 'Cancelar',
  toastAdicionado: (empresa: string) => `${empresa} adicionado ao evento.`,
  toastSalvo: 'Alterações salvas.',
  toastRemovido: (empresa: string) => `${empresa} removido do evento.`,
  erroRemover: 'Não foi possível remover o fornecedor do evento. Tente de novo.',
  erroConflito: 'Este fornecedor foi alterado em outra tela. Recarregue para ver a versão atual.',
  rodapeAnfitriao: 'A assessoria cuida das negociações. Fale com ela se tiver dúvidas sobre algum fornecedor.',
  tituloNovo: 'Adicionar fornecedor ao evento',
  tituloEditar: 'Editar fornecedor do evento',
  campoFornecedor: 'Fornecedor',
  grupoFornecedor: 'Fornecedor',
  grupoContratacao: 'Contratação',
  lateralContrato: 'Contrato do fornecedor',
  placeholderFornecedor: 'Escolha um fornecedor da sua base',
  linkCadastrar: 'Cadastrar fornecedor na base',
  semDisponiveis: 'Todos os fornecedores ativos já estão neste evento.',
  semFornecedoresBase: 'Sua base ainda não tem fornecedores ativos.',
  carregandoFornecedores: 'Carregando fornecedores…',
  erroFornecedores: 'Não foi possível carregar a sua base de fornecedores.',
  campoServico: 'Serviço',
  placeholderServico: 'Ex.: Jantar para 200 pessoas',
  campoStatus: 'Situação',
  campoOrcado: 'Valor orçado',
  campoContratado: 'Valor contratado',
  ajudaContratado: 'Obrigatório quando a situação é Contratado.',
  campoNotas: 'Notas internas',
  ajudaNotas: (atual: number, limite: number) => `Só a assessoria vê. Os anfitriões não têm acesso. ${atual}/${limite}`,
  salvarNovo: 'Adicionar ao evento',
  salvar: 'Salvar alterações',
  erroFornecedorObrigatorio: 'Escolha o fornecedor.',
  erroContratadoSemValor: 'Informe o valor contratado.',
  erroValor: 'Informe um valor entre R$ 0,00 e R$ 99.999.999,99.',
  erroTamanhoServico: 'Use até 120 caracteres.',
  erroTamanhoNotas: 'Use até 2.000 caracteres.',
  erroSalvar: 'Não foi possível salvar. Confira a conexão e tente de novo.',
  vinculoNaoEncontradoTitulo: 'Fornecedor do evento não encontrado',
  vinculoNaoEncontradoTexto: 'Ele pode ter sido removido deste evento.',
  semPermissao: 'Somente a assessoria pode alterar os fornecedores do evento.',
  importarTitulo: 'Importar fornecedores de outro evento',
  importarCampo: 'Evento de origem',
  importarPlaceholder: 'Escolha o evento',
  importarExplicacao:
    'Trazemos fornecedor, serviço e valor orçado. Valores contratados, notas e contratos ficam no evento de origem. Todos entram como Cotação.',
  importarBotao: 'Importar fornecedores',
  importarCarregando: 'Carregando eventos…',
  importarSemEventos: 'Você ainda não tem outro evento para importar.',
  importarNenhum: 'Nenhum fornecedor novo para importar deste evento.',
  importarErroEventos: 'Não foi possível carregar os eventos. Tente de novo.',
  importarErro: 'Não foi possível importar os fornecedores. Tente de novo.',
  importarOrigemObrigatoria: 'Escolha o evento de origem.',
  importarResultado: (importados: number, ignorados: number) => {
    const base = `${importados} ${plural(importados, 'fornecedor importado', 'fornecedores importados')}.`
    return ignorados > 0
      ? `${base} ${ignorados} já ${plural(ignorados, 'estava', 'estavam')} no evento ou ${plural(ignorados, 'arquivado', 'arquivados')}.`
      : base
  },
  opcaoEvento: (nomes: string, data: string, arquivado: boolean) => `${nomes} — ${data}${arquivado ? ' (arquivado)' : ''}`,
} as const

export const TEXTOS_HISTORICO_FORNECEDOR = {
  carregando: 'Carregando eventos…',
  erro: 'Não foi possível carregar os eventos deste fornecedor.',
  tentarNovamente: 'Tentar novamente',
  eventoArquivado: 'Arquivado',
  listaRotulo: 'Eventos em que participou',
  excluirBloqueado: (quantidade: number) =>
    `Este fornecedor participou de ${quantidade} ${plural(quantidade, 'evento', 'eventos')} e não pode ser excluído. Arquive-o para tirá-lo das listas.`,
} as const
