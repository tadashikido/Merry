import { ref } from 'vue'
import { defineStore } from 'pinia'

import { ErroApi, requisitar, requisitarArquivo } from '@/servicos/clienteHttp'
import {
  interpretarFalhaCasamento,
  ROTA_CASAMENTOS,
  type FalhaCasamento,
  type ResultadoCasamento,
} from '@/stores/casamentos'
import { TEXTOS_CONTRATO } from '@/textos/fornecedoresCasamento'
import type { CasamentoResumoDto } from '@/tipos/casamentos'
import type {
  AtualizarFornecedorCasamentoRequest,
  FornecedorCasamentoDto,
  ListaFornecedoresCasamentoDto,
  ResultadoImportacaoFornecedoresDto,
  VincularFornecedorRequest,
} from '@/tipos/fornecedoresCasamento'
import { baixarBlob } from '@/utilitarios/arquivo'
import { calcularResumoLocal } from '@/utilitarios/fornecedoresCasamento'

export function caminhoFornecedoresCasamento(casamentoId: string, vinculoId?: string, acao?: 'contrato' | 'importacao'): string {
  const base = `${ROTA_CASAMENTOS}/${encodeURIComponent(casamentoId)}/fornecedores`
  const comVinculo = vinculoId ? `${base}/${encodeURIComponent(vinculoId)}` : base
  return acao ? `${comVinculo}/${acao}` : comVinculo
}

export function interpretarFalhaFornecedorCasamento(erro: unknown): FalhaCasamento {
  if (erro instanceof ErroApi && erro.status === 413) {
    return { tipo: 'regra', mensagem: TEXTOS_CONTRATO.erroTamanho, errosCampos: {} }
  }
  if (erro instanceof ErroApi && erro.status === 429) {
    return { tipo: 'regra', mensagem: TEXTOS_CONTRATO.erroLimite, errosCampos: {} }
  }
  return interpretarFalhaCasamento(erro)
}

async function executar<T>(acao: () => Promise<T>): Promise<ResultadoCasamento<T>> {
  try {
    return { ok: true, valor: await acao() }
  } catch (erro) {
    return { ok: false, falha: interpretarFalhaFornecedorCasamento(erro) }
  }
}

export const useFornecedoresCasamentoStore = defineStore('fornecedoresCasamento', () => {
  const casamentoId = ref<string | null>(null)
  const lista = ref<ListaFornecedoresCasamentoDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaCasamento | null>(null)

  async function carregar(id: string): Promise<void> {
    if (casamentoId.value !== id) {
      lista.value = null
    }
    casamentoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<ListaFornecedoresCasamentoDto>(caminhoFornecedoresCasamento(id))
      if (casamentoId.value === id) {
        lista.value = resposta
      }
    } catch (erro) {
      if (casamentoId.value === id) {
        lista.value = null
        falha.value = interpretarFalhaFornecedorCasamento(erro)
      }
    } finally {
      if (casamentoId.value === id) {
        carregando.value = false
      }
    }
  }

  function sincronizar(id: string, vinculo: FornecedorCasamentoDto) {
    if (casamentoId.value !== id || !lista.value) {
      return
    }
    const existe = lista.value.vinculos.some((item) => item.id === vinculo.id)
    const vinculos = existe
      ? lista.value.vinculos.map((item) => (item.id === vinculo.id ? vinculo : item))
      : [...lista.value.vinculos, vinculo]
    lista.value = { ...lista.value, vinculos, resumo: calcularResumoLocal(vinculos, lista.value.resumo) }
  }

  function retirar(id: string, vinculoId: string) {
    if (casamentoId.value !== id || !lista.value) {
      return
    }
    const vinculos = lista.value.vinculos.filter((item) => item.id !== vinculoId)
    lista.value = { ...lista.value, vinculos, resumo: calcularResumoLocal(vinculos, lista.value.resumo) }
  }

  function obter(id: string, vinculoId: string): Promise<ResultadoCasamento<FornecedorCasamentoDto>> {
    return executar(() => requisitar<FornecedorCasamentoDto>(caminhoFornecedoresCasamento(id, vinculoId)))
  }

  async function vincular(id: string, dados: VincularFornecedorRequest): Promise<ResultadoCasamento<FornecedorCasamentoDto>> {
    const resultado = await executar(() =>
      requisitar<FornecedorCasamentoDto>(caminhoFornecedoresCasamento(id), { metodo: 'POST', corpo: dados }),
    )
    if (resultado.ok) {
      sincronizar(id, resultado.valor)
    }
    return resultado
  }

  async function atualizar(
    id: string,
    vinculoId: string,
    dados: AtualizarFornecedorCasamentoRequest,
  ): Promise<ResultadoCasamento<FornecedorCasamentoDto>> {
    const resultado = await executar(() =>
      requisitar<FornecedorCasamentoDto>(caminhoFornecedoresCasamento(id, vinculoId), { metodo: 'PUT', corpo: dados }),
    )
    if (resultado.ok) {
      sincronizar(id, resultado.valor)
    }
    return resultado
  }

  async function remover(id: string, vinculoId: string): Promise<ResultadoCasamento<null>> {
    const resultado = await executar(() =>
      requisitar<void>(caminhoFornecedoresCasamento(id, vinculoId), { metodo: 'DELETE' }),
    )
    if (!resultado.ok) {
      return resultado
    }
    retirar(id, vinculoId)
    return { ok: true, valor: null }
  }

  async function enviarContrato(
    id: string,
    vinculoId: string,
    arquivo: File,
  ): Promise<ResultadoCasamento<FornecedorCasamentoDto>> {
    const corpo = new FormData()
    corpo.append('arquivo', arquivo, arquivo.name)
    const resultado = await executar(() =>
      requisitar<FornecedorCasamentoDto>(caminhoFornecedoresCasamento(id, vinculoId, 'contrato'), {
        metodo: 'PUT',
        corpo,
        tempoLimiteMs: 60_000,
      }),
    )
    if (resultado.ok) {
      sincronizar(id, resultado.valor)
    }
    return resultado
  }

  async function removerContrato(id: string, vinculoId: string): Promise<ResultadoCasamento<FornecedorCasamentoDto>> {
    const resultado = await executar(() =>
      requisitar<FornecedorCasamentoDto>(caminhoFornecedoresCasamento(id, vinculoId, 'contrato'), { metodo: 'DELETE' }),
    )
    if (resultado.ok) {
      sincronizar(id, resultado.valor)
    }
    return resultado
  }

  async function baixarContrato(id: string, vinculo: FornecedorCasamentoDto): Promise<ResultadoCasamento<null>> {
    const resultado = await executar(() =>
      requisitarArquivo(caminhoFornecedoresCasamento(id, vinculo.id, 'contrato'), { tempoLimiteMs: 60_000 }),
    )
    if (!resultado.ok) {
      return resultado
    }
    baixarBlob(vinculo.contrato?.nomeArquivo ?? resultado.valor.nomeArquivo ?? 'contrato.pdf', resultado.valor.conteudo)
    return { ok: true, valor: null }
  }

  async function importar(id: string, casamentoOrigemId: string): Promise<ResultadoCasamento<ResultadoImportacaoFornecedoresDto>> {
    const resultado = await executar(() =>
      requisitar<ResultadoImportacaoFornecedoresDto>(caminhoFornecedoresCasamento(id, undefined, 'importacao'), {
        metodo: 'POST',
        corpo: { casamentoOrigemId },
      }),
    )
    if (resultado.ok && resultado.valor.importados > 0) {
      await carregar(id)
    }
    return resultado
  }

  async function listarCasamentosOrigem(id: string): Promise<ResultadoCasamento<CasamentoResumoDto[]>> {
    return executar(async () => {
      const [ativos, arquivados] = await Promise.all([
        requisitar<CasamentoResumoDto[]>(`${ROTA_CASAMENTOS}?situacao=Ativos`),
        requisitar<CasamentoResumoDto[]>(`${ROTA_CASAMENTOS}?situacao=Arquivados`),
      ])
      return [...ativos, ...arquivados]
        .filter((casamento) => casamento.id !== id)
        .sort((a, b) => b.data.localeCompare(a.data))
    })
  }

  function limpar() {
    casamentoId.value = null
    lista.value = null
    carregando.value = false
    falha.value = null
  }

  return {
    casamentoId,
    lista,
    carregando,
    falha,
    carregar,
    obter,
    vincular,
    atualizar,
    remover,
    enviarContrato,
    removerContrato,
    baixarContrato,
    importar,
    listarCasamentosOrigem,
    limpar,
  }
})
