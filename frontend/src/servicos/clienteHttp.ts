import { MENSAGEM_FALHA_CONEXAO, MENSAGEM_TEMPO_ESGOTADO } from '@/textos/mensagens'
import type { ProblemDetails } from '@/tipos/api'

export type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface OpcoesRequisicao {
  metodo?: MetodoHttp
  corpo?: unknown
  tempoLimiteMs?: number
  anonima?: boolean
}

export interface ProvedorAutenticacao {
  obterToken: () => string | null
  renovar: () => Promise<boolean>
}

export const TEMPO_LIMITE_PADRAO_MS = 10_000
export const CABECALHO_REQUISICAO = { nome: 'X-Requested-With', valor: 'XMLHttpRequest' } as const

let provedorAutenticacao: ProvedorAutenticacao | null = null

export function registrarProvedorAutenticacao(provedor: ProvedorAutenticacao | null): void {
  provedorAutenticacao = provedor
}

export class ErroApi extends Error {
  readonly status: number
  readonly detalhes: ProblemDetails | null

  constructor(mensagem: string, status: number, detalhes: ProblemDetails | null) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.detalhes = detalhes
  }
}

export function montarUrl(caminho: string, base: string = import.meta.env.VITE_API_URL ?? ''): string {
  const baseNormalizada = base.replace(/\/+$/, '')
  const caminhoNormalizado = caminho.startsWith('/') ? caminho : `/${caminho}`
  return `${baseNormalizada}${caminhoNormalizado}`
}

function ehProblemDetails(valor: unknown): valor is ProblemDetails {
  return typeof valor === 'object' && valor !== null && ('title' in valor || 'status' in valor)
}

async function lerProblemDetails(resposta: Response): Promise<ProblemDetails | null> {
  const tipoConteudo = resposta.headers.get('Content-Type') ?? ''
  if (!tipoConteudo.includes('json')) {
    return null
  }

  try {
    const corpo: unknown = await resposta.json()
    return ehProblemDetails(corpo) ? corpo : null
  } catch {
    return null
  }
}

export interface ArquivoRecebido {
  conteudo: Blob
  nomeArquivo: string | null
}

type LeitorResposta<T> = (resposta: Response) => Promise<T>

async function lerJson<T>(resposta: Response): Promise<T> {
  if (resposta.status === 204) {
    return undefined as T
  }
  return (await resposta.json()) as T
}

export function nomeArquivoDoCabecalho(cabecalho: string | null): string | null {
  if (!cabecalho) {
    return null
  }
  const codificado = /filename\*=UTF-8''([^;]+)/i.exec(cabecalho)
  if (codificado?.[1]) {
    try {
      return decodeURIComponent(codificado[1].trim())
    } catch {
      return null
    }
  }
  const simples = /filename="?([^";]+)"?/i.exec(cabecalho)
  return simples?.[1]?.trim() ?? null
}

async function lerArquivo(resposta: Response): Promise<ArquivoRecebido> {
  return {
    conteudo: await resposta.blob(),
    nomeArquivo: nomeArquivoDoCabecalho(resposta.headers.get('Content-Disposition')),
  }
}

async function executar<T>(
  caminho: string,
  opcoes: OpcoesRequisicao,
  podeRenovar: boolean,
  leitor: LeitorResposta<T> = lerJson,
  aceite = 'application/json',
): Promise<T> {
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), opcoes.tempoLimiteMs ?? TEMPO_LIMITE_PADRAO_MS)
  const cabecalhos: Record<string, string> = {
    Accept: aceite,
    [CABECALHO_REQUISICAO.nome]: CABECALHO_REQUISICAO.valor,
  }

  const corpoFormulario = opcoes.corpo instanceof FormData ? opcoes.corpo : null
  if (opcoes.corpo !== undefined && !corpoFormulario) {
    cabecalhos['Content-Type'] = 'application/json'
  }

  const token = opcoes.anonima ? null : (provedorAutenticacao?.obterToken() ?? null)
  if (token) {
    cabecalhos.Authorization = `Bearer ${token}`
  }

  let resposta: Response
  try {
    resposta = await fetch(montarUrl(caminho), {
      method: opcoes.metodo ?? 'GET',
      headers: cabecalhos,
      body: corpoFormulario ?? (opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo)),
      credentials: 'same-origin',
      signal: controlador.signal,
    })
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === 'AbortError') {
      throw new ErroApi(MENSAGEM_TEMPO_ESGOTADO, 0, null)
    }
    throw new ErroApi(MENSAGEM_FALHA_CONEXAO, 0, null)
  } finally {
    clearTimeout(temporizador)
  }

  if (resposta.status === 401 && podeRenovar && !opcoes.anonima && provedorAutenticacao) {
    const renovou = await provedorAutenticacao.renovar()
    if (renovou) {
      return executar<T>(caminho, opcoes, false, leitor, aceite)
    }
  }

  if (!resposta.ok) {
    const detalhes = await lerProblemDetails(resposta)
    throw new ErroApi(detalhes?.title ?? `A API respondeu com o status ${resposta.status}.`, resposta.status, detalhes)
  }

  try {
    return await leitor(resposta)
  } catch {
    throw new ErroApi(MENSAGEM_FALHA_CONEXAO, 0, null)
  }
}

export function requisitar<T>(caminho: string, opcoes: OpcoesRequisicao = {}): Promise<T> {
  return executar<T>(caminho, opcoes, true)
}

export function requisitarArquivo(caminho: string, opcoes: OpcoesRequisicao = {}): Promise<ArquivoRecebido> {
  return executar<ArquivoRecebido>(caminho, opcoes, true, lerArquivo, 'application/pdf, application/problem+json')
}
