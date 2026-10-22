import type { VarianteStatus } from '@/componentes/base/tipos'
import { TEXTOS_FORNECEDORES_EVENTO } from '@/textos/fornecedoresEvento'
import { CATEGORIAS_FORNECEDOR, type CategoriaFornecedor, type FornecedorResumoDto } from '@/tipos/fornecedores'
import type {
  FornecedorEventoDto,
  ResumoCategoriaOrcamentoDto,
  ResumoOrcamentoDto,
  StatusFornecedorEvento,
} from '@/tipos/fornecedoresEvento'
import { deCentavos, paraCentavos } from '@/utilitarios/centavos'
import type { RegraValidacao } from '@/utilitarios/validacao'

export const LIMITES_VINCULO = {
  servicoMaximo: 120,
  notasMaximo: 2000,
  valorMaximo: 99_999_999.99,
} as const

export const VARIANTES_STATUS_FORNECEDOR_EVENTO: Record<StatusFornecedorEvento, VarianteStatus> = {
  Cotacao: 'informacao',
  EmNegociacao: 'alerta',
  Contratado: 'sucesso',
  Cancelado: 'neutro',
}

export interface GrupoVinculos {
  categoria: CategoriaFornecedor
  vinculos: FornecedorEventoDto[]
}

export function agruparVinculosPorCategoria(vinculos: FornecedorEventoDto[]): GrupoVinculos[] {
  return CATEGORIAS_FORNECEDOR.map((categoria) => ({
    categoria,
    vinculos: vinculos
      .filter((vinculo) => vinculo.fornecedor.categoria === categoria)
      .sort((a, b) => a.fornecedor.nomeEmpresa.localeCompare(b.fornecedor.nomeEmpresa, 'pt-BR', { sensitivity: 'base' })),
  })).filter((grupo) => grupo.vinculos.length > 0)
}

export function fornecedoresDisponiveis(
  base: FornecedorResumoDto[],
  vinculos: FornecedorEventoDto[],
): FornecedorResumoDto[] {
  const vinculados = new Set(vinculos.map((vinculo) => vinculo.fornecedor.id))
  return base
    .filter((fornecedor) => !fornecedor.arquivado && !vinculados.has(fornecedor.id))
    .sort(
      (a, b) =>
        CATEGORIAS_FORNECEDOR.indexOf(a.categoria) - CATEGORIAS_FORNECEDOR.indexOf(b.categoria) ||
        a.nomeEmpresa.localeCompare(b.nomeEmpresa, 'pt-BR', { sensitivity: 'base' }),
    )
}

export function proporcaoContratada(categoria: Pick<ResumoCategoriaOrcamentoDto, 'orcado' | 'contratado'>): number {
  if (categoria.contratado <= 0) {
    return 0
  }
  if (categoria.orcado <= 0) {
    return 1
  }
  return Math.min(categoria.contratado / categoria.orcado, 1)
}

export interface ProporcoesPagamento {
  pago: number
  aPagar: number
  livre: number
}

export function proporcoesPagamento(orcado: number, contratado: number, pago: number): ProporcoesPagamento {
  const orcadoCentavos = Math.max(paraCentavos(orcado), 0)
  const contratadoCentavos = Math.max(paraCentavos(contratado), 0)
  const pagoCentavos = Math.min(Math.max(paraCentavos(pago), 0), contratadoCentavos)
  const baseCentavos = Math.max(orcadoCentavos, contratadoCentavos)
  if (baseCentavos === 0) {
    return { pago: 0, aPagar: 0, livre: 0 }
  }
  return {
    pago: pagoCentavos / baseCentavos,
    aPagar: (contratadoCentavos - pagoCentavos) / baseCentavos,
    livre: (baseCentavos - contratadoCentavos) / baseCentavos,
  }
}

export function excedenteOrcamento(categoria: Pick<ResumoCategoriaOrcamentoDto, 'orcado' | 'contratado'>): number {
  return categoria.orcado > 0 && categoria.contratado > categoria.orcado
    ? Math.round((categoria.contratado - categoria.orcado) * 100) / 100
    : 0
}

export function valorValido(valor: number | null | undefined): boolean {
  if (valor === null || valor === undefined) {
    return true
  }
  return (
    Number.isFinite(valor) &&
    valor >= 0 &&
    valor <= LIMITES_VINCULO.valorMaximo &&
    Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6
  )
}

export const regraValor: RegraValidacao = (valor) =>
  valorValido(typeof valor === 'number' ? valor : null) ? null : TEXTOS_FORNECEDORES_EVENTO.erroValor

export const regraFornecedor: RegraValidacao = (valor) =>
  typeof valor === 'string' && valor !== '' ? null : TEXTOS_FORNECEDORES_EVENTO.erroFornecedorObrigatorio

export function regraValorContratado(status: () => StatusFornecedorEvento): RegraValidacao {
  return (valor) => {
    if (!valorValido(typeof valor === 'number' ? valor : null)) {
      return TEXTOS_FORNECEDORES_EVENTO.erroValor
    }
    return status() === 'Contratado' && (valor === null || valor === undefined)
      ? TEXTOS_FORNECEDORES_EVENTO.erroContratadoSemValor
      : null
  }
}

export function calcularResumoLocal(vinculos: FornecedorEventoDto[], anterior?: ResumoOrcamentoDto | null): ResumoOrcamentoDto {
  const considerados = vinculos.filter((vinculo) => vinculo.status !== 'Cancelado')
  const vencidoAnterior = new Map((anterior?.categorias ?? []).map((categoria) => [categoria.categoria, categoria.vencido ?? 0]))
  const categorias = CATEGORIAS_FORNECEDOR.map((categoria) => {
    const daCategoria = considerados.filter((vinculo) => vinculo.fornecedor.categoria === categoria)
    const contratados = daCategoria.filter((vinculo) => vinculo.status === 'Contratado')
    const contratadoCentavos = contratados.reduce((total, vinculo) => total + paraCentavos(vinculo.valorContratado), 0)
    const pagoCentavos = contratados.reduce((total, vinculo) => total + paraCentavos(vinculo.parcelas?.pago), 0)
    return {
      categoria,
      quantidade: daCategoria.length,
      contratados: contratados.length,
      orcado: somar(daCategoria.map((vinculo) => vinculo.valorOrcado ?? 0)),
      contratado: deCentavos(contratadoCentavos),
      pago: deCentavos(pagoCentavos),
      pendente: deCentavos(Math.max(contratadoCentavos - pagoCentavos, 0)),
      vencido: contratados.length > 0 ? (vencidoAnterior.get(categoria) ?? 0) : 0,
      parcelado: deCentavos(contratados.reduce((total, vinculo) => total + paraCentavos(vinculo.parcelas?.parcelado), 0)),
    }
  }).filter((categoria) => categoria.quantidade > 0)

  return {
    categorias,
    totalOrcado: somar(categorias.map((categoria) => categoria.orcado)),
    totalContratado: somar(categorias.map((categoria) => categoria.contratado)),
    quantidadeFornecedores: considerados.length,
    quantidadeContratados: categorias.reduce((total, categoria) => total + categoria.contratados, 0),
    totalPago: somar(categorias.map((categoria) => categoria.pago)),
    totalPendente: somar(categorias.map((categoria) => categoria.pendente)),
    totalVencido: somar(categorias.map((categoria) => categoria.vencido)),
    totalParcelado: somar(categorias.map((categoria) => categoria.parcelado)),
  }
}

function somar(valores: number[]): number {
  return Math.round(valores.reduce((total, valor) => total + Math.round(valor * 100), 0)) / 100
}
