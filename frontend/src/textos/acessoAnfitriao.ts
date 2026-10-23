import type { SituacaoAcessoAnfitriao } from '@/tipos/acessoAnfitriao'
import type { VarianteStatus } from '@/componentes/base/tipos'

export const ID_TITULO_ACESSO_ANFITRIAO = 'titulo-acesso-anfitriao'

export const TEXTOS_ACESSO_ANFITRIAO = {
  titulo: 'Acesso dos anfitriões',
  descricao: 'Convide até dois anfitriões para cuidar da lista de convidados.',
  rotuloLista: 'Lugares de acesso dos anfitriões',
  lugarVazio: 'Lugar disponível',
  lugarVazioApoio: 'Convide um anfitrião.',
  convidar: 'Convidar',
  campoNome: 'Nome',
  campoEmail: 'E-mail',
  dicaEmail: 'Enviaremos um link para criar a senha. Vale por 7 dias.',
  enviarConvite: 'Enviar convite',
  cancelar: 'Cancelar',
  expiraEm: (data: string) => `Expira em ${data}`,
  expirouEm: (data: string) => `Venceu em ${data}`,
  ativoDesde: (data: string) => `Ativo desde ${data}`,
  reenviar: 'Reenviar convite',
  revogar: 'Revogar acesso',
  acoesLugar: (nome: string) => `Mais ações para ${nome}`,
  convidado: (email: string) => `Convite enviado para ${email}.`,
  reenviado: (email: string) => `Convite reenviado para ${email}. O link anterior deixou de valer.`,
  revogarTitulo: (nome: string) => `Revogar o acesso de ${nome}?`,
  revogarMensagemAtivo: (nome: string) => `${nome} deixa de entrar no evento na hora. A lista de convidados continua como está.`,
  revogarMensagemPendente: (email: string) => `O link enviado para ${email} deixa de funcionar.`,
  revogado: (nome: string) => `O acesso de ${nome} foi revogado.`,
  erroLimite: 'Os dois lugares já estão ocupados. Revogue um acesso para convidar outra pessoa.',
  avisoArquivado: 'Restaure o evento para convidar os anfitriões.',
  erroCarregar: 'Não foi possível carregar o acesso dos anfitriões.',
  semPermissao: 'Só a assessoria pode gerenciar o acesso dos anfitriões.',
} as const

export const ROTULOS_SITUACAO_ACESSO: Record<SituacaoAcessoAnfitriao, string> = {
  Pendente: 'Convite pendente',
  Expirado: 'Convite expirado',
  Ativo: 'Com acesso',
}

export const VARIANTE_SITUACAO_ACESSO: Record<SituacaoAcessoAnfitriao, VarianteStatus> = {
  Pendente: 'informacao',
  Expirado: 'alerta',
  Ativo: 'sucesso',
}

export const TEXTOS_ACEITE_ANFITRIAO = {
  tituloPadrao: 'Acesso ao evento',
  abrindo: 'Abrindo o convite…',
  email: 'E-mail',
  senha: 'Senha',
  senhasDiferentes: 'As senhas não são iguais.',
  enviar: 'Criar senha e entrar',
  invalidoTitulo: 'Este convite não vale mais',
  invalidoTexto: 'O link expirou, foi substituído por um novo ou já foi usado. Peça à assessoria um novo convite.',
  jaTemConta: 'Já criou a senha?',
  entrar: 'Entrar',
  boasVindas: (primeiroNome: string, eventoContraido: string) => `Boas-vindas, ${primeiroNome}! Este é o painel ${eventoContraido}.`,
  convidadosTitulo: 'Convidados',
  confirmacoesTitulo: 'Confirmações',
  cronogramaTitulo: 'Cronograma',
  validadeTitulo: (data: string) => `Link válido até ${data}`,
  motivoTitulo: 'Por que o convite deixou de valer',
  prazoTitulo: 'O convite vale por 7 dias',
  prazoTexto: 'Depois disso, a assessoria pode reenviar. O novo link chega no mesmo e-mail.',
  reenvioTitulo: 'Cada reenvio troca o link',
  reenvioTexto: 'Use o e-mail mais recente. O link anterior deixa de funcionar.',
  usoUnicoTitulo: 'Cada convite funciona uma vez',
  usoUnicoTexto: 'Se você já criou a senha com ele, é só entrar com o mesmo e-mail.',
} as const

export type TratamentoAceite = 'singular' | 'plural'

export interface TextosTratamentoAceite {
  titulo: (evento: string, nomes: string) => string
  descricao: (assessoria: string, evento: string) => string
  confirmarSenha: string
  outraConta: string
  orientacaoTitulo: string
  convidadosTexto: string
  confirmacoesTexto: string
  cronogramaTexto: (eventoContraido: string) => string
  validadeTexto: string
  naoEsperavaTitulo: string
  naoEsperavaTexto: string
}

export const TRATAMENTO_ACEITE_ANFITRIAO: Record<TratamentoAceite, TextosTratamentoAceite> = {
  singular: {
    titulo: (evento, nomes) => `Acesse ${evento} de ${nomes}`,
    descricao: (assessoria, evento) => `${assessoria} convidou você para acompanhar ${evento}. Crie a senha para entrar.`,
    confirmarSenha: 'Confirme a senha',
    outraConta: 'Ao continuar, você entra com este e-mail.',
    orientacaoTitulo: 'O que você vai acompanhar',
    convidadosTexto: 'Inclua e ajuste os convites. A assessoria vê cada mudança.',
    confirmacoesTexto: 'Veja quem já confirmou presença e quantas pessoas vêm.',
    cronogramaTexto: (eventoContraido) => `Consulte o roteiro ${eventoContraido} preparado pela assessoria.`,
    validadeTexto: 'Depois dessa data, peça um novo convite à assessoria.',
    naoEsperavaTitulo: 'Não esperava este convite?',
    naoEsperavaTexto: 'Ignore o e-mail; ninguém entra sem a senha.',
  },
  plural: {
    titulo: (evento, nomes) => `Acessem ${evento} de ${nomes}`,
    descricao: (assessoria, evento) => `${assessoria} convidou vocês para acompanhar ${evento}. Criem a senha para entrar.`,
    confirmarSenha: 'Confirmem a senha',
    outraConta: 'Ao continuar, vocês entram com este e-mail.',
    orientacaoTitulo: 'O que vocês vão acompanhar',
    convidadosTexto: 'Incluam e ajustem os convites. A assessoria vê cada mudança.',
    confirmacoesTexto: 'Vejam quem já confirmou presença e quantas pessoas vêm.',
    cronogramaTexto: (eventoContraido) => `Consultem o roteiro ${eventoContraido} preparado pela assessoria.`,
    validadeTexto: 'Depois dessa data, peçam um novo convite à assessoria.',
    naoEsperavaTitulo: 'Não esperavam este convite?',
    naoEsperavaTexto: 'Ignorem o e-mail; ninguém entra sem a senha.',
  },
}

export function tratamentoDoConvite(nomeSegundaPessoa: string | null | undefined): TratamentoAceite {
  return nomeSegundaPessoa?.trim() ? 'plural' : 'singular'
}

export const TEXTOS_AREA_ANFITRIAO = {
  menuNossoEvento: 'Nosso evento',
  menuConvidados: 'Convidados',
  menuConfirmacoes: 'Confirmações',
  rodape: (assessoria: string) => `Evento assessorado por ${assessoria}`,
  restricoesTitulo: 'Restrições alimentares',
  restricoesRotulo: 'Pessoas com restrição alimentar',
  restricoesVazio: 'Nenhuma pessoa com restrição registrada.',
  restricoesApoio: 'A assessoria cuida dos detalhes com o buffet.',
  voltarNossoEvento: 'Voltar para o nosso evento',
} as const
