import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ErroApi, registrarProvedorAutenticacao, requisitar } from '@/servicos/clienteHttp'
import { respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'

describe('requisitar com provedor de autenticação', () => {
  let fetchSimulado: ReturnType<typeof simularFetch>
  const renovar = vi.fn<() => Promise<boolean>>()
  let token: string | null

  beforeEach(() => {
    fetchSimulado = simularFetch()
    token = 'token-1'
    renovar.mockReset()
    registrarProvedorAutenticacao({ obterToken: () => token, renovar })
  })

  afterEach(() => {
    registrarProvedorAutenticacao(null)
  })

  function cabecalhos(indice: number): Record<string, string> {
    return fetchSimulado.mock.calls[indice]?.[1]?.headers as Record<string, string>
  }

  it('[SEGURANÇA] envia o token de acesso no cabeçalho Authorization', async () => {
    fetchSimulado.mockResolvedValue(respostaJson({ ok: true }))

    await requisitar('/api/protegido')

    expect(cabecalhos(0).Authorization).toBe('Bearer token-1')
    expect(cabecalhos(0)['X-Requested-With']).toBe('XMLHttpRequest')
  })

  it('[SEGURANÇA] não envia token em requisição anônima', async () => {
    fetchSimulado.mockResolvedValue(respostaJson({ ok: true }))

    await requisitar('/api/autenticacao/entrar', { metodo: 'POST', corpo: {}, anonima: true })

    expect(cabecalhos(0).Authorization).toBeUndefined()
  })

  it('[INTEGRAÇÃO] renova a sessão em 401 e repete a requisição uma única vez', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(401)).mockResolvedValueOnce(respostaJson({ valor: 1 }))
    renovar.mockImplementation(async () => {
      token = 'token-2'
      return true
    })

    const resultado = await requisitar<{ valor: number }>('/api/protegido')

    expect(resultado).toEqual({ valor: 1 })
    expect(renovar).toHaveBeenCalledTimes(1)
    expect(cabecalhos(1).Authorization).toBe('Bearer token-2')
  })

  it('[INTEGRAÇÃO] propaga o 401 quando a renovação falha', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(401))
    renovar.mockResolvedValue(false)

    await expect(requisitar('/api/protegido')).rejects.toMatchObject({ status: 401 })
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('[INTEGRAÇÃO] não entra em laço quando o 401 se repete após renovar', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(401))
    renovar.mockResolvedValue(true)

    await expect(requisitar('/api/protegido')).rejects.toBeInstanceOf(ErroApi)
    expect(fetchSimulado).toHaveBeenCalledTimes(2)
    expect(renovar).toHaveBeenCalledTimes(1)
  })

  it('[UNITÁRIO] não tenta renovar em requisições anônimas', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(401))

    await expect(requisitar('/api/autenticacao/entrar', { metodo: 'POST', anonima: true })).rejects.toMatchObject({ status: 401 })
    expect(renovar).not.toHaveBeenCalled()
  })
})
