import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ErroApi, TEMPO_LIMITE_PADRAO_MS, montarUrl, requisitar } from '@/servicos/clienteHttp'
import { MENSAGEM_FALHA_CONEXAO, MENSAGEM_TEMPO_ESGOTADO } from '@/textos/mensagens'

function respostaJson(corpo: unknown, status = 200, tipoConteudo = 'application/json'): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': tipoConteudo } })
}

describe('montarUrl', () => {
  it('[UNITÁRIO] usa caminho relativo quando a base está vazia', () => {
    expect(montarUrl('/api/sistema/informacoes', '')).toBe('/api/sistema/informacoes')
  })

  it('[UNITÁRIO] junta base e caminho removendo barras duplicadas', () => {
    expect(montarUrl('/api/saude', 'https://api.evento.com.br/')).toBe('https://api.evento.com.br/api/saude')
    expect(montarUrl('api/saude', 'https://api.evento.com.br//')).toBe('https://api.evento.com.br/api/saude')
  })
})

describe('requisitar', () => {
  const fetchSimulado = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSimulado)
  })

  afterEach(() => {
    fetchSimulado.mockReset()
    vi.useRealTimers()
  })

  it('[UNITÁRIO] retorna o corpo JSON em caso de sucesso', async () => {
    fetchSimulado.mockResolvedValue(respostaJson({ nome: 'Evento', versao: '0.1.0' }))

    const resultado = await requisitar<{ nome: string; versao: string }>('/api/sistema/informacoes')

    expect(resultado).toEqual({ nome: 'Evento', versao: '0.1.0' })
    const [url, opcoes] = fetchSimulado.mock.calls[0] ?? []
    expect(url).toBe('/api/sistema/informacoes')
    expect(opcoes?.method).toBe('GET')
    expect(opcoes?.credentials).toBe('same-origin')
    expect(opcoes?.headers).toEqual({ Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' })
    expect(opcoes?.body).toBeUndefined()
  })

  it('[UNITÁRIO] serializa o corpo e envia Content-Type em requisições com corpo', async () => {
    fetchSimulado.mockResolvedValue(new Response(null, { status: 204 }))

    const resultado = await requisitar<undefined>('/api/recurso', { metodo: 'POST', corpo: { nome: 'Ana' } })

    expect(resultado).toBeUndefined()
    const [, opcoes] = fetchSimulado.mock.calls[0] ?? []
    expect(opcoes?.method).toBe('POST')
    expect(opcoes?.body).toBe(JSON.stringify({ nome: 'Ana' }))
    expect(opcoes?.headers).toEqual({ Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' })
  })

  it('[UNITÁRIO] converte ProblemDetails em ErroApi com status e detalhes', async () => {
    fetchSimulado.mockResolvedValue(
      respostaJson(
        { title: 'A operação viola uma regra de negócio.', status: 422, detail: 'Prazo encerrado.', traceId: 'abc' },
        422,
        'application/problem+json',
      ),
    )

    const erro = await requisitar('/api/recurso').catch((falha: unknown) => falha)

    expect(erro).toBeInstanceOf(ErroApi)
    const erroApi = erro as ErroApi
    expect(erroApi.status).toBe(422)
    expect(erroApi.message).toBe('A operação viola uma regra de negócio.')
    expect(erroApi.detalhes?.detail).toBe('Prazo encerrado.')
    expect(erroApi.detalhes?.traceId).toBe('abc')
  })

  it('[UNITÁRIO] usa mensagem genérica quando o erro não é ProblemDetails', async () => {
    fetchSimulado.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }))

    const erro = await requisitar('/api/recurso').catch((falha: unknown) => falha)

    expect(erro).toBeInstanceOf(ErroApi)
    expect((erro as ErroApi).status).toBe(502)
    expect((erro as ErroApi).message).toBe('A API respondeu com o status 502.')
    expect((erro as ErroApi).detalhes).toBeNull()
  })

  it('[UNITÁRIO] tolera JSON inválido em resposta de erro', async () => {
    fetchSimulado.mockResolvedValue(new Response('{invalido', { status: 500, headers: { 'Content-Type': 'application/json' } }))

    const erro = await requisitar('/api/recurso').catch((falha: unknown) => falha)

    expect((erro as ErroApi).status).toBe(500)
    expect((erro as ErroApi).detalhes).toBeNull()
  })

  it('[UNITÁRIO] simula falha de rede e retorna ErroApi com status 0', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'))

    const erro = await requisitar('/api/recurso').catch((falha: unknown) => falha)

    expect(erro).toBeInstanceOf(ErroApi)
    expect((erro as ErroApi).status).toBe(0)
    expect((erro as ErroApi).message).toBe(MENSAGEM_FALHA_CONEXAO)
  })

  it('[UNITÁRIO] aborta a requisição quando o tempo limite é excedido', async () => {
    vi.useFakeTimers()
    fetchSimulado.mockImplementation(
      (_url, opcoes) =>
        new Promise<Response>((_resolver, rejeitar) => {
          opcoes?.signal?.addEventListener('abort', () => rejeitar(new DOMException('Abortado', 'AbortError')))
        }),
    )

    const promessa = requisitar('/api/lenta').catch((falha: unknown) => falha)
    await vi.advanceTimersByTimeAsync(TEMPO_LIMITE_PADRAO_MS)
    const erro = await promessa

    expect(erro).toBeInstanceOf(ErroApi)
    expect((erro as ErroApi).message).toBe(MENSAGEM_TEMPO_ESGOTADO)
  })
})
