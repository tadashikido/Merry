import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import CadastroView from '@/views/autenticacao/CadastroView.vue'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CADASTRO } from '@/textos/autenticacao'
import { VOCABULARIO_TIPO_EVENTO, tiposEventoEmFrase } from '@/textos/tiposEvento'
import { TIPOS_EVENTO } from '@/tipos/eventos'
import { MENSAGENS_VALIDACAO } from '@/utilitarios/validacao'
import {
  SESSAO_EXEMPLO,
  corpoDaChamada,
  montarView,
  prepararAplicacao,
  respostaJson,
  respostaProblema,
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'

await precarregarRotas('cadastro')

describe('CadastroView', () => {
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

  async function abrir() {
    fetchSimulado.mockResolvedValueOnce(respostaProblema(401))
    const montagem = await prepararAplicacao('/cadastro')
    wrapper = await montarView(CadastroView, montagem)
    return montagem
  }

  async function preencher(senha = 'senhaForte1', email = 'renata@exemplo.com') {
    await wrapper!.get('#cadastro-nomeAssessoria').setValue('  Albuquerque Assessoria ')
    await wrapper!.get('#cadastro-nome').setValue('Renata Albuquerque')
    await wrapper!.get('#cadastro-email').setValue(email)
    await wrapper!.get('#cadastro-senha').setValue(senha)
  }

  it('[COMPONENTE] agrupa os campos em "Sua assessoria" e "Seu acesso" com foco inicial no nome da assessoria', async () => {
    await abrir()

    const legendas = wrapper!.findAll('legend').map((legenda) => legenda.text())
    expect(legendas).toEqual([TEXTOS_CADASTRO.grupoAssessoria, TEXTOS_CADASTRO.grupoAcesso])
    expect(document.activeElement?.id).toBe('cadastro-nomeAssessoria')
  })

  it('[COMPONENTE] bloqueia senha fraca antes de chamar a API', async () => {
    await abrir()
    await preencher('fraca')

    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper!.text()).toContain(MENSAGENS_VALIDACAO.senhaFraca)
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
    expect(document.activeElement?.id).toBe('cadastro-senha')
  })

  it('[COMPONENTE] cria a conta com dados aparados e abre o painel', async () => {
    const { roteador } = await abrir()
    await preencher()
    fetchSimulado.mockResolvedValue(respostaJson(SESSAO_EXEMPLO, 201))

    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(corpoDaChamada(fetchSimulado.mock.calls[1]!)).toEqual({
      nomeAssessoria: 'Albuquerque Assessoria',
      nome: 'Renata Albuquerque',
      email: 'renata@exemplo.com',
      senha: 'senhaForte1',
    })
    await aguardarRota(roteador, 'inicio')
  })

  it('[COMPONENTE] e-mail em uso mostra o erro no campo e os caminhos para entrar ou recuperar', async () => {
    await abrir()
    await preencher()
    fetchSimulado.mockResolvedValue(respostaProblema(409))

    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    const aviso = wrapper!.get('[data-teste="aviso-email-em-uso"]')
    expect(aviso.findAll('a').map((link) => link.attributes('href'))).toEqual(['/entrar', '/esqueci-senha'])
    expect(wrapper!.get('#cadastro-email').attributes('aria-invalid')).toBe('true')
  })

  it('[COMPONENTE] exibe erros de validação devolvidos pelo servidor no campo correspondente', async () => {
    await abrir()
    await preencher()
    fetchSimulado.mockResolvedValue(respostaProblema(400, { errors: { NomeAssessoria: ['Use entre 2 e 120 caracteres.'] } }))

    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper!.text()).toContain('Use entre 2 e 120 caracteres.')
    expect(document.activeElement?.id).toBe('cadastro-nomeAssessoria')
  })

  it('[COMPONENTE] não mostra erro ao sair de um campo vazio antes de enviar', async () => {
    await abrir()

    await wrapper!.get('#cadastro-nomeAssessoria').trigger('blur')
    await wrapper!.get('#cadastro-senha').trigger('blur')
    await flushPromises()

    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)
  })

  it('[COMPONENTE] depois de tentar enviar, o erro da senha some enquanto a senha forte é digitada', async () => {
    await abrir()
    await preencher('fraca')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper!.get('#cadastro-senha').attributes('aria-invalid')).toBe('true')

    await wrapper!.get('#cadastro-senha').setValue('senhaForte1')
    await flushPromises()

    expect(wrapper!.find('[data-teste="erro-campo"]').exists()).toBe(false)
    expect(wrapper!.get('#cadastro-senha').attributes('aria-invalid')).toBe('false')
  })

  it('[COMPONENTE] depois de tentar enviar, sair de um campo ainda inválido mantém o erro', async () => {
    await abrir()
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper!.findAll('[data-teste="erro-campo"]')).toHaveLength(4)

    await wrapper!.get('#cadastro-nome').setValue('Renata')
    await wrapper!.get('#cadastro-nome').trigger('blur')
    await wrapper!.get('#cadastro-email').trigger('blur')
    await flushPromises()

    expect(wrapper!.findAll('[data-teste="erro-campo"]')).toHaveLength(3)
    expect(wrapper!.get('#cadastro-email').attributes('aria-invalid')).toBe('true')
  })

  it('[COMPONENTE] organiza grupos e ação com as primitivas de ritmo da fundação', async () => {
    await abrir()

    const formulario = wrapper!.get('[data-teste="formulario-cadastro"]')
    expect(formulario.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    const grupos = formulario.findAll('fieldset')
    expect(grupos).toHaveLength(2)
    for (const grupo of grupos) {
      expect(grupo.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--grupo']))
      expect(grupo.get('legend').classes()).toContain('texto-rotulo')
    }
    expect(formulario.get('p.texto-legenda').text()).toBe(TEXTOS_CADASTRO.apoio)
  })

  it('[COMPONENTE] mostra, depois da folha, o que a assessoria organiza: quatro recursos em região rotulada', async () => {
    await abrir()

    const regiao = wrapper!.get('aside[data-teste="o-que-organiza"]')
    const titulo = regiao.get('h2')
    expect(regiao.attributes('aria-labelledby')).toBe(titulo.attributes('id'))
    expect(titulo.text()).toBe('O que sua assessoria organiza no Celebri')
    expect(regiao.findAll('li h3').map((item) => item.text())).toEqual([
      TEXTOS_CADASTRO.recursoEventosTitulo,
      TEXTOS_CADASTRO.recursoConvidadosTitulo,
      TEXTOS_CADASTRO.recursoPlanejamentoTitulo,
      TEXTOS_CADASTRO.recursoDiaTitulo,
    ])
    expect(regiao.find('a').exists()).toBe(false)
    expect(regiao.text()).not.toMatch(/R\$|plano|preço|grátis/i)
  })

  it('[COMPONENTE] o recurso de eventos cita os quatro tipos sociais a partir do vocabulário', async () => {
    await abrir()

    const eventos = wrapper!.get('[data-teste="recurso-eventos"] p').text()
    expect(eventos).toBe('Um espaço para cada evento: casamentos, festas de 15 anos, aniversários e comemorações.')
    for (const tipo of TIPOS_EVENTO) {
      expect(eventos).toContain(VOCABULARIO_TIPO_EVENTO[tipo].rotuloPlural.toLocaleLowerCase('pt-BR'))
    }
  })

  it('[COMPONENTE] avisa o anfitrião convidado que não precisa criar conta, sem oferecer link', async () => {
    await abrir()

    const aviso = wrapper!.get('[data-teste="o-que-organiza"] [data-teste="aviso-anfitriao"]')
    expect(aviso.get('strong').text()).toBe(TEXTOS_CADASTRO.anfitriaoTitulo)
    expect(aviso.text()).toContain(TEXTOS_CADASTRO.anfitriaoTexto)
    expect(aviso.find('a').exists()).toBe(false)
  })

  it('[COMPONENTE] o conteúdo complementar vem depois do botão, fora do formulário, sem tirar o foco inicial', async () => {
    await abrir()

    const botao = wrapper!.get('[data-teste="enviar"]').element
    const regiao = wrapper!.get('[data-teste="o-que-organiza"]').element
    expect(botao.compareDocumentPosition(regiao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(wrapper!.get('form').find('[data-teste="o-que-organiza"]').exists()).toBe(false)
    expect(wrapper!.get('main').find('[data-teste="o-que-organiza"]').exists()).toBe(false)
    expect(document.activeElement?.id).toBe('cadastro-nomeAssessoria')
    expect(wrapper!.findAll('[data-teste="link-entrar"]')).toHaveLength(1)
  })

  it('[COMPONENTE] não trata casamento como conceito geral e usa texto de apoio neutro', async () => {
    await abrir()

    const textoSemTipos = wrapper!.text().split(tiposEventoEmFrase()).join('')
    expect(textoSemTipos).not.toMatch(/casamento|casal|noiv/i)
    expect(wrapper!.get('p.texto-legenda').text()).toBe('Você fica responsável pela conta da assessoria.')
  })
})
