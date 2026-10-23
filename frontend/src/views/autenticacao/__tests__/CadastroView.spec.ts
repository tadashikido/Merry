import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import CadastroView from '@/views/autenticacao/CadastroView.vue'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CADASTRO } from '@/textos/autenticacao'
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
})
