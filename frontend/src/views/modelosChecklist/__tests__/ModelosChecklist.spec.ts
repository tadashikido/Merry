import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { aguardarAte, aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { SESSAO_EXEMPLO, corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { ID_ITEM, ID_MODELO, itemModelo, modeloCompleto, resumoModelo } from '@/__tests__/auxiliaresChecklist'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { TEXTOS_ITEM_MODELO, TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import { TEXTOS_MODELOS_POR_TIPO } from '@/textos/modelos'
import type { TipoEvento } from '@/tipos/eventos'
import { RaizRotas, chamadas, quando, rotearFetch } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('modelos-checklist', 'modelo-checklist', 'modelo-checklist-novo', 'modelo-checklist-editar', 'item-modelo-novo', 'item-modelo-editar', 'evento')

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_MODELOS = '/api/modelos-checklist'
const ROTA_MODELO = `${ROTA_MODELOS}/${ID_MODELO}`
const ROTA_ITENS = `${ROTA_MODELO}/itens`

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  notificacoes.sucesso.mockClear()
  notificacoes.erro.mockClear()
  fetchSimulado = simularFetch()
  simularMatchMedia(false)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
})

async function abrir(caminho: string) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return { montagem, wrapper }
}

describe('ModelosChecklistView', () => {
  it('[COMPONENTE] lista modelos com selo Sugerido, contagem e item Modelos ativo no rail', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo(), resumoModelo({ id: 'm2', nome: 'Destination wedding', sugerido: false, quantidadeItens: 1 })])))

    const { wrapper } = await abrir('/modelos-checklist')

    expect(wrapper.get('h1').text()).toBe(TEXTOS_MODELOS_CHECKLIST.titulo)
    const modelos = wrapper.findAll('[data-teste="modelo-checklist"]')
    expect(modelos).toHaveLength(2)
    expect(modelos[0]!.text()).toContain('Sugerido')
    expect(modelos[0]!.text()).toContain('26 itens')
    expect(modelos[1]!.text()).toContain('1 item')
    expect(modelos[0]!.get('[data-teste="link-modelo"]').attributes('href')).toBe(`/modelos-checklist/${ID_MODELO}`)
    const rail = wrapper.findAll('[data-teste="item-menu"]').find((item) => item.text() === 'Modelos')!
    expect(rail.attributes('aria-current')).toBe('page')
  })

  it('[COMPONENTE] cartões em grade larga com resumo no cabeçalho e aba Checklist ativa', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo(), resumoModelo({ id: 'm2', nome: 'Destination wedding', descricao: null, sugerido: false, quantidadeItens: 1, tipoEvento: null })])))

    const { wrapper } = await abrir('/modelos-checklist')

    expect(wrapper.get('[data-teste="resumo-modelos"]').text()).toBe(TEXTOS_MODELOS_CHECKLIST.resumo(2))
    expect(wrapper.get('[data-teste="resumo-modelos"]').attributes('aria-live')).toBe('polite')
    const lista = wrapper.get('[data-teste="lista-modelos"]')
    const grades = lista.findAll('ul.grade')
    expect(grades).toHaveLength(2)
    for (const grade of grades) {
      expect(grade.classes()).toEqual(expect.arrayContaining(['grade', 'grade--larga']))
      expect(grade.attributes('aria-labelledby')).toBeUndefined()
      expect(grade.element.closest('section')?.getAttribute('aria-labelledby')).toBeTruthy()
    }
    expect(wrapper.findAllComponents({ name: 'CartaoModelo' })).toHaveLength(2)
    const cartoes = wrapper.findAll('[data-teste="modelo-checklist"]')
    expect(cartoes[0]!.find('[data-teste="descricao-modelo"]').exists()).toBe(true)
    expect(cartoes[1]!.find('[data-teste="descricao-modelo"]').exists()).toBe(false)
    expect(cartoes[1]!.text()).not.toContain(TEXTOS_MODELOS_CHECKLIST.sugerido)
    expect(cartoes[0]!.get('[data-teste="menu-acoes"]').attributes('aria-label')).toBe(TEXTOS_MODELOS_CHECKLIST.maisAcoesAria(resumoModelo().nome))
    expect(wrapper.find('.abas-secao__aba--ativa').text()).toBe('Checklist')
    expect(wrapper.find('[data-teste="novo-modelo"]').exists()).toBe(true)
  })

  it('[COMPONENTE] lista vazia não mostra resumo; erro esconde Novo modelo do cabeçalho', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaJson([])))
    const { wrapper } = await abrir('/modelos-checklist')
    expect(wrapper.find('[data-teste="resumo-modelos"]').exists()).toBe(false)
    wrapper.unmount()

    fetchSimulado.mockReset()
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaProblema(500, { title: 'Erro' })))
    const segunda = await abrir('/modelos-checklist')
    expect(segunda.wrapper.find('[data-teste="novo-modelo"]').exists()).toBe(false)
    expect(segunda.wrapper.find('[data-teste="resumo-modelos"]').exists()).toBe(false)
  })

  it('[COMPONENTE] sem permissão mostra aviso da assessoria sem tentar de novo', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaProblema(403, { title: 'Proibido' })))
    const { wrapper } = await abrir('/modelos-checklist')
    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.semAcesso)
    expect(wrapper.find('[data-teste="lista-modelos"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilo da tela usa @container, sem @media, largura de leitura nem espaçamento solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../ModelosChecklistView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).toContain('container: modelos com-lateral / inline-size')
    expect(estilo).toContain('@container com-lateral (min-width: 52rem)')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('largura-leitura')
    expect(estilo).not.toContain('--p-espaco-')
    expect(fonte).toContain('class="modelos com-lateral pilha pilha--cartao"')
  })

  it('[COMPONENTE] agrupa por tipo com selo do tipo, modelo da assessoria e tipo desconhecido neutro', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELOS, () =>
        respostaJson([
          resumoModelo({ id: 'm1', nome: 'Essencial casamento', tipoEvento: 'Casamento' }),
          resumoModelo({ id: 'm2', nome: 'Essencial 15 anos', tipoEvento: 'QuinzeAnos' }),
          resumoModelo({ id: 'm3', nome: 'Essencial aniversário', tipoEvento: 'Aniversario' }),
          resumoModelo({ id: 'm4', nome: 'Essencial comemoração', tipoEvento: 'Comemoracao' }),
          resumoModelo({ id: 'm5', nome: 'Formatura', tipoEvento: 'Formatura' as unknown as TipoEvento }),
          resumoModelo({ id: 'm6', nome: 'Evento no campo', sugerido: false, tipoEvento: null }),
        ]),
      ),
    )

    const { wrapper } = await abrir('/modelos-checklist')

    const grupos = wrapper.findAll('[data-teste="grupo-modelos"]')
    expect(grupos.map((grupo) => grupo.get('h2').text())).toEqual(['Casamentos', 'Festas de 15 anos', 'Aniversários', 'Comemorações', 'Para qualquer tipo de evento', 'Outros tipos de evento'])
    const selo = (nome: string) => {
      const cartao = wrapper.findAll('[data-teste="modelo-checklist"]').find((item) => item.text().includes(nome))!
      return cartao.find('[data-teste="badge-status"]').exists() ? cartao.get('[data-teste="badge-status"]').text() : cartao.get('[data-teste="origem-modelo"]').text()
    }
    expect(selo('Essencial casamento')).toBe('Sugerido para casamento')
    expect(selo('Essencial 15 anos')).toBe('Sugerido para festa de 15 anos')
    expect(selo('Essencial aniversário')).toBe('Sugerido para aniversário')
    expect(selo('Essencial comemoração')).toBe('Sugerido para comemoração')
    expect(selo('Formatura')).toBe(TEXTOS_MODELOS_CHECKLIST.sugerido)
    expect(selo('Evento no campo')).toBe(TEXTOS_MODELOS_POR_TIPO.origemAssessoria)
    expect(wrapper.findAll('[data-teste="modelo-checklist"] h3')).toHaveLength(6)
    expect(wrapper.find('[data-teste="modelo-checklist"] h2').exists()).toBe(false)
  })

  it('[COMPONENTE] lateral mostra o que cada tipo recebe ao aplicar o checklist e como reaproveitar', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo(), resumoModelo({ id: 'm2', nome: 'Evento no campo', sugerido: false, tipoEvento: null })])))

    const { wrapper } = await abrir('/modelos-checklist')

    const lateral = wrapper.get('[data-teste="cobertura-modelos"]')
    const textos = lateral.findAll('[data-teste="cobertura-tipo"]').map((linha) => linha.text().replace(/\s+/g, ' '))
    expect(textos[0]).toContain('Casamentos')
    expect(textos[0]).toContain('2 modelos')
    expect(textos[0]).toContain('Inclui o sugerido para casamento.')
    expect(textos[1]).toContain('Festas de 15 anos')
    expect(textos[1]).toContain('1 modelo')
    expect(textos[1]).toContain(TEXTOS_MODELOS_POR_TIPO.soQualquer)
    expect(lateral.get('[data-teste="reaproveitamento-modelos"]').findAll('li')).toHaveLength(TEXTOS_MODELOS_CHECKLIST.reaproveitamento.length)
    const corpo = wrapper.get('[data-teste="lista-modelos"]').element
    expect(corpo.lastElementChild).toBe(lateral.element)
  })

  it('[COMPONENTE] vazio ensina reaproveitamento e não mostra lateral', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaJson([])))

    const { wrapper } = await abrir('/modelos-checklist')

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.vazioTexto)
    expect(wrapper.find('[data-teste="cobertura-modelos"]').exists()).toBe(false)
    expect(TEXTOS_MODELOS_CHECKLIST.vazioTexto).not.toMatch(/casamento|casal/i)
  })

  it('[COMPONENTE] estado vazio e erro', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaJson([])))
    const { wrapper } = await abrir('/modelos-checklist')
    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.vazioTitulo)
    expect(wrapper.find('[data-teste="novo-modelo-vazio"]').exists()).toBe(true)
    wrapper.unmount()

    fetchSimulado.mockReset()
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaProblema(500, { title: 'Erro' })))
    const segunda = await abrir('/modelos-checklist')
    expect(segunda.wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.erroTitulo)
  })

  it('[COMPONENTE] excluir pede confirmação explicando a consequência', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('DELETE', ROTA_MODELO, () => respostaVazia()),
    )
    const { wrapper, montagem } = await abrir('/modelos-checklist')
    const confirmacao = useConfirmacaoExclusaoStore(montagem.pinia)

    wrapper.findComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'excluir')
    await flushPromises()

    expect(confirmacao.visivel).toBe(true)
    expect(confirmacao.nomeItem).toBe('Checklist essencial')
    expect(confirmacao.mensagem).toContain('Os 26 itens saem do modelo.')
    expect(confirmacao.mensagem).toContain('deixam de contar no checklist')
    await confirmacao.confirmar()
    await flushPromises()
    expect(chamadas(fetchSimulado, 'DELETE', ROTA_MODELO)).toHaveLength(1)
    expect(wrapper.findAll('[data-teste="modelo-checklist"]')).toHaveLength(0)
  })
})

describe('ModeloChecklistView', () => {
  it('[COMPONENTE] mostra os itens na régua de marcos com prazo relativo', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () =>
        respostaJson(
          modeloCompleto([
            itemModelo(),
            itemModelo({ id: 'i2', titulo: 'Prova final dos trajes', diasAntesDoEvento: 30, responsavel: 'Anfitriao', categoria: 'TrajesBeleza' }),
            itemModelo({ id: 'i3', titulo: 'Entregar o álbum', diasAntesDoEvento: -20, categoria: 'Geral' }),
          ]),
        ),
      ),
    )

    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}`)

    expect(wrapper.get('h1').text()).toBe('Checklist essencial')
    expect(wrapper.get('[data-teste="resumo-modelo"]').text()).toContain('3 itens')
    expect(wrapper.get('[data-teste="marco-dozeMeses"]').text()).toContain('365 dias antes')
    expect(wrapper.get('[data-teste="marco-trintaDias"]').text()).toContain('Trajes e beleza')
    expect(wrapper.get('[data-teste="marco-depois"]').text()).toContain('20 dias depois')
    expect(wrapper.findAll('li.regua__marco').map((marco) => marco.attributes('data-teste'))).toEqual(['marco-dozeMeses', 'marco-trintaDias', 'marco-depois'])
  })

  it('[COMPONENTE] modelo inexistente mostra não encontrado com volta', async () => {
    rotearFetch(fetchSimulado)

    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}`)

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.naoEncontradoTitulo)
    expect(wrapper.get('[data-teste="voltar"]').attributes('href')).toBe('/modelos-checklist')
  })

  it('[COMPONENTE] lateral resume total, itens por marco e por responsável, com volta para a lista', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () =>
        respostaJson(
          modeloCompleto([
            itemModelo(),
            itemModelo({ id: 'i2', titulo: 'Definir orçamento', diasAntesDoEvento: 400, responsavel: 'Anfitriao' }),
            itemModelo({ id: 'i3', titulo: 'Prova final dos trajes', diasAntesDoEvento: 30, responsavel: 'Anfitriao' }),
          ]),
        ),
      ),
    )

    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}`)

    const lateral = wrapper.get('[data-teste="lateral-modelo"]')
    expect(lateral.element.tagName).toBe('ASIDE')
    expect(lateral.attributes('aria-labelledby')).toBe('titulo-resumo-modelo')
    expect(wrapper.get('#titulo-resumo-modelo').text()).toBe(TEXTOS_MODELOS_CHECKLIST.resumoTitulo)
    expect(lateral.get('[data-teste="total-itens-modelo"]').text()).toBe('3 itens')
    expect(lateral.get('[data-teste="nota-prazos-modelo"]').text()).toBe(TEXTOS_MODELOS_CHECKLIST.notaPrazos('do casamento'))
    expect(lateral.get('[data-teste="resumo-marco-dozeMeses"]').text()).toContain('2')
    expect(lateral.get('[data-teste="resumo-marco-trintaDias"]').text()).toContain('1')
    expect(lateral.get('[data-teste="resumo-responsavel-Assessoria"]').text()).toContain('1')
    expect(lateral.get('[data-teste="resumo-responsavel-Anfitriao"]').text()).toContain('2')
    expect(lateral.get('[data-teste="voltar-lateral"]').attributes('href')).toBe('/modelos-checklist')
    const listas = wrapper.findAll('ul.modelo__lista.cartao')
    expect(listas).toHaveLength(2)
    expect(listas[0]!.attributes('aria-labelledby')).toBe(wrapper.get('[data-teste="marco-dozeMeses"] h2').attributes('id'))
    expect(listas[0]!.findAll('[data-teste="item-modelo-checklist"]')).toHaveLength(2)
  })

  it('[COMPONENTE] responsável sem itens não aparece no resumo', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([itemModelo()]))))

    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}`)

    expect(wrapper.find('[data-teste="resumo-responsavel-Assessoria"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="resumo-responsavel-Anfitriao"]').exists()).toBe(false)
  })

  it('[COMPONENTE] modelo sem itens mostra o convite e não mostra a lateral', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([]))))

    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}`)

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.itensVazioTitulo)
    expect(wrapper.find('[data-teste="adicionar-item-vazio"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="lateral-modelo"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="resumo-modelo"]').text()).toContain('0 itens')
  })

  it('[COMPONENTE] erro de rede mostra tentar de novo e sem permissão mostra aviso', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaProblema(500, { title: 'Erro' })))
    const primeira = await abrir(`/modelos-checklist/${ID_MODELO}`)
    expect(primeira.wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.erroTitulo)
    expect(primeira.wrapper.find('[data-teste="lateral-modelo"]').exists()).toBe(false)
    expect(primeira.wrapper.find('[data-teste="adicionar-item"]').exists()).toBe(false)
    primeira.wrapper.unmount()

    fetchSimulado.mockReset()
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaProblema(403, { title: 'Proibido' })))
    const segunda = await abrir(`/modelos-checklist/${ID_MODELO}`)
    expect(segunda.wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.semAcesso)
  })

  it('[COMPONENTE] excluir item confirma, chama a store e atualiza o resumo', async () => {
    const restante = itemModelo({ id: 'i2', titulo: 'Definir orçamento', responsavel: 'Anfitriao' })
    let excluido = false
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto(excluido ? [restante] : [itemModelo(), restante]))),
      quando('DELETE', `${ROTA_ITENS}/${ID_ITEM}`, () => {
        excluido = true
        return respostaVazia()
      }),
    )
    const { wrapper, montagem } = await abrir(`/modelos-checklist/${ID_MODELO}`)
    const confirmacao = useConfirmacaoExclusaoStore(montagem.pinia)

    wrapper.findAllComponents({ name: 'MenuAcoes' })[0]!.vm.$emit('selecionar', 'excluir')
    await flushPromises()

    expect(confirmacao.visivel).toBe(true)
    expect(confirmacao.mensagem).toBe(TEXTOS_MODELOS_CHECKLIST.itemConfirmarExclusaoTexto)
    await confirmacao.confirmar()
    await flushPromises()
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_ITENS}/${ID_ITEM}`)).toHaveLength(1)
    expect(wrapper.get('[data-teste="total-itens-modelo"]').text()).toBe('1 item')
  })

  it.each([
    ['Casamento', 'casamento', 'do casamento', 'Abra um casamento e entre em Checklist.'],
    ['QuinzeAnos', 'festa de 15 anos', 'da festa de 15 anos', 'Abra uma festa de 15 anos e entre em Checklist.'],
    ['Aniversario', 'aniversário', 'do aniversário', 'Abra um aniversário e entre em Checklist.'],
    ['Comemoracao', 'comemoração', 'da comemoração', 'Abra uma comemoração e entre em Checklist.'],
  ] as const)('[COMPONENTE] modelo sugerido de %s mostra o tipo, onde aparece e fala da data do tipo', async (tipo, singular, contracaoDe, abrirEvento) => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () =>
        respostaJson(
          modeloCompleto(
            [itemModelo({ diasAntesDoEvento: 180 }), itemModelo({ id: 'i2', titulo: 'Conferir montagem', diasAntesDoEvento: 0 }), itemModelo({ id: 'i3', titulo: 'Pagar saldo', diasAntesDoEvento: -10 })],
            { tipoEvento: tipo },
          ),
        ),
      ),
    )

    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}`)

    const resumo = wrapper.get('[data-teste="resumo-modelo"]')
    expect(resumo.text()).toContain(TEXTOS_MODELOS_POR_TIPO.sugeridoPara(singular))
    expect(resumo.find('[data-teste="origem-modelo"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="onde-aparece-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.notaTipo('checklist', singular))
    expect(wrapper.get('[data-teste="marco-seisMeses"] h2').text()).toContain(`antes ${contracaoDe}`)
    expect(wrapper.get('[data-teste="marco-noDia"] h2').text()).toContain(contracaoDe)
    expect(wrapper.get('[data-teste="marco-noDia"] [data-teste="prazo-item-modelo"]').text()).toBe(`No dia ${contracaoDe}`)
    expect(wrapper.get('[data-teste="primeiro-prazo-modelo"]').text()).toBe(`180 dias antes ${contracaoDe}`)
    expect(wrapper.get('[data-teste="ultimo-prazo-modelo"]').text()).toBe(`10 dias depois ${contracaoDe}`)
    expect(wrapper.get('[data-teste="nota-prazos-modelo"]').text()).toBe(TEXTOS_MODELOS_CHECKLIST.notaPrazos(contracaoDe))
    const passos = wrapper.findAll('[data-teste="passo-aplicar-modelo"]').map((passo) => passo.get('.como-aplicar__texto').text())
    expect(passos).toEqual([abrirEvento, ...TEXTOS_MODELOS_CHECKLIST.passosAplicar('Checklist essencial', contracaoDe)])
    expect(wrapper.get('.modelo').text()).not.toContain('do evento')
  })

  it('[COMPONENTE] modelo próprio sem tipo mostra Modelo da assessoria e textos de qualquer evento', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([itemModelo({ titulo: 'Reservar o local', diasAntesDoEvento: 30 })], { sugerido: false, tipoEvento: null, nome: 'Evento no campo' }))))

    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}`)

    const resumo = wrapper.get('[data-teste="resumo-modelo"]')
    expect(resumo.text()).not.toContain(TEXTOS_MODELOS_CHECKLIST.sugerido)
    expect(resumo.get('[data-teste="origem-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.origemAssessoria)
    expect(wrapper.get('[data-teste="onde-aparece-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.notaQualquer('checklist'))
    expect(wrapper.get('[data-teste="marco-trintaDias"] h2').text()).toContain('antes do evento')
    expect(wrapper.get('[data-teste="primeiro-prazo-modelo"]').text()).toBe('30 dias antes do evento')
    expect(wrapper.find('[data-teste="ultimo-prazo-modelo"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-teste="passo-aplicar-modelo"]')[0]!.text()).toContain(TEXTOS_MODELOS_POR_TIPO.abrirQualquerEvento())
    expect(wrapper.get('main').text()).not.toMatch(/casamento|comemoração/i)
  })

  it('[COMPONENTE] tipo desconhecido usa selo Sugerido, nota de tipo não reconhecido e vocabulário neutro', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([itemModelo({ titulo: 'Conferir o salão', diasAntesDoEvento: 0 })], { tipoEvento: 'Formatura' as unknown as TipoEvento, nome: 'Modelo de formatura' }))))

    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}`)

    const resumo = wrapper.get('[data-teste="resumo-modelo"]')
    expect(resumo.text()).toContain(TEXTOS_MODELOS_CHECKLIST.sugerido)
    expect(resumo.text()).not.toContain('Sugerido para')
    expect(wrapper.get('[data-teste="onde-aparece-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.notaOutros)
    expect(wrapper.get('[data-teste="primeiro-prazo-modelo"]').text()).toBe('No dia do evento')
    expect(wrapper.findAll('[data-teste="passo-aplicar-modelo"]')[0]!.text()).toContain(TEXTOS_MODELOS_POR_TIPO.abrirEventoOutroTipo())
    expect(wrapper.get('main').text()).not.toMatch(/casamento|comemoração/i)
  })

  it('[COMPONENTE] modelo vazio ensina pelo tipo e não mostra Como aplicar', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([], { tipoEvento: 'Aniversario' }))))

    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}`)

    expect(wrapper.find('[data-teste="como-aplicar-modelo"]').exists()).toBe(false)
    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.itensVazioTextoPara('do aniversário'))
  })

  it('[COMPONENTE] ordem no DOM: resumo, itens e depois Como aplicar', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([itemModelo()]))))

    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}`)

    const filhos = [...wrapper.get('.modelo__corpo').element.children].map((filho) => filho.className)
    expect(filhos[0]).toContain('modelo__lateral')
    expect(filhos[1]).toContain('modelo__principal')
    expect(filhos[2]).toContain('modelo__aplicar')
    expect(wrapper.get('[data-teste="nota-aplicar-modelo"]').text()).toBe(TEXTOS_MODELOS_CHECKLIST.notaAplicar)
  })

  it('[UNITÁRIO] estilo do detalhe usa @container, sem @media, largura de leitura nem espaçamento solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../ModeloChecklistView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).toContain('container: modelo com-lateral / inline-size')
    expect(estilo).toContain('@container com-lateral (min-width: 52rem)')
    expect(estilo).toContain('@container lateral-modelo (min-width: 36rem)')
    expect(estilo).not.toContain('sticky')
    expect(estilo).toContain('grid-row: 1 / span 2')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('largura-leitura')
    expect(estilo).not.toContain('--p-espaco-')
    expect(fonte).toContain('class="modelo com-lateral pilha pilha--bloco"')
  })

  it('[UNITÁRIO] prazo do item não usa a cor primária', () => {
    const fonte = readFileSync(resolve(__dirname, '../../../componentes/base/ItemModeloChecklist.vue'), 'utf-8')
    const regraPrazo = fonte.slice(fonte.indexOf('.item-modelo__prazo'), fonte.indexOf('}', fonte.indexOf('.item-modelo__prazo')))
    expect(regraPrazo).not.toContain('--p-cor-primaria')
    expect(regraPrazo).toContain('--p-cor-texto-secundario')
  })
})

describe('Formulários de modelo e item', () => {
  it('[COMPONENTE] cria modelo e vai para o detalhe', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_MODELOS, () => respostaJson(modeloCompleto([], { sugerido: false, nome: 'Campo' }), 201)),
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([], { sugerido: false, nome: 'Campo' }))),
    )
    const { wrapper, montagem } = await abrir('/modelos-checklist/novo')

    await wrapper.get('[data-teste="campo-nome"]').setValue('  Campo ')
    await wrapper.get('[data-teste="formulario-modelo"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', ROTA_MODELOS)
    expect(corpoDaChamada(chamada!)).toEqual({ nome: 'Campo', descricao: null })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_MODELOS_CHECKLIST.toastCriado)
    await aguardarRota(montagem.roteador, 'modelo-checklist')
  })

  it('[COMPONENTE] nome curto e nome repetido mostram erro', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_MODELOS, () => respostaProblema(422, { title: 'Regra', detail: 'Já existe um modelo com esse nome.' })))
    const { wrapper } = await abrir('/modelos-checklist/novo')

    await wrapper.get('[data-teste="campo-nome"]').setValue('A')
    await wrapper.get('[data-teste="formulario-modelo"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.erroNomeTamanho)
    expect(chamadas(fetchSimulado, 'POST', ROTA_MODELOS)).toHaveLength(0)

    await wrapper.get('[data-teste="campo-nome"]').setValue('Campo')
    await wrapper.get('[data-teste="formulario-modelo"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-teste="erro-formulario"]').text()).toContain('Já existe um modelo com esse nome.')
  })

  it('[COMPONENTE] criação mostra orientação no cabeçalho e campos agrupados em "Sobre o modelo"', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir('/modelos-checklist/novo')

    const pagina = wrapper.get('.pagina-formulario')
    expect(pagina.get('h1').text()).toBe(TEXTOS_MODELOS_CHECKLIST.formNovo)
    expect(pagina.text()).toContain(TEXTOS_MODELOS_CHECKLIST.formNovoDescricao)
    const grupo = pagina.get('[data-teste="grupo-modelo"]')
    expect(grupo.element.tagName).toBe('FIELDSET')
    expect(grupo.get('legend').text()).toBe(TEXTOS_MODELOS_CHECKLIST.grupoModelo)
    expect(grupo.get('legend').classes()).toContain('texto-rotulo')
    expect(grupo.find('[data-teste="campo-nome"]').exists()).toBe(true)
    expect(grupo.find('[data-teste="campo-descricao"]').exists()).toBe(true)
    expect(wrapper.get('[data-teste="formulario-modelo"]').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    expect(wrapper.get('[data-teste="salvar-modelo"]').text()).toBe(TEXTOS_MODELOS_CHECKLIST.criar)
  })

  it('[COMPONENTE] edição mostra o nome carregado no cabeçalho, salva com PUT e volta ao detalhe', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([], { nome: 'Evento no campo', descricao: 'Ao ar livre' }))),
      quando('PUT', ROTA_MODELO, () => respostaJson(modeloCompleto([], { nome: 'Campo e praia' }))),
    )
    const { wrapper, montagem } = await abrir(`/modelos-checklist/${ID_MODELO}/editar`)

    expect(wrapper.get('h1').text()).toBe(TEXTOS_MODELOS_CHECKLIST.formEditar)
    expect(wrapper.get('.cabecalho-pagina__descricao').text()).toBe('Evento no campo')
    expect((wrapper.get('[data-teste="campo-descricao"]').element as HTMLTextAreaElement).value).toBe('Ao ar livre')

    await wrapper.get('[data-teste="campo-nome"]').setValue('Campo e praia')
    expect(wrapper.get('.cabecalho-pagina__descricao').text()).toBe('Evento no campo')
    await wrapper.get('[data-teste="formulario-modelo"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'PUT', ROTA_MODELO)
    expect(corpoDaChamada(chamada!)).toEqual({ nome: 'Campo e praia', descricao: 'Ao ar livre' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_MODELOS_CHECKLIST.toastSalvo)
    await aguardarRota(montagem.roteador, 'modelo-checklist')
  })

  it('[COMPONENTE] erro só aparece depois da primeira tentativa e some ao digitar um nome válido', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir('/modelos-checklist/novo')
    const campoNome = wrapper.get('[data-teste="campo-nome"]')

    await campoNome.trigger('blur')
    expect(wrapper.text()).not.toContain(TEXTOS_MODELOS_CHECKLIST.erroNomeTamanho)

    await campoNome.setValue('A')
    await campoNome.trigger('blur')
    expect(wrapper.text()).not.toContain(TEXTOS_MODELOS_CHECKLIST.erroNomeTamanho)

    await wrapper.get('[data-teste="formulario-modelo"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.erroNomeTamanho)

    await campoNome.setValue('Campo')
    expect(wrapper.text()).not.toContain(TEXTOS_MODELOS_CHECKLIST.erroNomeTamanho)

    await campoNome.setValue('B')
    expect(wrapper.text()).not.toContain(TEXTOS_MODELOS_CHECKLIST.erroNomeTamanho)
    await campoNome.trigger('blur')
    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.erroNomeTamanho)
  })

  it('[COMPONENTE] edição de modelo inexistente mostra não encontrado sem formulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaProblema(404, { title: 'Não encontrado' })))
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/editar`)

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.naoEncontradoTitulo)
    expect(wrapper.find('[data-teste="formulario-modelo"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] edição sem permissão mostra aviso da assessoria sem formulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaProblema(403, { title: 'Proibido' })))
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/editar`)

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CHECKLIST.semAcesso)
    expect(wrapper.find('[data-teste="formulario-modelo"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilo do formulário de modelo usa @container, sem @media, largura de leitura nem espaçamento solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../ModeloChecklistFormularioView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(fonte).toContain('class="pagina-formulario formulario-modelo-tela__pagina com-lateral__pagina')
    expect(estilo).toContain('container: formulario-modelo / inline-size')
    expect(estilo).toContain('@container formulario-modelo (min-width: 40rem)')
    expect(estilo).not.toContain('container: formulario-modelo-tela /')
    expect(estilo).not.toContain('@container formulario-modelo-tela ')
    expect(estilo).not.toContain('sticky')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('largura-leitura')
    expect(estilo).not.toContain('--p-espaco-')
    expect(fonte).not.toContain("validarCampo('")
  })

  it('[COMPONENTE] criação mostra lateral para qualquer evento, exemplos dos 4 tipos e Depois de criar', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir('/modelos-checklist/novo')

    expect(wrapper.get('.formulario-modelo-tela__pagina').classes()).toContain('com-lateral__pagina--ativa')
    const lateral = wrapper.get('[data-teste="lateral-formulario-modelo"]')
    expect(lateral.get('[data-teste="selo-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.origemAssessoria)
    expect(lateral.get('[data-teste="onde-aparece-modelo"]').text()).toBe('Na lista ao aplicar o checklist de qualquer evento.')
    expect(lateral.findAll('[data-teste="exemplos-nome-modelo"] dd')).toHaveLength(4)
    expect(lateral.get('[data-teste="dicas-modelo"]').text()).toContain('data do evento')
    const passos = lateral.findAll('[data-teste="passo-aplicar-modelo"]').map((passo) => passo.text())
    expect(passos).toHaveLength(3)
    expect(passos[0]).toContain(TEXTOS_MODELOS_CHECKLIST.depoisDeCriarItens)
    expect(passos[1]).toContain(TEXTOS_MODELOS_POR_TIPO.abrirQualquerEvento())
    expect(passos[2]).toContain('Aplicar checklist ou Aplicar outro modelo')
    expect(lateral.get('[data-teste="como-aplicar-modelo"] h2').text()).toBe(TEXTOS_MODELOS_POR_TIPO.depoisDeCriarTitulo)
    expect(lateral.find('a, button').exists()).toBe(false)
  })

  it('[COMPONENTE] formulário vem antes da lateral no DOM', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir('/modelos-checklist/novo')

    const formulario = wrapper.get('[data-teste="formulario-modelo"]').element
    const lateral = wrapper.get('[data-teste="lateral-formulario-modelo"]').element
    expect(formulario.compareDocumentPosition(lateral) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each([
    ['Casamento', 'Sugerido para casamento', 'de cada casamento', 'data do casamento'],
    ['QuinzeAnos', 'Sugerido para festa de 15 anos', 'de cada festa de 15 anos', 'data da festa de 15 anos'],
    ['Aniversario', 'Sugerido para aniversário', 'de cada aniversário', 'data do aniversário'],
    ['Comemoracao', 'Sugerido para comemoração', 'de cada comemoração', 'data da comemoração'],
  ] as const)('[COMPONENTE] edição de sugerido %s mostra o tipo na lateral, sem Depois de criar', async (tipo, selo, onde, data) => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([itemModelo(), itemModelo()], { tipoEvento: tipo }))))
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/editar`)

    const lateral = wrapper.get('[data-teste="lateral-formulario-modelo"]')
    expect(lateral.get('[data-teste="selo-modelo"]').text()).toBe(selo)
    expect(lateral.get('[data-teste="onde-aparece-modelo"]').text()).toContain(onde)
    expect(lateral.get('[data-teste="contagem-modelo"]').text()).toBe(TEXTOS_MODELOS_CHECKLIST.resumoItens(2))
    expect(lateral.get('[data-teste="dicas-modelo"]').text()).toContain(data)
    expect(lateral.find('[data-teste="como-aplicar-modelo"]').exists()).toBe(false)
  })

  it.each([
    ['nulo', null, TEXTOS_MODELOS_POR_TIPO.origemAssessoria, false],
    ['desconhecido', 'Formatura' as unknown as TipoEvento, 'Sugerido', true],
  ] as const)('[COMPONENTE] edição de modelo com tipo %s não cai em casamento nem comemoração', async (_, tipo, selo, sugerido) => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([], { tipoEvento: tipo, sugerido, nome: 'Evento no campo' }))),
    )
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/editar`)

    const lateral = wrapper.get('[data-teste="lateral-formulario-modelo"]')
    expect(lateral.get('[data-teste="selo-modelo"]').text()).toBe(selo)
    expect(lateral.get('[data-teste="onde-modelo"]').text()).not.toMatch(/casamento|comemoração/i)
    expect(lateral.get('[data-teste="dicas-modelo"]').text()).toContain('data do evento')
  })

  it('[COMPONENTE] não encontrado e sem permissão não mostram a lateral nem alargam a página', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaProblema(403, { title: 'Proibido' })))
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/editar`)

    expect(wrapper.find('[data-teste="lateral-formulario-modelo"]').exists()).toBe(false)
    expect(wrapper.get('.formulario-modelo-tela__pagina').classes()).not.toContain('com-lateral__pagina--ativa')
  })

  it('[COMPONENTE] item com "depois do evento" envia dias negativos', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([]))),
      quando('POST', ROTA_ITENS, () => respostaJson(itemModelo({ diasAntesDoEvento: -15 }), 201)),
    )
    const { wrapper, montagem } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/novo`)

    expect(wrapper.get('[data-teste="campo-quando"] legend').text()).toBe(TEXTOS_ITEM_MODELO.campoQuando)
    await wrapper.get('[data-teste="campo-titulo"]').setValue('Enviar fotos para o álbum')
    const dias = wrapper.get('[data-teste="campo-dias"] input')
    await dias.setValue('15')
    await dias.trigger('input')
    await dias.trigger('blur')
    const depois = wrapper.get('[data-teste="campo-sentido"]').findAll('[role="radio"], button, [data-pc-section="pcbutton"]').find((opcao) => opcao.text() === 'depois do evento')!
    await depois.trigger('click')
    await wrapper.get('[data-teste="formulario-item-modelo"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', ROTA_ITENS)
    expect(corpoDaChamada(chamada!)).toMatchObject({ titulo: 'Enviar fotos para o álbum', diasAntesDoEvento: -15, responsavel: 'Assessoria', categoria: 'Geral' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_ITEM_MODELO.toastCriado)
    await aguardarRota(montagem.roteador, 'modelo-checklist')
  })

  it('[COMPONENTE] edição preenche o item e mapeia erro do servidor para o campo Dias', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([itemModelo({ diasAntesDoEvento: -10 })]))),
      quando('PUT', `${ROTA_ITENS}/${ID_ITEM}`, () =>
        respostaProblema(400, { title: 'Dados inválidos', errors: { DiasAntesDoEvento: ['Use de 0 a 1.095 dias antes ou até 365 dias depois.'] } }),
      ),
    )
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/${ID_ITEM}/editar`)

    expect((wrapper.get('[data-teste="campo-titulo"]').element as HTMLInputElement).value).toBe('Reservar local da cerimônia e da recepção')
    expect((wrapper.get('[data-teste="campo-dias"] input').element as HTMLInputElement).value).toBe('10')
    await wrapper.get('[data-teste="formulario-item-modelo"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Use de 0 a 1.095 dias antes ou até 365 dias depois.')
    expect(corpoDaChamada(chamadas(fetchSimulado, 'PUT', `${ROTA_ITENS}/${ID_ITEM}`)[0]!)).toMatchObject({ diasAntesDoEvento: -10 })
  })

  it('[COMPONENTE] formulário de item agrupa "O item" e "Prazo e responsável" com o nome do modelo no cabeçalho', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([]))))
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/novo`)

    const pagina = wrapper.get('.pagina-formulario')
    expect(pagina.get('h1').text()).toBe(TEXTOS_ITEM_MODELO.formNovo)
    expect(pagina.get('.cabecalho-pagina__descricao').text()).toBe('Checklist essencial')
    expect(wrapper.get('[data-teste="formulario-item-modelo"]').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))

    const grupoItem = pagina.get('[data-teste="grupo-item"]')
    expect(grupoItem.element.tagName).toBe('FIELDSET')
    expect(grupoItem.get('legend').text()).toBe(TEXTOS_ITEM_MODELO.grupoItem)
    expect(grupoItem.get('legend').classes()).toContain('texto-rotulo')
    for (const campo of ['campo-titulo', 'campo-categoria', 'campo-descricao']) {
      expect(grupoItem.find(`[data-teste="${campo}"]`).exists()).toBe(true)
    }

    const grupoPrazo = pagina.get('[data-teste="grupo-prazo"]')
    expect(grupoPrazo.element.tagName).toBe('FIELDSET')
    expect(grupoPrazo.get('legend').text()).toBe(TEXTOS_ITEM_MODELO.grupoPrazo)
    expect(grupoPrazo.get('legend').classes()).toContain('texto-rotulo')
    for (const campo of ['campo-quando', 'campo-dias', 'campo-sentido', 'campo-responsavel']) {
      expect(grupoPrazo.find(`[data-teste="${campo}"]`).exists()).toBe(true)
    }
    expect(grupoPrazo.find('[data-teste="campo-titulo"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="salvar-item"]').text()).toBe(TEXTOS_ITEM_MODELO.criar)
  })

  it('[COMPONENTE] erro do título só aparece depois da primeira tentativa, leva o foco e some ao digitar', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([]))))
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/novo`)
    const campoTitulo = wrapper.get('[data-teste="campo-titulo"]')

    await campoTitulo.trigger('blur')
    expect(wrapper.text()).not.toContain('Preencha este campo.')

    await wrapper.get('[data-teste="formulario-item-modelo"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Preencha este campo.')
    await aguardarAte(() => expect(document.activeElement?.id).toBe('item-modelo-titulo'))
    expect(chamadas(fetchSimulado, 'POST', ROTA_ITENS)).toHaveLength(0)

    await campoTitulo.setValue('Provar o vestido')
    expect(wrapper.text()).not.toContain('Preencha este campo.')
  })

  it('[COMPONENTE] trocar o sentido refaz a validação de dias depois da tentativa', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([]))))
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/novo`)

    await wrapper.get('[data-teste="campo-titulo"]').setValue('Enviar fotos para o álbum')
    const dias = wrapper.get('[data-teste="campo-dias"] input')
    await dias.setValue('500')
    await dias.trigger('input')
    await dias.trigger('blur')
    const opcoes = () => wrapper.get('[data-teste="campo-sentido"]').findAll('[role="radio"], button, [data-pc-section="pcbutton"]')
    await opcoes().find((opcao) => opcao.text() === 'depois do evento')!.trigger('click')
    expect(wrapper.text()).not.toContain(TEXTOS_ITEM_MODELO.erroDias)

    await wrapper.get('[data-teste="formulario-item-modelo"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_ITEM_MODELO.erroDias)
    await aguardarAte(() => expect(document.activeElement?.id).toBe('item-modelo-dias'))

    await opcoes().find((opcao) => opcao.text() === 'antes do evento')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain(TEXTOS_ITEM_MODELO.erroDias)
  })

  it('[UNITÁRIO] estilo do formulário de item usa @container, sem @media, largura de leitura nem espaçamento solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../ItemModeloChecklistFormularioView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(fonte).toContain('class="pagina-formulario formulario-item-tela__pagina com-lateral__pagina')
    expect(estilo).toContain('container: formulario-item / inline-size')
    expect(estilo).toContain('@container formulario-item (min-width: 40rem)')
    expect(estilo).not.toContain('container: formulario-item-tela /')
    expect(estilo).not.toContain('@container formulario-item-tela ')
    expect(estilo).not.toContain('sticky')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('largura-leitura')
    expect(estilo).not.toContain('--p-espaco-')
    expect(fonte).not.toContain("validarCampo('")
  })

  it.each([
    ['Casamento', 'Reservar o local da cerimônia', 'Cerca de 6 meses antes do casamento', 'um casamento'],
    ['QuinzeAnos', 'Escolher o vestido da valsa', 'Cerca de 6 meses antes da festa de 15 anos', 'uma festa de 15 anos'],
    ['Aniversario', 'Reservar o espaço da festa', 'Cerca de 6 meses antes do aniversário', 'um aniversário'],
    ['Comemoracao', 'Reservar o espaço', 'Cerca de 6 meses antes da comemoração', 'uma comemoração'],
  ] as const)('[COMPONENTE] item de modelo %s traduz placeholder, dica e lateral para o tipo', async (tipo, exemplo, previa, indefinido) => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([itemModelo({ id: 'outro', titulo: 'Contratar o buffet', diasAntesDoEvento: 200 })], { tipoEvento: tipo }))))
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/novo`)

    expect(wrapper.get('[data-teste="campo-titulo"]').attributes('placeholder')).toBe(`Ex.: ${exemplo}`)
    expect(wrapper.get('[data-teste="campo-quando"]').text()).toContain(`${previa}.`)
    expect(wrapper.get('.formulario-item-tela__pagina').classes()).toContain('com-lateral__pagina--ativa')
    const lateral = wrapper.get('[data-teste="lateral-formulario-item"]')
    expect(lateral.get('[data-teste="previa-prazo-item"]').text()).toBe(previa)
    expect(lateral.get('[data-teste="marco-item-seisMeses"]').classes()).toContain('posicao-item__marco--atual')
    expect(lateral.findAll('[data-teste="vizinho-item"]').map((vizinho) => vizinho.text())).toEqual([expect.stringContaining('Contratar o buffet')])
    expect(lateral.get('[data-teste="apoio-exemplos-item"]').text()).toBe(TEXTOS_ITEM_MODELO.exemplosApoioTipo(indefinido))
    expect(lateral.find('a, button').exists()).toBe(false)
  })

  it.each([
    ['nulo', null],
    ['desconhecido', 'Formatura' as unknown as TipoEvento],
  ] as const)('[COMPONENTE] item de modelo com tipo %s fala do evento, sem casamento nem comemoração', async (_, tipo) => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([itemModelo({ titulo: 'Contratar o buffet', diasAntesDoEvento: 30 })], { tipoEvento: tipo, sugerido: false }))))
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/novo`)

    expect(wrapper.get('[data-teste="campo-titulo"]').attributes('placeholder')).toBe('Ex.: Reservar o local')
    const posicao = wrapper.get('[data-teste="posicao-item-modelo"]')
    expect(posicao.get('[data-teste="previa-prazo-item"]').text()).toBe('Cerca de 6 meses antes do evento')
    expect(posicao.text()).not.toMatch(/casamento|comemoração/i)
    expect(wrapper.get('[data-teste="formulario-item-modelo"]').text()).not.toMatch(/casamento|comemoração|cerimônia/i)
    expect(wrapper.findAll('[data-teste="tipo-exemplo-item"]')).toHaveLength(4)
  })

  it('[COMPONENTE] prévia acompanha os dias e o sentido e some com valor inválido', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([], { tipoEvento: 'QuinzeAnos' }))))
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/novo`)
    const previa = () => wrapper.get('[data-teste="previa-prazo-item"]').text()

    expect(wrapper.get('[data-teste="nota-alcance-item"]').text()).toBe(TEXTOS_ITEM_MODELO.primeiroItem)
    const dias = wrapper.get('[data-teste="campo-dias"] input')
    await dias.setValue('15')
    await dias.trigger('input')
    await dias.trigger('blur')
    await aguardarAte(() => expect(previa()).toBe('Cerca de 2 semanas antes da festa de 15 anos'))
    const opcoes = () => wrapper.get('[data-teste="campo-sentido"]').findAll('[role="radio"], button, [data-pc-section="pcbutton"]')
    await opcoes().find((opcao) => opcao.text() === 'depois do evento')!.trigger('click')
    await aguardarAte(() => expect(previa()).toBe('Cerca de 2 semanas depois da festa de 15 anos'))
    expect(wrapper.find('[data-teste="marco-item-depois"]').exists()).toBe(true)

    await dias.setValue('500')
    await dias.trigger('input')
    await dias.trigger('blur')
    await aguardarAte(() => expect(previa()).toBe(TEXTOS_ITEM_MODELO.posicaoSemDias))
  })

  it('[COMPONENTE] edição não lista o próprio item como vizinho e lateral vem depois do formulário', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () =>
        respostaJson(modeloCompleto([itemModelo({ diasAntesDoEvento: 400 }), itemModelo({ id: 'outro', titulo: 'Definir orçamento', diasAntesDoEvento: 380 })], { tipoEvento: 'Aniversario' })),
      ),
    )
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/${ID_ITEM}/editar`)

    const lateral = wrapper.get('[data-teste="lateral-formulario-item"]')
    expect(lateral.findAll('[data-teste="vizinho-item"]').map((vizinho) => vizinho.text())).toEqual([expect.stringContaining('Definir orçamento')])
    expect(lateral.get('[data-teste="este-item"]').text()).toContain('Reservar local da cerimônia e da recepção')
    expect(lateral.get('[data-teste="marco-item-dozeMeses"] [data-teste="contagem-marco-item"]').text()).toBe('2 itens')
    const formulario = wrapper.get('[data-teste="formulario-item-modelo"]').element
    expect(formulario.compareDocumentPosition(lateral.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each([
    ['sem permissão', 403],
    ['modelo não encontrado', 404],
  ] as const)('[COMPONENTE] %s não mostra a lateral nem alarga a página', async (_, status) => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaProblema(status, { title: 'Falha' })))
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/novo`)

    expect(wrapper.find('[data-teste="lateral-formulario-item"]').exists()).toBe(false)
    expect(wrapper.get('.formulario-item-tela__pagina').classes()).not.toContain('com-lateral__pagina--ativa')
  })

  it('[COMPONENTE] item inexistente não mostra a lateral', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([]))))
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/${ID_ITEM}/editar`)

    expect(wrapper.text()).toContain(TEXTOS_ITEM_MODELO.naoEncontradoTitulo)
    expect(wrapper.find('[data-teste="lateral-formulario-item"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] anfitriões são redirecionados para fora das rotas de modelos', async () => {
    const sessaoAnfitriao = { ...SESSAO_EXEMPLO, usuario: { ...SESSAO_EXEMPLO.usuario, papel: 'Anfitriao' as const, eventoId: '11111111-1111-4111-8111-111111111111' } }
    fetchSimulado.mockImplementation(async (entrada) => {
      const url = String(entrada)
      if (url === '/api/autenticacao/renovar') {
        return respostaJson(sessaoAnfitriao)
      }
      if (url === '/api/eventos/11111111-1111-4111-8111-111111111111') {
        return respostaJson({})
      }
      return respostaProblema(404, { title: 'Não encontrado' })
    })

    const { montagem } = await abrir('/modelos-checklist')

    expect(montagem.roteador.currentRoute.value.name).toBe('evento')
    expect(chamadas(fetchSimulado, 'GET', ROTA_MODELOS)).toHaveLength(0)
  })
})
