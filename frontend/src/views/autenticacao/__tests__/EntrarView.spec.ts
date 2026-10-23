import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { aguardarAte, aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import EntrarView from '@/views/autenticacao/EntrarView.vue'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { MENSAGENS_AUTENTICACAO, TEXTOS_ENTRAR } from '@/textos/autenticacao'
import { MENSAGENS_VALIDACAO } from '@/utilitarios/validacao'
import {
  SESSAO_EXEMPLO,
  montarView,
  prepararAplicacao,
  respostaJson,
  respostaProblema,
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'

await precarregarRotas('entrar', 'esqueci-senha', 'cadastro')

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

    await aguardarAte(() => expect(roteador.currentRoute.value.fullPath).toBe('/?aba=convidados'))
  })

  it('[SEGURANÇA] ignora destino externo e vai para o painel', async () => {
    const { roteador } = await abrir('/entrar?destino=//malicioso.com')
    fetchSimulado.mockResolvedValue(respostaJson(SESSAO_EXEMPLO))

    await preencherEEnviar('renata@exemplo.com', 'senhaForte1')

    await aguardarRota(roteador, 'inicio')
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
    await aguardarRota(roteador, 'esqueci-senha')
  })

  it('[COMPONENTE] não mostra erro ao sair do e-mail vazio antes de enviar, para não deslocar o link', async () => {
    await abrir()

    await wrapper!.get('#entrar-email').trigger('blur')
    await flushPromises()

    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)
  })

  it('[COMPONENTE] depois de tentar enviar, revalida o e-mail ao sair do campo', async () => {
    await abrir()
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper!.findAll('[data-teste="erro-campo"]')).toHaveLength(2)

    await wrapper!.get('#entrar-email').setValue('renata@exemplo.com')
    await wrapper!.get('#entrar-email').trigger('blur')
    await flushPromises()

    expect(wrapper!.findAll('[data-teste="erro-campo"]')).toHaveLength(1)
    expect(wrapper!.get('#entrar-email').attributes('aria-invalid')).toBe('false')
  })

  it('[COMPONENTE] depois de tentar enviar, o erro do e-mail some ao digitar a correção, sem depender do blur', async () => {
    await abrir()
    await wrapper!.get('#entrar-email').setValue('renata@')
    await wrapper!.get('#entrar-senha').setValue('senhaForte1')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper!.text()).toContain(MENSAGENS_VALIDACAO.email)

    await wrapper!.get('#entrar-email').setValue('renata@exemplo.com')
    await flushPromises()

    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)
    expect(wrapper!.get('#entrar-email').attributes('aria-invalid')).toBe('false')
  })

  it('[COMPONENTE] depois de corrigir o e-mail, um único envio chama a API', async () => {
    const { roteador } = await abrir()
    await wrapper!.get('#entrar-email').setValue('renata@')
    await wrapper!.get('#entrar-senha').setValue('senhaForte1')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    const chamadasAntes = fetchSimulado.mock.calls.length
    fetchSimulado.mockResolvedValue(respostaJson(SESSAO_EXEMPLO))

    await wrapper!.get('#entrar-email').setValue('renata@exemplo.com')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(fetchSimulado.mock.calls.length).toBe(chamadasAntes + 1)
    await aguardarRota(roteador, 'inicio')
  })

  it('[COMPONENTE] depois de tentar enviar, o erro da senha some ao digitar e não aparece no blur antes do envio', async () => {
    await abrir()
    await wrapper!.get('#entrar-senha').trigger('blur')
    await flushPromises()
    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)

    await wrapper!.get('#entrar-email').setValue('renata@exemplo.com')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper!.get('#entrar-senha').attributes('aria-invalid')).toBe('true')

    await wrapper!.get('#entrar-senha').setValue('senhaForte1')
    await flushPromises()

    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)
  })

  it('[COMPONENTE] coloca "Esqueci minha senha" na linha do rótulo Senha sem quebrar a associação do rótulo', async () => {
    await abrir()

    const cabecalho = wrapper!.get('.campo-formulario__cabecalho')
    expect(cabecalho.get('label').attributes('for')).toBe('entrar-senha')
    expect(cabecalho.get('label').text()).toBe('Senha')
    expect(cabecalho.find('[data-teste="link-esqueci-senha"]').exists()).toBe(true)
    expect(cabecalho.get('label').find('a').exists()).toBe(false)
  })

  it('[COMPONENTE] descreve a tela para assessoria e anfitriões', async () => {
    await abrir()

    expect(wrapper!.text()).toContain('Use o e-mail e a senha da sua conta.')
    expect(wrapper!.text()).not.toContain('painel da sua assessoria')
  })

  it('[COMPONENTE] orienta a primeira vez: a assessoria cria a conta e o anfitrião usa o convite do e-mail', async () => {
    await abrir()

    const orientacao = wrapper!.get('aside[data-teste="primeira-vez"]')
    const titulo = orientacao.get('h2')
    expect(orientacao.attributes('aria-labelledby')).toBe(titulo.attributes('id'))
    expect(titulo.text()).toBe('Primeira vez no Celebri?')
    expect(orientacao.findAll('li')).toHaveLength(2)

    const assessoria = orientacao.get('[data-teste="caminho-assessoria"]')
    expect(assessoria.get('h3').text()).toBe(TEXTOS_ENTRAR.assessoriaTitulo)
    expect(assessoria.text()).toContain(TEXTOS_ENTRAR.assessoriaTexto)

    const anfitriao = orientacao.get('[data-teste="caminho-anfitriao"]')
    expect(anfitriao.get('h3').text()).toBe(TEXTOS_ENTRAR.anfitriaoTitulo)
    expect(anfitriao.text()).toContain(TEXTOS_ENTRAR.anfitriaoTexto)
    expect(anfitriao.find('a').exists()).toBe(false)
  })

  it('[COMPONENTE] o link de cadastro aparece uma vez, no caminho da assessoria, e leva ao cadastro', async () => {
    const { roteador } = await abrir()

    const links = wrapper!.findAll('[data-teste="link-cadastro"]')
    expect(links).toHaveLength(1)
    expect(wrapper!.get('[data-teste="caminho-assessoria"] [data-teste="link-cadastro"]').text()).toBe(TEXTOS_ENTRAR.criarConta)

    await links[0]!.trigger('click')
    await aguardarRota(roteador, 'cadastro')
  })

  it('[COMPONENTE] a orientação vem depois do botão Entrar e não tira o foco inicial do e-mail', async () => {
    await abrir()

    const botao = wrapper!.get('[data-teste="enviar"]').element
    const orientacao = wrapper!.get('[data-teste="primeira-vez"]').element
    expect(botao.compareDocumentPosition(orientacao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.activeElement?.id).toBe('entrar-email')
    expect(wrapper!.get('form').find('[data-teste="primeira-vez"]').exists()).toBe(false)
  })

  it('[COMPONENTE] não trata casamento como conceito geral e lista os quatro tipos de evento no painel de marca', async () => {
    await abrir()

    const tipos = wrapper!.get('[data-teste="tipos-atendidos"]')
    expect(tipos.text()).toBe('Para casamentos, festas de 15 anos, aniversários e comemorações.')

    const textoSemTipos = wrapper!.text().replace(tipos.text(), '')
    expect(textoSemTipos).not.toMatch(/casamento|casal|noiv/i)
  })
})
