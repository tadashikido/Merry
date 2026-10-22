import type { OrigemConsentimento, TipoRestricaoAlimentar } from '@/tipos/dadosSensiveis'
import { formatarNumero } from '@/utilitarios/formatacao'

export const VERSAO_TERMO_PRIVACIDADE = '2026-09-29'

export const TAMANHO_MAXIMO_OUTRA_RESTRICAO = 80
export const TAMANHO_MAXIMO_NECESSIDADE_ESPECIAL = 200

export const ROTULOS_TIPO_RESTRICAO: Record<TipoRestricaoAlimentar, string> = {
  Vegetariana: 'Vegetariana',
  Vegana: 'Vegana',
  SemGluten: 'Sem glúten',
  SemLactose: 'Sem lactose',
  AlergiaFrutosDoMar: 'Alergia a frutos do mar',
  AlergiaAmendoimCastanhas: 'Alergia a amendoim ou castanhas',
}

export const ROTULOS_ORIGEM_CONSENTIMENTO: Record<OrigemConsentimento, string> = {
  Convidado: 'Informada pelo convidado',
  Cerimonialista: 'Registrada pela assessoria',
}

function pessoas(quantidade: number): string {
  return quantidade === 1 ? '1 pessoa' : `${formatarNumero(quantidade)} pessoas`
}

export const TEXTOS_DADOS_SENSIVEIS = {
  abrirRestricao: 'Alguma restrição alimentar ou necessidade especial?',
  fecharRestricao: 'Fechar restrição alimentar e necessidade especial',
  legendaRestricoes: (nome: string) => `Restrições alimentares de ${nome}`,
  legendaVisivel: 'Restrições alimentares',
  outraRestricao: 'Outra restrição',
  placeholderOutra: 'Ex.: não come carne de porco',
  necessidadeEspecial: 'Necessidade especial',
  dicaNecessidade: 'Ex.: cadeira de rodas, lugar perto da saída, cadeira alta para bebê',
  opcional: '(opcional)',
  contador: (atual: number, maximo: number) => `${formatarNumero(atual)} de ${formatarNumero(maximo)} caracteres`,
  registrada: 'Restrição registrada',
  naoExibimos: 'Por privacidade, não mostramos o que foi informado.',
  informarDeNovo: 'Informar de novo',
  remover: 'Remover',
  seraRemovida: 'Será removida ao enviar.',
  desfazer: 'Desfazer',
  seraApagadaRecusa: (nome: string) => `A restrição de ${nome} será apagada ao enviar.`,
  avisoTitulo: 'Sobre estas informações',
  avisoTexto: (dias: number) =>
    `Usamos restrições e necessidades só para o buffet e a organização do evento. Quem vê: a assessoria do evento e, sem seus contatos, o buffet. Tudo é apagado ${formatarNumero(dias)} ${dias === 1 ? 'dia' : 'dias'} depois do evento.`,
  consentimento: 'Autorizo o uso destas informações, inclusive das pessoas deste convite, para essa finalidade.',
  erroConsentimento: 'Marque a autorização para enviarmos as restrições, ou apague o que foi preenchido.',
  erroOutraLonga: `Use até ${TAMANHO_MAXIMO_OUTRA_RESTRICAO} caracteres em outra restrição.`,
  erroNecessidadeLonga: `Use até ${TAMANHO_MAXIMO_NECESSIDADE_ESPECIAL} caracteres na necessidade especial.`,
  tituloPainel: 'Restrições alimentares',
  descricaoPainel: 'Para o buffet e a organização. Sem telefones nem e-mails.',
  resumoBuffet: 'Para o buffet (confirmados)',
  outrasRestricoes: 'Outras restrições',
  necessidadesEspeciais: 'Necessidades especiais',
  totais: (total: number, confirmados: number) =>
    `${pessoas(total)} com restrição, ${formatarNumero(confirmados)} ${confirmados === 1 ? 'confirmada' : 'confirmadas'}`,
  semConfirmados: 'Ninguém com restrição confirmou presença ainda.',
  exclusaoPrevista: (data: string, dias: number) =>
    `Estas informações serão apagadas em ${data} (${formatarNumero(dias)} ${dias === 1 ? 'dia' : 'dias'} após o evento).`,
  dadosExcluidosTitulo: 'Dados excluídos pela política de privacidade',
  dadosExcluidosTexto: (data: string) => `As restrições deste evento foram apagadas em ${data}.`,
  vazioTitulo: 'Ninguém informou restrição ainda',
  vazioTexto: 'As respostas do link aparecem aqui. Você também pode registrar uma restrição recebida por outro canal.',
  erroCarregar: 'Não foi possível carregar as restrições.',
  semAcesso: 'Você não tem permissão para ver as restrições.',
  registrar: 'Registrar restrição',
  editar: 'Editar',
  tituloRegistrar: 'Registrar restrição',
  tituloEditar: (nome: string) => `Editar restrição de ${nome}`,
  pessoa: 'Pessoa',
  placeholderPessoa: 'Busque pelo nome',
  semPessoas: 'Nenhuma pessoa disponível. Cadastre convidados primeiro.',
  consentimentoObtido: 'Confirmo que a pessoa autorizou o uso desta informação para o buffet e a organização do evento.',
  erroConsentimentoObtido: 'Confirme que a pessoa autorizou antes de salvar.',
  erroSemPessoa: 'Escolha a pessoa.',
  erroSemConteudo: 'Marque ao menos uma restrição ou preencha um dos campos.',
  salvar: 'Salvar restrição',
  cancelar: 'Cancelar',
  salva: 'Restrição salva.',
  itemExclusao: (nome: string) => `restrição de ${nome}`,
  removida: (nome: string) => `Restrição de ${nome} foi removida.`,
  badgeLista: 'Restrição',
  acaoLista: 'Restrições alimentares',
  ilegiveis: (quantidade: number) =>
    `${formatarNumero(quantidade)} ${quantidade === 1 ? 'restrição não pôde ser lida' : 'restrições não puderam ser lidas'}. Fale com o suporte.`,
  retencaoEncerrada: 'O prazo de guarda terminou; não é possível registrar novas restrições.',
  colunaNome: 'Nome',
  colunaRestricoes: 'Restrições',
  colunaNecessidade: 'Necessidade especial',
  colunaResposta: 'Resposta',
  colunaOrigem: 'Origem',
  listaRotulo: 'Pessoas com restrição alimentar ou necessidade especial',
  buscaPlaceholder: 'Buscar por nome',
  acoesPessoa: (nome: string) => `Ações da restrição de ${nome}`,
  acompanhante: 'acompanhante',
  nenhuma: '—',
} as const
