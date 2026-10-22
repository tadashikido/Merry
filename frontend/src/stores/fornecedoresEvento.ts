import { ref } from 'vue'
import { defineStore } from 'pinia'

import { ErroApi, requisitar, requisitarArquivo } from '@/servicos/clienteHttp'
import {
  interpretarFalhaEvento,
  ROTA_EVENTOS,
  type FalhaEvento,
  type ResultadoEvento,
} from '@/stores/eventos'
import { TEXTOS_CONTRATO } from '@/textos/fornecedoresEvento'
import type { EventoResumoDto } from '@/tipos/eventos'
import type {
  AtualizarFornecedorEventoRequest,
  FornecedorEventoDto,
  ListaFornecedoresEventoDto,
  ResultadoImportacaoFornecedoresDto,
  VincularFornecedorRequest,
} from '@/tipos/fornecedoresEvento'
import { baixarBlob } from '@/utilitarios/arquivo'
import { calcularResumoLocal } from '@/utilitarios/fornecedoresEvento'

export function caminhoFornecedoresEvento(eventoId: string, vinculoId?: string, acao?: 'contrato' | 'importacao'): string {
  const base = `${ROTA_EVENTOS}/${encodeURIComponent(eventoId)}/fornecedores`
  const comVinculo = vinculoId ? `${base}/${encodeURIComponent(vinculoId)}` : base
  return acao ? `${comVinculo}/${acao}` : comVinculo
}

export function interpretarFalhaFornecedorEvento(erro: unknown): FalhaEvento {
  if (erro instanceof ErroApi && erro.status === 413) {
    return { tipo: 'regra', mensagem: TEXTOS_CONTRATO.erroTamanho, errosCampos: {} }
  }
  if (erro instanceof ErroApi && erro.status === 429) {
    return { tipo: 'regra', mensagem: TEXTOS_CONTRATO.erroLimite, errosCampos: {} }
  }
  return interpretarFalhaEvento(erro)
}

async function executar<T>(acao: () => Promise<T>): Promise<ResultadoEvento<T>> {
  try {
    return { ok: true, valor: await acao() }
  } catch (erro) {
    return { ok: false, falha: interpretarFalhaFornecedorEvento(erro) }
  }
}

export const useFornecedoresEventoStore = defineStore('fornecedoresEvento', () => {
  const eventoId = ref<string | null>(null)
  const lista = ref<ListaFornecedoresEventoDto | null>(null)
  const carregando = ref(false)
  const falha = ref<FalhaEvento | null>(null)

  async function carregar(id: string): Promise<void> {
    if (eventoId.value !== id) {
      lista.value = null
    }
    eventoId.value = id
    carregando.value = true
    falha.value = null

    try {
      const resposta = await requisitar<ListaFornecedoresEventoDto>(caminhoFornecedoresEvento(id))
      if (eventoId.value === id) {
        lista.value = resposta
      }
    } catch (erro) {
      if (eventoId.value === id) {
        lista.value = null
        falha.value = interpretarFalhaFornecedorEvento(erro)
      }
    } finally {
      if (eventoId.value === id) {
        carregando.value = false
      }
    }
  }

  function sincronizar(id: string, vinculo: FornecedorEventoDto) {
    if (eventoId.value !== id || !lista.value) {
      return
    }
    const existe = lista.value.vinculos.some((item) => item.id === vinculo.id)
    const vinculos = existe
      ? lista.value.vinculos.map((item) => (item.id === vinculo.id ? vinculo : item))
      : [...lista.value.vinculos, vinculo]
    lista.value = { ...lista.value, vinculos, resumo: calcularResumoLocal(vinculos, lista.value.resumo) }
  }

  function retirar(id: string, vinculoId: string) {
    if (eventoId.value !== id || !lista.value) {
      return
    }
    const vinculos = lista.value.vinculos.filter((item) => item.id !== vinculoId)
    lista.value = { ...lista.value, vinculos, resumo: calcularResumoLocal(vinculos, lista.value.resumo) }
  }

  function obter(id: string, vinculoId: string): Promise<ResultadoEvento<FornecedorEventoDto>> {
    return executar(() => requisitar<FornecedorEventoDto>(caminhoFornecedoresEvento(id, vinculoId)))
  }

  async function vincular(id: string, dados: VincularFornecedorRequest): Promise<ResultadoEvento<FornecedorEventoDto>> {
    const resultado = await executar(() =>
      requisitar<FornecedorEventoDto>(caminhoFornecedoresEvento(id), { metodo: 'POST', corpo: dados }),
    )
    if (resultado.ok) {
      sincronizar(id, resultado.valor)
    }
    return resultado
  }

  async function atualizar(
    id: string,
    vinculoId: string,
    dados: AtualizarFornecedorEventoRequest,
  ): Promise<ResultadoEvento<FornecedorEventoDto>> {
    const resultado = await executar(() =>
      requisitar<FornecedorEventoDto>(caminhoFornecedoresEvento(id, vinculoId), { metodo: 'PUT', corpo: dados }),
    )
    if (resultado.ok) {
      sincronizar(id, resultado.valor)
    }
    return resultado
  }

  async function remover(id: string, vinculoId: string): Promise<ResultadoEvento<null>> {
    const resultado = await executar(() =>
      requisitar<void>(caminhoFornecedoresEvento(id, vinculoId), { metodo: 'DELETE' }),
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
  ): Promise<ResultadoEvento<FornecedorEventoDto>> {
    const corpo = new FormData()
    corpo.append('arquivo', arquivo, arquivo.name)
    const resultado = await executar(() =>
      requisitar<FornecedorEventoDto>(caminhoFornecedoresEvento(id, vinculoId, 'contrato'), {
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

  async function removerContrato(id: string, vinculoId: string): Promise<ResultadoEvento<FornecedorEventoDto>> {
    const resultado = await executar(() =>
      requisitar<FornecedorEventoDto>(caminhoFornecedoresEvento(id, vinculoId, 'contrato'), { metodo: 'DELETE' }),
    )
    if (resultado.ok) {
      sincronizar(id, resultado.valor)
    }
    return resultado
  }

  async function baixarContrato(id: string, vinculo: FornecedorEventoDto): Promise<ResultadoEvento<null>> {
    const resultado = await executar(() =>
      requisitarArquivo(caminhoFornecedoresEvento(id, vinculo.id, 'contrato'), { tempoLimiteMs: 60_000 }),
    )
    if (!resultado.ok) {
      return resultado
    }
    baixarBlob(vinculo.contrato?.nomeArquivo ?? resultado.valor.nomeArquivo ?? 'contrato.pdf', resultado.valor.conteudo)
    return { ok: true, valor: null }
  }

  async function importar(id: string, eventoOrigemId: string): Promise<ResultadoEvento<ResultadoImportacaoFornecedoresDto>> {
    const resultado = await executar(() =>
      requisitar<ResultadoImportacaoFornecedoresDto>(caminhoFornecedoresEvento(id, undefined, 'importacao'), {
        metodo: 'POST',
        corpo: { eventoOrigemId },
      }),
    )
    if (resultado.ok && resultado.valor.importados > 0) {
      await carregar(id)
    }
    return resultado
  }

  async function listarEventosOrigem(id: string): Promise<ResultadoEvento<EventoResumoDto[]>> {
    return executar(async () => {
      const [ativos, arquivados] = await Promise.all([
        requisitar<EventoResumoDto[]>(`${ROTA_EVENTOS}?situacao=Ativos`),
        requisitar<EventoResumoDto[]>(`${ROTA_EVENTOS}?situacao=Arquivados`),
      ])
      return [...ativos, ...arquivados]
        .filter((evento) => evento.id !== id)
        .sort((a, b) => b.data.localeCompare(a.data))
    })
  }

  function limpar() {
    eventoId.value = null
    lista.value = null
    carregando.value = false
    falha.value = null
  }

  return {
    eventoId,
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
    listarEventosOrigem,
    limpar,
  }
})
