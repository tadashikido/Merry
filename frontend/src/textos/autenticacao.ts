import { NOME_PRODUTO } from '@/textos/rotulos'

export const TITULO_CONVITE_ASSESSORIA = 'Recebeu um convite da assessoria?'

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
  anfitriaoTitulo: TITULO_CONVITE_ASSESSORIA,
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
  anfitriaoTitulo: TITULO_CONVITE_ASSESSORIA,
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
  antesTitulo: 'Antes de pedir o link',
  emailContaTitulo: 'Use o e-mail da sua conta',
  emailContaTexto: 'É o mesmo e-mail com que você entra, seja da assessoria ou anfitrião de um evento.',
  semSenhaTitulo: 'Ainda não criou sua senha?',
  semSenhaTexto:
    'Se a assessoria convidou você para acompanhar um evento, a senha é criada pelo link do convite. Se ele expirou, peça um novo à assessoria.',
  enquantoTitulo: 'Enquanto o e-mail chega',
  assuntoTitulo: 'Procure pelo assunto',
  assuntoTexto: `“Redefinição de senha — ${NOME_PRODUTO}”. Pode levar alguns minutos.`,
  maisDeUmPedidoTitulo: 'Pediu mais de uma vez?',
  maisDeUmPedidoTexto: 'Use o e-mail mais recente. Cada pedido novo cancela o link anterior.',
  depoisTitulo: 'Depois de criar a nova senha',
  depoisTexto: 'As sessões abertas em outros aparelhos são encerradas. Entre de novo com a nova senha.',
  anfitriaoNotaTitulo: TITULO_CONVITE_ASSESSORIA,
  anfitriaoNotaTexto: 'O e-mail de recuperação só vale para quem já criou a senha. Antes disso, use o link do convite.',
} as const

export const TEXTOS_REDEFINIR_SENHA = {
  titulo: 'Crie uma nova senha',
  descricao: 'Você vai usar esta senha para entrar daqui em diante.',
  botao: 'Salvar nova senha',
  voltar: 'Voltar para entrar',
  linkInvalidoTitulo: 'Este link não vale mais',
  linkInvalidoTexto: 'O link de redefinição expirou ou já foi usado. Peça um novo para continuar.',
  pedirNovo: 'Pedir um novo link',
  sobreTitulo: 'Sobre a nova senha',
  soSuaTitulo: 'Escolha uma senha só sua',
  soSuaTexto: 'Não use o seu e-mail nem uma senha que você já usa em outro site.',
  depoisTitulo: 'Depois de salvar',
  depoisTexto: 'Você volta para a tela de entrada. Entre com o mesmo e-mail e a nova senha.',
  aparelhosTitulo: 'Outros aparelhos saem da conta',
  aparelhosTexto:
    'Por segurança, as sessões abertas em outros celulares e computadores são encerradas. Entre de novo neles com a nova senha.',
  motivoTitulo: 'Por que o link deixou de valer',
  validadeTitulo: 'O link vale por 1 hora',
  validadeTexto: 'Depois disso, peça um novo. Ele chega no e-mail da sua conta.',
  usoUnicoTitulo: 'Cada link funciona uma vez',
  usoUnicoTexto: 'Se você já criou a nova senha com ele, é só entrar.',
  maisDeUmPedidoTitulo: TEXTOS_ESQUECI_SENHA.maisDeUmPedidoTitulo,
  maisDeUmPedidoTexto: TEXTOS_ESQUECI_SENHA.maisDeUmPedidoTexto,
  anfitriaoNotaTitulo: TITULO_CONVITE_ASSESSORIA,
  anfitriaoNotaTexto: 'Se você ainda não criou sua senha, use o link do convite. Se ele expirou, peça um novo à assessoria.',
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
  primeiroAcessoTexto: (tipos: string) =>
    `O ${NOME_PRODUTO} organiza ${tipos}. Comece pelo primeiro evento; leva uns 5 minutos.`,
  saudacao: (primeiroNome: string) => `Olá, ${primeiroNome}`,
  sair: 'Sair',
  contaConectada: 'Conta conectada',
} as const

export const TEXTOS_AUTENTICACAO_LAYOUT = {
  frase: 'Eventos que conectam.',
  tipos: (lista: string) => `Para ${lista}.`,
} as const
