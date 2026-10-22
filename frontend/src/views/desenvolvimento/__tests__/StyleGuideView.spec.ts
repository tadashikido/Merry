import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import PrimeVue from 'primevue/config'
import { createPinia } from 'pinia'
import ToastService from 'primevue/toastservice'

import { criarRotas, rotas } from '@/router'
import StyleGuideView from '@/views/desenvolvimento/StyleGuideView.vue'
import { PARES_CONTRASTE } from '@/design/contraste'
import { NOMES_ICONES } from '@/design/icones'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'

class ResizeObserverSimulado {
  observe() {}
  unobserve() {}
  disconnect() {}
}

async function montar() {
  simularMatchMedia(false)
  vi.stubGlobal('ResizeObserver', ResizeObserverSimulado)
  const roteador = createRouter({ history: createMemoryHistory(), routes: rotas })
  await roteador.push('/style-guide')
  await roteador.isReady()
  const wrapper = mount(StyleGuideView, {
    attachTo: document.body,
    global: { plugins: [roteador, createPinia(), [PrimeVue, { unstyled: true }], ToastService] },
  })
  await flushPromises()
  return wrapper
}

describe('rota /style-guide', () => {
  it('[UNITÁRIO] existe no ambiente de desenvolvimento', () => {
    const roteador = createRouter({ history: createMemoryHistory(), routes: rotas })
    expect(import.meta.env.DEV).toBe(true)
    expect(roteador.resolve('/style-guide').name).toBe('style-guide')
  })

  it('[SEGURANÇA] cai em página não encontrada sem as rotas de desenvolvimento, como no build de produção', () => {
    const roteador = createRouter({ history: createMemoryHistory(), routes: criarRotas([]) })
    expect(roteador.resolve('/style-guide').name).toBe('nao-encontrado')
    expect(roteador.resolve('/').name).toBe('inicio')
  })
})

describe('StyleGuideView', { timeout: 20_000 }, () => {
  let wrapper: VueWrapper | undefined

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  it('[COMPONENTE] exibe todas as seções do style guide dentro do layout do painel', async () => {
    wrapper = await montar()

    expect(wrapper.get('h1').text()).toBe('Style guide')
    for (const id of ['cores', 'tipografia', 'espaco', 'textos', 'acoes', 'formulario', 'listagem', 'estados', 'feedback', 'casamento', 'convidados', 'importacao', 'tarefas', 'layouts', 'regras']) {
      expect(wrapper.find(`#${id}`).exists()).toBe(true)
    }
    expect(wrapper.find('[data-teste="menu-lateral"]').exists()).toBe(true)
    expect(wrapper.findAll('main')).toHaveLength(1)
  })

  it('[COMPONENTE] exibe a seção de dados sensíveis com os estados dos componentes novos', async () => {
    wrapper = await montar()

    const secao = wrapper.get('#dados-sensiveis')
    expect(secao.findAll('[data-teste="seletor-restricao"]')).toHaveLength(3)
    expect(secao.find('[data-teste="restricao-registrada"]').exists()).toBe(true)
    expect(secao.find('[data-teste="restricao-erro"]').exists()).toBe(true)
    expect(secao.find('[data-teste="aviso-privacidade"]').exists()).toBe(true)
    expect(secao.find('[data-teste="caixa-consentimento"]').exists()).toBe(true)
    expect(secao.find('[data-teste="resumo-cardapio"]').exists()).toBe(true)
    expect(wrapper.get('.guia__indice').text()).toContain('Dados sensíveis')

    const validar = secao.findAll('button').find((botao) => botao.text() === 'Validar exemplo')!
    await validar.trigger('click')
    expect(secao.find('[data-teste="consentimento-erro"]').exists()).toBe(true)
  })

  it('[COMPONENTE] exibe a seção de mesas com fileira de lugares, linha selecionável e barra de seleção', async () => {
    wrapper = await montar()

    const secao = wrapper.get('#mesas')
    expect(secao.findAll('[data-teste="ocupacao-mesa"]')).toHaveLength(5)
    expect(secao.findAll('.ocupacao-mesa--completa')).toHaveLength(1)
    expect(secao.findAll('[data-teste="linha-pessoa-mesa"]')).toHaveLength(5)
    expect(secao.findAll('.linha-pessoa-mesa--selecionada')).toHaveLength(1)
    expect(secao.find('.barra-acao-fixa--selecao').exists()).toBe(true)
    expect(wrapper.get('.guia__indice').text()).toContain('Mesas')
    expect(wrapper.get('#regras').text()).toContain('fileira de lugares')
  })

  it('[COMPONENTE] exibe a seção de confirmações com barra, prazos e layout de impressão', async () => {
    wrapper = await montar()

    const secao = wrapper.get('#confirmacoes')
    expect(secao.findAll('[data-teste="barra-progresso-envio"]')).toHaveLength(2)
    expect(secao.findAll('[data-teste="indicador-prazo"]').map((indicador) => indicador.classes().find((classe) => classe.startsWith('indicador-prazo--')))).toEqual([
      'indicador-prazo--normal',
      'indicador-prazo--alerta',
      'indicador-prazo--encerrado',
    ])
    expect(secao.find('.layout-impressao').exists()).toBe(true)
    expect(wrapper.get('.guia__indice').text()).toContain('Confirmações e buffet')
    expect(wrapper.findAll('main')).toHaveLength(1)
  })

  it('[COMPONENTE] exibe os componentes de casamento com todos os estados', async () => {
    wrapper = await montar()

    const secao = wrapper.get('#casamento')
    expect(secao.findAll('[data-teste="nomes-casal"]').length).toBeGreaterThanOrEqual(4)
    expect(secao.findAll('[data-teste="contagem-regressiva"]')).toHaveLength(10)
    expect(secao.text()).toContain('Semana do casamento')
    expect(secao.text()).toContain('Arquivado')
    expect(secao.find('[data-teste="lista-detalhes"]').exists()).toBe(true)
    expect(wrapper.get('.guia__indice').text()).toContain('Casamento')
  })

  it('[COMPONENTE] lista todas as combinações de contraste aprovadas', async () => {
    wrapper = await montar()

    const secao = wrapper.get('#cores')
    expect(secao.findAll('tbody tr')).toHaveLength(PARES_CONTRASTE.length)
    expect(secao.text()).not.toContain('Reprovado')
  })

  it('[COMPONENTE] documenta marca, iconografia, os 8 estados, o workspace e os dois contextos do Celebri', async () => {
    wrapper = await montar()

    expect(wrapper.get('#marca').findAll('[data-teste="marca-produto"]')).toHaveLength(4)
    expect(wrapper.get('#marca').get('.guia__logo-principal').text()).toBe('Celebri')
    expect(wrapper.get('#marca').find('img').exists()).toBe(false)
    expect(wrapper.get('[data-teste="guia-icones"]').findAll('li')).toHaveLength(NOMES_ICONES.length)
    const estados = wrapper.get('#estados').findAll('.guia__rotulo-estado').map((rotulo) => rotulo.text())
    expect(estados).toEqual([
      '01 · Carregando',
      '02 · Vazio',
      '03 · Erro',
      '04 · Sem permissão',
      '05 · Sucesso',
      '06 · Dados incompletos',
      '07 · Confirmação destrutiva',
      '08 · Primeiro acesso',
    ])
    expect(wrapper.get('#estados').find('[data-teste="estado-primeiro-acesso"]').exists()).toBe(true)
    const workspace = wrapper.get('[data-teste="guia-workspace"]')
    const navegacoes = workspace.findAll('[data-teste="navegacao-casamento"]')
    expect(navegacoes).toHaveLength(2)
    expect(navegacoes[0]!.text()).toContain('Restrições alimentares')
    expect(navegacoes[1]!.text()).not.toContain('Restrições alimentares')
    expect(wrapper.get('#navegacao').text()).toContain('MODULOS_CASAMENTO')
    expect(wrapper.get('#contextos').text()).toContain('Seu casamento está tomando forma.')
    expect(wrapper.get('.guia__indice').text()).toContain('Os 8 estados')
  })

  it('[COMPONENTE] não descreve mais a direção visual antiga', async () => {
    wrapper = await montar()

    expect(wrapper.text()).not.toMatch(/ameixa|latão|Brygada|papelaria|monograma|Enlace|Hanken|pinho|champagne|sálvia|Nossia|terracota|alecrim|areia|rosado|rosa queimado|\bLora\b/i)
  })

  it('[COMPONENTE] registra as regras obrigatórias de evolução do style guide', async () => {
    wrapper = await montar()

    const regras = wrapper.get('#regras').text()
    expect(regras).toContain('Padrão novo exige evoluir o style guide antes de usar numa tela')
    expect(regras).toContain('frontend-design:frontend-design')
    expect(regras).toContain('O design system Celebri é a referência oficial do front')
    expect(regras).toContain('Espaço só pelo ritmo')
    expect(regras).toContain('“Desfazer” só aparece quando existe operação inversa real')
  })

  it('[COMPONENTE] documenta os componentes de importação e suas regras', async () => {
    wrapper = await montar()

    const secao = wrapper.get('#importacao')
    expect(secao.find('[data-teste="indicador-etapas"]').exists()).toBe(true)
    expect(secao.findAll('[data-teste="envio-arquivo"]').map((envio) => envio.attributes('data-estado'))).toEqual([
      'vazio',
      'carregando',
      'erro',
      'vazio',
    ])
    expect(secao.find('[data-teste="lista-problemas"]').exists()).toBe(true)
    expect(secao.find('[data-teste="guia-abrir-confirmacao"]').exists()).toBe(true)
    const regras = wrapper.get('#regras').text()
    expect(regras).toContain('indicador de etapas')
    expect(regras).toContain('neutralização de fórmulas')
  })

  it('[COMPONENTE] valida o formulário de exemplo e foca o primeiro campo inválido', async () => {
    wrapper = await montar()

    await wrapper.get('#formulario form').trigger('submit')
    await flushPromises()

    const nome = wrapper.get('#demo-nome')
    expect(nome.attributes('aria-invalid')).toBe('true')
    expect(nome.attributes('aria-describedby')).toBe('demo-nome-erro')
    expect(document.activeElement?.id).toBe('demo-nome')
  })

  it('[COMPONENTE] demonstra a validação que não rouba o clique: nada no blur antes de enviar e erro some ao digitar depois', async () => {
    wrapper = await montar()
    const nome = wrapper.get('#demo-nome')

    await nome.trigger('blur')
    await flushPromises()
    expect(nome.attributes('aria-invalid')).toBe('false')

    await wrapper.get('#formulario form').trigger('submit')
    await flushPromises()
    expect(nome.attributes('aria-invalid')).toBe('true')

    await nome.setValue('Renata Alves')
    await flushPromises()
    expect(nome.attributes('aria-invalid')).toBe('false')
  })

  it('[COMPONENTE] alterna os estados da listagem de exemplo', async () => {
    wrapper = await montar()

    expect(wrapper.find('#listagem [data-teste="listagem-tabela"]').exists()).toBe(true)
    const botoes = wrapper.findAll('#listagem .p-togglebutton, #listagem [role="radio"], #listagem button')
    const erro = botoes.find((botao) => botao.text() === 'Erro')
    expect(erro).toBeDefined()
    await erro?.trigger('click')
    await flushPromises()

    expect(wrapper.find('#listagem [data-teste="estado-erro"]').exists()).toBe(true)
  })

  it('[COMPONENTE] exibe a seção de fornecedores com índice interativo, linhas, canais e estado vazio', async () => {
    wrapper = await montar()

    const secao = wrapper.get('#fornecedores')
    expect(secao.find('[data-teste="indice-categorias"]').exists()).toBe(true)
    expect(secao.findAll('[data-teste="linha-fornecedor"]').length).toBeGreaterThanOrEqual(4)
    expect(secao.find('[data-teste="badge-status"]').text()).toContain('Arquivado')
    expect(secao.find('.canais-contato--completa').exists()).toBe(true)
    expect(secao.find('[data-teste="estado-vazio"]').text()).toContain('Você ainda não possui fornecedores.')

    await secao.get('[data-chave="Fotografia"]').trigger('click')
    expect(secao.findAll('.guia__painel-fornecedores [data-teste="link-fornecedor"]').map((link) => link.text())).toEqual([
      'Fotografia Ângela Lima',
      'Florista Jardim',
    ])
  })

  it('[COMPONENTE] exibe a seção de fornecedores do casamento com resumo, os quatro status e os estados do contrato', async () => {
    wrapper = await montar()

    const secao = wrapper.get('#fornecedores-casamento')
    expect(secao.get('[data-teste="resumo-frase"]').text().replace(/\s+/g, ' ')).toBe('R$ 25.900,00 contratados de R$ 43.300,00 orçados')
    expect(secao.find('[data-teste="resumo-excedente"]').exists()).toBe(true)
    const status = secao.findAll('[data-teste="status-vinculo"]').map((selo) => selo.text())
    expect(status).toEqual(expect.arrayContaining(['Cotação', 'Em negociação', 'Contratado', 'Cancelado']))
    expect(secao.findAll('[data-teste="anexo-contrato"]')).toHaveLength(5)
    expect(secao.findAll('[data-teste="contrato-anexado"]')).toHaveLength(2)
  })
  it('[COMPONENTE] exibe a seção Cronograma do dia com as variantes da linha e os atalhos de preenchimento', async () => {
    wrapper = await montar()

    const secao = wrapper.get('#cronograma')
    const linhas = secao.findAll('[data-teste="linha-cronograma"]')
    expect(linhas).toHaveLength(3)
    expect(linhas[1]!.classes()).toEqual(expect.arrayContaining(['linha-cronograma--cerimonia', 'linha-cronograma--conflito']))
    expect(linhas[2]!.find('button').exists()).toBe(false)
    expect(linhas[2]!.get('[data-teste="linha-cronograma-termino"]').text()).toBe('02:00+1')
    const atalhos = secao.findAll('[data-teste="atalho-preenchimento"]')
    expect(atalhos[0]!.attributes('aria-pressed')).toBe('true')
    await atalhos[1]!.trigger('click')
    expect(secao.get('[data-teste="guia-local-escolhido"]').text()).toContain('Espaço Villa Real')
    expect(wrapper.get('.guia__indice').text()).toContain('Cronograma do dia')
  })

  it('[COMPONENTE] exibe a seção Duplicar casamento com as opções de cópia nos quatro estados e o que fica na origem', async () => {
    wrapper = await montar()

    const secao = wrapper.get('#duplicacao')
    const opcoes = secao.findAll('[data-teste="opcao-copia"]')
    expect(opcoes).toHaveLength(4)
    expect(opcoes[0]!.classes()).toContain('opcao-copia--marcada')
    expect(opcoes[1]!.classes()).not.toContain('opcao-copia--marcada')
    expect(opcoes[2]!.get('input').attributes('disabled')).toBeDefined()
    expect(opcoes[3]!.find('.p-skeleton').exists() || opcoes[3]!.get('[data-teste="opcao-copia-quantidade"]').text() === '').toBe(true)
    expect(secao.get('[data-teste="lista-nao-copiado"]').text()).toContain('Fica com Ana & João')
    expect(wrapper.get('.guia__indice').text()).toContain('Duplicar casamento')
  })

  it('[COMPONENTE] exibe a seção Financeiro com resumo de pagamentos, parcelas, linha do hoje e os estados do bloco', async () => {
    wrapper = await montar()

    const secao = wrapper.get('#financeiro')
    expect(secao.get('[data-teste="resumo-frase"]').text().replace(/\s+/g, ' ')).toBe('R$ 27.600,00 pagos de R$ 45.900,00 contratados')
    expect(secao.find('[data-teste="resumo-regua-total"]').exists()).toBe(true)
    expect(secao.find('[data-teste="linha-hoje"]').exists()).toBe(true)
    expect(secao.findAll('[data-teste="parcela-situacao"]').map((selo) => selo.text())).toEqual(
      expect.arrayContaining(['Vencida há 2 dias', 'Vence hoje', 'Vence em 5 dias', 'Pendente', 'Paga em 18 set']),
    )
    expect(secao.findAll('[data-teste="bloco-alertas-pagamentos"]')).toHaveLength(4)
  })
})
