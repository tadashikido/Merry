import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { DETALHE_LINK_INVALIDO, ROTAS_AUTENTICACAO, interpretarFalha, useAutenticacaoStore } from '@/stores/autenticacao'
import { ErroApi, registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import {
  SESSAO_EXEMPLO,
  corpoDaChamada,
  respostaJson,
  respostaProblema,
  respostaVazia,
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'

describe('useAutenticacaoStore', () => {
  let fetchSimulado: ReturnType<typeof simularFetch>

  beforeEach(() => {
    setActivePinia(createPinia())
    fetchSimulado = simularFetch()
  })

  afterEach(() => {
    registrarProvedorAutenticacao(null)
  })

  it('[UNITÁRIO] entrar guarda o token só em memória e o usuário da sessão', async () => {
    fetchSimulado.mockResolvedValue(respostaJson(SESSAO_EXEMPLO))
    const store = useAutenticacaoStore()

    const resultado = await store.entrar({ email: 'renata@exemplo.com', senha: 'senhaForte1' })

    expect(resultado).toEqual({ ok: true })
    expect(store.autenticado).toBe(true)
    expect(store.tokenAcesso).toBe('token-de-acesso')
    expect(store.usuario?.organizacao.nome).toBe('Albuquerque Assessoria')
    expect(fetchSimulado.mock.calls[0]?.[0]).toBe(ROTAS_AUTENTICACAO.entrar)
    expect(corpoDaChamada(fetchSimulado.mock.calls[0]!)).toEqual({ email: 'renata@exemplo.com', senha: 'senhaForte1' })
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it.each([
    [401, 'credenciais'],
    [429, 'limite'],
    [409, 'conflito'],
    [500, 'inesperado'],
  ])('[UNITÁRIO] entrar traduz o status %i em falha "%s"', async (status, tipo) => {
    fetchSimulado.mockResolvedValue(respostaProblema(status))
    const store = useAutenticacaoStore()

    const resultado = await store.entrar({ email: 'a@b.com', senha: 'x' })

    expect(resultado).toMatchObject({ ok: false, tipo })
    expect(store.autenticado).toBe(false)
  })

  it('[UNITÁRIO] falha de rede vira falha de conexão', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('offline'))
    const store = useAutenticacaoStore()

    expect(await store.entrar({ email: 'a@b.com', senha: 'x' })).toMatchObject({ ok: false, tipo: 'conexao' })
  })

  it('[UNITÁRIO] cadastro devolve erros de validação por campo em camelCase', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(400, { errors: { Senha: ['Senha fraca.'], '$.email': ['E-mail inválido.'] } }))
    const store = useAutenticacaoStore()

    const resultado = await store.cadastrar({ nomeAssessoria: 'A', nome: 'B', email: 'x', senha: 'y' })

    expect(resultado).toEqual({ ok: false, tipo: 'validacao', errosCampos: { senha: 'Senha fraca.', email: 'E-mail inválido.' } })
  })

  it('[UNITÁRIO] renovar é single-flight: chamadas simultâneas fazem uma única requisição', async () => {
    fetchSimulado.mockResolvedValue(respostaJson(SESSAO_EXEMPLO))
    const store = useAutenticacaoStore()

    const [primeira, segunda] = await Promise.all([store.renovar(), store.renovar()])

    expect(primeira).toBe(true)
    expect(segunda).toBe(true)
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
    const cabecalhos = fetchSimulado.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(cabecalhos['X-Requested-With']).toBe('XMLHttpRequest')
    expect(cabecalhos.Authorization).toBeUndefined()
  })

  it('[UNITÁRIO] renovação recusada encerra a sessão e avisa que ela terminou', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(SESSAO_EXEMPLO)).mockResolvedValueOnce(respostaProblema(401))
    const store = useAutenticacaoStore()
    await store.entrar({ email: 'a@b.com', senha: 'x' })

    const renovou = await store.renovar()

    expect(renovou).toBe(false)
    expect(store.autenticado).toBe(false)
    expect(store.avisoEntrada).toBe('sessaoTerminou')
  })

  it('[UNITÁRIO] falha de rede na renovação mantém a sessão atual', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(SESSAO_EXEMPLO)).mockRejectedValueOnce(new TypeError('offline'))
    const store = useAutenticacaoStore()
    await store.entrar({ email: 'a@b.com', senha: 'x' })

    expect(await store.renovar()).toBe(false)
    expect(store.autenticado).toBe(true)
  })

  it('[UNITÁRIO] garantirSessaoVerificada tenta restaurar apenas uma vez', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(401))
    const store = useAutenticacaoStore()

    await store.garantirSessaoVerificada()
    await store.garantirSessaoVerificada()

    expect(fetchSimulado).toHaveBeenCalledTimes(1)
    expect(store.sessaoVerificada).toBe(true)
    expect(store.avisoEntrada).toBeNull()
  })

  it('[UNITÁRIO] sair limpa a sessão mesmo se a API falhar', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaJson(SESSAO_EXEMPLO)).mockRejectedValueOnce(new TypeError('offline'))
    const store = useAutenticacaoStore()
    await store.entrar({ email: 'a@b.com', senha: 'x' })

    await store.sair()

    expect(store.autenticado).toBe(false)
    expect(store.tokenAcesso).toBeNull()
    expect(store.consumirAviso()).toBe('saiu')
    expect(store.avisoEntrada).toBeNull()
  })

  it('[UNITÁRIO] redefinir senha distingue link inválido de senha recusada', async () => {
    fetchSimulado
      .mockResolvedValueOnce(respostaProblema(422, { detail: DETALHE_LINK_INVALIDO }))
      .mockResolvedValueOnce(respostaProblema(422, { detail: 'A senha não pode ser igual ao e-mail.' }))
      .mockResolvedValueOnce(respostaVazia())
    const store = useAutenticacaoStore()

    expect(await store.redefinirSenha('t', 'senhaForte1')).toMatchObject({ ok: false, tipo: 'linkInvalido' })
    expect(await store.redefinirSenha('t', 'senhaForte1')).toEqual({
      ok: false,
      tipo: 'validacao',
      errosCampos: { novaSenha: 'A senha não pode ser igual ao e-mail.' },
    })
    expect(await store.redefinirSenha('t', 'senhaForte1')).toEqual({ ok: true })
    expect(store.avisoEntrada).toBe('senhaRedefinida')
  })

  it('[UNITÁRIO] solicitar recuperação envia somente o e-mail', async () => {
    fetchSimulado.mockResolvedValue(respostaJson({ mensagem: 'ok' }, 202))
    const store = useAutenticacaoStore()

    expect(await store.solicitarRecuperacao('renata@exemplo.com')).toEqual({ ok: true })
    expect(corpoDaChamada(fetchSimulado.mock.calls[0]!)).toEqual({ email: 'renata@exemplo.com' })
  })

  it('[INTEGRAÇÃO] carregarUsuario renova o token expirado e repete a consulta', async () => {
    fetchSimulado
      .mockResolvedValueOnce(respostaJson(SESSAO_EXEMPLO))
      .mockResolvedValueOnce(respostaProblema(401))
      .mockResolvedValueOnce(respostaJson({ ...SESSAO_EXEMPLO, tokenAcesso: 'token-novo' }))
      .mockResolvedValueOnce(respostaJson(SESSAO_EXEMPLO.usuario))
    const store = useAutenticacaoStore()
    await store.entrar({ email: 'a@b.com', senha: 'x' })

    const resultado = await store.carregarUsuario()

    expect(resultado).toEqual({ ok: true })
    expect(store.tokenAcesso).toBe('token-novo')
    const cabecalhos = fetchSimulado.mock.calls[3]?.[1]?.headers as Record<string, string>
    expect(cabecalhos.Authorization).toBe('Bearer token-novo')
  })

  it('[UNITÁRIO] interpretarFalha trata erro desconhecido como inesperado', () => {
    expect(interpretarFalha(new Error('x'))).toEqual({ ok: false, tipo: 'inesperado', errosCampos: {} })
    expect(interpretarFalha(new ErroApi('x', 400, null))).toEqual({ ok: false, tipo: 'inesperado', errosCampos: {} })
  })
})
