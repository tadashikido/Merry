import { VOCABULARIO_TIPO_EVENTO, ehTipoEvento } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type EventoResumoDto, type TipoEvento } from '@/tipos/eventos'
import { CATEGORIAS_FORNECEDOR, type CategoriaFornecedor, type FornecedorResumoDto } from '@/tipos/fornecedores'
import { contarPorTipo, type QuantidadePorTipo } from '@/utilitarios/carteiraEventos'

export interface CategoriaSemFornecedor {
  categoria: CategoriaFornecedor
  tipos: TipoEvento[]
  eventos: number
  arquivados: number
}

export interface CoberturaCarteira {
  daCarteira: boolean
  porTipo: QuantidadePorTipo[]
  tipos: TipoEvento[]
  essenciais: number
  cobertas: number
  faltando: CategoriaSemFornecedor[]
}

export function eventosDaCarteira(eventos: readonly EventoResumoDto[]): EventoResumoDto[] {
  return eventos.filter((evento) => !evento.arquivado && evento.diasRestantes >= 0 && ehTipoEvento(evento.tipo))
}

function essenciaisDe(tipo: TipoEvento): readonly CategoriaFornecedor[] {
  return VOCABULARIO_TIPO_EVENTO[tipo].fornecedoresEssenciais
}

export function coberturaDaCarteira(
  fornecedores: readonly FornecedorResumoDto[],
  eventos: readonly EventoResumoDto[] | null,
): CoberturaCarteira {
  const considerados = eventos ? eventosDaCarteira(eventos) : []
  const porTipo = contarPorTipo(considerados)
  const daCarteira = porTipo.length > 0
  const tipos = daCarteira ? porTipo.map((item) => item.tipo) : [...TIPOS_EVENTO]

  const ativos = new Set<CategoriaFornecedor>()
  const arquivadosPorCategoria = new Map<CategoriaFornecedor, number>()
  for (const fornecedor of fornecedores) {
    if (fornecedor.arquivado) {
      arquivadosPorCategoria.set(fornecedor.categoria, (arquivadosPorCategoria.get(fornecedor.categoria) ?? 0) + 1)
    } else {
      ativos.add(fornecedor.categoria)
    }
  }

  const essenciais = CATEGORIAS_FORNECEDOR.filter((categoria) => tipos.some((tipo) => essenciaisDe(tipo).includes(categoria)))
  const faltando = essenciais
    .filter((categoria) => !ativos.has(categoria))
    .map((categoria) => ({
      categoria,
      tipos: tipos.filter((tipo) => essenciaisDe(tipo).includes(categoria)),
      eventos: porTipo
        .filter((item) => essenciaisDe(item.tipo).includes(categoria))
        .reduce((soma, item) => soma + item.quantidade, 0),
      arquivados: arquivadosPorCategoria.get(categoria) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.eventos - a.eventos ||
        b.tipos.length - a.tipos.length ||
        CATEGORIAS_FORNECEDOR.indexOf(a.categoria) - CATEGORIAS_FORNECEDOR.indexOf(b.categoria),
    )

  return {
    daCarteira,
    porTipo,
    tipos,
    essenciais: essenciais.length,
    cobertas: essenciais.length - faltando.length,
    faltando,
  }
}

export interface EssencialidadeCategoria {
  daCarteira: boolean
  tipos: TipoEvento[]
  eventos: number
}

export function essencialidadeDaCategoria(
  categoria: CategoriaFornecedor,
  eventos: readonly EventoResumoDto[] | null,
): EssencialidadeCategoria {
  const cobertura = coberturaDaCarteira([], eventos)
  const falta = cobertura.faltando.find((item) => item.categoria === categoria)
  return {
    daCarteira: cobertura.daCarteira,
    tipos: falta ? falta.tipos : [],
    eventos: falta ? falta.eventos : 0,
  }
}

export interface SituacaoCategoriaNaBase {
  essencialidade: EssencialidadeCategoria
  ativos: number | null
  outros: boolean
}

export function situacaoCategoriaNaBase(
  categoria: CategoriaFornecedor,
  fornecedores: readonly FornecedorResumoDto[] | null,
  eventos: readonly EventoResumoDto[] | null,
  fornecedorAtualId: string | null = null,
): SituacaoCategoriaNaBase {
  const ativos = fornecedores
    ? fornecedores.filter(
        (fornecedor) => !fornecedor.arquivado && fornecedor.categoria === categoria && fornecedor.id !== fornecedorAtualId,
      ).length
    : null
  return {
    essencialidade: essencialidadeDaCategoria(categoria, eventos),
    ativos,
    outros: fornecedorAtualId !== null,
  }
}
