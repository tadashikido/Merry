import type { VarianteStatus } from '@/componentes/base/tipos'
import {
  ROTULOS_CATEGORIA_TAREFA,
  ROTULOS_HORIZONTE_TAREFA,
  ROTULOS_RESPONSAVEL_TAREFA,
  ROTULOS_STATUS_TAREFA,
  TEXTOS_TAREFAS,
  VARIANTE_STATUS_TAREFA,
} from '@/textos/tarefas'
import type {
  FiltroCategoriaTarefa,
  FiltroResponsavelTarefa,
  HorizonteTarefa,
  ResumoTarefasDto,
  SituacaoFiltroTarefa,
  StatusTarefa,
  TarefaDto,
} from '@/tipos/tarefas'
import { formatarData, formatarDataCalendario } from '@/utilitarios/formatacao'
import type { RegraValidacao } from '@/utilitarios/validacao'

export const LIMITES_TAREFA = {
  tituloMinimo: 2,
  tituloMaximo: 160,
  descricaoMaximo: 2000,
  prazoMinimo: '2000-01-01',
  prazoMaximo: '2100-12-31',
} as const

export const LIMITE_ITENS_PENDENCIAS = 5

export const ORDEM_HORIZONTES: HorizonteTarefa[] = ['atrasadas', 'semana', 'adiante', 'semPrazo']

export interface FiltrosTarefa {
  situacao: SituacaoFiltroTarefa
  responsavel: FiltroResponsavelTarefa
  categoria: FiltroCategoriaTarefa
}

export interface GrupoTarefas {
  horizonte: HorizonteTarefa
  rotulo: string
  tarefas: TarefaDto[]
}

export interface BadgeTarefa {
  texto: string
  variante: VarianteStatus
}

export function tarefaAberta(status: StatusTarefa): boolean {
  return status === 'AFazer' || status === 'EmAndamento'
}

function atendeSituacao(tarefa: TarefaDto, situacao: SituacaoFiltroTarefa): boolean {
  switch (situacao) {
    case 'abertas':
      return tarefaAberta(tarefa.status)
    case 'atrasadas':
      return tarefa.atrasada
    case 'semana':
      return tarefa.venceNaSemana
    case 'concluidas':
      return tarefa.status === 'Concluida'
    case 'canceladas':
      return tarefa.status === 'Cancelada'
    default:
      return true
  }
}

export function filtrarTarefas(tarefas: TarefaDto[], filtros: FiltrosTarefa): TarefaDto[] {
  return tarefas.filter(
    (tarefa) =>
      atendeSituacao(tarefa, filtros.situacao) &&
      (filtros.responsavel === 'Todos' || tarefa.responsavel === filtros.responsavel) &&
      (filtros.categoria === 'Todas' || tarefa.categoria === filtros.categoria),
  )
}

export function horizonteTarefa(tarefa: TarefaDto): HorizonteTarefa {
  if (tarefa.atrasada) {
    return 'atrasadas'
  }
  if (tarefa.venceNaSemana) {
    return 'semana'
  }
  return tarefa.prazo === null ? 'semPrazo' : 'adiante'
}

export function agruparPorHorizonte(tarefas: TarefaDto[]): GrupoTarefas[] {
  return ORDEM_HORIZONTES.map((horizonte) => {
    const doGrupo = tarefas.filter((tarefa) => horizonteTarefa(tarefa) === horizonte)
    return {
      horizonte,
      rotulo: TEXTOS_TAREFAS.grupoRotulo(ROTULOS_HORIZONTE_TAREFA[horizonte], doGrupo.length),
      tarefas: doGrupo,
    }
  }).filter((grupo) => grupo.tarefas.length > 0)
}

export function contagemSituacao(resumo: ResumoTarefasDto | null, situacao: SituacaoFiltroTarefa): number | null {
  if (!resumo) {
    return null
  }
  switch (situacao) {
    case 'atrasadas':
      return resumo.atrasadas
    case 'semana':
      return resumo.estaSemana
    default:
      return null
  }
}

export function descreverPrazo(tarefa: Pick<TarefaDto, 'prazo' | 'diasParaPrazo' | 'status'>): string {
  if (tarefa.prazo === null || tarefa.diasParaPrazo === null) {
    return TEXTOS_TAREFAS.semPrazo
  }
  const data = formatarDataCalendario(tarefa.prazo)
  if (!tarefaAberta(tarefa.status)) {
    return TEXTOS_TAREFAS.prazoData(data)
  }
  const dias = tarefa.diasParaPrazo
  if (dias < 0) {
    return TEXTOS_TAREFAS.prazoAtraso(-dias)
  }
  if (dias === 0) {
    return TEXTOS_TAREFAS.prazoHoje
  }
  if (dias === 1) {
    return TEXTOS_TAREFAS.prazoAmanha
  }
  return TEXTOS_TAREFAS.prazoFuturo(dias, data)
}

export function descreverConclusao(tarefa: TarefaDto, visaoDoAnfitriao: boolean): string | null {
  if (tarefa.status !== 'Concluida' || !tarefa.concluidaEm) {
    return null
  }
  const data = formatarData(tarefa.concluidaEm)
  if (tarefa.concluidaPor === 'Anfitriao') {
    return visaoDoAnfitriao ? TEXTOS_TAREFAS.concluidaPorVoces(data) : TEXTOS_TAREFAS.concluidaPeloAnfitriao(data)
  }
  return TEXTOS_TAREFAS.concluidaPorAssessoria(data)
}

export function metadadosTarefa(tarefa: TarefaDto, visaoDoAnfitriao: boolean): string[] {
  const conclusao = descreverConclusao(tarefa, visaoDoAnfitriao)
  const itens: string[] = []
  if (!visaoDoAnfitriao) {
    itens.push(ROTULOS_RESPONSAVEL_TAREFA[tarefa.responsavel])
  }
  itens.push(conclusao ?? descreverPrazo(tarefa))
  if (!visaoDoAnfitriao && tarefa.categoria !== 'Geral') {
    itens.push(ROTULOS_CATEGORIA_TAREFA[tarefa.categoria])
  }
  return itens
}

export function badgeTarefa(tarefa: TarefaDto): BadgeTarefa | null {
  if (tarefa.atrasada) {
    return { texto: TEXTOS_TAREFAS.badgeAtrasada, variante: 'erro' }
  }
  if (tarefa.venceNaSemana) {
    return {
      texto: tarefa.diasParaPrazo === 0 ? TEXTOS_TAREFAS.badgeVenceHoje : TEXTOS_TAREFAS.badgeSemana,
      variante: 'alerta',
    }
  }
  if (tarefa.status === 'AFazer') {
    return null
  }
  return { texto: ROTULOS_STATUS_TAREFA[tarefa.status], variante: VARIANTE_STATUS_TAREFA[tarefa.status] }
}

export const tituloTarefa: RegraValidacao = (valor) => {
  const texto = String(valor ?? '').trim().replace(/\s+/g, ' ')
  if (texto === '') {
    return null
  }
  return texto.length < LIMITES_TAREFA.tituloMinimo || texto.length > LIMITES_TAREFA.tituloMaximo
    ? TEXTOS_TAREFAS.erroTituloTamanho
    : null
}

export const descricaoTarefa: RegraValidacao = (valor) =>
  String(valor ?? '').trim().length > LIMITES_TAREFA.descricaoMaximo ? TEXTOS_TAREFAS.erroDescricaoTamanho : null

export const prazoTarefa: RegraValidacao = (valor) => {
  const texto = String(valor ?? '')
  if (texto === '') {
    return null
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) && texto >= LIMITES_TAREFA.prazoMinimo && texto <= LIMITES_TAREFA.prazoMaximo
    ? null
    : TEXTOS_TAREFAS.erroPrazo
}
