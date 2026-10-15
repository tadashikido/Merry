import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'

import BarraAcaoFixa from '../BarraAcaoFixa.vue'
import CartaoAgora from '../CartaoAgora.vue'
import ContatoUmToque from '../ContatoUmToque.vue'
import FaixaFaseDia from '../FaixaFaseDia.vue'
import LinhaOperacao from '../LinhaOperacao.vue'
import LinhaProximo from '../LinhaProximo.vue'
import PainelAgoraProximo from '../PainelAgoraProximo.vue'
import RelogioOperacao from '../RelogioOperacao.vue'
import SuperficieOperacao from '../SuperficieOperacao.vue'
import { itemPainel } from '@/__tests__/auxiliaresGrandeDia'
import { cores } from '@/design/tokens'
import { PARES_CONTRASTE, razaoContraste } from '@/design/contraste'
import { NOMES_ICONES } from '@/design/icones'
import { MODULOS_CASAMENTO } from '@/layouts/modulosCasamento'

const global = { plugins: [[PrimeVue, { unstyled: true }]] as [typeof PrimeVue, Record<string, unknown>][] }

describe('RelogioOperacao', () => {
  it('[COMPONENTE] mostra a hora em <time> sem região viva e o selo ao vivo', () => {
    const wrapper = mount(RelogioOperacao, { props: { hora: '16:34', selo: 'Ao vivo', aoVivo: true } })

    expect(wrapper.get('time').text()).toBe('16:34')
    expect(wrapper.get('time').attributes('aria-label')).toBe('Agora são 16:34')
    expect(wrapper.find('[aria-live]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="relogio-operacao-selo"]').classes()).toContain('relogio-operacao__selo--ao-vivo')
    expect(wrapper.find('.relogio-operacao__ponto').exists()).toBe(true)
  })

  it('[COMPONENTE] fora do dia o selo traz a fase sem ponto', () => {
    const wrapper = mount(RelogioOperacao, { props: { hora: '10:12', selo: 'Faltam 12 dias' } })

    expect(wrapper.get('[data-teste="relogio-operacao-selo"]').text()).toBe('Faltam 12 dias')
    expect(wrapper.find('.relogio-operacao__ponto').exists()).toBe(false)
  })
})

describe('CartaoAgora', () => {
  it('[COMPONENTE] é uma região rotulada "Agora" com período, local, quem, instruções e slots', () => {
    const wrapper = mount(CartaoAgora, {
      props: {
        idTitulo: 'teste-agora',
        inicio: '16:30',
        termino: '17:15',
        atividade: 'Cerimônia',
        local: 'Capela São José',
        responsavel: 'Fernanda',
        fornecedor: 'Coral Harmonia',
        instrucoes: 'Coral entra às 16:25.',
        cerimonia: true,
      },
      slots: { contatos: () => h('span', { 'data-teste': 'slot-contatos' }, 'contatos'), acoes: () => h('button', 'Feito') },
    })

    expect(wrapper.attributes('aria-labelledby')).toBe('teste-agora')
    expect(wrapper.get('#teste-agora').text()).toBe('Agora')
    expect(wrapper.get('#teste-agora').attributes('tabindex')).toBe('-1')
    expect(wrapper.get('[data-teste="cartao-agora-atividade"]').text()).toBe('Cerimônia')
    expect(wrapper.text()).toContain('Desde 16:30 · até 17:15')
    expect(wrapper.text()).toContain('Capela São José')
    expect(wrapper.text()).toContain('Coral entra às 16:25.')
    expect(wrapper.find('[data-teste="slot-contatos"]').exists()).toBe(true)
    expect(wrapper.classes()).toContain('cartao-agora--cerimonia')
  })

  it('[COMPONENTE] sem término mostra só "Desde" e o término no dia seguinte ganha +1', () => {
    const semTermino = mount(CartaoAgora, { props: { inicio: '18:00', atividade: 'Recepção' } })
    const madrugada = mount(CartaoAgora, { props: { inicio: '21:30', termino: '02:00', terminaEmOutroDia: true, atividade: 'Pista' } })

    expect(semTermino.text()).toContain('Desde 18:00')
    expect(semTermino.text()).not.toContain('até')
    expect(madrugada.text()).toContain('Desde 21:30 · até 02:00 +1')
  })
})

describe('LinhaProximo, LinhaOperacao e FaixaFaseDia', () => {
  it('[COMPONENTE] LinhaProximo traz quanto falta, quem e o horário', () => {
    const wrapper = mount(LinhaProximo, { props: { inicio: '17:15', atividade: 'Fotos', quem: 'Ana', quando: 'em 41 min', idTitulo: 'p' } })

    expect(wrapper.get('#p').text()).toBe('Próximo · em 41 min')
    expect(wrapper.get('[data-teste="linha-proximo-atividade"]').text()).toBe('Fotos')
    expect(wrapper.get('time').text()).toBe('17:15')
    expect(wrapper.text()).toContain('Ana')
  })

  it('[COMPONENTE] LinhaOperacao é um item de lista com detalhe e ações', () => {
    const wrapper = mount(LinhaOperacao, {
      props: { inicio: '14:00', atividade: 'Montagem', detalhe: 'Feito às 15:20', concluido: true },
      slots: { acoes: () => h('button', 'Reabrir') },
    })

    expect(wrapper.element.tagName).toBe('LI')
    expect(wrapper.classes()).toContain('linha-operacao--concluido')
    expect(wrapper.text()).toContain('Feito às 15:20')
    expect(wrapper.get('button').text()).toBe('Reabrir')
  })

  it('[COMPONENTE] FaixaFaseDia é um status com título e texto', () => {
    const wrapper = mount(FaixaFaseDia, { props: { titulo: 'O grande dia já passou', texto: 'Roteiro registrado.' } })

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.get('h2').text()).toBe('O grande dia já passou')
  })

  it('[COMPONENTE] SuperficieOperacao aplica o tema de operação', () => {
    const wrapper = mount(SuperficieOperacao, { slots: { default: () => 'conteúdo' } })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['superficie-operacao', 'tema-operacao']))
  })

  it('[COMPONENTE] SuperficieOperacao só fica ampla quando pedido', () => {
    expect(mount(SuperficieOperacao).classes()).not.toContain('superficie-operacao--ampla')
    expect(mount(SuperficieOperacao, { props: { ampla: true } }).classes()).toContain('superficie-operacao--ampla')
  })

  it('[UNITÁRIO] a lateral de pendências mantém contraste de texto sobre a superfície de operação', () => {
    expect(razaoContraste(cores.operacaoTexto, cores.operacaoSuperficie)).toBeGreaterThanOrEqual(4.5)
    expect(razaoContraste(cores.operacaoApoio, cores.operacaoSuperficie)).toBeGreaterThanOrEqual(4.5)
    expect(razaoContraste(cores.operacaoSucesso, cores.operacaoSuperficie)).toBeGreaterThanOrEqual(4.5)
  })

  it('[COMPONENTE] BarraAcaoFixa aceita a variante de operação', () => {
    const wrapper = mount(BarraAcaoFixa, { props: { variante: 'operacao' }, slots: { default: () => h('button', 'Marcar') } })
    expect(wrapper.classes()).toContain('barra-acao-fixa--operacao')
    expect(mount(BarraAcaoFixa).classes()).toContain('barra-acao-fixa--padrao')
  })
})

describe('ContatoUmToque', () => {
  it('[COMPONENTE] liga e abre o WhatsApp com um toque e rótulos completos', () => {
    const wrapper = mount(ContatoUmToque, { props: { nome: 'Buffet Sabor', telefone: '(11) 98765-4321' } })

    const ligar = wrapper.get('[data-teste="contato-ligar"]')
    const whatsapp = wrapper.get('[data-teste="contato-whatsapp"]')
    expect(ligar.attributes('href')).toBe('tel:11987654321')
    expect(ligar.attributes('aria-label')).toBe('Ligar para Buffet Sabor')
    expect(whatsapp.attributes('href')).toBe('https://wa.me/5511987654321')
    expect(whatsapp.attributes('rel')).toBe('noopener noreferrer')
  })

  it('[SEGURANÇA] sem telefone válido não renderiza nada', () => {
    expect(mount(ContatoUmToque, { props: { nome: 'X' } }).find('[data-teste="contato-um-toque"]').exists()).toBe(false)
    expect(mount(ContatoUmToque, { props: { nome: 'X', telefone: 'javascript:alert(1)' } }).find('a').exists()).toBe(false)
  })
})

describe('PainelAgoraProximo', () => {
  const itens = [
    itemPainel({ atividade: 'Maquiagem', inicio: '16:00', situacao: 'Agora' }),
    itemPainel({ atividade: 'Cerimônia', inicio: '16:30', situacao: 'Agora', contato: { nome: 'Coral', telefone: '11987654321' } }),
    itemPainel({ atividade: 'Fotos', inicio: '17:15', situacao: 'Proximo', responsavel: 'Ana', fornecedor: 'Estúdio Luz' }),
    itemPainel({ atividade: 'Recepção', inicio: '18:00', situacao: 'Depois' }),
    itemPainel({ atividade: 'Entrada', inicio: '18:30', situacao: 'Depois' }),
    itemPainel({ atividade: 'Jantar', inicio: '19:00', situacao: 'Depois' }),
    itemPainel({ atividade: 'Bolo', inicio: '21:00', situacao: 'Depois' }),
    itemPainel({ atividade: 'Montagem', inicio: '14:00', situacao: 'Feito' }),
  ]

  it('[COMPONENTE] destaca o Agora mais recente, lista também agora, próximo e até três depois', () => {
    const wrapper = mount(PainelAgoraProximo, {
      props: { itens, minutoAtual: 994, prefixo: 't' },
      slots: { acoes: ({ item }: { item: { atividade: string } }) => h('button', { 'data-teste': 'acao' }, `Feito ${item.atividade}`) },
      global,
    })

    expect(wrapper.get('[data-teste="cartao-agora-atividade"]').text()).toBe('Cerimônia')
    expect(wrapper.get('[data-teste="painel-tambem-agora"]').text()).toContain('Maquiagem')
    expect(wrapper.findAll('[data-teste="acao"]').map((botao) => botao.text())).toEqual(['Feito Maquiagem'])
    expect(wrapper.get('[data-teste="linha-proximo-quando"]').text()).toContain('em 41 min')
    expect(wrapper.text()).toContain('Ana · Estúdio Luz')
    expect(wrapper.get('[data-teste="painel-depois"]').findAll('li').map((linha) => linha.find('[data-teste="linha-operacao-atividade"]').text())).toEqual([
      'Recepção',
      'Entrada',
      'Jantar',
    ])
    expect(wrapper.text()).not.toContain('Montagem')
  })

  it('[SEGURANÇA] sem slots (link público) não há ações nem contatos', () => {
    const wrapper = mount(PainelAgoraProximo, { props: { itens, minutoAtual: 994 }, global })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('[COMPONENTE] sem item em andamento e sem próximo mostra os estados vazios', () => {
    const wrapper = mount(PainelAgoraProximo, { props: { itens: [itemPainel({ situacao: 'Feito' })], minutoAtual: 994 }, global })

    expect(wrapper.get('[data-teste="painel-nada-agora"]').text()).toContain('Nada em andamento agora')
    expect(wrapper.get('[data-teste="painel-sem-proximo"]').text()).toBe('Nada mais no roteiro')
  })
})

describe('style guide do Grande Dia', () => {
  it('[UNITÁRIO] tokens novos têm contraste AA registrado', () => {
    const pares = PARES_CONTRASTE.filter((par) => par.descricao.startsWith('Grande Dia'))
    expect(pares.length).toBeGreaterThanOrEqual(8)
    expect(razaoContraste(cores.operacaoCartaoTexto, cores.operacaoCartao)).toBeGreaterThanOrEqual(4.5)
    expect(razaoContraste(cores.operacaoCartaoApoio, cores.operacaoCartao)).toBeGreaterThanOrEqual(4.5)
    expect(razaoContraste(cores.operacaoAoVivo, cores.operacaoAoVivoFundo)).toBeGreaterThanOrEqual(4.5)
    expect(razaoContraste(cores.operacaoAcaoTexto, cores.operacaoAcao)).toBeGreaterThanOrEqual(4.5)
  })

  it('[UNITÁRIO] módulo Grande Dia no grupo Execução com o ícone ao vivo', () => {
    expect(NOMES_ICONES).toContain('ao-vivo')
    expect(MODULOS_CASAMENTO.find((modulo) => modulo.chave === 'grande-dia')).toMatchObject({
      grupo: 'execucao',
      rotulo: 'Grande Dia',
      icone: 'ao-vivo',
      rota: 'casamento-grande-dia',
    })
  })
})
