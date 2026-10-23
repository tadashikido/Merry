import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type EventoResumoDto, type TipoEvento } from '@/tipos/eventos'
import { formatarNumero } from '@/utilitarios/formatacao'

export const JANELA_SEMANA_DIAS = 7
export const JANELA_MES_DIAS = 30

export interface QuantidadePorTipo {
  tipo: TipoEvento
  quantidade: number
}

export interface ResumoCarteira {
  pelaFrente: number
  proximos7Dias: number
  proximos30Dias: number
  realizados: number
  porTipo: QuantidadePorTipo[]
}

export function resumirCarteira(eventos: readonly EventoResumoDto[]): ResumoCarteira {
  const ativos = eventos.filter((evento) => !evento.arquivado)
  const futuros = ativos.filter((evento) => evento.diasRestantes >= 0)
  const porTipo = TIPOS_EVENTO.map((tipo) => ({
    tipo,
    quantidade: futuros.filter((evento) => evento.tipo === tipo).length,
  })).filter((item) => item.quantidade > 0)

  return {
    pelaFrente: futuros.length,
    proximos7Dias: futuros.filter((evento) => evento.diasRestantes <= JANELA_SEMANA_DIAS).length,
    proximos30Dias: futuros.filter((evento) => evento.diasRestantes <= JANELA_MES_DIAS).length,
    realizados: ativos.length - futuros.length,
    porTipo,
  }
}

export function descreverCarteiraPorTipo(porTipo: readonly QuantidadePorTipo[]): string {
  const partes = porTipo.map(({ tipo, quantidade }) => {
    const { singular, plural } = VOCABULARIO_TIPO_EVENTO[tipo].contagem
    return `${formatarNumero(quantidade)} ${quantidade === 1 ? singular : plural}`
  })
  const ultima = partes.pop() ?? ''
  return partes.length > 0 ? `${partes.join(', ')} e ${ultima}` : ultima
}
