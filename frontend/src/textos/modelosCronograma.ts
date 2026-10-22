import type { DiaCronograma } from '@/tipos/cronograma'
import type { OpcaoLocalModelo } from '@/tipos/modelosCronograma'

function numero(valor: number): string {
  return valor.toLocaleString('pt-BR')
}

function contar(quantidade: number, singular: string, plural: string): string {
  return `${numero(quantidade)} ${quantidade === 1 ? singular : plural}`
}

export const ROTULOS_DIA_CURTO: Record<DiaCronograma, string> = {
  Vespera: 'Véspera',
  DiaDoEvento: 'Dia',
  DiaSeguinte: 'Dia seguinte',
}

export const ROTULOS_LOCAL_MODELO: Record<OpcaoLocalModelo, string> = {
  Cerimonia: 'Local da cerimônia',
  Recepcao: 'Local da recepção',
  Outro: 'Outro',
}

export const TEXTOS_ABAS_MODELOS = {
  rotulo: 'Tipos de modelo',
  checklist: 'Checklist',
  cronograma: 'Cronograma',
} as const

export const TEXTOS_MODELOS_CRONOGRAMA = {
  titulo: 'Modelos de cronograma',
  tituloDocumento: 'Modelos de cronograma',
  subtitulo: 'Roteiros com horários relativos à cerimônia.',
  novo: 'Novo modelo',
  sugerido: 'Sugerido',
  itens: (quantidade: number) => contar(quantidade, 'item', 'itens'),
  referencia: (horario: string) => `Referência: cerimônia às ${horario}`,
  apoioReferencia: (horario: string) =>
    `Horários com cerimônia às ${horario}. Ao aplicar, tudo acompanha o horário real.`,
  listaRotulo: 'Modelos de cronograma da assessoria',
  resumo: (quantidade: number) => contar(quantidade, 'modelo', 'modelos'),
  vazioTitulo: 'Nenhum modelo de cronograma',
  vazioTexto: 'Crie um modelo ou salve o cronograma de um evento como modelo.',
  erroTitulo: 'Não foi possível carregar os modelos.',
  erroTexto: 'Verifique a conexão e tente de novo.',
  semAcesso: 'Só a assessoria gerencia modelos de cronograma.',
  naoEncontradoTitulo: 'Modelo não encontrado',
  naoEncontradoTexto: 'Ele pode ter sido excluído. Volte para a lista de modelos.',
  voltarModelos: 'Voltar para os modelos',
  maisAcoes: 'Mais ações',
  maisAcoesAria: (nome: string) => `Mais ações para ${nome}`,
  acaoEditar: 'Editar',
  acaoExcluir: 'Excluir',
  editar: 'Editar',
  confirmarExclusaoTexto: (itens: number) =>
    `O modelo e ${itens === 1 ? 'seu item serão excluídos' : `seus ${numero(itens)} itens serão excluídos`}. Cronogramas onde ele já foi aplicado não mudam.`,
  toastExcluido: 'Modelo excluído.',
  erroExcluir: 'Não foi possível excluir. Tente de novo.',
  formNovo: 'Novo modelo de cronograma',
  formEditar: 'Editar modelo de cronograma',
  formNovoDescricao:
    'Dê um nome que a equipe reconheça e o horário da cerimônia que serve de base. Os itens entram depois, no detalhe do modelo.',
  grupoModelo: 'Sobre o modelo',
  campoNome: 'Nome',
  campoNomePlaceholder: 'Ex.: Roteiro fazenda',
  campoDescricao: 'Descrição',
  campoDescricaoDica: (atual: number, limite: number) => `Opcional. ${numero(atual)} de ${numero(limite)} caracteres.`,
  campoReferencia: 'Horário de referência da cerimônia',
  dicaReferencia: 'Só muda como os horários aparecem aqui. A distância de cada item até a cerimônia continua a mesma.',
  criarModelo: 'Criar modelo',
  salvarAlteracoes: 'Salvar alterações',
  cancelar: 'Cancelar',
  toastCriado: 'Modelo criado.',
  toastSalvo: 'Modelo salvo.',
  erroNomeTamanho: 'Use entre 2 e 80 caracteres.',
  erroDescricaoTamanho: 'Use até 500 caracteres.',
  erroHorario: 'Use o formato 00:00.',
  erroSalvar: 'Não foi possível salvar o modelo. Verifique a conexão e tente de novo.',
  fio: 'Roteiro do modelo',
  adicionarItem: 'Adicionar item',
  itensVazioTitulo: 'Este modelo ainda não tem itens.',
  itensVazioTexto: 'Adicione o que acontece antes, durante e depois da cerimônia.',
  rotuloLinha: (atividade: string, inicio: string, distancia: string) => `Editar ${atividade}, ${inicio}, ${distancia}`,
  resumoTitulo: 'Resumo do modelo',
  porDiaTitulo: 'Por dia',
  cerimoniaTitulo: 'Em relação à cerimônia',
  rotuloReferencia: 'Cerimônia',
  rotuloComeca: 'Começa',
  rotuloTermina: 'Termina',
  resumoDia: (quantidade: number, intervalo: string) => `${contar(quantidade, 'item', 'itens')}, ${intervalo}`,
} as const

export const TEXTOS_ITEM_MODELO_CRONOGRAMA = {
  novo: 'Novo item',
  editar: 'Editar item',
  grupoAtividade: 'A atividade',
  grupoHorarioLocal: 'Horário e local',
  campoQuando: 'Quando',
  campoLocal: 'Local',
  campoLocalOutro: 'Qual local',
  campoCategoria: 'Categoria de fornecedor',
  nenhumaCategoria: 'Nenhuma',
  dicaCategoria: 'Ao aplicar, se o evento tiver um único fornecedor desta categoria, ele é preenchido.',
  salvar: 'Salvar item',
  salvarOutro: 'Salvar e adicionar outro',
  cancelar: 'Cancelar',
  excluir: 'Excluir item',
  confirmarExclusao: 'Cronogramas onde ele já foi aplicado não mudam.',
  toastAdicionado: 'Item adicionado.',
  toastAtualizado: 'Item atualizado.',
  toastExcluido: 'Item excluído.',
  erroSalvar: 'Não foi possível salvar o item. Verifique a conexão e tente de novo.',
  naoEncontradoTitulo: 'Item não encontrado',
  naoEncontradoTexto: 'Ele pode ter sido excluído. Volte para o modelo.',
} as const

export const TEXTOS_APLICAR_MODELO_CRONOGRAMA = {
  acao: 'Aplicar modelo',
  titulo: 'Aplicar modelo',
  campoModelo: 'Modelo',
  opcaoModelo: (nome: string, itens: number) => `${nome} (${contar(itens, 'item', 'itens')})`,
  gerenciar: 'Gerenciar modelos',
  semModelos: 'Nenhum modelo de cronograma ainda.',
  calculando: 'Calculando…',
  previaErro: 'Não foi possível calcular a prévia. Tente de novo.',
  previaCriar: (quantidade: number) => `Vai criar ${contar(quantidade, 'item', 'itens')}.`,
  previaFaixa: (primeiro: string, ultimo: string) => `De ${primeiro} a ${ultimo}.`,
  previaPonto: (dia: string, inicio: string, atividade: string) => `${dia} ${inicio} (${atividade})`,
  previaExistentes: (quantidade: number) => `${numero(quantidade)} ${quantidade === 1 ? 'já está' : 'já estão'} no cronograma.`,
  previaFornecedores: (quantidade: number) =>
    `${contar(quantidade, 'fornecedor será preenchido', 'fornecedores serão preenchidos')} pela categoria.`,
  previaAjustados: (quantidade: number) =>
    `${contar(quantidade, 'item ficaria', 'itens ficariam')} fora da véspera ou do dia seguinte e ${quantidade === 1 ? 'será colocado' : 'serão colocados'} no limite.`,
  previaNada: 'Todos os itens deste modelo já estão no cronograma.',
  previaLimite: (existentes: number, novos: number) =>
    `O cronograma passaria de 200 itens (hoje tem ${numero(existentes)}, o modelo cria ${numero(novos)}). Exclua itens ou use um modelo menor.`,
  incompletoTitulo: 'Falta o horário da cerimônia.',
  incompletoTexto: 'Os horários do modelo são calculados a partir dele.',
  incompletoAcao: 'Adicionar horário',
  cancelar: 'Cancelar',
  toastAplicado: (quantidade: number) => `${contar(quantidade, 'item adicionado', 'itens adicionados')} ao cronograma.`,
  erroAplicar: 'Não foi possível aplicar o modelo. Tente de novo.',
  erroConcorrente: 'O cronograma mudou em outra tela. Recarregue e tente de novo.',
} as const

export const TEXTOS_SALVAR_COMO_MODELO = {
  acao: 'Salvar como modelo',
  titulo: 'Salvar como modelo',
  nota: (horario: string) =>
    `Os horários ficam relativos à cerimônia (${horario}). Notas internas e fornecedores específicos não entram no modelo; a categoria do fornecedor, sim.`,
  salvar: 'Salvar modelo',
  cancelar: 'Cancelar',
  toast: (nome: string) => `Modelo “${nome}” salvo.`,
  erroSalvar: 'Não foi possível salvar o modelo. Tente de novo.',
} as const

export const TEXTOS_RECALCULO_HORARIOS = {
  faixa: (quantidade: number) =>
    `${contar(quantidade, 'item do modelo está', 'itens do modelo estão')} com horários de antes da mudança da cerimônia.`,
  recalcular: 'Recalcular horários',
  manter: 'Manter horários',
  titulo: 'Recalcular os horários do cronograma?',
  texto: (quantidade: number, horario: string) =>
    `${contar(quantidade, 'item veio', 'itens vieram')} de modelo e ${quantidade === 1 ? 'está marcado' : 'estão marcados'} pelo horário antigo da cerimônia. Recalcular move cada um para manter a distância até a cerimônia das ${horario}. Itens criados à mão e itens concluídos não mudam.`,
  toast: (quantidade: number) => `Horários de ${contar(quantidade, 'item recalculados', 'itens recalculados')}.`,
  erro: 'Não foi possível recalcular os horários. Tente de novo em Cronograma.',
} as const
