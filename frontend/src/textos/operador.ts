export const TEXTOS_OPERADOR = {
  loginTitulo: 'Operação da plataforma',
  loginDescricao: 'Acesso restrito à equipe Celebri',
  rotuloEmail: 'E-mail',
  exemploEmail: 'voce@celebri.com.br',
  rotuloSenha: 'Senha',
  botaoEntrar: 'Entrar',
  areaTitulo: 'Operação da plataforma',
  areaPlaceholder: 'O console de assessorias chega em breve.',
  sair: 'Sair',
  saudacao: (nome: string): string => `Olá, ${nome}`,
} as const

export const MENSAGENS_OPERADOR = {
  credenciais: 'E-mail ou senha inválidos.',
  muitasTentativas: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  conexao: 'Não foi possível conectar. Tente novamente.',
  inesperado: 'Algo deu errado. Tente novamente.',
  sessaoTerminou: 'Sua sessão expirou. Entre novamente.',
  saiu: 'Você saiu da área de operação.',
} as const
