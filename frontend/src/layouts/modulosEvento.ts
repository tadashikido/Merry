import type { GrupoModuloEvento, GrupoNavegacaoEvento, IndicadorModulo, ModuloEvento } from './tipos'
import { ROTULOS_GRUPOS_EVENTO, ROTULOS_MODULOS_EVENTO } from '@/textos/rotulos'

export const ORDEM_GRUPOS_EVENTO: GrupoModuloEvento[] = ['planejar', 'pessoas', 'dinheiroDocumentos', 'execucao']

export const MODULOS_EVENTO: ModuloEvento[] = [
  { chave: 'visao-geral', grupo: 'planejar', rotulo: ROTULOS_MODULOS_EVENTO.visaoGeral, icone: 'dashboard', rota: 'evento' },
  {
    chave: 'tarefas',
    grupo: 'planejar',
    rotulo: ROTULOS_MODULOS_EVENTO.tarefas,
    icone: 'checklist',
    rota: 'evento-tarefas',
    rotasRelacionadas: ['tarefa-nova', 'tarefa-editar'],
  },
  { chave: 'checklist', grupo: 'planejar', rotulo: ROTULOS_MODULOS_EVENTO.checklist, icone: 'concluido', rota: 'evento-checklist' },
  { chave: 'cronograma', grupo: 'planejar', rotulo: ROTULOS_MODULOS_EVENTO.cronograma, icone: 'cronograma', rota: 'evento-cronograma' },
  {
    chave: 'fornecedores',
    grupo: 'pessoas',
    rotulo: ROTULOS_MODULOS_EVENTO.fornecedores,
    icone: 'fornecedor',
    rota: 'evento-fornecedores',
    rotasRelacionadas: ['fornecedor-evento-novo', 'fornecedor-evento-editar'],
  },
  {
    chave: 'convidados',
    grupo: 'pessoas',
    rotulo: ROTULOS_MODULOS_EVENTO.convidados,
    icone: 'convidados',
    rota: 'evento-convidados',
    rotasRelacionadas: ['convite-novo', 'convite-editar', 'convidados-importar'],
  },
  { chave: 'confirmacoes', grupo: 'pessoas', rotulo: ROTULOS_MODULOS_EVENTO.confirmacoes, icone: 'confirmacoes', rota: 'painel-confirmacoes' },
  { chave: 'restricoes', grupo: 'pessoas', rotulo: ROTULOS_MODULOS_EVENTO.restricoes, icone: 'restricao', rota: 'restricoes-alimentares' },
  {
    chave: 'mesas',
    grupo: 'pessoas',
    rotulo: ROTULOS_MODULOS_EVENTO.mesas,
    icone: 'mesa',
    rota: 'evento-mesas',
    rotasRelacionadas: ['impressao-mesas'],
  },
  {
    chave: 'financeiro',
    grupo: 'dinheiroDocumentos',
    rotulo: ROTULOS_MODULOS_EVENTO.financeiro,
    icone: 'financeiro',
    rota: 'evento-financeiro',
  },
  { chave: 'grande-dia', grupo: 'execucao', rotulo: ROTULOS_MODULOS_EVENTO.grandeDia, icone: 'ao-vivo', rota: 'evento-grande-dia' },
]

export function moduloAtivo(modulo: ModuloEvento, nomeRota: string | null): boolean {
  return nomeRota !== null && (modulo.rota === nomeRota || (modulo.rotasRelacionadas ?? []).includes(nomeRota))
}

export function gruposNavegacaoEvento(
  eventoId: string,
  nomeRotaAtual: string | null,
  podeAcessar: (modulo: ModuloEvento) => boolean,
  modulos: ModuloEvento[] = MODULOS_EVENTO,
  indicadores: Partial<Record<string, IndicadorModulo>> = {},
): GrupoNavegacaoEvento[] {
  return ORDEM_GRUPOS_EVENTO.map((grupo) => ({
    chave: grupo,
    rotulo: ROTULOS_GRUPOS_EVENTO[grupo],
    itens: modulos
      .filter((modulo) => modulo.grupo === grupo && podeAcessar(modulo))
      .map((modulo) => ({
        chave: modulo.chave,
        rotulo: modulo.rotulo,
        icone: modulo.icone,
        rota: { name: modulo.rota, params: { id: eventoId } },
        ativo: moduloAtivo(modulo, nomeRotaAtual),
        ...(indicadores[modulo.chave] ? { indicador: indicadores[modulo.chave] } : {}),
      })),
  })).filter((grupo) => grupo.itens.length > 0)
}
