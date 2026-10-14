import type { VarianteStatus } from '@/componentes/base/tipos'
import type { FaixaEtaria, RespostaRsvp, StatusEnvioConvite } from '@/tipos/convidados'
import { formatarNumero } from '@/utilitarios/formatacao'
import { NOME_PRODUTO } from '@/textos/rotulos'

function plural(quantidade: number, singular: string, varias: string): string {
  return quantidade === 1 ? singular : varias
}

function contar(quantidade: number, singular: string, varias: string): string {
  return `${formatarNumero(quantidade)} ${plural(quantidade, singular, varias)}`
}

export const TEXTOS_CONVIDADOS = {
  blocoTitulo: 'Convidados',
  gerenciar: 'Gerenciar convidados',
  listaTitulo: 'Convidados',
  listaRotulo: 'Lista de convites',
  resumoRotulo: 'Totais de convidados',
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
  dicaGrupo: 'Por exemplo: Família da noiva, Amigos do noivo.',
  mostrarGrupos: 'Mostrar grupos já usados',
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
  avisoArquivado: 'Este casamento está arquivado. Restaure para voltar a editar os convidados.',
  vazioTitulo: 'Nenhum convite cadastrado',
  vazioTexto: 'Comece pela família de um dos noivos. Cada convite reúne as pessoas que recebem o mesmo convite.',
  blocoVazioTitulo: 'Nenhum convidado ainda',
  blocoVazioTexto: 'Cadastre as famílias e grupos para acompanhar quem vem.',
  erroCarregarTitulo: 'Não foi possível carregar os convidados',
  erroCarregar: 'Não foi possível carregar os convidados. Tente novamente em instantes.',
  semAcesso: 'Você não tem acesso aos convidados desta assessoria.',
  semPermissao: 'Você não tem permissão para alterar convidados.',
  casamentoNaoEncontradoTitulo: 'Casamento não encontrado',
  casamentoNaoEncontradoTexto: 'Ele pode ter sido excluído ou pertencer a outra assessoria.',
  conviteNaoEncontradoTitulo: 'Convite não encontrado',
  conviteNaoEncontradoTexto: 'Ele pode ter sido excluído.',
  voltarConvidados: 'Voltar para convidados',
  voltarCasamentos: 'Voltar para casamentos',
  salvo: (nome: string) => `Convite “${nome}” salvo.`,
  confirmarExclusaoTexto: (quantidade: number) =>
    quantidade === 1
      ? 'A pessoa deste convite também será excluída.'
      : `As ${formatarNumero(quantidade)} pessoas deste convite também serão excluídas.`,
  acaoComNome: (acao: string, nome: string) => `${acao} ${nome}`,
  tituloDocumento: (nomesCasal: string) => `Convidados · ${nomesCasal} · ${NOME_PRODUTO}`,
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
