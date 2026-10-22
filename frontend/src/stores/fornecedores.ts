import { ref } from 'vue'
import { defineStore } from 'pinia'

import { requisitar } from '@/servicos/clienteHttp'
import { interpretarFalhaEvento, type FalhaEvento, type ResultadoEvento } from '@/stores/eventos'
import type { FornecedorDto, FornecedorResumoDto, SalvarFornecedorRequest } from '@/tipos/fornecedores'
import type { ParticipacaoFornecedorDto } from '@/tipos/fornecedoresEvento'

export const ROTA_FORNECEDORES = '/api/fornecedores'

export function caminhoFornecedor(fornecedorId?: string, acao?: 'arquivar' | 'restaurar' | 'eventos'): string {
  if (!fornecedorId) {
    return ROTA_FORNECEDORES
  }
  const base = `${ROTA_FORNECEDORES}/${encodeURIComponent(fornecedorId)}`
  return acao ? `${base}/${acao}` : base
}

async function executar<T>(acao: () => Promise<T>): Promise<ResultadoEvento<T>> {
  try {
    return { ok: true, valor: await acao() }
  } catch (erro) {
    return { ok: false, falha: interpretarFalhaEvento(erro) }
  }
}

function paraResumo(fornecedor: FornecedorDto): FornecedorResumoDto {
  return {
    id: fornecedor.id,
    categoria: fornecedor.categoria,
    nomeEmpresa: fornecedor.nomeEmpresa,
    responsavel: fornecedor.responsavel,
    telefone: fornecedor.telefone,
    email: fornecedor.email,
    site: fornecedor.site,
    instagram: fornecedor.instagram,
    arquivado: fornecedor.arquivado,
    atualizadoEm: fornecedor.atualizadoEm,
  }
}

export const useFornecedoresStore = defineStore('fornecedores', () => {
  const lista = ref<FornecedorResumoDto[] | null>(null)
  const carregandoLista = ref(false)
  const falhaLista = ref<FalhaEvento | null>(null)

  const atual = ref<FornecedorDto | null>(null)
  const carregandoAtual = ref(false)
  const falhaAtual = ref<FalhaEvento | null>(null)

  const participacoesDe = ref<string | null>(null)
  const participacoes = ref<ParticipacaoFornecedorDto[] | null>(null)
  const carregandoParticipacoes = ref(false)
  const falhaParticipacoes = ref<FalhaEvento | null>(null)

  function sincronizar(fornecedor: FornecedorDto) {
    if (atual.value?.id === fornecedor.id || atual.value === null) {
      atual.value = fornecedor
    }
    if (!lista.value) {
      return
    }
    const resumo = paraResumo(fornecedor)
    const indice = lista.value.findIndex((item) => item.id === fornecedor.id)
    lista.value = indice >= 0 ? lista.value.map((item) => (item.id === fornecedor.id ? resumo : item)) : [...lista.value, resumo]
  }

  async function carregar(): Promise<void> {
    carregandoLista.value = true
    falhaLista.value = null
    try {
      lista.value = await requisitar<FornecedorResumoDto[]>(ROTA_FORNECEDORES)
    } catch (erro) {
      lista.value = null
      falhaLista.value = interpretarFalhaEvento(erro)
    } finally {
      carregandoLista.value = false
    }
  }

  async function carregarAtual(fornecedorId: string): Promise<void> {
    if (atual.value?.id !== fornecedorId) {
      atual.value = null
    }
    carregandoAtual.value = true
    falhaAtual.value = null
    try {
      atual.value = await requisitar<FornecedorDto>(caminhoFornecedor(fornecedorId))
    } catch (erro) {
      atual.value = null
      falhaAtual.value = interpretarFalhaEvento(erro)
    } finally {
      carregandoAtual.value = false
    }
  }

  async function carregarParticipacoes(fornecedorId: string): Promise<void> {
    if (participacoesDe.value !== fornecedorId) {
      participacoes.value = null
    }
    participacoesDe.value = fornecedorId
    carregandoParticipacoes.value = true
    falhaParticipacoes.value = null
    try {
      const resposta = await requisitar<ParticipacaoFornecedorDto[]>(caminhoFornecedor(fornecedorId, 'eventos'))
      if (participacoesDe.value === fornecedorId) {
        participacoes.value = resposta
      }
    } catch (erro) {
      if (participacoesDe.value === fornecedorId) {
        participacoes.value = null
        falhaParticipacoes.value = interpretarFalhaEvento(erro)
      }
    } finally {
      if (participacoesDe.value === fornecedorId) {
        carregandoParticipacoes.value = false
      }
    }
  }

  function obter(fornecedorId: string): Promise<ResultadoEvento<FornecedorDto>> {
    return executar(() => requisitar<FornecedorDto>(caminhoFornecedor(fornecedorId)))
  }

  async function criar(dados: SalvarFornecedorRequest): Promise<ResultadoEvento<FornecedorDto>> {
    const resultado = await executar(() =>
      requisitar<FornecedorDto>(ROTA_FORNECEDORES, { metodo: 'POST', corpo: dados }),
    )
    if (resultado.ok) {
      atual.value = resultado.valor
      sincronizar(resultado.valor)
    }
    return resultado
  }

  async function atualizar(fornecedorId: string, dados: SalvarFornecedorRequest): Promise<ResultadoEvento<FornecedorDto>> {
    const resultado = await executar(() =>
      requisitar<FornecedorDto>(caminhoFornecedor(fornecedorId), { metodo: 'PUT', corpo: dados }),
    )
    if (resultado.ok) {
      sincronizar(resultado.valor)
    }
    return resultado
  }

  async function alterarSituacao(
    fornecedorId: string,
    acao: 'arquivar' | 'restaurar',
  ): Promise<ResultadoEvento<FornecedorDto>> {
    const resultado = await executar(() =>
      requisitar<FornecedorDto>(caminhoFornecedor(fornecedorId, acao), { metodo: 'POST' }),
    )
    if (resultado.ok) {
      sincronizar(resultado.valor)
    }
    return resultado
  }

  function arquivar(fornecedorId: string): Promise<ResultadoEvento<FornecedorDto>> {
    return alterarSituacao(fornecedorId, 'arquivar')
  }

  function restaurar(fornecedorId: string): Promise<ResultadoEvento<FornecedorDto>> {
    return alterarSituacao(fornecedorId, 'restaurar')
  }

  async function remover(fornecedorId: string): Promise<ResultadoEvento<null>> {
    const resultado = await executar(() => requisitar<void>(caminhoFornecedor(fornecedorId), { metodo: 'DELETE' }))
    if (!resultado.ok) {
      return resultado
    }
    if (lista.value) {
      lista.value = lista.value.filter((fornecedor) => fornecedor.id !== fornecedorId)
    }
    if (atual.value?.id === fornecedorId) {
      atual.value = null
    }
    return { ok: true, valor: null }
  }

  function limpar() {
    lista.value = null
    carregandoLista.value = false
    falhaLista.value = null
    atual.value = null
    carregandoAtual.value = false
    falhaAtual.value = null
    participacoesDe.value = null
    participacoes.value = null
    carregandoParticipacoes.value = false
    falhaParticipacoes.value = null
  }

  return {
    lista,
    carregandoLista,
    falhaLista,
    atual,
    carregandoAtual,
    falhaAtual,
    participacoesDe,
    participacoes,
    carregandoParticipacoes,
    falhaParticipacoes,
    carregar,
    carregarParticipacoes,
    carregarAtual,
    obter,
    criar,
    atualizar,
    arquivar,
    restaurar,
    remover,
    limpar,
  }
})
