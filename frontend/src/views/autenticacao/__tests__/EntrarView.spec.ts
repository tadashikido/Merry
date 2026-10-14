import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import EntrarView from '@/views/autenticacao/EntrarView.vue'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { MENSAGENS_AUTENTICACAO } from '@/textos/autenticacao'
import { MENSAGENS_VALIDACAO } from '@/utilitarios/validacao'
import {
  SESSAO_EXEMPLO,
  montarView,
  prepararAplicacao,
  respostaJson,
  respostaProblema,
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'

describe('EntrarView', () => {
  let fetchSimulado: ReturnType<typeof simularFetch>
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    fetchSimulado = simularFetch()
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    registrarProvedorAutenticacao(null)
  })

  async function abrir(caminho = '/entrar') {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(401))
    const montagem = await prepararAplicacao(caminho)
    wrapper = await montarView(EntrarView, montagem)
    return { ...montagem, wrapper }
  }

  async function preencherEEnviar(email: string, senha: string) {
    await wrapper!.get('#entrar-email').setValue(email)
    await wrapper!.get('#entrar-senha').setValue(senha)
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
  }

  it('[COMPONENTE] valida campos obrigatórios sem chamar a API e foca o primeiro inválido', async () => {
    await abrir()

    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper!.text()).toContain(MENSAGENS_VALIDACAO.obrigatorio)
    expect(document.activeElement?.id).toBe('entrar-email')
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('[COMPONENTE] entra e vai para o destino interno informado', async () => {
    const { roteador } = await abrir('/entrar?destino=/?aba=convidados')
    fetchSimulado.mockResolvedValue(respostaJson(SESSAO_EXEMPLO))

    await preencherEEnviar('renata@exemplo.com', 'senhaForte1')

    expect(roteador.currentRoute.value.fullPath).toBe('/?aba=convidados')
  })

  it('[SEGURANÇA] ignora destino externo e vai para o painel', async () => {
    const { roteador } = await abrir('/entrar?destino=//malicioso.com')
    fetchSimulado.mockResolvedValue(respostaJson(SESSAO_EXEMPLO))

    await preencherEEnviar('renata@exemplo.com', 'senhaForte1')

    expect(roteador.currentRoute.value.name).toBe('inicio')
  })

  it('[COMPONENTE] mostra mensagem genérica de credenciais, limpa a senha e foca o campo', async () => {
    await abrir()
    fetchSimulado.mockResolvedValue(respostaProblema(401))

    await preencherEEnviar('renata@exemplo.com', 'senhaErrada1')

    expect(wrapper!.get('[data-teste="mensagem-formulario"]').text()).toContain(MENSAGENS_AUTENTICACAO.credenciais)
    expect((wrapper!.get('#entrar-senha').element as HTMLInputElement).value).toBe('')
    expect(document.activeElement?.id).toBe('entrar-senha')
  })

  it('[COMPONENTE] informa excesso de tentativas e falha de conexão', async () => {
    await abrir()
    fetchSimulado.mockResolvedValueOnce(respostaProblema(429))
    await preencherEEnviar('renata@exemplo.com', 'senhaErrada1')
    expect(wrapper!.text()).toContain(MENSAGENS_AUTENTICACAO.muitasTentativas)

    fetchSimulado.mockRejectedValueOnce(new TypeError('offline'))
    await preencherEEnviar('renata@exemplo.com', 'senhaErrada1')
    expect(wrapper!.text()).toContain(MENSAGENS_AUTENTICACAO.conexao)
  })

  it('[COMPONENTE] exibe o aviso de saída uma única vez', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(401))
    const montagem = await prepararAplicacao('/entrar')
    useAutenticacaoStore().avisoEntrada = 'saiu'

    wrapper = await montarView(EntrarView, montagem)

    expect(wrapper.get('[data-teste="mensagem-formulario"]').text()).toContain(MENSAGENS_AUTENTICACAO.saiu)
    expect(useAutenticacaoStore().avisoEntrada).toBeNull()
  })

  it('[COMPONENTE] leva o e-mail digitado para a recuperação de senha', async () => {
    const { roteador } = await abrir()
    await wrapper!.get('#entrar-email').setValue('renata@exemplo.com')

    await wrapper!.get('[data-teste="link-esqueci-senha"]').trigger('click')
    await flushPromises()

    expect(useAutenticacaoStore().emailInformado).toBe('renata@exemplo.com')
    await vi.waitFor(() => expect(roteador.currentRoute.value.name).toBe('esqueci-senha'))
  })
})
