import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CartaoAgora from '@/componentes/base/CartaoAgora.vue'
import ItemRoteiro from '@/componentes/base/ItemRoteiro.vue'
import PainelAgoraProximo from '@/componentes/base/PainelAgoraProximo.vue'
import ConfirmadosGrandeDia from '../ConfirmadosGrandeDia.vue'
import ListaFornecedoresDia from '../ListaFornecedoresDia.vue'
import { itemPainel } from '@/__tests__/auxiliaresGrandeDia'
import type { FornecedorDoDia } from '@/tipos/grandeDia'
import type { TotaisConvidadosDto } from '@/tipos/convidados'

function fornecedor(dados: Partial<FornecedorDoDia> = {}): FornecedorDoDia {
  return {
    chave: 'Lume|Fotografia',
    nomeEmpresa: 'Lume Fotografia',
    categoria: 'Fotografia',
    contato: 'Bruno',
    telefone: '11912345678',
    inicio: '17:15',
    situacao: 'Proximo',
    encerrado: false,
    noCartaoAgora: false,
    ...dados,
  }
}

describe('rótulo do momento principal nos componentes de operação', () => {
  it('[COMPONENTE] CartaoAgora mostra o rótulo só quando o item é o horário principal', () => {
    const marcado = mount(CartaoAgora, { props: { inicio: '20:00', atividade: 'Entrada', cerimonia: true, rotuloMomento: 'Hora da festa' } })
    const comum = mount(CartaoAgora, { props: { inicio: '19:00', atividade: 'Recepção', cerimonia: false, rotuloMomento: 'Hora da festa' } })
    const semRotulo = mount(CartaoAgora, { props: { inicio: '20:00', atividade: 'Entrada', cerimonia: true } })

    expect(marcado.get('[data-teste="cartao-agora-momento"]').text()).toBe('Hora da festa')
    expect(comum.find('[data-teste="cartao-agora-momento"]').exists()).toBe(false)
    expect(semRotulo.find('[data-teste="cartao-agora-momento"]').exists()).toBe(false)
  })

  it('[COMPONENTE] ItemRoteiro mostra o rótulo textual junto do anel do horário principal', () => {
    const wrapper = mount(ItemRoteiro, { props: { inicio: '19:00', atividade: 'Brinde', cerimonia: true, rotuloMomento: 'Hora do evento' } })

    expect(wrapper.get('[data-teste="item-roteiro-momento"]').text()).toBe('Hora do evento')
    expect(wrapper.find('.item-roteiro__anel').exists()).toBe(true)
  })

  it('[COMPONENTE] PainelAgoraProximo repassa o rótulo ao cartão Agora', () => {
    const wrapper = mount(PainelAgoraProximo, {
      props: { itens: [itemPainel({ situacao: 'Agora', cerimonia: true })], minutoAtual: 990, rotuloMomento: 'Hora da cerimônia' },
    })

    expect(wrapper.get('[data-teste="cartao-agora-momento"]').text()).toBe('Hora da cerimônia')
  })
})

describe('ListaFornecedoresDia', () => {
  it('[COMPONENTE] mostra nome, categoria, contato, horário, situação e contatos de um toque', () => {
    const wrapper = mount(ListaFornecedoresDia, { props: { fornecedores: [fornecedor()], mostrarSituacao: true } })

    expect(wrapper.get('[data-teste="fornecedor-dia"]').text()).toContain('Lume Fotografia')
    expect(wrapper.text()).toContain('Fotografia · Bruno · às 17:15')
    expect(wrapper.get('[data-teste="fornecedor-dia-situacao"]').text()).toBe('Próximo')
    expect(wrapper.get('[data-teste="contato-ligar"]').attributes('href')).toContain('11912345678')
  })

  it('[SEGURANÇA] o telefone nunca aparece como texto', () => {
    const wrapper = mount(ListaFornecedoresDia, { props: { fornecedores: [fornecedor()] } })

    expect(wrapper.text()).not.toContain('11912345678')
    expect(wrapper.text()).not.toMatch(/9\s?1234/)
  })

  it('[COMPONENTE] sem telefone ensina o que falta e sem situação quando não pedido', () => {
    const wrapper = mount(ListaFornecedoresDia, {
      props: { fornecedores: [fornecedor({ telefone: null, contato: null, encerrado: true, situacao: null })] },
    })

    expect(wrapper.get('[data-teste="fornecedor-dia-sem-telefone"]').text()).toBe('Sem telefone no cadastro')
    expect(wrapper.text()).toContain('Fotografia · itens feitos')
    expect(wrapper.find('[data-teste="contato-um-toque"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="fornecedor-dia-situacao"]').exists()).toBe(false)
  })
})

describe('ConfirmadosGrandeDia', () => {
  const totais: TotaisConvidadosDto = {
    convites: 70,
    pessoas: 158,
    adultos: 134,
    criancas: 24,
    acompanhantesPermitidos: 0,
    pendentes: { total: 8, adultos: 6, criancas: 2 },
    confirmados: { total: 142, adultos: 120, criancas: 22 },
    recusados: { total: 8, adultos: 8, criancas: 0 },
  }

  it('[COMPONENTE] mostra confirmadas, faixas e quem ainda não respondeu', () => {
    const wrapper = mount(ConfirmadosGrandeDia, { props: { totais } })

    expect(wrapper.get('section').attributes('aria-labelledby')).toBe('grande-dia-convidados')
    expect(wrapper.get('[data-teste="grande-dia-confirmados"]').text()).toBe('142 pessoas confirmadas')
    expect(wrapper.text()).toContain('120 adultos e 22 crianças')
    expect(wrapper.get('[data-teste="grande-dia-sem-resposta"]').text()).toBe('8 ainda sem resposta')
  })

  it('[COMPONENTE] usa singular e omite pendentes quando todos responderam', () => {
    const wrapper = mount(ConfirmadosGrandeDia, {
      props: { totais: { ...totais, confirmados: { total: 1, adultos: 1, criancas: 0 }, pendentes: { total: 0, adultos: 0, criancas: 0 } } },
    })

    expect(wrapper.get('[data-teste="grande-dia-confirmados"]').text()).toBe('1 pessoa confirmada')
    expect(wrapper.find('[data-teste="grande-dia-sem-resposta"]').exists()).toBe(false)
  })
})
