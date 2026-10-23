import type { VarianteStatus } from '@/componentes/base/tipos'
import type { FaixaEtaria, RespostaRsvp, StatusEnvioConvite } from '@/tipos/convidados'
import { formatarNumero } from '@/utilitarios/formatacao'
import { NOME_PRODUTO } from '@/textos/rotulos'
import { ehTipoEvento, vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'

function plural(quantidade: number, singular: string, varias: string): string {
  return quantidade === 1 ? singular : varias
}

function contar(quantidade: number, singular: string, varias: string): string {
  return `${formatarNumero(quantidade)} ${plural(quantidade, singular, varias)}`
}

function emFrase(itens: readonly string[], conector = 'e'): string {
  if (itens.length <= 1) {
    return itens[0] ?? ''
  }
  return `${itens.slice(0, -1).join(', ')} ${conector} ${itens[itens.length - 1]}`
}

export function referenciaDoEvento(tipo: TipoEvento | null | undefined): string {
  return ehTipoEvento(tipo) ? vocabularioOuNeutro(tipo).referencia.artigo : 'o evento'
}

export function gruposSugeridos(tipo: TipoEvento | null | undefined): readonly string[] {
  return vocabularioOuNeutro(tipo).gruposConvidados
}

export const TEXTOS_CONVIDADOS = {
  blocoTitulo: 'Convidados',
  gerenciar: 'Gerenciar convidados',
  listaTitulo: 'Convidados',
  listaRotulo: 'Lista de convites',
  resumoRotulo: 'Totais de convidados',
  atalhosRotulo: 'Atalhos dos convidados',
  adicionarConvite: 'Adicionar convite',
  novoConviteTitulo: 'Novo convite',
  editarConviteTitulo: 'Editar convite',
  buscaPlaceholder: 'Buscar por nome, e-mail ou telefone',
  filtroGrupo: 'Filtrar por grupo',
  todosGrupos: 'Todos os grupos',
  semGrupo: 'Sem grupo',
  filtroResposta: 'Filtrar por resposta',
  respostaTodas: 'Todas',
  colunaConvite: 'Convite',
  colunaGrupo: 'Grupo',
  colunaAcompanhantes: 'Acompanhantes',
  editar: 'Editar',
  excluir: 'Excluir',
  crianca: 'Criança',
  grupoConvite: 'Convite',
  campoNomeConvite: 'Nome do convite',
  dicaNomeConvite: 'Se deixar em branco, usamos o nome da primeira pessoa.',
  campoGrupo: 'Grupo',
  dicaGrupoPara: (grupos: readonly string[]) => `Por exemplo: ${emFrase(grupos, 'ou')}.`,
  dicaGrupoExistente: (quantidade: number, grupo: string) =>
    quantidade === 1
      ? `1 outro convite já está em ${grupo}.`
      : `${formatarNumero(quantidade)} outros convites já estão em ${grupo}.`,
  mostrarGrupos: 'Mostrar sugestões de grupo',
  campoAcompanhantes: 'Acompanhantes',
  dicaAcompanhantes: 'Pessoas além das listadas que este convite pode levar.',
  opcaoSemAcompanhante: 'Nenhum',
  secaoPessoas: 'Pessoas',
  rotuloPessoa: 'Pessoa',
  campoNome: 'Nome',
  campoIdade: 'Idade',
  campoTelefone: 'Telefone',
  campoEmail: 'E-mail',
  campoResposta: 'Resposta',
  adicionarPessoa: 'Adicionar pessoa',
  removerPessoa: 'Remover pessoa',
  limitePessoas: 'Um convite pode ter até 30 pessoas. Para mais gente, crie outro convite.',
  minimoPessoas: 'Um convite precisa de pelo menos uma pessoa. Para tirar todos, exclua o convite.',
  salvarConvite: 'Salvar convite',
  excluirConvite: 'Excluir convite',
  erroTelefone: 'Informe o telefone com DDD, como (11) 98765-4321.',
  erroNome: 'Use entre 2 e 120 caracteres.',
  erroGrupo: 'Use até 60 caracteres.',
  avisoArquivado: 'Este evento está arquivado. Restaure para voltar a editar os convidados.',
  vazioTitulo: 'Nenhum convite cadastrado',
  vazioTexto: 'Comece pela família de um dos anfitriões. Cada convite reúne as pessoas que recebem o mesmo convite.',
  vazioTextoPara: (referencia: string, grupos: readonly string[]) =>
    `Cada convite reúne as pessoas que recebem o mesmo convite, como uma família. Para ${referencia}, costuma ajudar separar em grupos como ${emFrase(grupos)}.`,
  opcaoGrupo: (rotulo: string, quantidade: number) => `${rotulo} (${formatarNumero(quantidade)})`,
  blocoVazioTitulo: 'Nenhum convidado ainda',
  blocoVazioTexto: 'Cadastre as famílias e grupos para acompanhar quem vem.',
  erroCarregarTitulo: 'Não foi possível carregar os convidados',
  erroCarregar: 'Não foi possível carregar os convidados. Tente novamente em instantes.',
  semAcesso: 'Você não tem acesso aos convidados desta assessoria.',
  semPermissao: 'Você não tem permissão para alterar convidados.',
  eventoNaoEncontradoTitulo: 'Evento não encontrado',
  eventoNaoEncontradoTexto: 'Ele pode ter sido excluído ou pertencer a outra assessoria.',
  conviteNaoEncontradoTitulo: 'Convite não encontrado',
  conviteNaoEncontradoTexto: 'Ele pode ter sido excluído.',
  voltarConvidados: 'Voltar para convidados',
  voltarEventos: 'Voltar para eventos',
  salvo: (nome: string) => `Convite “${nome}” salvo.`,
  restaurado: (nome: string) => `Convite “${nome}” restaurado.`,
  erroExcluir: (nome: string) => `Não foi possível excluir “${nome}”. Tente de novo.`,
  confirmarExclusaoTexto: (quantidade: number) =>
    quantidade === 1
      ? 'A pessoa deste convite também será excluída.'
      : `As ${formatarNumero(quantidade)} pessoas deste convite também serão excluídas.`,
  acaoComNome: (acao: string, nome: string) => `${acao} ${nome}`,
  tituloDocumento: (nomesAnfitrioes: string) => `Convidados · ${nomesAnfitrioes} · ${NOME_PRODUTO}`,
  rotuloPessoaNumero: (numero: number) => `Pessoa ${numero}`,
  contadorPessoas: (quantidade: number, maximo: number) => `${formatarNumero(quantidade)} de ${formatarNumero(maximo)} pessoas`,
  pessoaAdicionada: (numero: number) => `Pessoa ${numero} adicionada.`,
  pessoaRemovida: (numero: number) => `Pessoa ${numero} removida.`,
  opcaoAcompanhantes: (quantidade: number) => contar(quantidade, 'acompanhante', 'acompanhantes'),
  acompanhantesValor: (quantidade: number) => (quantidade > 0 ? `+${formatarNumero(quantidade)}` : '—'),
  resultados: (quantidade: number) => `${contar(quantidade, 'convite encontrado', 'convites encontrados')}`,
  outrasPessoas: (quantidade: number) =>
    `+ ${contar(quantidade, 'outra pessoa neste convite', 'outras pessoas neste convite')}`,
  totalPessoas: (quantidade: number) => plural(quantidade, 'pessoa', 'pessoas'),
  totalConfirmadas: (quantidade: number) => plural(quantidade, 'confirmada', 'confirmadas'),
  totalPendentes: (quantidade: number) => plural(quantidade, 'pendente', 'pendentes'),
  totalRecusadas: (quantidade: number) => plural(quantidade, 'recusada', 'recusadas'),
  detalheFaixas: (adultos: number, criancas: number) =>
    `${contar(adultos, 'adulto', 'adultos')} e ${contar(criancas, 'criança', 'crianças')}`,
  complementoConvites: (convites: number, acompanhantes: number) =>
    acompanhantes > 0
      ? `${contar(convites, 'convite', 'convites')} · até ${contar(acompanhantes, 'acompanhante', 'acompanhantes')}`
      : contar(convites, 'convite', 'convites'),
  comparacaoEstimativa: (pessoas: number, estimados: number) =>
    `${formatarNumero(pessoas)} de ${formatarNumero(estimados)} estimados`,
} as const

export const TEXTOS_ACOMPANHAMENTO_CONVITES = {
  titulo: 'Envio e respostas',
  trilhaRotulo: 'Situação dos convites',
  aEnviar: 'a enviar',
  aguardando: 'aguardando resposta',
  respondidos: (quantidade: number) => plural(quantidade, 'respondido', 'respondidos'),
  numeroAcessivel: (quantidade: number, legenda: string) =>
    `${contar(quantidade, 'convite', 'convites')} ${legenda}`,
  verPendentes: (pessoas: number) => `Ver quem não respondeu (${formatarNumero(pessoas)})`,
  gruposSemEnvioTitulo: 'Grupos sem nenhum convite enviado',
  filtrarGrupo: (grupo: string) => `Filtrar pelo grupo ${grupo}`,
  maisGrupos: (quantidade: number) => `e mais ${contar(quantidade, 'grupo', 'grupos')}`,
  todosRespondidos: 'Todos os convites já foram respondidos.',
  orientacaoGrupos: (grupos: readonly string[]) =>
    `Grupos como ${emFrase(grupos)} ajudam a filtrar e a enviar por partes.`,
} as const

export const TEXTOS_PREVIA_CONVITE = {
  titulo: 'Como o convidado vê',
  subtitulo: 'Um resumo da página de confirmação, atualizado enquanto você preenche.',
  nomeProvisorio: 'Nome do convite',
  pessoaProvisoria: (numero: number) => `Pessoa ${numero}`,
  privacidade: 'Telefone e e-mail ficam só com a assessoria; o convidado vê apenas os nomes.',
  restricoes: 'Restrição alimentar é informada pelo próprio convidado ao confirmar presença.',
} as const

export const ROTULOS_FAIXA_ETARIA: Record<FaixaEtaria, string> = {
  Adulto: 'Adulto',
  Crianca: 'Criança',
}

export const ROTULOS_RESPOSTA: Record<RespostaRsvp, string> = {
  Pendente: 'Pendente',
  Confirmado: 'Confirmado',
  Recusado: 'Recusado',
}

export const ROTULOS_FILTRO_RESPOSTA: Record<RespostaRsvp, string> = {
  Pendente: 'Pendentes',
  Confirmado: 'Confirmadas',
  Recusado: 'Recusadas',
}

export const VARIANTE_RESPOSTA: Record<RespostaRsvp, VarianteStatus> = {
  Pendente: 'alerta',
  Confirmado: 'sucesso',
  Recusado: 'neutro',
}

export const ROTULOS_STATUS_ENVIO: Record<StatusEnvioConvite, string> = {
  NaoEnviado: 'Não enviado',
  Enviado: 'Enviado',
  Visualizado: 'Visualizado',
}
