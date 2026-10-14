import type { TextosListaRepetivel, VarianteStatus } from '@/componentes/base/tipos'
import type { StatusEnvioConvite } from '@/tipos/convidados'
import { formatarNumero } from '@/utilitarios/formatacao'

function pessoas(quantidade: number): string {
  return quantidade === 1 ? '1 pessoa' : `${formatarNumero(quantidade)} pessoas`
}

export const TEXTOS_RSVP = {
  fraseConvite: 'Com alegria, convidamos você para celebrar o nosso casamento',
  tituloDocumento: 'Confirmação de presença',
  conviteDe: 'Convite para',
  prazo: (data: string) => `Responda até ${data}`,
  cerimonia: 'Cerimônia',
  recepcao: 'Recepção',
  horario: (horario: string) => `às ${horario}`,
  conector: 'e',
  quemVai: 'Quem vai?',
  todosVao: 'Todos vão',
  ninguemVai: 'Ninguém vai',
  vou: 'Vou',
  naoVou: 'Não vou',
  crianca: 'criança',
  acompanhante: 'acompanhante',
  grupoAcessivel: (nome: string) => `Presença de ${nome}`,
  acompanhantesTitulo: 'Vai levar acompanhante?',
  acompanhantesLimite: (limite: number) => `Você pode levar até ${pessoas(limite)}.`,
  nomeAcompanhante: 'Nome do acompanhante',
  placeholderNome: 'Nome e sobrenome',
  faixaAcompanhante: 'Idade',
  adulto: 'Adulto',
  criancaOpcao: 'Criança',
  acompanhantesRetirados: 'Os acompanhantes foram retirados porque ninguém do convite vai.',
  contador: (vao: number, total: number) => `${formatarNumero(vao)} de ${formatarNumero(total)} vão`,
  faltam: (quantidade: number) => `Falta responder por ${pessoas(quantidade)}`,
  faltaEscolha: 'Escolha vou ou não vou para esta pessoa.',
  enviar: 'Enviar resposta',
  enviada: 'Resposta enviada',
  obrigado: (nomeConvite: string) => `Obrigado, ${nomeConvite}.`,
  suaResposta: 'Sua resposta',
  vai: 'Vai',
  naoVai: 'Não vai',
  resumoAcompanhante: (nome: string) => `${nome} (acompanhante)`,
  podeAlterar: (data: string) => `Você pode alterar até ${data}.`,
  alterar: 'Alterar resposta',
  prazoEncerrado: (data: string) =>
    `O prazo para responder terminou em ${data}. Para mudar algo, fale com quem enviou o convite.`,
  linkInativoTitulo: 'Este link não está ativo',
  linkInativoTexto: 'Confira se o link foi copiado inteiro ou peça um novo a quem enviou o convite.',
  erroCarregarTitulo: 'Não foi possível abrir o convite',
  erroCarregar: 'Verifique a conexão e tente de novo.',
  muitasTentativasTitulo: 'Muitas tentativas seguidas',
  muitasTentativas: 'Aguarde um minuto e tente de novo.',
  conflito: 'Sua resposta mudou em outro aparelho. Recarregamos com a versão mais recente.',
  erroEnviar: 'Não foi possível enviar. Suas escolhas continuam aqui; tente de novo.',
  erroNomeAcompanhante: 'Use entre 2 e 120 caracteres no nome do acompanhante.',
} as const

export const TEXTOS_LISTA_ACOMPANHANTES: TextosListaRepetivel = {
  rotuloItem: (numero) => `Acompanhante ${numero}`,
  adicionar: 'Adicionar acompanhante',
  remover: 'Remover',
  contador: (quantidade, maximo) => `${formatarNumero(quantidade)} de ${formatarNumero(maximo)}`,
  limiteAtingido: 'Você chegou ao limite de acompanhantes deste convite.',
  minimoAtingido: '',
  adicionado: (numero) => `Acompanhante ${numero} adicionado.`,
  removido: (numero) => `Acompanhante ${numero} removido.`,
}

export const TEXTOS_ENVIO_CONVITE = {
  colunaEnvio: 'Envio',
  respondidoEm: (data: string) => `Respondeu em ${data}`,
  acompanhante: 'Acompanhante',
  enviarWhatsApp: 'Enviar pelo WhatsApp',
  enviarWhatsAppCurto: 'WhatsApp',
  maisAcoes: 'Mais ações',
  copiarLink: 'Copiar link',
  copiarMensagem: 'Copiar mensagem',
  marcarEnviado: 'Marcar como enviado',
  regenerarLink: 'Gerar novo link',
  revogarLink: 'Desativar link',
  linkCopiado: 'Link copiado',
  mensagemCopiada: 'Mensagem copiada',
  marcadoEnviado: 'Convite marcado como enviado',
  linkRegenerado: 'Novo link gerado. O anterior parou de funcionar.',
  linkRevogado: 'Link desativado',
  confirmarRegenerarTitulo: 'Gerar novo link?',
  confirmarRegenerarTexto: (nomeConvite: string) =>
    `O link enviado para ${nomeConvite} vai parar de funcionar. As respostas já dadas continuam salvas.`,
  confirmarRegenerarAcao: 'Gerar novo link',
  confirmarRevogarTitulo: 'Desativar link?',
  confirmarRevogarTexto: 'Ninguém mais consegue responder por este link até você gerar outro. As respostas já dadas continuam salvas.',
  confirmarRevogarAcao: 'Desativar link',
  cancelar: 'Cancelar',
  semTelefone: 'Este convite não tem telefone. Escolha o contato no WhatsApp.',
  linkIrrecuperavel: 'Não foi possível recuperar este link. Use “Gerar novo link”.',
  copiaFalhou: (link: string) => `Não foi possível copiar. Copie manualmente: ${link}`,
  semPermissao: 'Você não tem permissão para enviar convites.',
  erroLink: 'Não foi possível preparar o link. Tente novamente.',
  acaoComNome: (acao: string, nome: string) => `${acao}: ${nome}`,
  mensagemPronta: (dados: {
    nomeConvite: string
    primeiro: string
    segundo: string
    data: string
    dataLimite: string
    url: string
  }) =>
    `Olá, ${dados.nomeConvite}! ${dados.primeiro} e ${dados.segundo} vão se casar em ${dados.data} e querem muito contar com vocês. Confirme a presença por este link até ${dados.dataLimite}: ${dados.url}`,
} as const

export const VARIANTE_STATUS_ENVIO: Record<StatusEnvioConvite, VarianteStatus> = {
  NaoEnviado: 'neutro',
  Enviado: 'informacao',
  Visualizado: 'sucesso',
}
