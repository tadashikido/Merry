import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import CampoSenha from '@/componentes/base/CampoSenha.vue'
import IndicadorAbertura from '@/componentes/base/IndicadorAbertura.vue'
import LacreIcone from '@/componentes/base/LacreIcone.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import ResumoUsuario from '@/componentes/base/ResumoUsuario.vue'
import LayoutAutenticacao from '@/layouts/LayoutAutenticacao.vue'
import { MENSAGENS_AUTENTICACAO, ROTULOS_CAMPOS_AUTENTICACAO } from '@/textos/autenticacao'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, object]] }

describe('CampoSenha', () => {
  it('[COMPONENTE] alterna entre ocultar e mostrar a senha com rótulo acessível', async () => {
    const wrapper = mount(CampoSenha, { props: { id: 'senha', modelValue: 'abc' }, global })
    const entrada = wrapper.get('input')
    const botao = wrapper.get('[data-teste="alternar-senha"]')

    expect(entrada.attributes('type')).toBe('password')
    expect(botao.attributes('aria-label')).toBe(ROTULOS_CAMPOS_AUTENTICACAO.mostrarSenha)
    expect(botao.attributes('aria-pressed')).toBe('false')

    await botao.trigger('click')

    expect(entrada.attributes('type')).toBe('text')
    expect(botao.attributes('aria-label')).toBe(ROTULOS_CAMPOS_AUTENTICACAO.ocultarSenha)
    expect(botao.attributes('aria-pressed')).toBe('true')
  })

  it('[COMPONENTE] marca os requisitos atendidos com texto e liga a lista ao campo', async () => {
    const wrapper = mount(CampoSenha, {
      props: { id: 'nova', modelValue: 'abc', comRequisitos: true, descritoPor: 'nova-dica', 'onUpdate:modelValue': () => undefined },
      global,
    })

    const requisitos = wrapper.findAll('[data-teste="requisito-senha"]')
    expect(requisitos).toHaveLength(3)
    expect(requisitos.map((item) => item.attributes('data-atendido'))).toEqual(['false', 'true', 'false'])
    expect(requisitos[1]?.text()).toContain(ROTULOS_CAMPOS_AUTENTICACAO.requisitoAtendido)
    expect(wrapper.get('input').attributes('aria-describedby')).toBe('nova-dica nova-requisitos')

    await wrapper.setProps({ modelValue: 'abcdefghi1' })
    expect(wrapper.findAll('[data-teste="requisito-senha"]').map((item) => item.attributes('data-atendido'))).toEqual(['true', 'true', 'true'])
  })

  it('[COMPONENTE] emite a digitação pelo v-model', async () => {
    const wrapper = mount(CampoSenha, { props: { id: 's', modelValue: '' }, global })

    await wrapper.get('input').setValue('senha1')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['senha1'])
  })
})

describe('MensagemFormulario', () => {
  it('[COMPONENTE] usa role alert para erro e status para demais variantes', () => {
    const erro = mount(MensagemFormulario, { props: { mensagem: 'Falhou' }, global })
    const sucesso = mount(MensagemFormulario, { props: { mensagem: 'Pronto', variante: 'sucesso' }, global })

    expect(erro.get('[data-teste="mensagem-formulario"]').attributes('role')).toBe('alert')
    expect(sucesso.get('[data-teste="mensagem-formulario"]').attributes('role')).toBe('status')
    expect(sucesso.text()).toContain('Pronto')
  })
})

describe('LayoutAutenticacao', () => {
  it('[COMPONENTE] exibe título como h1, lacre decorativo e rodapé fora da folha', () => {
    const wrapper = mount(LayoutAutenticacao, {
      props: { titulo: 'Entrar', descricao: 'Acesse o painel.' },
      slots: { default: '<form>campos</form>', rodape: '<a href="/cadastro">Criar conta</a>' },
      global,
    })

    expect(wrapper.get('h1').text()).toBe('Entrar')
    expect(wrapper.get('main').attributes('aria-labelledby')).toBe('autenticacao-titulo')
    expect(wrapper.get('[data-teste="lacre"]').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('footer').text()).toBe('Criar conta')
    expect(wrapper.get('main').text()).not.toContain('Criar conta')
  })

  it('[COMPONENTE] no modo demonstração não cria landmarks nem h1', () => {
    const wrapper = mount(LayoutAutenticacao, { props: { titulo: 'Entrar', demonstracao: true }, global })

    expect(wrapper.find('main').exists()).toBe(false)
    expect(wrapper.find('h1').exists()).toBe(false)
  })
})

describe('LacreIcone', () => {
  it('[UNITÁRIO] renderiza o ícone pedido escondido de leitores de tela e repassa atributos', () => {
    const wrapper = mount(LacreIcone, { props: { icone: 'ie-link' }, attrs: { 'data-teste': 'lacre-teste' } })

    const lacre = wrapper.get('[data-teste="lacre-teste"]')
    expect(lacre.classes()).toContain('lacre-icone')
    expect(lacre.attributes('aria-hidden')).toBe('true')
    expect(lacre.get('span.ie').classes()).toContain('ie-link')
    expect(wrapper.text()).toBe('')
  })
})

describe('ResumoUsuario e IndicadorAbertura', () => {
  it('[COMPONENTE] mostra usuário, assessoria e emite sair', async () => {
    const wrapper = mount(ResumoUsuario, { props: { nome: 'Renata', organizacao: 'Albuquerque Assessoria' }, global })

    expect(wrapper.text()).toContain('Renata')
    expect(wrapper.text()).toContain('Albuquerque Assessoria')
    await wrapper.get('[data-teste="sair"]').trigger('click')
    expect(wrapper.emitted('sair')).toHaveLength(1)
  })

  it('[COMPONENTE] indicador de abertura anuncia o carregamento', () => {
    const wrapper = mount(IndicadorAbertura, { global })

    expect(wrapper.get('[role="status"]').text()).toContain(MENSAGENS_AUTENTICACAO.abrindoConta)
  })
})
