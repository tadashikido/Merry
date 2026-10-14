import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import EstadoPrimeiroAcesso from '@/componentes/base/EstadoPrimeiroAcesso.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MarcaProduto from '@/componentes/base/MarcaProduto.vue'
import { MENSAGENS_PADRAO } from '@/textos/mensagens'

const global = { plugins: [[PrimeVue, { unstyled: true }] as [typeof PrimeVue, object]] }

describe('CabecalhoPagina', () => {
  it('[COMPONENTE] exibe título como h1, descrição e ações', () => {
    const wrapper = mount(CabecalhoPagina, {
      props: { titulo: 'Convidados', descricao: 'Acompanhe quem já confirmou presença.' },
      slots: { acoes: '<button type="button">Adicionar convidado</button>' },
      global,
    })

    expect(wrapper.get('h1').text()).toBe('Convidados')
    expect(wrapper.text()).toContain('Acompanhe quem já confirmou presença.')
    expect(wrapper.get('.cabecalho-pagina__acoes button').text()).toBe('Adicionar convidado')
    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('[COMPONENTE] exibe trilha em navegação rotulada quando informada', () => {
    const wrapper = mount(CabecalhoPagina, {
      props: { titulo: 'Editar convidado' },
      slots: { trilha: '<a href="/convidados">Convidados</a>' },
      global,
    })

    expect(wrapper.get('nav').attributes('aria-label')).toBe('Você está em')
    expect(wrapper.find('.cabecalho-pagina__descricao').exists()).toBe(false)
  })
})

describe('CampoFormulario', () => {
  function montarCampo(props: Record<string, unknown>) {
    return mount(CampoFormulario, {
      props: { rotulo: 'E-mail', idCampo: 'email', ...props },
      slots: {
        default: (escopo: { id: string; invalido: boolean; descritoPor?: string }) =>
          h('input', { id: escopo.id, 'aria-invalid': String(escopo.invalido), 'aria-describedby': escopo.descritoPor }),
      },
      global,
    })
  }

  it('[COMPONENTE] associa rótulo ao campo e marca obrigatoriedade em texto', () => {
    const wrapper = montarCampo({ obrigatorio: true })

    expect(wrapper.get('label').attributes('for')).toBe('email')
    expect(wrapper.get('label').text()).toContain('(obrigatório)')
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('false')
  })

  it('[COMPONENTE] liga a dica ao campo por aria-describedby', () => {
    const wrapper = montarCampo({ dica: 'Usado só para enviar a confirmação.' })

    expect(wrapper.get('input').attributes('aria-describedby')).toBe('email-dica')
    expect(wrapper.get('#email-dica').text()).toBe('Usado só para enviar a confirmação.')
  })

  it('[COMPONENTE] exibe erro no lugar da dica e marca o campo como inválido', () => {
    const wrapper = montarCampo({ dica: 'Dica', erro: 'Informe um e-mail válido, como nome@exemplo.com.' })

    const input = wrapper.get('input')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe('email-erro')
    expect(wrapper.get('[data-teste="erro-campo"]').text()).toContain('Informe um e-mail válido')
    expect(wrapper.find('#email-dica').exists()).toBe(false)
  })

  it('[COMPONENTE] não define aria-describedby sem dica nem erro', () => {
    const wrapper = montarCampo({})

    expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined()
  })

  it('[COMPONENTE] sem o slot acao-rotulo mantém só o rótulo, sem cabeçalho', () => {
    const wrapper = montarCampo({})

    expect(wrapper.find('.campo-formulario__cabecalho').exists()).toBe(false)
    expect(wrapper.get('label').attributes('for')).toBe('email')
  })

  it('[COMPONENTE] com o slot acao-rotulo põe a ação ao lado do rótulo, fora do label', () => {
    const wrapper = mount(CampoFormulario, {
      props: { rotulo: 'Senha', idCampo: 'senha' },
      slots: {
        default: (escopo: { id: string }) => h('input', { id: escopo.id }),
        'acao-rotulo': () => h('a', { href: '/esqueci-senha' }, 'Esqueci minha senha'),
      },
      global,
    })

    const cabecalho = wrapper.get('.campo-formulario__cabecalho')
    expect(cabecalho.get('label').attributes('for')).toBe('senha')
    expect(cabecalho.get('a').text()).toBe('Esqueci minha senha')
    expect(cabecalho.get('label').find('a').exists()).toBe(false)
    expect(wrapper.findAll('label')).toHaveLength(1)
  })
})

describe('Estados', () => {
  it('[COMPONENTE] estado vazio exibe título, descrição e ação', () => {
    const wrapper = mount(EstadoVazio, {
      props: { titulo: 'Nenhum convidado ainda', descricao: 'Adicione o primeiro convidado.' },
      slots: { acao: '<button type="button">Adicionar convidado</button>' },
      global,
    })

    expect(wrapper.get('h2').text()).toBe('Nenhum convidado ainda')
    expect(wrapper.text()).toContain('Adicione o primeiro convidado.')
    expect(wrapper.get('button').text()).toBe('Adicionar convidado')
  })

  it.each(['lista', 'cartao', 'formulario'] as const)('[COMPONENTE] carregando (%s) é anunciado a leitores de tela', (variante) => {
    const wrapper = mount(EstadoCarregando, { props: { variante, linhas: 2 }, global })

    const raiz = wrapper.get('[data-teste="estado-carregando"]')
    expect(raiz.attributes('role')).toBe('status')
    expect(raiz.attributes('aria-busy')).toBe('true')
    expect(raiz.text()).toContain(MENSAGENS_PADRAO.carregando)
    expect(raiz.classes()).toContain(`estado-carregando--${variante}`)
  })

  it('[COMPONENTE] erro usa role alert, mensagem padrão e emite nova tentativa', async () => {
    const wrapper = mount(EstadoErro, { global })

    const raiz = wrapper.get('[data-teste="estado-erro"]')
    expect(raiz.attributes('role')).toBe('alert')
    expect(raiz.text()).toContain(MENSAGENS_PADRAO.erroGenericoTitulo)
    expect(raiz.text()).toContain(MENSAGENS_PADRAO.erroGenericoMensagem)

    await wrapper.get('[data-teste="tentar-novamente"]').trigger('click')
    expect(wrapper.emitted('tentar-novamente')).toHaveLength(1)
  })

  it('[COMPONENTE] erro pode omitir a nova tentativa', () => {
    const wrapper = mount(EstadoErro, { props: { mensagem: 'Sem acesso.', podeTentarNovamente: false }, global })

    expect(wrapper.find('[data-teste="tentar-novamente"]').exists()).toBe(false)
  })

  it('[COMPONENTE] estado vazio mostra o ícone escolhido dentro do círculo decorativo', () => {
    const wrapper = mount(EstadoVazio, { props: { titulo: 'Nada ainda', icone: 'presente' }, global })

    const circulo = wrapper.get('.estado-vazio__circulo')
    expect(circulo.attributes('aria-hidden')).toBe('true')
    expect(circulo.find('.ie-presente').exists()).toBe(true)
  })

  it('[COMPONENTE] sem permissão usa cadeado, variante própria e nenhuma nova tentativa', () => {
    const wrapper = mount(EstadoErro, {
      props: { titulo: 'Esta área é da equipe de cerimonial.', mensagem: 'Peça acesso à assessoria.', podeTentarNovamente: false, variante: 'semPermissao' },
      global,
    })

    const raiz = wrapper.get('[data-teste="estado-erro"]')
    expect(raiz.attributes('data-variante')).toBe('semPermissao')
    expect(raiz.find('.ie-permissao').exists()).toBe(true)
    expect(raiz.find('.ie-ocorrencia').exists()).toBe(false)
    expect(wrapper.find('[data-teste="tentar-novamente"]').exists()).toBe(false)
  })

  it('[COMPONENTE] primeiro acesso numera os passos, marca o atual e emite continuar', async () => {
    const wrapper = mount(EstadoPrimeiroAcesso, {
      props: {
        titulo: 'Boas-vindas ao Nossia.',
        descricao: 'Vamos configurar seu primeiro casamento.',
        rotuloAcao: 'Continuar',
        passos: [
          { chave: 'a', rotulo: 'Dados do casamento', concluido: true },
          { chave: 'b', rotulo: 'Convidar o casal', concluido: false },
          { chave: 'c', rotulo: 'Convidados', concluido: false },
        ],
      },
      global,
    })

    expect(wrapper.get('h2').text()).toBe('Boas-vindas ao Nossia.')
    const passos = wrapper.findAll('[data-teste="passo-primeiro-acesso"]')
    expect(passos[0]!.classes()).toContain('primeiro-acesso__passo--concluido')
    expect(passos[0]!.find('.ie-concluir').exists()).toBe(true)
    expect(passos[1]!.attributes('aria-current')).toBe('step')
    expect(passos[2]!.text()).toBe('3Convidados')
    await wrapper.get('[data-teste="primeiro-acesso-continuar"]').trigger('click')
    expect(wrapper.emitted('continuar')).toHaveLength(1)
  })

  it('[COMPONENTE] dados incompletos: mensagem de alerta com ícone, papel de status e ação', () => {
    const wrapper = mount(MensagemFormulario, {
      props: { variante: 'alerta', mensagem: 'Falta o horário da cerimônia.' },
      slots: { default: '<a href="/editar">Adicionar horário</a>' },
      global,
    })

    const raiz = wrapper.get('[data-teste="mensagem-formulario"]')
    expect(raiz.classes()).toContain('mensagem-formulario--alerta')
    expect(raiz.attributes('role')).toBe('status')
    expect(raiz.find('.ie-alerta').exists()).toBe(true)
    expect(raiz.get('a').text()).toBe('Adicionar horário')
  })
})

describe('BadgeStatus', () => {
  it.each([
    ['neutro', 'secondary'],
    ['sucesso', 'success'],
    ['alerta', 'warn'],
    ['erro', 'danger'],
    ['informacao', 'info'],
  ] as const)('[COMPONENTE] variante %s mapeia para a severidade %s e mantém o texto', (variante, severidade) => {
    const wrapper = mount(BadgeStatus, { props: { texto: 'Confirmado', variante }, global: { plugins: [PrimeVue] } })

    const badge = wrapper.get('[data-teste="badge-status"]')
    expect(badge.text()).toBe('Confirmado')
    expect(badge.attributes('data-variante')).toBe(variante)
    expect(badge.classes()).toContain(`p-tag-${severidade}`)
  })

  it.each([
    ['neutro', 'ie-ponto'],
    ['sucesso', 'ie-concluir'],
    ['alerta', 'ie-prazo'],
    ['erro', 'ie-alerta'],
    ['informacao', 'ie-informacao'],
  ] as const)('[COMPONENTE] variante %s sempre tem ícone (%s) além da cor e do texto', (variante, icone) => {
    const wrapper = mount(BadgeStatus, { props: { texto: 'Status', variante }, global: { plugins: [PrimeVue] } })

    expect(wrapper.find(`.${icone}`).exists()).toBe(true)
    expect(wrapper.text()).toBe('Status')
  })

  it('[COMPONENTE] aceita ícone específico no lugar do padrão da variante', () => {
    const wrapper = mount(BadgeStatus, { props: { texto: 'Arquivado', icone: 'arquivar' }, global: { plugins: [PrimeVue] } })

    expect(wrapper.find('.ie-arquivar').exists()).toBe(true)
    expect(wrapper.find('.ie-ponto').exists()).toBe(false)
  })
})

describe('MarcaProduto', () => {
  it('[COMPONENTE] exibe o logo horizontal oficial com o nome Nossia como texto alternativo', () => {
    const wrapper = mount(MarcaProduto)

    const logo = wrapper.get('img.marca__logo')
    expect(logo.attributes('alt')).toBe('Nossia')
    expect(logo.attributes('src')).toContain('nossia-logo-horizontal')
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.classes()).toContain('marca--escuro')
  })

  it('[COMPONENTE] mantém o nome para leitores de tela quando só o símbolo aparece e aceita o tom claro', () => {
    const wrapper = mount(MarcaProduto, { props: { somenteSimbolo: true, tom: 'claro' } })

    expect(wrapper.find('.marca__logo').exists()).toBe(false)
    expect(wrapper.get('img.marca__simbolo').attributes('alt')).toBe('')
    expect(wrapper.get('img.marca__simbolo').attributes('src')).toContain('nossia-icone-claro')
    expect(wrapper.get('.somente-leitor-tela').text()).toBe('Nossia')
    expect(wrapper.classes()).toContain('marca--claro')
  })
})
