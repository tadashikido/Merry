import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import EsqueciSenhaView from '@/views/autenticacao/EsqueciSenhaView.vue'
import RedefinirSenhaView from '@/views/autenticacao/RedefinirSenhaView.vue'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { DETALHE_LINK_INVALIDO, useAutenticacaoStore } from '@/stores/autenticacao'
import { MENSAGENS_AUTENTICACAO, TEXTOS_ENTRAR, TEXTOS_ESQUECI_SENHA, TEXTOS_REDEFINIR_SENHA } from '@/textos/autenticacao'
import { tiposEventoEmFrase } from '@/textos/tiposEvento'
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

await precarregarRotas('esqueci-senha', 'redefinir-senha', 'entrar')

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

  async function abrirEsqueci() {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(401))
    const montagem = await prepararAplicacao('/esqueci-senha')
    wrapper = await montarView(EsqueciSenhaView, montagem)
  }

  async function enviarEmail(valor: string) {
    await wrapper!.get('#esqueci-email').setValue(valor)
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
  }

  it('[COMPONENTE] não mostra erro ao sair do campo vazio antes de enviar', async () => {
    await abrirEsqueci()

    await wrapper!.get('#esqueci-email').trigger('blur')
    await flushPromises()

    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)
    expect(wrapper!.get('#esqueci-email').attributes('aria-invalid')).toBe('false')
  })

  it('[COMPONENTE] depois de tentar enviar, o erro some enquanto o e-mail válido é digitado', async () => {
    await abrirEsqueci()
    await enviarEmail('renata@')
    expect(wrapper!.get('#esqueci-email').attributes('aria-invalid')).toBe('true')

    await wrapper!.get('#esqueci-email').setValue('renata@exemplo.com')
    await flushPromises()

    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)
    expect(wrapper!.get('#esqueci-email').attributes('aria-invalid')).toBe('false')
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('[COMPONENTE] depois de tentar enviar, sair do campo ainda inválido mantém o erro', async () => {
    await abrirEsqueci()
    await enviarEmail('')
    expect(wrapper!.text()).toContain(MENSAGENS_VALIDACAO.obrigatorio)

    await wrapper!.get('#esqueci-email').setValue('renata')
    await wrapper!.get('#esqueci-email').trigger('blur')
    await flushPromises()

    expect(wrapper!.text()).toContain(MENSAGENS_VALIDACAO.email)
    expect(wrapper!.get('#esqueci-email').attributes('aria-invalid')).toBe('true')
  })

  it('[COMPONENTE] erro de campo vindo do servidor some quando o e-mail é corrigido', async () => {
    await abrirEsqueci()
    fetchSimulado.mockResolvedValueOnce(respostaProblema(400, { errors: { Email: ['E-mail recusado pelo servidor.'] } }))

    await enviarEmail('renata@exemplo.com')
    expect(wrapper!.text()).toContain('E-mail recusado pelo servidor.')
    expect(document.activeElement?.id).toBe('esqueci-email')

    await wrapper!.get('#esqueci-email').setValue('renata.albuquerque@exemplo.com')
    await flushPromises()

    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)
  })

  it('[COMPONENTE] informa excesso de tentativas e falha de conexão sem sair do formulário', async () => {
    await abrirEsqueci()
    fetchSimulado.mockResolvedValueOnce(respostaProblema(429))
    await enviarEmail('renata@exemplo.com')
    expect(wrapper!.text()).toContain(MENSAGENS_AUTENTICACAO.muitasTentativas)

    fetchSimulado.mockRejectedValueOnce(new TypeError('offline'))
    await enviarEmail('renata@exemplo.com')
    expect(wrapper!.text()).toContain(MENSAGENS_AUTENTICACAO.conexao)
    expect(wrapper!.find('form').exists()).toBe(true)
  })

  it('[SEGURANÇA] mostra a mesma confirmação genérica sem revelar se o e-mail existe', async () => {
    await abrirEsqueci()
    fetchSimulado.mockResolvedValueOnce(respostaJson({ mensagem: 'ok' }, 202))

    await enviarEmail('ninguem@exemplo.com')

    expect(wrapper!.get('h1').text()).toBe(TEXTOS_ESQUECI_SENHA.enviadoTitulo)
    expect(wrapper!.text()).toContain(TEXTOS_ESQUECI_SENHA.enviadoTexto)
    expect(wrapper!.text()).not.toContain('ninguem@exemplo.com')
  })

  it('[COMPONENTE] organiza formulário e confirmação com as primitivas de ritmo da fundação', async () => {
    await abrirEsqueci()

    const formulario = wrapper!.get('[data-teste="formulario-esqueci-senha"]')
    expect(formulario.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--cartao']))
    expect(formulario.get('div.pilha.pilha--grupo').find('#esqueci-email').exists()).toBe(true)

    fetchSimulado.mockResolvedValueOnce(respostaJson({ mensagem: 'ok' }, 202))
    await enviarEmail('renata@exemplo.com')

    const confirmacao = wrapper!.get('[data-teste="confirmacao-envio"]')
    expect(confirmacao.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--grupo']))
    expect(confirmacao.get('[data-teste="lacre-envio"]').attributes('aria-hidden')).toBe('true')
    expect(confirmacao.get('p.texto-legenda').text()).toBe(TEXTOS_ESQUECI_SENHA.enviadoDica)
  })

  it('[COMPONENTE] antes do pedido orienta sobre o e-mail da conta e o anfitrião sem senha, fora do formulário', async () => {
    await abrirEsqueci()

    const regiao = wrapper!.get('aside[data-teste="orientacao-antes"]')
    const titulo = regiao.get('h2')
    expect(regiao.attributes('aria-labelledby')).toBe(titulo.attributes('id'))
    expect(titulo.text()).toBe(TEXTOS_ESQUECI_SENHA.antesTitulo)
    expect(regiao.findAll('li h3').map((item) => item.text())).toEqual([
      TEXTOS_ESQUECI_SENHA.emailContaTitulo,
      TEXTOS_ESQUECI_SENHA.semSenhaTitulo,
    ])
    expect(regiao.get('[data-teste="orientacao-sem-senha"] p').text()).toBe(TEXTOS_ESQUECI_SENHA.semSenhaTexto)
    expect(regiao.find('a').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="orientacao-enquanto"]').exists()).toBe(false)

    const botao = wrapper!.get('[data-teste="enviar"]').element
    expect(botao.compareDocumentPosition(regiao.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(wrapper!.get('form').find('[data-teste="orientacao-antes"]').exists()).toBe(false)
    expect(wrapper!.get('main').find('[data-teste="orientacao-antes"]').exists()).toBe(false)
    expect(document.activeElement?.id).toBe('esqueci-email')
    expect(wrapper!.findAll('a')).toHaveLength(1)
  })

  it('[COMPONENTE] depois do pedido troca para o que fazer enquanto o e-mail chega, com nota ao anfitrião', async () => {
    await abrirEsqueci()
    fetchSimulado.mockResolvedValueOnce(respostaJson({ mensagem: 'ok' }, 202))
    await enviarEmail('renata@exemplo.com')

    expect(wrapper!.find('[data-teste="orientacao-antes"]').exists()).toBe(false)
    const regiao = wrapper!.get('aside[data-teste="orientacao-enquanto"]')
    expect(regiao.attributes('aria-labelledby')).toBe(regiao.get('h2').attributes('id'))
    expect(regiao.get('h2').text()).toBe(TEXTOS_ESQUECI_SENHA.enquantoTitulo)
    expect(regiao.findAll('li h3').map((item) => item.text())).toEqual([
      TEXTOS_ESQUECI_SENHA.assuntoTitulo,
      TEXTOS_ESQUECI_SENHA.maisDeUmPedidoTitulo,
      TEXTOS_ESQUECI_SENHA.depoisTitulo,
    ])
    expect(regiao.get('[data-teste="orientacao-assunto"] p').text()).toBe('“Redefinição de senha — Celebri”. Pode levar alguns minutos.')
    const nota = regiao.get('[data-teste="nota-anfitriao"]')
    expect(nota.get('strong').text()).toBe(TEXTOS_ENTRAR.anfitriaoTitulo)
    expect(nota.text()).toContain(TEXTOS_ESQUECI_SENHA.anfitriaoNotaTexto)
    expect(regiao.find('a').exists()).toBe(false)
    expect(document.activeElement?.id).toBe('autenticacao-titulo')

    await wrapper!.get('[data-teste="enviar-de-novo"]').trigger('click')
    await flushPromises()
    expect(wrapper!.find('[data-teste="orientacao-enquanto"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="orientacao-antes"]').exists()).toBe(true)
  })

  it('[SEGURANÇA] a orientação depois do pedido é a mesma para qualquer e-mail e não repete o endereço', async () => {
    await abrirEsqueci()
    fetchSimulado.mockResolvedValueOnce(respostaJson({ mensagem: 'ok' }, 202))
    await enviarEmail('renata@exemplo.com')
    const primeira = wrapper!.get('main').text() + wrapper!.get('[data-teste="orientacao-enquanto"]').text()

    await wrapper!.get('[data-teste="enviar-de-novo"]').trigger('click')
    await flushPromises()
    fetchSimulado.mockResolvedValueOnce(respostaJson({ mensagem: 'ok' }, 202))
    await enviarEmail('ninguem@exemplo.com')
    const segunda = wrapper!.get('main').text() + wrapper!.get('[data-teste="orientacao-enquanto"]').text()

    expect(segunda).toBe(primeira)
    expect(segunda).not.toMatch(/renata@|ninguem@/)
  })

  it('[COMPONENTE] não trata casamento como conceito geral antes nem depois do pedido', async () => {
    await abrirEsqueci()
    const semTipos = () => wrapper!.text().split(tiposEventoEmFrase()).join('')
    expect(wrapper!.get('[data-teste="tipos-atendidos"]').text()).toContain(tiposEventoEmFrase())
    expect(semTipos()).not.toMatch(/casamento|casal|noiv/i)

    fetchSimulado.mockResolvedValueOnce(respostaJson({ mensagem: 'ok' }, 202))
    await enviarEmail('renata@exemplo.com')
    expect(semTipos()).not.toMatch(/casamento|casal|noiv/i)
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
    await aguardarRota(roteador, 'esqueci-senha')
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
    await aguardarRota(roteador, 'entrar')
    expect(useAutenticacaoStore().avisoEntrada).toBe('senhaRedefinida')
  })

  it('[COMPONENTE] link expirado recusado pelo servidor mostra o estado de link inválido', async () => {
    await abrir('/redefinir-senha#token=abc')
    fetchSimulado.mockResolvedValue(respostaProblema(422, { detail: DETALHE_LINK_INVALIDO }))

    await preencherEEnviar('senhaForte1', 'senhaForte1')

    expect(wrapper!.get('h1').text()).toBe(TEXTOS_REDEFINIR_SENHA.linkInvalidoTitulo)
    expect(wrapper!.text()).toContain(TEXTOS_REDEFINIR_SENHA.linkInvalidoTexto)
  })
  it('[COMPONENTE] link inválido mostra título e texto uma única vez, com lacre decorativo e sem cartão de erro', async () => {
    await abrir('/redefinir-senha')

    expect(wrapper!.findAll('h1')).toHaveLength(1)
    expect(wrapper!.find('h2').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="estado-erro"]').exists()).toBe(false)
    expect(wrapper!.text().split(TEXTOS_REDEFINIR_SENHA.linkInvalidoTexto)).toHaveLength(2)

    const estado = wrapper!.get('[data-teste="link-invalido"]')
    expect(estado.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--cartao']))
    const lacre = estado.get('[data-teste="lacre-link-invalido"]')
    expect(lacre.attributes('aria-hidden')).toBe('true')
    expect(lacre.find('.ie-link').exists()).toBe(true)
    expect(estado.find('[data-teste="pedir-novo-link"]').exists()).toBe(true)
    expect(wrapper!.find('form').exists()).toBe(false)
  })

  it('[COMPONENTE] link recusado pelo servidor leva o foco ao título do estado de link inválido', async () => {
    await abrir('/redefinir-senha#token=abc')
    fetchSimulado.mockResolvedValue(respostaProblema(422, { detail: DETALHE_LINK_INVALIDO }))

    await preencherEEnviar('senhaForte1', 'senhaForte1')

    expect(document.activeElement?.id).toBe('autenticacao-titulo')
    expect(wrapper!.find('[data-teste="lacre-link-invalido"]').exists()).toBe(true)
  })

  it('[COMPONENTE] organiza o formulário com as primitivas de ritmo da fundação', async () => {
    await abrir('/redefinir-senha#token=abc')

    const formulario = wrapper!.get('[data-teste="formulario-redefinir-senha"]')
    expect(formulario.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--cartao']))
    const grupo = formulario.get('div.pilha.pilha--grupo')
    expect(grupo.find('#redefinir-novaSenha').exists()).toBe(true)
    expect(grupo.find('#redefinir-confirmacao').exists()).toBe(true)
    expect(grupo.find('[data-teste="enviar"]').exists()).toBe(false)
  })

  it('[COMPONENTE] não mostra erro ao sair dos campos vazios antes de tentar salvar', async () => {
    await abrir('/redefinir-senha#token=abc')

    await wrapper!.get('#redefinir-novaSenha').trigger('blur')
    await wrapper!.get('#redefinir-confirmacao').trigger('blur')
    await flushPromises()

    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)
    expect(wrapper!.get('#redefinir-novaSenha').attributes('aria-invalid')).toBe('false')
    expect(wrapper!.get('#redefinir-confirmacao').attributes('aria-invalid')).toBe('false')
  })

  it('[COMPONENTE] depois de tentar salvar, o erro da confirmação some ao digitar a mesma senha', async () => {
    await abrir('/redefinir-senha#token=abc')
    await preencherEEnviar('senhaForte1', 'senhaForte2')
    expect(wrapper!.get('#redefinir-confirmacao').attributes('aria-invalid')).toBe('true')

    await wrapper!.get('#redefinir-confirmacao').setValue('senhaForte1')
    await flushPromises()

    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)
    expect(wrapper!.get('#redefinir-confirmacao').attributes('aria-invalid')).toBe('false')
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('[COMPONENTE] depois de tentar salvar, ajustar a nova senha para igualar a confirmação limpa o erro da confirmação', async () => {
    await abrir('/redefinir-senha#token=abc')
    await preencherEEnviar('senhaForte2', 'senhaForte1')
    expect(wrapper!.text()).toContain(MENSAGENS_VALIDACAO.senhasDiferentes)

    await wrapper!.get('#redefinir-novaSenha').setValue('senhaForte1')
    await flushPromises()

    expect(wrapper!.text()).not.toContain(MENSAGENS_VALIDACAO.senhasDiferentes)
    expect(wrapper!.get('#redefinir-confirmacao').attributes('aria-invalid')).toBe('false')
  })

  it('[COMPONENTE] depois de tentar salvar, sair de um campo ainda inválido mantém o erro', async () => {
    await abrir('/redefinir-senha#token=abc')
    await preencherEEnviar('', '')
    expect(wrapper!.text()).toContain(MENSAGENS_VALIDACAO.obrigatorio)

    await wrapper!.get('#redefinir-novaSenha').setValue('curta')
    await wrapper!.get('#redefinir-novaSenha').trigger('blur')
    await flushPromises()

    expect(wrapper!.text()).toContain(MENSAGENS_VALIDACAO.senhaFraca)
    expect(wrapper!.get('#redefinir-novaSenha').attributes('aria-invalid')).toBe('true')
  })

  it('[COMPONENTE] informa excesso de tentativas e falha de conexão sem sair do formulário', async () => {
    await abrir('/redefinir-senha#token=abc')
    fetchSimulado.mockResolvedValueOnce(respostaProblema(429))
    await preencherEEnviar('senhaForte1', 'senhaForte1')
    expect(wrapper!.text()).toContain(MENSAGENS_AUTENTICACAO.muitasTentativas)

    fetchSimulado.mockRejectedValueOnce(new TypeError('offline'))
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper!.text()).toContain(MENSAGENS_AUTENTICACAO.conexao)
    expect(wrapper!.find('form').exists()).toBe(true)
  })
})
