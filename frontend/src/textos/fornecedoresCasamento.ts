import type { TextosEnvioArquivo } from '@/componentes/base/tipos'
import type { StatusFornecedorCasamento } from '@/tipos/fornecedoresCasamento'

export const ROTULOS_STATUS_FORNECEDOR_CASAMENTO: Record<StatusFornecedorCasamento, string> = {
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

export const TEXTOS_FORNECEDORES_CASAMENTO = {
  titulo: 'Fornecedores',
  tituloDocumento: (nomes: string) => `Fornecedores · ${nomes} · Enlace`,
  listaRotulo: 'Fornecedores do casamento',
  adicionar: 'Adicionar fornecedor',
  importar: 'Importar de outro casamento',
  vazioTitulo: 'Você ainda não possui fornecedores.',
  vazioTexto: 'Centralize todos os fornecedores deste casamento em um só lugar.',
  vazioCasalTitulo: 'A assessoria ainda não adicionou fornecedores ao casamento.',
  vazioCasalTexto: 'Quando os fornecedores forem escolhidos, eles aparecem aqui com os valores e o contrato.',
  erroTitulo: 'Não conseguimos carregar os fornecedores.',
  erroTexto: 'A conexão caiu por um instante. Nada do que você salvou foi perdido.',
  semAcesso: 'Esta área é da equipe de cerimonial.',
  naoEncontradoTitulo: 'Casamento não encontrado',
  naoEncontradoCasalTitulo: 'Não encontramos este casamento',
  naoEncontradoTexto: 'Ele pode ter sido removido ou você não tem acesso a ele.',
  voltarCasamentos: 'Voltar para casamentos',
  voltarNossoCasamento: 'Voltar para o nosso casamento',
  arquivado: 'Este casamento está arquivado. Restaure para voltar a editar.',
  rotuloOrcado: 'Orçado',
  rotuloContratado: 'Contratado',
  indicadorContrato: 'Contrato',
  fornecedorArquivado: 'Arquivado na base',
  quantidadeGrupo: (quantidade: number) => `${quantidade} ${plural(quantidade, 'fornecedor', 'fornecedores')}`,
  maisAcoes: 'Mais ações',
  maisAcoesAria: (empresa: string) => `Mais ações para ${empresa}`,
  menuEditar: 'Editar',
  menuBaixar: 'Baixar contrato',
  menuRemover: 'Remover do casamento',
  confirmarRemoverTitulo: (empresa: string) => `Remover “${empresa}” deste casamento?`,
  confirmarRemoverTexto: 'O vínculo, os valores e o contrato anexado serão apagados. O fornecedor continua na sua base.',
  confirmarRemover: 'Remover',
  cancelar: 'Cancelar',
  toastAdicionado: (empresa: string) => `${empresa} adicionado ao casamento.`,
  toastSalvo: 'Alterações salvas.',
  toastRemovido: (empresa: string) => `${empresa} removido do casamento.`,
  erroRemover: 'Não foi possível remover o fornecedor do casamento. Tente de novo.',
  erroConflito: 'Este fornecedor foi alterado em outra tela. Recarregue para ver a versão atual.',
  rodapeCasal: 'A assessoria cuida das negociações. Fale com ela se tiver dúvidas sobre algum fornecedor.',
  tituloNovo: 'Adicionar fornecedor ao casamento',
  tituloEditar: 'Editar fornecedor do casamento',
  campoFornecedor: 'Fornecedor',
  placeholderFornecedor: 'Escolha um fornecedor da sua base',
  linkCadastrar: 'Cadastrar fornecedor na base',
  semDisponiveis: 'Todos os fornecedores ativos já estão neste casamento.',
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
  ajudaNotas: (atual: number, limite: number) => `Só a assessoria vê. O casal não tem acesso. ${atual}/${limite}`,
  salvarNovo: 'Adicionar ao casamento',
  salvar: 'Salvar alterações',
  erroFornecedorObrigatorio: 'Escolha o fornecedor.',
  erroContratadoSemValor: 'Informe o valor contratado.',
  erroValor: 'Informe um valor entre R$ 0,00 e R$ 99.999.999,99.',
  erroTamanhoServico: 'Use até 120 caracteres.',
  erroTamanhoNotas: 'Use até 2.000 caracteres.',
  erroSalvar: 'Não foi possível salvar. Confira a conexão e tente de novo.',
  vinculoNaoEncontradoTitulo: 'Fornecedor do casamento não encontrado',
  vinculoNaoEncontradoTexto: 'Ele pode ter sido removido deste casamento.',
  semPermissao: 'Somente a assessoria pode alterar os fornecedores do casamento.',
  importarTitulo: 'Importar fornecedores de outro casamento',
  importarCampo: 'Casamento de origem',
  importarPlaceholder: 'Escolha o casamento',
  importarExplicacao:
    'Trazemos fornecedor, serviço e valor orçado. Valores contratados, notas e contratos ficam no casamento de origem. Todos entram como Cotação.',
  importarBotao: 'Importar fornecedores',
  importarCarregando: 'Carregando casamentos…',
  importarSemCasamentos: 'Você ainda não tem outro casamento para importar.',
  importarNenhum: 'Nenhum fornecedor novo para importar deste casamento.',
  importarErroCasamentos: 'Não foi possível carregar os casamentos. Tente de novo.',
  importarErro: 'Não foi possível importar os fornecedores. Tente de novo.',
  importarOrigemObrigatoria: 'Escolha o casamento de origem.',
  importarResultado: (importados: number, ignorados: number) => {
    const base = `${importados} ${plural(importados, 'fornecedor importado', 'fornecedores importados')}.`
    return ignorados > 0
      ? `${base} ${ignorados} já ${plural(ignorados, 'estava', 'estavam')} no casamento ou ${plural(ignorados, 'arquivado', 'arquivados')}.`
      : base
  },
  opcaoCasamento: (nomes: string, data: string, arquivado: boolean) => `${nomes} — ${data}${arquivado ? ' (arquivado)' : ''}`,
} as const

export const TEXTOS_HISTORICO_FORNECEDOR = {
  carregando: 'Carregando casamentos…',
  erro: 'Não foi possível carregar os casamentos deste fornecedor.',
  tentarNovamente: 'Tentar novamente',
  casamentoArquivado: 'Arquivado',
  listaRotulo: 'Casamentos em que participou',
  excluirBloqueado: (quantidade: number) =>
    `Este fornecedor participou de ${quantidade} ${plural(quantidade, 'casamento', 'casamentos')} e não pode ser excluído. Arquive-o para tirá-lo das listas.`,
} as const
