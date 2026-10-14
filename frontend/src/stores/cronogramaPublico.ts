import { ref } from 'vue'
import { defineStore } from 'pinia'

import { ErroApi, requisitar } from '@/servicos/clienteHttp'
import type { CronogramaPublicoDto } from '@/tipos/cronogramaPublico'
import { tokenCronogramaValido } from '@/utilitarios/cronogramaPublico'

export const ROTA_CRONOGRAMA_PUBLICO = '/api/cronograma-publico'

export type TipoFalhaCronogramaPublico = 'linkInativo' | 'muitasTentativas' | 'conexao' | 'inesperado'

export function interpretarFalhaCronogramaPublico(falha: unknown): TipoFalhaCronogramaPublico {
  if (!(falha instanceof ErroApi)) {
    return 'inesperado'
  }
  switch (falha.status) {
    case 0:
      return 'conexao'
    case 400:
    case 404:
      return 'linkInativo'
    case 429:
      return 'muitasTentativas'
    default:
      return 'inesperado'
  }
}

export const useCronogramaPublicoStore = defineStore('cronogramaPublico', () => {
  const dados = ref<CronogramaPublicoDto | null>(null)
  const carregadoEm = ref<Date | null>(null)
  const carregando = ref(false)
  const falha = ref<TipoFalhaCronogramaPublico | null>(null)
  const token = ref<string | null>(null)

  async function consultar(valor: string): Promise<void> {
    if (token.value !== valor) {
      dados.value = null
      carregadoEm.value = null
    }
    token.value = valor
    carregando.value = true
    falha.value = null

    if (!tokenCronogramaValido(valor)) {
      dados.value = null
      falha.value = 'linkInativo'
      carregando.value = false
      return
    }

    try {
      const resposta = await requisitar<CronogramaPublicoDto>(`${ROTA_CRONOGRAMA_PUBLICO}/consulta`, {
        metodo: 'POST',
        corpo: { token: valor },
        anonima: true,
      })
      if (token.value === valor) {
        dados.value = resposta
        carregadoEm.value = new Date()
      }
    } catch (erro) {
      if (token.value === valor) {
        const tipo = interpretarFalhaCronogramaPublico(erro)
        falha.value = tipo
        if (tipo === 'linkInativo') {
          dados.value = null
          carregadoEm.value = null
        }
      }
    } finally {
      if (token.value === valor) {
        carregando.value = false
      }
    }
  }

  function limpar() {
    dados.value = null
    carregadoEm.value = null
    carregando.value = false
    falha.value = null
    token.value = null
  }

  return { dados, carregadoEm, carregando, falha, consultar, limpar }
})
