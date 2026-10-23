import type { DataCalendario } from '@/tipos/eventos'
import type { DiaCronograma } from '@/tipos/cronograma'
import type {
  DistribuicaoPainel,
  FornecedorDoDia,
  ItemGrandeDiaDto,
  ItemPainelGrandeDia,
  MomentoInterpolado,
  MomentoPrincipal,
  SituacaoItemGrandeDia,
} from '@/tipos/grandeDia'
import type { ItemCronogramaPublicoDto } from '@/tipos/cronogramaPublico'
import { ehHorarioDaCerimonia } from '@/utilitarios/cronogramaPublico'

export const INTERVALO_ATUALIZACAO_INTERNO_MS = 30_000
export const INTERVALO_ATUALIZACAO_PUBLICO_MS = 60_000
export const INTERVALO_RELOGIO_MS = 15_000
export const LIMITE_DEPOIS = 3
export const MINUTOS_POR_DIA = 1440

const DESLOCAMENTO_DIA: Record<DiaCronograma, number> = { Vespera: -1, DiaDoEvento: 0, DiaSeguinte: 1 }
const PADRAO_MOMENTO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
const PADRAO_HORARIO = /^(\d{2}):(\d{2})/
const MS_POR_DIA = 86_400_000

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, '0')
}

function minutosDoHorario(horario: string): number {
  const partes = PADRAO_HORARIO.exec(horario)
  return partes ? Number(partes[1]) * 60 + Number(partes[2]) : 0
}

function diaUtc(data: DataCalendario): number {
  const [ano, mes, dia] = data.split('-').map(Number)
  return Date.UTC(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1) / MS_POR_DIA
}

export function interpolarMomento(agoraServidor: string, recebidoEm: number, agoraDispositivo: number): MomentoInterpolado | null {
  const partes = PADRAO_MOMENTO.exec(agoraServidor)
  if (!partes) {
    return null
  }
  const base = Date.UTC(
    Number(partes[1]),
    Number(partes[2]) - 1,
    Number(partes[3]),
    Number(partes[4]),
    Number(partes[5]),
    Number(partes[6] ?? 0),
  )
  const atual = new Date(base + Math.max(0, agoraDispositivo - recebidoEm))
  const horas = atual.getUTCHours()
  const minutos = atual.getUTCMinutes()
  return {
    data: `${atual.getUTCFullYear()}-${doisDigitos(atual.getUTCMonth() + 1)}-${doisDigitos(atual.getUTCDate())}`,
    hora: `${doisDigitos(horas)}:${doisDigitos(minutos)}`,
    minutoDoDia: horas * 60 + minutos,
  }
}

export function minutoAtualNoRoteiro(momento: MomentoInterpolado, dataEvento: DataCalendario): number {
  return (diaUtc(momento.data) - diaUtc(dataEvento)) * MINUTOS_POR_DIA + momento.minutoDoDia
}

export function minutoDoItem(item: Pick<ItemPainelGrandeDia, 'dia' | 'inicio'>): number {
  return DESLOCAMENTO_DIA[item.dia] * MINUTOS_POR_DIA + minutosDoHorario(item.inicio)
}

export function minutosAte(item: Pick<ItemPainelGrandeDia, 'dia' | 'inicio'>, minutoAtual: number): number {
  return minutoDoItem(item) - minutoAtual
}

export function horaLocalDoInstante(instante: string | null): string | null {
  if (!instante) {
    return null
  }
  const data = new Date(instante)
  if (Number.isNaN(data.getTime())) {
    return null
  }
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(data)
}

type ItemComSituacao = Pick<
  ItemCronogramaPublicoDto,
  'dia' | 'inicio' | 'termino' | 'terminaEmOutroDia' | 'atividade' | 'local' | 'responsavel' | 'instrucoes' | 'concluidoEm' | 'situacao'
> & { fornecedor: { nomeEmpresa: string } | null }

export function paraItemPainel(
  item: ItemComSituacao,
  chave: string,
  horarioCerimonia: string | null,
  contato: ItemPainelGrandeDia['contato'] = null,
): ItemPainelGrandeDia {
  return {
    chave,
    dia: item.dia,
    inicio: item.inicio,
    termino: item.termino,
    terminaEmOutroDia: item.terminaEmOutroDia,
    atividade: item.atividade,
    local: item.local,
    responsavel: item.responsavel,
    fornecedor: item.fornecedor?.nomeEmpresa ?? null,
    contato,
    instrucoes: item.instrucoes,
    situacao: item.situacao,
    concluidoEm: item.concluidoEm,
    cerimonia: ehHorarioDaCerimonia(item, horarioCerimonia),
  }
}

export function itensPainelDoGrandeDia(itens: ItemGrandeDiaDto[], horarioCerimonia: string | null): ItemPainelGrandeDia[] {
  return itens.map((item) =>
    paraItemPainel(
      item,
      item.id,
      horarioCerimonia,
      item.fornecedor ? { nome: item.fornecedor.nomeEmpresa, telefone: item.fornecedor.telefone } : null,
    ),
  )
}

export function itensPainelPublicos(itens: ItemCronogramaPublicoDto[], horarioCerimonia: string | null): ItemPainelGrandeDia[] {
  return itens.map((item, indice) => paraItemPainel(item, `${item.dia}-${item.inicio}-${indice}`, horarioCerimonia))
}

function comSituacao(itens: ItemPainelGrandeDia[], situacao: SituacaoItemGrandeDia): ItemPainelGrandeDia[] {
  return itens.filter((item) => item.situacao === situacao)
}

export function distribuirPainel(itens: ItemPainelGrandeDia[]): DistribuicaoPainel {
  const emAndamento = comSituacao(itens, 'Agora')
  const principal = emAndamento.reduce<ItemPainelGrandeDia | null>(
    (escolhido, item) => (escolhido === null || minutoDoItem(item) > minutoDoItem(escolhido) ? item : escolhido),
    null,
  )
  return {
    principal,
    tambemAgora: emAndamento.filter((item) => item !== principal),
    proximo: comSituacao(itens, 'Proximo')[0] ?? null,
    depois: comSituacao(itens, 'Depois'),
    semMarcar: comSituacao(itens, 'SemMarcar'),
    feitos: comSituacao(itens, 'Feito'),
  }
}

export function momentoPrincipal(minutoAtual: number, horarioCerimonia: string | null): MomentoPrincipal | null {
  if (!horarioCerimonia || !PADRAO_HORARIO.test(horarioCerimonia)) {
    return null
  }
  const horario = horarioCerimonia.slice(0, 5)
  return { minutos: minutosDoHorario(horario) - minutoAtual, horario }
}

function chaveFornecedor(fornecedor: { nomeEmpresa: string; categoria: string }): string {
  return `${fornecedor.nomeEmpresa}|${fornecedor.categoria}`
}

function grupoFornecedor(fornecedor: FornecedorDoDia): number {
  if (fornecedor.encerrado) {
    return 3
  }
  if (fornecedor.situacao === 'Agora') {
    return 0
  }
  return fornecedor.situacao === 'Proximo' ? 1 : 2
}

export function fornecedoresDoDia(itens: ItemGrandeDiaDto[], idPrincipal: string | null = null): FornecedorDoDia[] {
  const ordenados = [...itens].sort((a, b) => minutoDoItem(a) - minutoDoItem(b))
  const porChave = new Map<string, { fornecedor: FornecedorDoDia; minuto: number }>()
  for (const item of ordenados) {
    if (!item.fornecedor) {
      continue
    }
    const chave = chaveFornecedor(item.fornecedor)
    const pendente = item.situacao !== 'Feito'
    const situacao = item.situacao === 'Agora' || item.situacao === 'Proximo' ? item.situacao : null
    const existente = porChave.get(chave)
    if (!existente) {
      porChave.set(chave, {
        minuto: minutoDoItem(item),
        fornecedor: {
          chave,
          nomeEmpresa: item.fornecedor.nomeEmpresa,
          categoria: item.fornecedor.categoria,
          contato: item.fornecedor.contato,
          telefone: item.fornecedor.telefone,
          inicio: item.inicio,
          situacao,
          encerrado: !pendente,
          noCartaoAgora: item.id === idPrincipal,
        },
      })
      continue
    }
    const atual = existente.fornecedor
    if (pendente && atual.encerrado) {
      atual.encerrado = false
      atual.inicio = item.inicio
      existente.minuto = minutoDoItem(item)
    }
    if (situacao === 'Agora' || (situacao === 'Proximo' && atual.situacao === null)) {
      atual.situacao = situacao
    }
    atual.noCartaoAgora = atual.noCartaoAgora || item.id === idPrincipal
    atual.telefone = atual.telefone ?? item.fornecedor.telefone
    atual.contato = atual.contato ?? item.fornecedor.contato
  }
  return [...porChave.values()]
    .sort((a, b) => grupoFornecedor(a.fornecedor) - grupoFornecedor(b.fornecedor) || a.minuto - b.minuto)
    .map(({ fornecedor }) => fornecedor)
}

export function contatosDoMomento(fornecedores: FornecedorDoDia[]): FornecedorDoDia[] {
  return fornecedores.filter((fornecedor) => fornecedor.situacao !== null && !fornecedor.noCartaoAgora)
}
