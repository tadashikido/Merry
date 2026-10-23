import type { DataCalendario } from '@/tipos/eventos'
import { diferencaEmDias } from '@/utilitarios/dataCalendario'

export interface DadosPrazoConfirmacao {
  data: DataCalendario
  diasRestantes: number
  dataLimiteRsvpEfetiva: DataCalendario
}

export interface PrazoConfirmacao {
  diasAntesDoEvento: number
  diasRestantes: number
  encerrado: boolean
}

export function calcularPrazoConfirmacao(dados: DadosPrazoConfirmacao): PrazoConfirmacao | null {
  const diasAntesDoEvento = diferencaEmDias(dados.dataLimiteRsvpEfetiva, dados.data)
  if (diasAntesDoEvento === null) {
    return null
  }
  const diasRestantes = dados.diasRestantes - diasAntesDoEvento
  return { diasAntesDoEvento, diasRestantes, encerrado: diasRestantes < 0 }
}
