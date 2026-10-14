import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ErroApi, registrarProvedorAutenticacao, requisitar } from '@/servicos/clienteHttp'
import type { ConviteAcessoCasalDto } from '@/tipos/acessoCasal'
import type {
  CadastroOrganizacaoRequest,
  EntrarRequest,
  SessaoDto,
  SolicitacaoRecuperacaoDto,
  UsuarioAutenticadoDto,
} from '@/tipos/api'

export const ROTAS_AUTENTICACAO = {
  cadastro: '/api/autenticacao/cadastro',
  entrar: '/api/autenticacao/entrar',
  renovar: '/api/autenticacao/renovar',
  sair: '/api/autenticacao/sair',
  eu: '/api/autenticacao/eu',
  esqueciSenha: '/api/autenticacao/esqueci-senha',
  redefinirSenha: '/api/autenticacao/redefinir-senha',
  consultarConviteCasal: '/api/acesso-casal/consulta',
  aceitarConviteCasal: '/api/acesso-casal/aceite',
} as const

export const PAPEL_CASAL = 'Casal'
export const DETALHE_CONVITE_CASAL_INVALIDO = 'Este convite não vale mais.'

export const NOME_TRAVA_RENOVACAO = 'casamento-renovacao-sessao'
export const DETALHE_LINK_INVALIDO = 'Link de redefinição inválido ou expirado.'

export type AvisoEntrada = 'sessaoTerminou' | 'saiu' | 'senhaRedefinida'

export type TipoFalha = 'credenciais' | 'limite' | 'conexao' | 'conflito' | 'linkInvalido' | 'validacao' | 'inesperado'

export type ResultadoAcao = { ok: true } | { ok: false; tipo: TipoFalha; errosCampos: Record<string, string> }

export type ResultadoConsultaConvite = { ok: true; convite: ConviteAcessoCasalDto } | { ok: false; tipo: TipoFalha }

export function interpretarFalhaConviteCasal(falha: unknown): Extract<ResultadoAcao, { ok: false }> {
  if (falha instanceof ErroApi && falha.status === 422) {
    const detalhe = falha.detalhes?.detail ?? falha.message
    return detalhe === DETALHE_CONVITE_CASAL_INVALIDO
      ? { ok: false, tipo: 'linkInvalido', errosCampos: {} }
      : { ok: false, tipo: 'validacao', errosCampos: { senha: detalhe } }
  }
  return interpretarFalha(falha)
}

function nomeCampo(chave: string): string {
  const semPrefixo = chave.replace(/^\$\./, '')
  return semPrefixo.charAt(0).toLowerCase() + semPrefixo.slice(1)
}

export function interpretarFalha(falha: unknown): Extract<ResultadoAcao, { ok: false }> {
  if (!(falha instanceof ErroApi)) {
    return { ok: false, tipo: 'inesperado', errosCampos: {} }
  }

  const errosCampos: Record<string, string> = {}
  for (const [chave, mensagens] of Object.entries(falha.detalhes?.errors ?? {})) {
    const primeira = mensagens[0]
    if (primeira) {
      errosCampos[nomeCampo(chave)] = primeira
    }
  }

  switch (falha.status) {
    case 0:
      return { ok: false, tipo: 'conexao', errosCampos }
    case 400:
      return { ok: false, tipo: Object.keys(errosCampos).length > 0 ? 'validacao' : 'inesperado', errosCampos }
    case 401:
      return { ok: false, tipo: 'credenciais', errosCampos }
    case 409:
      return { ok: false, tipo: 'conflito', errosCampos }
    case 422:
      return falha.detalhes?.detail === DETALHE_LINK_INVALIDO
        ? { ok: false, tipo: 'linkInvalido', errosCampos }
        : { ok: false, tipo: 'validacao', errosCampos: { novaSenha: falha.detalhes?.detail ?? falha.message, ...errosCampos } }
    case 429:
      return { ok: false, tipo: 'limite', errosCampos }
    default:
      return { ok: false, tipo: 'inesperado', errosCampos }
  }
}

async function executarComTrava<T>(acao: () => Promise<T>): Promise<T> {
  const travas = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (travas && typeof travas.request === 'function') {
    return travas.request(NOME_TRAVA_RENOVACAO, acao)
  }
  return acao()
}

export const useAutenticacaoStore = defineStore('autenticacao', () => {
  const usuario = ref<UsuarioAutenticadoDto | null>(null)
  const tokenAcesso = ref<string | null>(null)
  const expiraEm = ref<string | null>(null)
  const sessaoVerificada = ref(false)
  const avisoEntrada = ref<AvisoEntrada | null>(null)
  const emailInformado = ref('')

  const autenticado = computed(() => tokenAcesso.value !== null && usuario.value !== null)
  const ehCasal = computed(() => autenticado.value && usuario.value?.papel === PAPEL_CASAL)
  const casamentoDoCasal = computed(() => (ehCasal.value ? (usuario.value?.casamentoId ?? null) : null))

  let renovacaoEmAndamento: Promise<boolean> | null = null

  function aplicarSessao(sessao: SessaoDto) {
    tokenAcesso.value = sessao.tokenAcesso
    expiraEm.value = sessao.expiraEm
    usuario.value = sessao.usuario
    sessaoVerificada.value = true
    avisoEntrada.value = null
  }

  function limparSessao() {
    tokenAcesso.value = null
    expiraEm.value = null
    usuario.value = null
  }

  function renovar(): Promise<boolean> {
    if (renovacaoEmAndamento) {
      return renovacaoEmAndamento
    }

    renovacaoEmAndamento = executarComTrava(async () => {
      try {
        aplicarSessao(await requisitar<SessaoDto>(ROTAS_AUTENTICACAO.renovar, { metodo: 'POST', anonima: true }))
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
    }).finally(() => {
      renovacaoEmAndamento = null
    })

    return renovacaoEmAndamento
  }

  registrarProvedorAutenticacao({
    obterToken: () => tokenAcesso.value,
    renovar,
  })

  async function garantirSessaoVerificada(): Promise<void> {
    if (sessaoVerificada.value) {
      return
    }
    await renovar()
  }

  async function entrar(dados: EntrarRequest): Promise<ResultadoAcao> {
    try {
      aplicarSessao(await requisitar<SessaoDto>(ROTAS_AUTENTICACAO.entrar, { metodo: 'POST', corpo: dados, anonima: true }))
      return { ok: true }
    } catch (falha) {
      return interpretarFalha(falha)
    }
  }

  async function cadastrar(dados: CadastroOrganizacaoRequest): Promise<ResultadoAcao> {
    try {
      aplicarSessao(await requisitar<SessaoDto>(ROTAS_AUTENTICACAO.cadastro, { metodo: 'POST', corpo: dados, anonima: true }))
      return { ok: true }
    } catch (falha) {
      return interpretarFalha(falha)
    }
  }

  async function sair(): Promise<void> {
    await requisitar<void>(ROTAS_AUTENTICACAO.sair, { metodo: 'POST', anonima: true }).catch(() => undefined)
    avisoEntrada.value = 'saiu'
    limparSessao()
  }

  async function carregarUsuario(): Promise<ResultadoAcao> {
    try {
      usuario.value = await requisitar<UsuarioAutenticadoDto>(ROTAS_AUTENTICACAO.eu)
      return { ok: true }
    } catch (falha) {
      return interpretarFalha(falha)
    }
  }

  async function solicitarRecuperacao(email: string): Promise<ResultadoAcao> {
    try {
      await requisitar<SolicitacaoRecuperacaoDto>(ROTAS_AUTENTICACAO.esqueciSenha, { metodo: 'POST', corpo: { email }, anonima: true })
      return { ok: true }
    } catch (falha) {
      return interpretarFalha(falha)
    }
  }

  async function redefinirSenha(token: string, novaSenha: string): Promise<ResultadoAcao> {
    try {
      await requisitar<void>(ROTAS_AUTENTICACAO.redefinirSenha, { metodo: 'POST', corpo: { token, novaSenha }, anonima: true })
      limparSessao()
      avisoEntrada.value = 'senhaRedefinida'
      return { ok: true }
    } catch (falha) {
      return interpretarFalha(falha)
    }
  }

  async function consultarConviteCasal(token: string): Promise<ResultadoConsultaConvite> {
    try {
      const convite = await requisitar<ConviteAcessoCasalDto>(ROTAS_AUTENTICACAO.consultarConviteCasal, {
        metodo: 'POST',
        corpo: { token },
        anonima: true,
      })
      return { ok: true, convite }
    } catch (falha) {
      return { ok: false, tipo: interpretarFalhaConviteCasal(falha).tipo }
    }
  }

  async function aceitarConviteCasal(token: string, senha: string): Promise<ResultadoAcao> {
    try {
      aplicarSessao(
        await requisitar<SessaoDto>(ROTAS_AUTENTICACAO.aceitarConviteCasal, { metodo: 'POST', corpo: { token, senha }, anonima: true }),
      )
      return { ok: true }
    } catch (falha) {
      return interpretarFalhaConviteCasal(falha)
    }
  }

  function consumirAviso(): AvisoEntrada | null {
    const aviso = avisoEntrada.value
    avisoEntrada.value = null
    return aviso
  }

  return {
    usuario,
    tokenAcesso,
    expiraEm,
    sessaoVerificada,
    avisoEntrada,
    emailInformado,
    autenticado,
    ehCasal,
    casamentoDoCasal,
    garantirSessaoVerificada,
    renovar,
    entrar,
    cadastrar,
    sair,
    carregarUsuario,
    solicitarRecuperacao,
    redefinirSenha,
    consultarConviteCasal,
    aceitarConviteCasal,
    consumirAviso,
  }
})
