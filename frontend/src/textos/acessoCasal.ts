import type { SituacaoAcessoCasal } from '@/tipos/acessoCasal'
import type { VarianteStatus } from '@/componentes/base/tipos'

export const ID_TITULO_ACESSO_CASAL = 'titulo-acesso-casal'

export const TEXTOS_ACESSO_CASAL = {
  titulo: 'Acesso do casal',
  descricao: 'Convide até duas pessoas do casal para cuidar da lista de convidados.',
  rotuloLista: 'Lugares de acesso do casal',
  lugarVazio: 'Lugar disponível',
  lugarVazioApoio: 'Convide uma pessoa do casal.',
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
  revogarMensagemAtivo: (nome: string) => `${nome} deixa de entrar no casamento na hora. A lista de convidados continua como está.`,
  revogarMensagemPendente: (email: string) => `O link enviado para ${email} deixa de funcionar.`,
  revogado: (nome: string) => `O acesso de ${nome} foi revogado.`,
  erroLimite: 'Os dois lugares já estão ocupados. Revogue um acesso para convidar outra pessoa.',
  avisoArquivado: 'Restaure o casamento para convidar o casal.',
  erroCarregar: 'Não foi possível carregar o acesso do casal.',
  semPermissao: 'Só a assessoria pode gerenciar o acesso do casal.',
} as const

export const ROTULOS_SITUACAO_ACESSO: Record<SituacaoAcessoCasal, string> = {
  Pendente: 'Convite pendente',
  Expirado: 'Convite expirado',
  Ativo: 'Com acesso',
}

export const VARIANTE_SITUACAO_ACESSO: Record<SituacaoAcessoCasal, VarianteStatus> = {
  Pendente: 'informacao',
  Expirado: 'alerta',
  Ativo: 'sucesso',
}

export const TEXTOS_ACEITE_CASAL = {
  titulo: (nomes: string) => `Acessem o casamento de ${nomes}`,
  tituloPadrao: 'Acessem o casamento',
  descricao: (assessoria: string) => `${assessoria} convidou vocês para acompanhar a lista de convidados. Criem a senha para entrar.`,
  abrindo: 'Abrindo o convite de vocês…',
  email: 'E-mail',
  senha: 'Senha',
  confirmarSenha: 'Confirmem a senha',
  senhasDiferentes: 'As senhas não são iguais.',
  enviar: 'Criar senha e entrar',
  naoEsperava: 'Não esperavam este convite? Ignorem o e-mail; ninguém entra sem a senha.',
  outraConta: 'Ao continuar, vocês entram com este e-mail.',
  invalidoTitulo: 'Este convite não vale mais',
  invalidoTexto: 'O link expirou, foi substituído por um novo ou já foi usado. Peçam à assessoria um novo convite.',
  jaTemConta: 'Já criaram a senha?',
  entrar: 'Entrar',
  boasVindas: (primeiroNome: string) => `Boas-vindas, ${primeiroNome}! Aqui está o casamento de vocês.`,
} as const

export const TEXTOS_AREA_CASAL = {
  menuNossoCasamento: 'Nosso casamento',
  menuConvidados: 'Convidados',
  menuConfirmacoes: 'Confirmações',
  rodape: (assessoria: string) => `Casamento assessorado por ${assessoria}`,
  restricoesTitulo: 'Restrições alimentares',
  restricoesRotulo: 'Pessoas com restrição alimentar',
  restricoesVazio: 'Nenhuma pessoa com restrição registrada.',
  restricoesApoio: 'A assessoria cuida dos detalhes com o buffet.',
  voltarNossoCasamento: 'Voltar para o nosso casamento',
} as const
