import type { GrupoModuloCasamento, GrupoNavegacaoCasamento, IndicadorModulo, ModuloCasamento } from './tipos'
import { ROTULOS_GRUPOS_CASAMENTO, ROTULOS_MODULOS_CASAMENTO } from '@/textos/rotulos'

export const ORDEM_GRUPOS_CASAMENTO: GrupoModuloCasamento[] = ['planejar', 'pessoas', 'dinheiroDocumentos', 'execucao']

export const MODULOS_CASAMENTO: ModuloCasamento[] = [
  { chave: 'visao-geral', grupo: 'planejar', rotulo: ROTULOS_MODULOS_CASAMENTO.visaoGeral, icone: 'dashboard', rota: 'casamento' },
  {
    chave: 'tarefas',
    grupo: 'planejar',
    rotulo: ROTULOS_MODULOS_CASAMENTO.tarefas,
    icone: 'checklist',
    rota: 'casamento-tarefas',
    rotasRelacionadas: ['tarefa-nova', 'tarefa-editar'],
  },
  { chave: 'checklist', grupo: 'planejar', rotulo: ROTULOS_MODULOS_CASAMENTO.checklist, icone: 'concluido', rota: 'casamento-checklist' },
  { chave: 'cronograma', grupo: 'planejar', rotulo: ROTULOS_MODULOS_CASAMENTO.cronograma, icone: 'cronograma', rota: 'casamento-cronograma' },
  {
    chave: 'fornecedores',
    grupo: 'pessoas',
    rotulo: ROTULOS_MODULOS_CASAMENTO.fornecedores,
    icone: 'fornecedor',
    rota: 'casamento-fornecedores',
    rotasRelacionadas: ['fornecedor-casamento-novo', 'fornecedor-casamento-editar'],
  },
  {
    chave: 'convidados',
    grupo: 'pessoas',
    rotulo: ROTULOS_MODULOS_CASAMENTO.convidados,
    icone: 'convidados',
    rota: 'casamento-convidados',
    rotasRelacionadas: ['convite-novo', 'convite-editar', 'convidados-importar'],
  },
  { chave: 'confirmacoes', grupo: 'pessoas', rotulo: ROTULOS_MODULOS_CASAMENTO.confirmacoes, icone: 'confirmacoes', rota: 'painel-confirmacoes' },
  { chave: 'restricoes', grupo: 'pessoas', rotulo: ROTULOS_MODULOS_CASAMENTO.restricoes, icone: 'restricao', rota: 'restricoes-alimentares' },
  {
    chave: 'mesas',
    grupo: 'pessoas',
    rotulo: ROTULOS_MODULOS_CASAMENTO.mesas,
    icone: 'mesa',
    rota: 'casamento-mesas',
    rotasRelacionadas: ['impressao-mesas'],
  },
  {
    chave: 'financeiro',
    grupo: 'dinheiroDocumentos',
    rotulo: ROTULOS_MODULOS_CASAMENTO.financeiro,
    icone: 'financeiro',
    rota: 'casamento-financeiro',
  },
  { chave: 'grande-dia', grupo: 'execucao', rotulo: ROTULOS_MODULOS_CASAMENTO.grandeDia, icone: 'ao-vivo', rota: 'casamento-grande-dia' },
]

export function moduloAtivo(modulo: ModuloCasamento, nomeRota: string | null): boolean {
  return nomeRota !== null && (modulo.rota === nomeRota || (modulo.rotasRelacionadas ?? []).includes(nomeRota))
}

export function gruposNavegacaoCasamento(
  casamentoId: string,
  nomeRotaAtual: string | null,
  podeAcessar: (modulo: ModuloCasamento) => boolean,
  modulos: ModuloCasamento[] = MODULOS_CASAMENTO,
  indicadores: Partial<Record<string, IndicadorModulo>> = {},
): GrupoNavegacaoCasamento[] {
  return ORDEM_GRUPOS_CASAMENTO.map((grupo) => ({
    chave: grupo,
    rotulo: ROTULOS_GRUPOS_CASAMENTO[grupo],
    itens: modulos
      .filter((modulo) => modulo.grupo === grupo && podeAcessar(modulo))
      .map((modulo) => ({
        chave: modulo.chave,
        rotulo: modulo.rotulo,
        icone: modulo.icone,
        rota: { name: modulo.rota, params: { id: casamentoId } },
        ativo: moduloAtivo(modulo, nomeRotaAtual),
        ...(indicadores[modulo.chave] ? { indicador: indicadores[modulo.chave] } : {}),
      })),
  })).filter((grupo) => grupo.itens.length > 0)
}
