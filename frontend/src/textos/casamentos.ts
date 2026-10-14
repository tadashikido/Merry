import type { VarianteStatus } from '@/componentes/base/tipos'
import type { FaseCasamento } from '@/tipos/casamentos'
import { NOME_PRODUTO } from '@/textos/rotulos'

export const TEXTOS_CASAMENTOS = {
  menu: 'Casamentos',
  novoCasamento: 'Novo casamento',
  verTodos: 'Ver todos os casamentos',
  proximosTitulo: 'Próximos casamentos',
  painelVazioTitulo: 'Nenhum casamento pela frente',
  painelVazioTexto: 'Cadastre um casamento para acompanhar a data, os locais e, em breve, a lista de convidados.',
  listaTitulo: 'Casamentos',
  listaDescricao: 'Os casamentos que sua assessoria acompanha, dos mais próximos aos já realizados.',
  listaRotulo: 'Lista de casamentos',
  placeholderBusca: 'Buscar pelo nome do casal',
  filtroSituacao: 'Situação',
  ativos: 'Ativos',
  arquivados: 'Arquivados',
  colunaCasal: 'Casal',
  colunaData: 'Data',
  colunaFase: 'Fase',
  colunaContagem: 'Contagem',
  colunaLocal: 'Local da cerimônia',
  vazioAtivosTitulo: 'Nenhum casamento por aqui ainda',
  vazioAtivosTexto: 'Cadastre o primeiro casamento para começar a organizar datas e convidados.',
  vazioArquivadosTitulo: 'Nenhum casamento arquivado',
  vazioArquivadosTexto: 'Casamentos arquivados aparecem aqui e podem ser restaurados quando precisar.',
  editar: 'Editar',
  editarCasamento: 'Editar casamento',
  arquivar: 'Arquivar',
  restaurar: 'Restaurar',
  salvarNovo: 'Salvar casamento',
  salvarEdicao: 'Salvar alterações',
  voltarLista: 'Voltar para casamentos',
  tituloNovo: 'Novo casamento',
  descricaoNovo: 'Preencha o essencial agora; você pode completar o resto depois.',
  tituloEdicao: 'Editar casamento',
  grupoCasal: 'O casal',
  grupoQuando: 'Quando',
  grupoOnde: 'Onde',
  grupoPlanejamento: 'Planejamento',
  nomePrimeiraPessoa: 'Nome de uma das pessoas',
  nomeSegundaPessoa: 'Nome da outra pessoa',
  data: 'Data do casamento',
  horario: 'Horário da cerimônia',
  horarioDica: 'Deixe em branco se ainda não estiver definido.',
  dataLimiteRsvp: 'Data limite para confirmação',
  dataLimiteRsvpDica: (padrao: string | null) =>
    padrao
      ? `Se ficar em branco, usamos 10 dias antes do casamento (${padrao}).`
      : 'Se ficar em branco, usamos 10 dias antes do casamento.',
  localCerimonia: 'Local da cerimônia',
  localRecepcao: 'Local da recepção',
  localRecepcaoDica: 'Se for no mesmo lugar, repita o nome.',
  convidados: 'Convidados estimados',
  convidadosDica: 'Um número aproximado já ajuda.',
  observacoes: 'Observações',
  contadorObservacoes: (quantidade: number, limite: number) =>
    `${quantidade.toLocaleString('pt-BR')} de ${limite.toLocaleString('pt-BR')} caracteres`,
  detalhesTitulo: 'Detalhes',
  faltaHorario: {
    titulo: 'Falta o horário da cerimônia.',
    texto: 'Sem ele, o convite digital não mostra a hora.',
    acao: 'Adicionar horário',
  },
  faltaLocal: {
    titulo: 'Falta o local da cerimônia.',
    texto: 'O convite digital usa esse endereço.',
    acao: 'Adicionar local',
  },
  avisoArquivado: 'Este casamento está arquivado. Restaure para voltar a editar.',
  statusArquivado: 'Arquivado',
  naoEncontradoTitulo: 'Casamento não encontrado',
  naoEncontradoTexto: 'Ele pode ter sido removido ou o link está incorreto.',
  erroCarregarTitulo: 'Não foi possível carregar os casamentos',
  erroCarregarTexto: 'Verifique a conexão e tente novamente.',
  erroCarregarUmTitulo: 'Não foi possível carregar o casamento',
  semPermissao: 'Você não tem permissão para alterar casamentos.',
  semAcesso: 'Você não tem acesso aos casamentos desta assessoria.',
  criado: 'Casamento cadastrado.',
  arquivado: (nomes: string) => `“${nomes}” foi arquivado. Você encontra em Arquivados.`,
  restaurado: (nomes: string) => `“${nomes}” foi restaurado.`,
  acaoComNome: (acao: string, nomes: string) => `${acao} ${nomes}`,
  tituloDocumento: (nomes: string) => `${nomes} · ${NOME_PRODUTO}`,
  conectorNomes: 'e',
} as const

export const ROTULOS_FASE: Record<FaseCasamento, string> = {
  Planejamento: 'Planejamento',
  RetaFinal: 'Reta final',
  SemanaDoCasamento: 'Semana do casamento',
  DiaDoCasamento: 'Dia do casamento',
  Realizado: 'Realizado',
}

export const VARIANTE_FASE: Record<FaseCasamento, VarianteStatus> = {
  Planejamento: 'neutro',
  RetaFinal: 'informacao',
  SemanaDoCasamento: 'alerta',
  DiaDoCasamento: 'sucesso',
  Realizado: 'neutro',
}

export function descreverContagem(dias: number): string {
  if (dias > 1) {
    return `Faltam ${dias.toLocaleString('pt-BR')} dias`
  }
  if (dias === 1) {
    return 'Falta 1 dia'
  }
  if (dias === 0) {
    return 'É hoje'
  }
  if (dias === -1) {
    return 'Foi ontem'
  }
  return `Foi há ${Math.abs(dias).toLocaleString('pt-BR')} dias`
}

export function legendaContagemDestaque(dias: number): string {
  return dias === 1 ? 'dia para o casamento' : 'dias para o casamento'
}

export function descreverContagemAcessivel(dias: number): string {
  return dias > 0 ? `${descreverContagem(dias)} para o casamento` : descreverContagem(dias)
}

export const MENSAGENS_VALIDACAO_CASAMENTO = {
  nomeTamanho: 'Use entre 2 e 80 caracteres.',
  dataInvalida: 'Informe uma data válida, como 15/05/2027.',
  dataFaixa: 'Informe uma data entre 2000 e 2100.',
  horarioInvalido: 'Informe o horário no formato 24 h, como 16:30.',
  dataLimiteRsvpInvalida: 'A data limite precisa ser igual ou anterior à data do casamento.',
  localTamanho: 'Use até 200 caracteres.',
  convidadosFaixa: 'Informe um número entre 1 e 5.000.',
  observacoesTamanho: 'Use até 2.000 caracteres.',
} as const
