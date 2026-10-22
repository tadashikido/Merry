import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ErroApi, nomeArquivoDoCabecalho, registrarProvedorAutenticacao, requisitarArquivo } from '@/servicos/clienteHttp'

describe('requisitarArquivo', () => {
  const fetchSimulado = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSimulado)
  })

  afterEach(() => {
    fetchSimulado.mockReset()
    registrarProvedorAutenticacao(null)
  })

  it('[UNITÁRIO] devolve o conteúdo binário e o nome do Content-Disposition, enviando o token', async () => {
    registrarProvedorAutenticacao({ obterToken: () => 'token-dono', renovar: async () => false })
    fetchSimulado.mockResolvedValue(
      new Response('%PDF-1.4', {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': "attachment; filename=contrato.pdf; filename*=UTF-8''contrato%20S%C3%A3o%20Jo%C3%A3o.pdf",
        },
      }),
    )

    const arquivo = await requisitarArquivo('/api/eventos/c/fornecedores/v/contrato')

    expect(arquivo.nomeArquivo).toBe('contrato São João.pdf')
    expect(await arquivo.conteudo.text()).toBe('%PDF-1.4')
    const [, init] = fetchSimulado.mock.calls[0]!
    const cabecalhos = init?.headers as Record<string, string>
    expect(cabecalhos.Authorization).toBe('Bearer token-dono')
    expect(cabecalhos.Accept).toContain('application/pdf')
  })

  it('[UNITÁRIO] erro do servidor vira ErroApi com o status', async () => {
    fetchSimulado.mockResolvedValue(
      new Response(JSON.stringify({ title: 'Recurso não encontrado.', status: 404 }), {
        status: 404,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    )

    await expect(requisitarArquivo('/api/x')).rejects.toMatchObject({ status: 404 })
    await expect(requisitarArquivo('/api/x')).rejects.toBeInstanceOf(ErroApi)
  })

  it('[UNITÁRIO] interpreta filename simples, entre aspas e ausente', () => {
    expect(nomeArquivoDoCabecalho('attachment; filename="contrato.pdf"')).toBe('contrato.pdf')
    expect(nomeArquivoDoCabecalho('attachment; filename=contrato.pdf')).toBe('contrato.pdf')
    expect(nomeArquivoDoCabecalho("attachment; filename*=UTF-8''%E0%A4%A")).toBeNull()
    expect(nomeArquivoDoCabecalho(null)).toBeNull()
  })
})
