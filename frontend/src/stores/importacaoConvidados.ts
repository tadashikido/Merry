import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { ErroApi, requisitar } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import {
  interpretarFalhaConvidados,
  rotaConvites,
  useConvidadosStore,
  type FalhaConvidados,
  type ResultadoConvidados,
} from '@/stores/convidados'
import { TEXTOS_IMPORTACAO } from '@/textos/importacaoConvidados'
import type { PreVisualizacaoImportacaoDto, ResultadoImportacaoDto } from '@/tipos/importacaoConvidados'

export const TEMPO_LIMITE_IMPORTACAO_MS = 30_000
export const CAMPO_ARQUIVO = 'arquivo'

export const STATUS_ARQUIVO_GRANDE = 413

export function interpretarFalhaImportacao(erro: unknown): FalhaConvidados {
  if (erro instanceof ErroApi && erro.status === STATUS_ARQUIVO_GRANDE) {
    return { tipo: 'regra', mensagem: erro.detalhes?.detail ?? TEXTOS_IMPORTACAO.erroTamanho, errosCampos: {} }
  }
  return interpretarFalhaConvidados(erro)
}

export function rotaImportacao(casamentoId: string, previa = false): string {
  const base = `${rotaConvites(casamentoId)}/importacao`
  return previa ? `${base}/pre-visualizacao` : base
}

export const useImportacaoConvidadosStore = defineStore('importacaoConvidados', () => {
  const casamentoId = ref<string | null>(null)
  const arquivo = ref<File | null>(null)
  const previa = ref<PreVisualizacaoImportacaoDto | null>(null)
  const resultado = ref<ResultadoImportacaoDto | null>(null)
  const enviando = ref(false)
  const importando = ref(false)
  const falha = ref<FalhaConvidados | null>(null)

  function montarFormulario(conteudo: File): FormData {
    const formulario = new FormData()
    formulario.append(CAMPO_ARQUIVO, conteudo, conteudo.name)
    return formulario
  }

  async function preVisualizar(id: string, conteudo: File): Promise<ResultadoConvidados<PreVisualizacaoImportacaoDto>> {
    casamentoId.value = id
    arquivo.value = conteudo
    previa.value = null
    resultado.value = null
    falha.value = null
    enviando.value = true

    try {
      const resposta = await requisitar<PreVisualizacaoImportacaoDto>(rotaImportacao(id, true), {
        metodo: 'POST',
        corpo: montarFormulario(conteudo),
        tempoLimiteMs: TEMPO_LIMITE_IMPORTACAO_MS,
      })
      if (casamentoId.value === id && arquivo.value === conteudo) {
        previa.value = resposta
      }
      return { ok: true, valor: resposta }
    } catch (erro) {
      const interpretada = interpretarFalhaImportacao(erro)
      if (casamentoId.value === id && arquivo.value === conteudo) {
        falha.value = interpretada
        arquivo.value = null
      }
      return { ok: false, falha: interpretada }
    } finally {
      if (casamentoId.value === id) {
        enviando.value = false
      }
    }
  }

  async function importar(somenteValidos: boolean): Promise<ResultadoConvidados<ResultadoImportacaoDto>> {
    const id = casamentoId.value
    const conteudo = arquivo.value
    const atual = previa.value
    if (!id || !conteudo || !atual) {
      return { ok: false, falha: { tipo: 'inesperado', mensagem: null, errosCampos: {} } }
    }

    const formulario = montarFormulario(conteudo)
    formulario.append('somenteValidos', String(somenteValidos))
    formulario.append('convitesEsperados', String(atual.resumo.convitesValidos))
    formulario.append('pessoasEsperadas', String(atual.resumo.pessoasValidas))

    importando.value = true
    falha.value = null
    try {
      const resposta = await requisitar<ResultadoImportacaoDto>(rotaImportacao(id), {
        metodo: 'POST',
        corpo: formulario,
        tempoLimiteMs: TEMPO_LIMITE_IMPORTACAO_MS,
      })
      resultado.value = resposta
      previa.value = null
      arquivo.value = null
      useConvidadosStore().invalidar(id)
      return { ok: true, valor: resposta }
    } catch (erro) {
      const interpretada = interpretarFalhaImportacao(erro)
      falha.value = interpretada
      return { ok: false, falha: interpretada }
    } finally {
      importando.value = false
    }
  }

  function limpar() {
    casamentoId.value = null
    arquivo.value = null
    previa.value = null
    resultado.value = null
    enviando.value = false
    importando.value = false
    falha.value = null
  }

  const autenticacao = useAutenticacaoStore()
  watch(
    () => autenticacao.usuario?.organizacao.id ?? null,
    (organizacaoAtual, organizacaoAnterior) => {
      if (organizacaoAtual !== organizacaoAnterior) {
        limpar()
      }
    },
  )

  return {
    casamentoId,
    arquivo,
    previa,
    resultado,
    enviando,
    importando,
    falha,
    preVisualizar,
    importar,
    limpar,
  }
})
