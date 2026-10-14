import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'

import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { SESSAO_EXEMPLO, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'

describe('guarda de autenticação', () => {
  let fetchSimulado: ReturnType<typeof simularFetch>

  beforeEach(() => {
    fetchSimulado = simularFetch()
  })

  afterEach(() => {
    registrarProvedorAutenticacao(null)
  })

  it('[SEGURANÇA] visitante sem sessão é levado para entrar, preservando o destino', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(401))

    const { roteador } = await prepararAplicacao('/?aba=1')

    expect(roteador.currentRoute.value.name).toBe('entrar')
    expect(roteador.currentRoute.value.query.destino).toBe('/?aba=1')
  })

  it('[SEGURANÇA] sem destino quando o acesso é à raiz', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(401))

    const { roteador } = await prepararAplicacao('/')

    expect(roteador.currentRoute.value.name).toBe('entrar')
    expect(roteador.currentRoute.value.query.destino).toBeUndefined()
  })

  it('[INTEGRAÇÃO] sessão restaurada pelo cookie abre o painel sem pedir login', async () => {
    fetchSimulado.mockResolvedValue(respostaJson(SESSAO_EXEMPLO))

    const { roteador } = await prepararAplicacao('/')

    expect(roteador.currentRoute.value.name).toBe('inicio')
  })

  it('[UNITÁRIO] usuário autenticado que abre entrar ou cadastro vai para o painel', async () => {
    fetchSimulado.mockResolvedValue(respostaJson(SESSAO_EXEMPLO))

    const { roteador } = await prepararAplicacao('/cadastro')

    expect(roteador.currentRoute.value.name).toBe('inicio')
    await roteador.push('/entrar')
    expect(roteador.currentRoute.value.name).toBe('inicio')
  })

  it('[UNITÁRIO] redefinir senha é acessível com ou sem sessão e não consulta a API', async () => {
    const { roteador } = await prepararAplicacao('/redefinir-senha')

    expect(roteador.currentRoute.value.name).toBe('redefinir-senha')
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('[INTEGRAÇÃO] quando a sessão termina no painel, volta para entrar com o destino', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(SESSAO_EXEMPLO)).mockResolvedValueOnce(respostaProblema(401))
    const { roteador } = await prepararAplicacao('/?aba=2')
    const store = useAutenticacaoStore()

    await store.renovar()
    await flushPromises()

    expect(roteador.currentRoute.value.name).toBe('entrar')
    expect(roteador.currentRoute.value.query.destino).toBe('/?aba=2')
  })

  it('[INTEGRAÇÃO] ao sair do painel, volta para entrar sem destino', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(SESSAO_EXEMPLO)).mockResolvedValueOnce(new Response(null, { status: 204 }))
    const { roteador } = await prepararAplicacao('/')
    const store = useAutenticacaoStore()

    await store.sair()
    await flushPromises()

    expect(roteador.currentRoute.value.name).toBe('entrar')
    expect(roteador.currentRoute.value.query.destino).toBeUndefined()
    expect(store.avisoEntrada).toBe('saiu')
  })
})
