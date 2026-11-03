import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ErroApi, requisitar, type ProvedorAutenticacao } from '@/servicos/clienteHttp'
import { MENSAGENS_OPERADOR } from '@/textos/operador'

export const ROTAS_OPERADOR = {
  entrar: '/api/operador/autenticacao/entrar',
  renovar: '/api/operador/autenticacao/renovar',
  sair: '/api/operador/autenticacao/sair',
  eu: '/api/operador/autenticacao/eu',
  alterarSenha: '/api/operador/autenticacao/alterar-senha',
} as const

export interface OperadorAutenticadoDto {
  id: string
  nome: string
  email: string
}

export interface SessaoOperadorDto {
  tokenAcesso: string
  expiraEm: string
  operador: OperadorAutenticadoDto
}

export interface EntrarOperadorRequest {
  email: string
  senha: string
}

export interface AlterarSenhaOperadorRequest {
  senhaAtual: string
  novaSenha: string
}

export type ResultadoAlteracaoSenha = { ok: true } | { ok: false; mensagem: string }

export type AvisoEntradaOperador = 'sessaoTerminou' | 'saiu'

export type TipoFalhaOperador = 'credenciais' | 'limite' | 'conexao' | 'inesperado'

export type ResultadoAcaoOperador = { ok: true } | { ok: false; tipo: TipoFalhaOperador }

function interpretarFalha(falha: unknown): Extract<ResultadoAcaoOperador, { ok: false }> {
  if (!(falha instanceof ErroApi)) {
    return { ok: false, tipo: 'inesperado' }
  }

  switch (falha.status) {
    case 0:
      return { ok: false, tipo: 'conexao' }
    case 401:
      return { ok: false, tipo: 'credenciais' }
    case 429:
      return { ok: false, tipo: 'limite' }
    default:
      return { ok: false, tipo: 'inesperado' }
  }
}

export const useOperadorAutenticacaoStore = defineStore('operadorAutenticacao', () => {
  const operador = ref<OperadorAutenticadoDto | null>(null)
  const tokenAcesso = ref<string | null>(null)
  const expiraEm = ref<string | null>(null)
  const sessaoVerificada = ref(false)
  const avisoEntrada = ref<AvisoEntradaOperador | null>(null)

  const autenticado = computed(() => tokenAcesso.value !== null && operador.value !== null)

  let renovacaoEmAndamento: Promise<boolean> | null = null

  function aplicarSessao(sessao: SessaoOperadorDto) {
    tokenAcesso.value = sessao.tokenAcesso
    expiraEm.value = sessao.expiraEm
    operador.value = sessao.operador
    sessaoVerificada.value = true
    avisoEntrada.value = null
  }

  function limparSessao() {
    tokenAcesso.value = null
    expiraEm.value = null
    operador.value = null
  }

  function renovar(): Promise<boolean> {
    if (renovacaoEmAndamento) {
      return renovacaoEmAndamento
    }

    renovacaoEmAndamento = (async () => {
      try {
        aplicarSessao(await requisitar<SessaoOperadorDto>(ROTAS_OPERADOR.renovar, { metodo: 'POST', anonima: true }))
        return true
      } catch (falha) {
        if (falha instanceof ErroApi && (falha.status === 401 || falha.status === 400)) {
          const tinhaSessao = autenticado.value
          limparSessao()
          if (tinhaSessao) {
            avisoEntrada.value = 'sessaoTerminou'
          }
        }
        return false
      } finally {
        sessaoVerificada.value = true
      }
    })().finally(() => {
      renovacaoEmAndamento = null
    })

    return renovacaoEmAndamento
  }

  const provedor: ProvedorAutenticacao = {
    obterToken: () => tokenAcesso.value,
    renovar,
  }

  async function garantirSessaoVerificada(): Promise<void> {
    if (sessaoVerificada.value) {
      return
    }
    await renovar()
  }

  async function entrar(dados: EntrarOperadorRequest): Promise<ResultadoAcaoOperador> {
    try {
      aplicarSessao(await requisitar<SessaoOperadorDto>(ROTAS_OPERADOR.entrar, { metodo: 'POST', corpo: dados, anonima: true }))
      return { ok: true }
    } catch (falha) {
      return interpretarFalha(falha)
    }
  }

  async function sair(): Promise<void> {
    await requisitar<void>(ROTAS_OPERADOR.sair, { metodo: 'POST', anonima: true }).catch(() => undefined)
    avisoEntrada.value = 'saiu'
    limparSessao()
  }

  async function carregarOperador(): Promise<ResultadoAcaoOperador> {
    try {
      operador.value = await requisitar<OperadorAutenticadoDto>(ROTAS_OPERADOR.eu, { provedor })
      return { ok: true }
    } catch (falha) {
      return interpretarFalha(falha)
    }
  }

  async function alterarSenha(dados: AlterarSenhaOperadorRequest): Promise<ResultadoAlteracaoSenha> {
    try {
      await requisitar<void>(ROTAS_OPERADOR.alterarSenha, { metodo: 'POST', corpo: dados, provedor })
      return { ok: true }
    } catch (falha) {
      if (falha instanceof ErroApi) {
        return { ok: false, mensagem: falha.status === 0 ? MENSAGENS_OPERADOR.conexao : falha.message }
      }
      return { ok: false, mensagem: MENSAGENS_OPERADOR.inesperado }
    }
  }

  function consumirAviso(): AvisoEntradaOperador | null {
    const aviso = avisoEntrada.value
    avisoEntrada.value = null
    return aviso
  }

  return {
    operador,
    tokenAcesso,
    expiraEm,
    sessaoVerificada,
    avisoEntrada,
    autenticado,
    garantirSessaoVerificada,
    renovar,
    entrar,
    sair,
    carregarOperador,
    alterarSenha,
    consumirAviso,
  }
})
