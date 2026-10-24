import { ehTipoEvento } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type DataCalendario, type EventoResumoDto, type TipoEvento } from '@/tipos/eventos'
import type { ParticipacaoFornecedorDto } from '@/tipos/fornecedoresEvento'
import type { QuantidadePorTipo } from '@/utilitarios/carteiraEventos'
import { resumirParticipacoes } from '@/utilitarios/fornecedoresEvento'

export interface ResumoAtuacaoFornecedor {
  total: number
  contratados: number
  pelaFrente: number
  proximo: ParticipacaoFornecedorDto | null
  ultimaAtuacao: DataCalendario | null
  porTipo: QuantidadePorTipo[]
  semTipo: number
  tiposConhecidos: boolean
}

export function tiposDasParticipacoes(
  participacoes: readonly ParticipacaoFornecedorDto[],
  eventos: readonly EventoResumoDto[] | null,
): Map<string, TipoEvento> {
  const tipos = new Map<string, TipoEvento>()
  if (!eventos) {
    return tipos
  }
  const tipoPorEvento = new Map<string, TipoEvento>()
  for (const evento of eventos) {
    if (ehTipoEvento(evento.tipo)) {
      tipoPorEvento.set(evento.id, evento.tipo)
    }
  }
  for (const participacao of participacoes) {
    const tipo = tipoPorEvento.get(participacao.eventoId)
    if (tipo) {
      tipos.set(participacao.eventoId, tipo)
    }
  }
  return tipos
}

export function resumirAtuacaoFornecedor(
  participacoes: readonly ParticipacaoFornecedorDto[],
  eventos: readonly EventoResumoDto[] | null,
  hoje: DataCalendario,
): ResumoAtuacaoFornecedor {
  const { total, contratados } = resumirParticipacoes([...participacoes], '', 0)
  const validas = participacoes.filter((participacao) => participacao.status !== 'Cancelado')

  const pelaFrente = validas
    .filter((participacao) => !participacao.eventoArquivado && participacao.dataEvento >= hoje)
    .sort((a, b) => a.dataEvento.localeCompare(b.dataEvento))

  const ultimaAtuacao = participacoes
    .filter((participacao) => participacao.status === 'Contratado' && participacao.dataEvento < hoje)
    .reduce<DataCalendario | null>(
      (maisRecente, participacao) =>
        maisRecente === null || participacao.dataEvento > maisRecente ? participacao.dataEvento : maisRecente,
      null,
    )

  const tipos = tiposDasParticipacoes(validas, eventos)
  const porTipo = TIPOS_EVENTO.map((tipo) => ({
    tipo,
    quantidade: validas.filter((participacao) => tipos.get(participacao.eventoId) === tipo).length,
  })).filter((item) => item.quantidade > 0)

  return {
    total,
    contratados,
    pelaFrente: pelaFrente.length,
    proximo: pelaFrente[0] ?? null,
    ultimaAtuacao,
    porTipo,
    semTipo: validas.length - validas.filter((participacao) => tipos.has(participacao.eventoId)).length,
    tiposConhecidos: eventos !== null && eventos.some((evento) => ehTipoEvento(evento.tipo)),
  }
}
