export const MENSAGEM_FALHA_CONEXAO = 'Não foi possível conectar à API.'
export const MENSAGEM_TEMPO_ESGOTADO = 'A API demorou demais para responder.'
export const MENSAGEM_VERIFIQUE_CONEXAO = 'Verifique sua conexão e tente novamente.'

export const MENSAGENS_PADRAO = {
  salvoComSucesso: 'Alterações salvas.',
  erroGenericoTitulo: 'Não foi possível concluir',
  erroGenericoMensagem: 'Tente novamente em instantes. Se continuar, fale com o suporte.',
  carregando: 'Carregando…',
  listaVaziaTitulo: 'Nada por aqui ainda',
  semResultadoTitulo: 'Nenhum resultado para essa busca',
  semResultadoTexto: 'Revise o termo buscado ou limpe os filtros.',
  exclusaoMensagem: 'Essa ação não pode ser desfeita.',
} as const

export function tituloExclusao(nomeItem: string): string {
  return `Excluir “${nomeItem}”?`
}

export function mensagemExcluido(nomeItem: string): string {
  return `“${nomeItem}” foi excluído.`
}
