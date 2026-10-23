import { NOME_PRODUTO } from '@/textos/rotulos'

export const TEXTOS_ENTRAR = {
  titulo: 'Entrar',
  descricao: 'Use o e-mail e a senha da sua conta.',
  botao: 'Entrar',
  esqueci: 'Esqueci minha senha',
  semConta: 'Ainda não tem conta?',
  criarConta: 'Criar conta da assessoria',
  primeiraVez: `Primeira vez no ${NOME_PRODUTO}?`,
  assessoriaTitulo: 'Organiza eventos para clientes?',
  assessoriaTexto: 'Crie a conta da sua assessoria. Leva um minuto.',
  anfitriaoTitulo: 'Recebeu um convite da assessoria?',
  anfitriaoTexto: 'Abra o link do e-mail para criar sua senha. Depois, entre aqui com o mesmo e-mail.',
} as const

export const TEXTOS_CADASTRO = {
  titulo: 'Crie a conta da sua assessoria',
  descricao: 'Leva um minuto. Você pode completar os dados depois.',
  grupoAssessoria: 'Sua assessoria',
  grupoAcesso: 'Seu acesso',
  botao: 'Criar conta',
  apoio: 'Você fica responsável pela conta da assessoria.',
  emailEmUso: 'Este e-mail já tem uma conta. Entre ou recupere a senha.',
  recuperarSenha: 'Recuperar a senha',
  jaTemConta: 'Já tem conta?',
  entrar: 'Entrar',
  organizaTitulo: `O que sua assessoria organiza no ${NOME_PRODUTO}`,
  recursoEventosTitulo: 'Eventos dos seus clientes',
  recursoEventosTexto: (tipos: string) => `Um espaço para cada evento: ${tipos}.`,
  recursoConvidadosTitulo: 'Convidados e confirmações',
  recursoConvidadosTexto: 'Lista de convidados, link para confirmar presença e restrições alimentares.',
  recursoPlanejamentoTitulo: 'Checklist e cronograma',
  recursoPlanejamentoTexto: 'Tarefas, prazos e o roteiro do dia, a partir de modelos para cada tipo de evento.',
  recursoDiaTitulo: 'Dia do evento',
  recursoDiaTexto: 'Cronograma em andamento, mesas e fornecedores à mão da equipe.',
  anfitriaoTitulo: 'Recebeu um convite da assessoria?',
  anfitriaoTexto: 'Você não precisa criar conta. Abra o link do e-mail para criar sua senha.',
} as const

export const TEXTOS_ESQUECI_SENHA = {
  titulo: 'Recuperar acesso',
  descricao: 'Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.',
  botao: 'Enviar link',
  voltar: 'Voltar para entrar',
  enviadoTitulo: 'Confira seu e-mail',
  enviadoTexto: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.',
  enviadoDica: 'O link vale por 1 hora. Não chegou? Veja a caixa de spam ou envie de novo.',
  enviarDeNovo: 'Enviar de novo',
} as const

export const TEXTOS_REDEFINIR_SENHA = {
  titulo: 'Crie uma nova senha',
  descricao: 'Depois de salvar, entre com a nova senha em todos os seus dispositivos.',
  botao: 'Salvar nova senha',
  voltar: 'Voltar para entrar',
  linkInvalidoTitulo: 'Este link não vale mais',
  linkInvalidoTexto: 'O link de redefinição expirou ou já foi usado. Peça um novo para continuar.',
  pedirNovo: 'Pedir um novo link',
} as const

export const ROTULOS_CAMPOS_AUTENTICACAO = {
  nomeAssessoria: 'Nome da assessoria',
  nomeAssessoriaDica: 'Como seus clientes conhecem você.',
  nome: 'Seu nome',
  email: 'E-mail',
  senha: 'Senha',
  novaSenha: 'Nova senha',
  confirmarSenha: 'Confirme a nova senha',
  mostrarSenha: 'Mostrar senha',
  ocultarSenha: 'Ocultar senha',
  requisitosSenha: 'A senha precisa ter:',
  requisitoAtendido: 'atendido',
  requisitoPendente: 'pendente',
  exemploEmail: 'nome@exemplo.com',
} as const

export const REQUISITOS_SENHA_TEXTOS = {
  tamanho: '10 caracteres ou mais',
  letra: 'Pelo menos uma letra',
  numero: 'Pelo menos um número',
} as const

export const MENSAGENS_AUTENTICACAO = {
  credenciais: 'E-mail ou senha incorretos. Confira e tente de novo.',
  muitasTentativas: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  conexao: 'Sem conexão com o servidor. Verifique a internet e tente de novo.',
  inesperado: 'Não foi possível concluir agora. Tente novamente em instantes.',
  sessaoTerminou: 'Sua sessão terminou. Entre novamente para continuar.',
  saiu: 'Você saiu da sua conta.',
  senhaRedefinida: 'Senha redefinida. Entre com a nova senha.',
  abrindoConta: 'Abrindo sua conta…',
  contaCriada: (assessoria: string) => `Conta da ${assessoria} criada.`,
} as const

export const TEXTOS_PAINEL = {
  menuInicio: 'Dashboard',
  primeiroAcessoTitulo: `Boas-vindas ao ${NOME_PRODUTO}.`,
  primeiroAcessoTexto: 'Vamos configurar seu primeiro evento. Leva uns 5 minutos.',
  saudacao: (primeiroNome: string) => `Olá, ${primeiroNome}`,
  sair: 'Sair',
  contaConectada: 'Conta conectada',
} as const

export const TEXTOS_AUTENTICACAO_LAYOUT = {
  frase: 'Eventos que conectam.',
  tipos: (lista: string) => `Para ${lista}.`,
} as const
