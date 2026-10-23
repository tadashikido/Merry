import { TEXTOS_MODELOS_CRONOGRAMA } from '@/textos/modelosCronograma'
import { DIAS_CRONOGRAMA, type DiaCronograma } from '@/tipos/cronograma'
import type { CategoriaFornecedor } from '@/tipos/fornecedores'
import type { ItemModeloCronogramaDto, OpcaoLocalModelo } from '@/tipos/modelosCronograma'
import { horarioParaMinutos, minutosParaHorario, MINUTOS_POR_DIA, resumirDias } from '@/utilitarios/cronograma'
import type { RegraValidacao } from '@/utilitarios/validacao'

export const LIMITES_MODELO_CRONOGRAMA = {
  nomeMinimo: 2,
  nomeMaximo: 80,
  descricaoMaximo: 500,
  itens: 200,
  posicaoMinima: -MINUTOS_POR_DIA,
  posicaoMaxima: 2 * MINUTOS_POR_DIA - 1,
} as const

export const HORARIO_REFERENCIA_PADRAO = '16:00'

const DESLOCAMENTO_DIA: Record<DiaCronograma, number> = {
  Vespera: -1,
  DiaDoEvento: 0,
  DiaSeguinte: 1,
}

export function posicaoDe(dia: DiaCronograma, inicio: string): number | null {
  const minutos = horarioParaMinutos(inicio)
  return minutos === null ? null : DESLOCAMENTO_DIA[dia] * MINUTOS_POR_DIA + minutos
}

export function minutosDesdeCerimonia(dia: DiaCronograma, inicio: string, referencia: string): number | null {
  const posicao = posicaoDe(dia, inicio)
  const cerimonia = horarioParaMinutos(referencia)
  return posicao === null || cerimonia === null ? null : posicao - cerimonia
}

export function posicaoNaReferencia(minutos: number, referencia: string): { dia: DiaCronograma; inicio: string } | null {
  const cerimonia = horarioParaMinutos(referencia)
  if (cerimonia === null) {
    return null
  }
  const posicao = Math.min(Math.max(cerimonia + minutos, LIMITES_MODELO_CRONOGRAMA.posicaoMinima), LIMITES_MODELO_CRONOGRAMA.posicaoMaxima)
  const dia: DiaCronograma = posicao < 0 ? 'Vespera' : posicao < MINUTOS_POR_DIA ? 'DiaDoEvento' : 'DiaSeguinte'
  return { dia, inicio: minutosParaHorario(posicao) }
}

export function opcaoLocalDoItem(item: Pick<ItemModeloCronogramaDto, 'referenciaLocal' | 'local'>): OpcaoLocalModelo {
  return item.referenciaLocal ?? 'Outro'
}

export function agruparItensModeloPorDia(itens: ItemModeloCronogramaDto[]): { dia: DiaCronograma; itens: ItemModeloCronogramaDto[] }[] {
  const dias: DiaCronograma[] = ['Vespera', 'DiaDoEvento', 'DiaSeguinte']
  return dias
    .map((dia) => ({ dia, itens: itens.filter((item) => item.dia === dia) }))
    .filter((grupo) => grupo.itens.length > 0)
}

export interface PontoDoModelo {
  minutos: number
  dia: DiaCronograma
  horario: string
}

export interface AlcanceDoModelo {
  comeca: PontoDoModelo
  termina: PontoDoModelo
  duracaoMinutos: number | null
}

type ItemPosicionado = Pick<ItemModeloCronogramaDto, 'minutosDesdeCerimonia' | 'duracaoMinutos'>

export function alcanceDoModelo(itens: ItemPosicionado[], referencia: string): AlcanceDoModelo | null {
  if (itens.length === 0) {
    return null
  }
  const comeca = Math.min(...itens.map((item) => item.minutosDesdeCerimonia))
  const termina = Math.max(...itens.map((item) => item.minutosDesdeCerimonia + (item.duracaoMinutos ?? 0)))
  const inicio = posicaoNaReferencia(comeca, referencia)
  const fim = posicaoNaReferencia(termina, referencia)
  if (!inicio || !fim) {
    return null
  }
  return {
    comeca: { minutos: comeca, dia: inicio.dia, horario: inicio.inicio },
    termina: { minutos: termina, dia: fim.dia, horario: fim.inicio },
    duracaoMinutos: termina > comeca ? termina - comeca : null,
  }
}

export interface PosicoesNoMomento {
  antes: number
  naHora: number
  depois: number
}

export function posicoesNoMomento(itens: Pick<ItemModeloCronogramaDto, 'minutosDesdeCerimonia'>[]): PosicoesNoMomento {
  return {
    antes: itens.filter((item) => item.minutosDesdeCerimonia < 0).length,
    naHora: itens.filter((item) => item.minutosDesdeCerimonia === 0).length,
    depois: itens.filter((item) => item.minutosDesdeCerimonia > 0).length,
  }
}

export interface CategoriaNoModelo {
  categoria: CategoriaFornecedor
  quantidade: number
}

export interface EquipeDoModelo {
  categorias: CategoriaNoModelo[]
  responsaveis: string[]
  semNinguem: number
}

export function equipeDoModelo(
  itens: Pick<ItemModeloCronogramaDto, 'categoriaFornecedor' | 'responsavel'>[],
  rotular: (categoria: CategoriaFornecedor) => string = (categoria) => categoria,
): EquipeDoModelo {
  const porCategoria = new Map<CategoriaFornecedor, number>()
  const responsaveis = new Map<string, string>()
  let semNinguem = 0
  for (const item of itens) {
    const responsavel = item.responsavel?.trim()
    if (item.categoriaFornecedor) {
      porCategoria.set(item.categoriaFornecedor, (porCategoria.get(item.categoriaFornecedor) ?? 0) + 1)
    }
    if (responsavel) {
      const chave = responsavel.toLocaleLowerCase('pt-BR')
      if (!responsaveis.has(chave)) {
        responsaveis.set(chave, responsavel)
      }
    }
    if (!responsavel && !item.categoriaFornecedor) {
      semNinguem += 1
    }
  }
  const categorias = [...porCategoria]
    .map(([categoria, quantidade]) => ({ categoria, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || rotular(a.categoria).localeCompare(rotular(b.categoria), 'pt-BR'))
  return {
    categorias,
    responsaveis: [...responsaveis.values()].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    semNinguem,
  }
}

export interface ItemNaPosicao {
  dia: DiaCronograma
  minutos: number
  inicio: string
  termino: string | null
  terminaEmOutroDia: boolean
}

export interface DiaDoModelo {
  dia: DiaCronograma
  quantidade: number
  intervalo: string
  atual: boolean
}

export interface PosicaoItemNoModeloCronograma {
  dia: DiaCronograma | null
  dias: DiaDoModelo[]
  vizinhos: ItemModeloCronogramaDto[]
  maisNoDia: number
  ampliaComeco: boolean
  ampliaFim: boolean
  outrosItens: number
}

export function posicaoItemNoModeloCronograma(
  itens: readonly ItemModeloCronogramaDto[],
  atual: ItemNaPosicao | null,
  itemId: string | null = null,
  limite = 4,
): PosicaoItemNoModeloCronograma {
  const outros = itens.filter((item) => item.id !== itemId)
  const grupos = DIAS_CRONOGRAMA.map((dia) => {
    const doDia: Pick<ItemModeloCronogramaDto, 'inicio' | 'termino' | 'terminaEmOutroDia'>[] = outros.filter((item) => item.dia === dia)
    return { dia, itens: atual?.dia === dia ? [...doDia, atual] : doDia }
  })
  const dias = resumirDias(grupos).map((resumo) => ({
    dia: resumo.dia,
    quantidade: resumo.quantidade,
    intervalo: resumo.intervalo,
    atual: resumo.dia === atual?.dia,
  }))

  const doDia = atual === null ? [] : outros.filter((item) => item.dia === atual.dia)
  const vizinhos =
    atual === null
      ? []
      : [...doDia]
          .sort((a, b) => Math.abs(a.minutosDesdeCerimonia - atual.minutos) - Math.abs(b.minutosDesdeCerimonia - atual.minutos))
          .slice(0, limite)
          .sort((a, b) => a.minutosDesdeCerimonia - b.minutosDesdeCerimonia)

  const posicoes = outros.map((item) => item.minutosDesdeCerimonia)
  const primeiro = posicoes.length > 0 ? Math.min(...posicoes) : null
  const ultimo = posicoes.length > 0 ? Math.max(...posicoes) : null
  return {
    dia: atual?.dia ?? null,
    dias,
    vizinhos,
    maisNoDia: doDia.length - vizinhos.length,
    ampliaComeco: atual !== null && primeiro !== null && atual.minutos < primeiro,
    ampliaFim: atual !== null && ultimo !== null && atual.minutos > ultimo,
    outrosItens: outros.length,
  }
}

export const regraNomeModeloCronograma: RegraValidacao = (valor) => {
  const texto = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : ''
  if (texto === '') {
    return null
  }
  return texto.length < LIMITES_MODELO_CRONOGRAMA.nomeMinimo || texto.length > LIMITES_MODELO_CRONOGRAMA.nomeMaximo
    ? TEXTOS_MODELOS_CRONOGRAMA.erroNomeTamanho
    : null
}

export const regraDescricaoModeloCronograma: RegraValidacao = (valor) => {
  const texto = typeof valor === 'string' ? valor.trim() : ''
  return texto.length > LIMITES_MODELO_CRONOGRAMA.descricaoMaximo ? TEXTOS_MODELOS_CRONOGRAMA.erroDescricaoTamanho : null
}

export const regraHorarioReferencia: RegraValidacao = (valor) => {
  const texto = typeof valor === 'string' ? valor.trim() : ''
  return horarioParaMinutos(texto) === null ? TEXTOS_MODELOS_CRONOGRAMA.erroHorario : null
}
