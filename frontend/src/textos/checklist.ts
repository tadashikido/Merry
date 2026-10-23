import type { MarcoChecklist, SentidoPrazo } from '@/tipos/checklist'

function plural(quantidade: number, singular: string, varios: string): string {
  return quantidade === 1 ? singular : varios
}

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR')
}

function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export const ROTULOS_MARCO_CHECKLIST: Record<MarcoChecklist, string> = {
  dozeMeses: '12 meses',
  seisMeses: '6 meses',
  tresMeses: '3 meses',
  trintaDias: '30 dias',
  retaFinal: 'Reta final',
  noDia: 'No dia',
  depois: 'Depois',
  semPrazo: 'Sem prazo',
}

export const COMPLEMENTO_MARCO_CHECKLIST: Record<MarcoChecklist, string | null> = {
  dozeMeses: 'antes ou mais',
  seisMeses: 'antes',
  tresMeses: 'antes',
  trintaDias: 'antes',
  retaFinal: 'último mês',
  noDia: 'do evento',
  depois: 'do evento',
  semPrazo: null,
}

export const ROTULOS_SENTIDO_PRAZO: Record<SentidoPrazo, string> = {
  antes: 'antes do evento',
  depois: 'depois do evento',
}

export const TEXTOS_MODELOS_CHECKLIST = {
  menu: 'Modelos',
  titulo: 'Modelos de checklist',
  tituloDocumento: 'Modelos de checklist',
  subtitulo: 'Itens com prazo relativo à data do evento.',
  novo: 'Novo modelo',
  sugerido: 'Sugerido',
  itens: (quantidade: number) => `${numero(quantidade)} ${plural(quantidade, 'item', 'itens')}`,
  resumo: (quantidade: number) => `${numero(quantidade)} ${plural(quantidade, 'modelo', 'modelos')}`,
  vazioTitulo: 'Nenhum modelo ainda',
  vazioTexto: 'Monte uma vez os itens que se repetem e aplique no checklist de cada evento, com prazos contados a partir da data dele.',
  recurso: 'checklist',
  reaproveitamento: [
    'Monte uma vez e aplique pelo Checklist de cada evento.',
    'Os prazos são contados a partir da data de cada evento.',
    'Os sugeridos são da sua assessoria: edite os itens ou exclua o que não usar.',
  ],
  erroTitulo: 'Não foi possível abrir os modelos',
  erroTexto: 'Verifique sua conexão e tente de novo.',
  semAcesso: 'Só a assessoria gerencia modelos de checklist.',
  naoEncontradoTitulo: 'Modelo não encontrado',
  naoEncontradoTexto: 'Ele pode ter sido excluído. Volte para a lista de modelos.',
  voltarModelos: 'Voltar para os modelos',
  maisAcoes: 'Mais ações',
  maisAcoesAria: (nome: string) => `Mais ações para ${nome}`,
  acaoEditar: 'Editar nome',
  acaoExcluir: 'Excluir',
  editar: 'Editar',
  confirmarExclusaoTexto: (itens: number) =>
    `${itens > 0 ? `Os ${numero(itens)} ${plural(itens, 'item sai', 'itens saem')} do modelo. ` : ''}As tarefas já criadas nos eventos continuam, mas deixam de contar no checklist.`,
  formNovo: 'Novo modelo',
  formEditar: 'Editar modelo',
  formNovoDescricao: 'Dê um nome que a equipe reconheça. Os itens entram depois, no detalhe do modelo.',
  grupoModelo: 'Sobre o modelo',
  campoNome: 'Nome do modelo',
  campoNomePlaceholder: 'Ex.: Evento no campo',
  campoDescricao: 'Descrição',
  campoDescricaoDica: (atual: number, limite: number) => `Opcional. ${numero(atual)} de ${numero(limite)} caracteres.`,
  criar: 'Criar modelo',
  salvar: 'Salvar alterações',
  cancelar: 'Cancelar',
  toastCriado: 'Modelo criado.',
  toastSalvo: 'Modelo salvo.',
  toastExcluido: 'Modelo excluído.',
  erroNomeTamanho: 'Use entre 2 e 80 caracteres.',
  erroDescricaoTamanho: 'Use até 500 caracteres.',
  erroSalvar: 'Não foi possível salvar o modelo. Tente de novo.',
  erroExcluir: 'Não foi possível excluir. Tente de novo.',
  regua: 'Itens por marco',
  adicionarItem: 'Adicionar item',
  itensVazioTitulo: 'Este modelo ainda não tem itens',
  itemMaisAcoesAria: (titulo: string) => `Mais ações para ${titulo}`,
  itemEditar: 'Editar item',
  itemExcluir: 'Excluir',
  itemConfirmarExclusaoTexto: 'As tarefas já criadas a partir deste item continuam nos eventos, mas deixam de contar no checklist.',
  itemToastExcluido: 'Item excluído.',
  resumoItens: (quantidade: number) => `${numero(quantidade)} ${plural(quantidade, 'item', 'itens')}`,
  resumoTitulo: 'Resumo do modelo',
  porMarcoTitulo: 'Por marco',
  porResponsavelTitulo: 'Quem faz',
  itensVazioTextoPara: (contracaoDe: string) => `Adicione o que precisa acontecer e quando, contando a partir da data ${contracaoDe}.`,
  primeiroPrazo: 'Primeiro prazo',
  ultimoPrazo: 'Último prazo',
  prazoNoEvento: (dias: number, contracaoDe: string) => {
    if (dias === 0) {
      return `No dia ${contracaoDe}`
    }
    const absoluto = Math.abs(dias)
    return `${numero(absoluto)} ${plural(absoluto, 'dia', 'dias')} ${dias > 0 ? 'antes' : 'depois'} ${contracaoDe}`
  },
  notaPrazos: (contracaoDe: string) => `Os prazos são contados a partir da data ${contracaoDe}.`,
  passosAplicar: (nome: string, contracaoDe: string) => [
    `Em Aplicar checklist ou Aplicar outro modelo, escolha “${nome}”. A prévia mostra quantas tarefas serão criadas.`,
    `Cada item vira uma tarefa com prazo contado a partir da data ${contracaoDe}. O que já passou entra atrasado.`,
  ],
  notaAplicar: 'Itens já aplicados não se repetem, e editar o modelo não muda as tarefas já criadas.',
  dicasModelo: (contracaoDe: string) => [
    'Na descrição, conte quando usar: porte, estilo ou local.',
    `Os itens entram no detalhe do modelo, cada um com prazo em dias antes ou depois da data ${contracaoDe}.`,
  ],
  depoisDeCriarItens: 'Adicione os itens no detalhe do modelo, que abre ao criar.',
  depoisDeCriarAplicar: (contracaoDe: string) =>
    `Em Aplicar checklist ou Aplicar outro modelo, escolha este modelo. Cada item vira uma tarefa com prazo contado a partir da data ${contracaoDe}.`,
} as const

export function complementoMarcoModelo(marco: MarcoChecklist, contracaoDe: string): string | null {
  if (marco === 'dozeMeses') {
    return `ou mais antes ${contracaoDe}`
  }
  if (marco === 'seisMeses' || marco === 'tresMeses' || marco === 'trintaDias') {
    return `antes ${contracaoDe}`
  }
  if (marco === 'noDia' || marco === 'depois') {
    return contracaoDe
  }
  return COMPLEMENTO_MARCO_CHECKLIST[marco]
}

export const TEXTOS_ITEM_MODELO = {
  formNovo: 'Novo item',
  formEditar: 'Editar item',
  grupoItem: 'O item',
  grupoPrazo: 'Prazo e responsável',
  campoTitulo: 'Título',
  campoTituloPlaceholder: 'Ex.: Reservar o local da cerimônia',
  campoQuando: 'Quando',
  campoDias: 'Dias',
  campoQuandoDica: 'Conte a partir da data do evento. 180 dias ≈ 6 meses.',
  campoSentido: 'Antes ou depois',
  campoResponsavel: 'Quem faz',
  campoCategoria: 'Categoria',
  campoDescricao: 'Descrição',
  criar: 'Adicionar item',
  salvar: 'Salvar item',
  cancelar: 'Cancelar',
  toastCriado: 'Item adicionado.',
  toastSalvo: 'Item salvo.',
  erroDias: 'Use de 0 a 1.095 dias antes ou até 365 dias depois.',
  erroDiasObrigatorio: 'Informe quantos dias.',
  erroSalvar: 'Não foi possível salvar o item. Tente de novo.',
  naoEncontradoTitulo: 'Item não encontrado',
  naoEncontradoTexto: 'Ele pode ter sido excluído. Volte para o modelo.',
} as const

export const TEXTOS_CHECKLIST = {
  titulo: 'Checklist',
  tituloDocumento: (nomes: string) => `Checklist · ${nomes}`,
  subtitulo: 'Tarefas criadas a partir de modelos, com prazos pela data do evento.',
  progressoTitulo: 'Progresso',
  porMarcoTitulo: 'Por marco',
  progresso: (concluidas: number, consideradas: number) =>
    `${numero(concluidas)} de ${numero(consideradas)} ${plural(consideradas, 'concluída', 'concluídas')}`,
  canceladas: (quantidade: number) =>
    `${numero(quantidade)} ${plural(quantidade, 'cancelada fica', 'canceladas ficam')} fora da conta`,
  semChecklist: 'Sem checklist ainda',
  percentualAria: (percentual: number, concluidas: number, consideradas: number) =>
    `${percentual}% concluído, ${numero(concluidas)} de ${numero(consideradas)} tarefas`,
  indicadorNavegacao: (percentual: number) => `${percentual}%`,
  indicadorNavegacaoAria: (percentual: number) => `${percentual}% concluído`,
  aplicarTitulo: 'Aplicar modelo',
  aplicarOutroTitulo: 'Aplicar outro modelo',
  campoModelo: 'Modelo',
  aplicar: 'Aplicar modelo',
  previaCarregando: 'Calculando…',
  previaCriar: (quantidade: number) => `Vai criar ${numero(quantidade)} ${plural(quantidade, 'tarefa', 'tarefas')}.`,
  previaExistentes: (quantidade: number) =>
    `${numero(quantidade)} ${plural(quantidade, 'já está', 'já estão')} no checklist.`,
  previaAtrasadas: (quantidade: number) =>
    `${numero(quantidade)} ${plural(quantidade, 'nasce atrasada', 'nascem atrasadas')}, porque o prazo já passou.`,
  previaNada: 'Todas as tarefas deste modelo já estão no checklist.',
  previaLimite: (existentes: number, novas: number) =>
    `Este evento passaria de 500 tarefas (hoje tem ${numero(existentes)}, o modelo cria ${numero(novas)}). Exclua tarefas ou use um modelo menor.`,
  previaErro: 'Não foi possível calcular a prévia.',
  semModelos: 'Crie um modelo em Modelos para aplicar aqui.',
  irParaModelos: 'Abrir modelos',
  toastAplicado: (criadas: number) => `${numero(criadas)} ${plural(criadas, 'tarefa criada', 'tarefas criadas')} no checklist.`,
  toastAplicadoAtrasadas: (criadas: number, atrasadas: number) =>
    `${numero(criadas)} ${plural(criadas, 'tarefa criada', 'tarefas criadas')} no checklist. ${numero(atrasadas)} já ${plural(atrasadas, 'nasce atrasada', 'nascem atrasadas')}.`,
  prazosDesatualizados: (quantidade: number) =>
    `${numero(quantidade)} ${plural(quantidade, 'prazo não acompanha', 'prazos não acompanham')} a data do evento.`,
  recalcular: 'Recalcular prazos',
  arquivado: 'Este evento está arquivado. Restaure para aplicar modelos ou recalcular prazos.',
  verTarefas: 'Ver todas as tarefas',
  conflito: 'O checklist mudou em outra tela. Atualizamos a lista.',
  erroTitulo: 'Não foi possível abrir o checklist',
  erroTexto: 'Verifique sua conexão e tente de novo.',
  semAcesso: 'Só a assessoria acompanha o checklist.',
  erroAplicar: 'Não foi possível aplicar o modelo. Tente de novo.',
  regua: 'Tarefas do checklist por marco',
  marcoAntes: (rotulo: string) => `${rotulo} antes`,
  recalculoTitulo: 'Recalcular os prazos do checklist?',
  recalculoTexto: (data: string, quantidade: number) =>
    `A data mudou para ${data}. ${numero(quantidade)} ${plural(quantidade, 'tarefa do checklist ainda aberta terá', 'tarefas do checklist ainda abertas terão')} o prazo recalculado a partir da nova data. Tarefas concluídas não mudam.`,
  recalculoTextoSemData: (quantidade: number) =>
    `${numero(quantidade)} ${plural(quantidade, 'tarefa do checklist ainda aberta terá', 'tarefas do checklist ainda abertas terão')} o prazo recalculado a partir da data do evento. Tarefas concluídas não mudam.`,
  manterPrazos: 'Manter prazos',
  toastRecalculado: (quantidade: number) =>
    `${plural(quantidade, 'Prazo de', 'Prazos de')} ${numero(quantidade)} ${plural(quantidade, 'tarefa recalculado', 'tarefas recalculados')}.`,
  erroRecalcular: 'Não foi possível recalcular os prazos. Tente de novo em Checklist.',
  vazioTituloEvento: (artigo: string) => `${maiuscula(artigo)} ainda não tem checklist`,
  vazioTextoEvento: (contracaoDe: string) =>
    `Aplique um modelo para criar as tarefas com prazos contados a partir da data ${contracaoDe}.`,
  aplicarPrimeiro: 'Aplicar checklist',
  notaMarcos: (contracaoDe: string) => `Cada tarefa entra no marco do seu prazo, contado a partir da data ${contracaoDe}.`,
  marcoAgora: 'Agora',
  faltaNoMarco: (abertas: number, atrasadas: number) =>
    `${plural(abertas, 'Falta', 'Faltam')} ${numero(abertas)}${atrasadas > 0 ? `, ${numero(atrasadas)} ${plural(atrasadas, 'atrasada', 'atrasadas')}` : ''}`,
  detalheMarco: (concluidas: number, total: number, atrasadas: number) =>
    `${numero(concluidas)} de ${numero(total)} ${plural(total, 'concluída', 'concluídas')}${atrasadas > 0 ? `, ${numero(atrasadas)} ${plural(atrasadas, 'atrasada', 'atrasadas')}` : ''}`,
  sugestaoTextoSelecionado: (contracaoDe: string) =>
    `O modelo selecionado cria estas tarefas, com prazos contados a partir da data ${contracaoDe}.`,
  comoOrganizaTitulo: 'Como o checklist se organiza',
  comoOrganizaTexto: (contracaoDe: string) =>
    `As tarefas ficam em marcos pelo prazo, contados a partir da data ${contracaoDe}: 12 meses, 6 meses, 3 meses, 30 dias, reta final, no dia e depois.`,
} as const

export function descreverPrazoRelativo(dias: number, contracaoDe = 'do evento'): string {
  if (dias === 0) {
    return `No dia ${contracaoDe}`
  }
  const absoluto = Math.abs(dias)
  const unidade = `${numero(absoluto)} ${plural(absoluto, 'dia', 'dias')}`
  return dias > 0 ? `${unidade} antes` : `${unidade} depois`
}
