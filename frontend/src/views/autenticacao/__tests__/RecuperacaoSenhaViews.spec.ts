import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import EsqueciSenhaView from '@/views/autenticacao/EsqueciSenhaView.vue'
import RedefinirSenhaView from '@/views/autenticacao/RedefinirSenhaView.vue'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { DETALHE_LINK_INVALIDO, useAutenticacaoStore } from '@/stores/autenticacao'
import { TEXTOS_ESQUECI_SENHA, TEXTOS_REDEFINIR_SENHA } from '@/textos/autenticacao'
import { MENSAGENS_VALIDACAO } from '@/utilitarios/validacao'
import {
  corpoDaChamada,
  montarView,
  prepararAplicacao,
  respostaJson,
  respostaProblema,
  respostaVazia,
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'

describe('EsqueciSenhaView', () => {
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

  it('[COMPONENTE] mostra a confirmação genérica após enviar e permite enviar de novo', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(401))
    const montagem = await prepararAplicacao('/esqueci-senha')
    useAutenticacaoStore().emailInformado = 'renata@exemplo.com'
    wrapper = await montarView(EsqueciSenhaView, montagem)
    fetchSimulado.mockResolvedValue(respostaJson({ mensagem: 'ok' }, 202))

    expect((wrapper.get('#esqueci-email').element as HTMLInputElement).value).toBe('renata@exemplo.com')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual({ email: 'renata@exemplo.com' })
    expect(wrapper.get('h1').text()).toBe(TEXTOS_ESQUECI_SENHA.enviadoTitulo)
    expect(wrapper.text()).toContain(TEXTOS_ESQUECI_SENHA.enviadoTexto)
    expect(document.activeElement?.id).toBe('autenticacao-titulo')

    await wrapper.get('[data-teste="enviar-de-novo"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('[COMPONENTE] valida o e-mail antes de enviar', async () => {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(401))
    const montagem = await prepararAplicacao('/esqueci-senha')
    wrapper = await montarView(EsqueciSenhaView, montagem)

    await wrapper.get('#esqueci-email').setValue('invalido')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(MENSAGENS_VALIDACAO.email)
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })
})

describe('RedefinirSenhaView', () => {
  let fetchSimulado: ReturnType<typeof simularFetch>
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    fetchSimulado = simularFetch()
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    registrarProvedorAutenticacao(null)
    vi.restoreAllMocks()
  })

  async function abrir(caminho: string) {
    const montagem = await prepararAplicacao(caminho)
    wrapper = await montarView(RedefinirSenhaView, montagem)
    return montagem
  }

  async function preencherEEnviar(senha: string, confirmacao: string) {
    await wrapper!.get('#redefinir-novaSenha').setValue(senha)
    await wrapper!.get('#redefinir-confirmacao').setValue(confirmacao)
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
  }

  it('[COMPONENTE] sem token no link mostra o estado de link inválido com ação para pedir outro', async () => {
    const { roteador } = await abrir('/redefinir-senha')

    expect(wrapper!.get('h1').text()).toBe(TEXTOS_REDEFINIR_SENHA.linkInvalidoTitulo)
    await wrapper!.get('[data-teste="pedir-novo-link"]').trigger('click')
    await flushPromises()
    expect(roteador.currentRoute.value.name).toBe('esqueci-senha')
  })

  it('[SEGURANÇA] lê o token do fragmento e o remove da barra de endereços', async () => {
    const substituir = vi.spyOn(window.history, 'replaceState')

    await abrir('/redefinir-senha#token=abc%2D123')

    expect(wrapper!.find('form').exists()).toBe(true)
    expect(substituir).toHaveBeenCalledWith(expect.anything(), '', '/redefinir-senha')
  })

  it('[COMPONENTE] exige confirmação igual à nova senha', async () => {
    await abrir('/redefinir-senha#token=abc')

    await preencherEEnviar('senhaForte1', 'senhaForte2')

    expect(wrapper!.text()).toContain(MENSAGENS_VALIDACAO.senhasDiferentes)
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('[COMPONENTE] redefine a senha, envia o token e volta para entrar com aviso de sucesso', async () => {
    const { roteador } = await abrir('/redefinir-senha#token=abc-123')
    fetchSimulado.mockResolvedValueOnce(respostaVazia()).mockResolvedValue(respostaProblema(401))

    await preencherEEnviar('senhaForte1', 'senhaForte1')

    expect(corpoDaChamada(fetchSimulado.mock.calls[0]!)).toEqual({ token: 'abc-123', novaSenha: 'senhaForte1' })
    await vi.waitFor(() => expect(roteador.currentRoute.value.name).toBe('entrar'))
    expect(useAutenticacaoStore().avisoEntrada).toBe('senhaRedefinida')
  })

  it('[COMPONENTE] link expirado recusado pelo servidor mostra o estado de link inválido', async () => {
    await abrir('/redefinir-senha#token=abc')
    fetchSimulado.mockResolvedValue(respostaProblema(422, { detail: DETALHE_LINK_INVALIDO }))

    await preencherEEnviar('senhaForte1', 'senhaForte1')

    expect(wrapper!.get('h1').text()).toBe(TEXTOS_REDEFINIR_SENHA.linkInvalidoTitulo)
    expect(wrapper!.text()).toContain(TEXTOS_REDEFINIR_SENHA.linkInvalidoTexto)
  })
})
