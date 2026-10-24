import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { aguardarAte, aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import {
  ID_ITEM_MODELO_CRONOGRAMA,
  ID_MODELO_CRONOGRAMA,
  itemModeloCronograma,
  modeloCronogramaCompleto,
  resumoModeloCronograma,
} from '@/__tests__/auxiliaresModelosCronograma'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { TEXTOS_CRONOGRAMA } from '@/textos/cronograma'
import { TEXTOS_MODELOS_POR_TIPO } from '@/textos/modelos'
import { TEXTOS_ITEM_MODELO_CRONOGRAMA, TEXTOS_MODELOS_CRONOGRAMA, momentosPrincipaisEmFrase, referenciaHorarioModelo } from '@/textos/modelosCronograma'
import type { TipoEvento } from '@/tipos/eventos'
import { RaizRotas, chamadas, quando, rotearFetch } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('modelos-cronograma', 'modelo-cronograma', 'item-modelo-cronograma-editar', 'modelo-cronograma-novo', 'modelo-cronograma-editar', 'item-modelo-cronograma-novo')

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_MODELOS = '/api/modelos-cronograma'
const ROTA_MODELO = `${ROTA_MODELOS}/${ID_MODELO_CRONOGRAMA}`
const ROTA_ITENS = `${ROTA_MODELO}/itens`
const ROTA_ITEM = `${ROTA_ITENS}/${ID_ITEM_MODELO_CRONOGRAMA}`

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

describe('ModelosCronogramaView', () => {
  it('[COMPONENTE] lista com abas, selo Sugerido, contagem, referência e rail Modelos ativo', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELOS, () =>
        respostaJson([resumoModeloCronograma(), resumoModeloCronograma({ id: 'm2', nome: 'Roteiro fazenda', sugerido: false, quantidadeItens: 1, horarioReferencia: '17:30', descricao: null })]),
      ),
    )

    const { wrapper } = await abrir('/modelos-cronograma')

    expect(wrapper.get('h1').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.titulo)
    expect(wrapper.get('[data-teste="aba-cronograma"]').attributes('aria-current')).toBe('page')
    expect(wrapper.get('[data-teste="aba-checklist"]').attributes('href')).toBe('/modelos-checklist')
    const modelos = wrapper.findAll('[data-teste="modelo-cronograma"]')
    expect(modelos).toHaveLength(2)
    expect(modelos[0]!.text()).toContain('Sugerido')
    expect(modelos[0]!.text()).toContain('20 itens')
    expect(modelos[0]!.text()).toContain('Referência: cerimônia às 16:00')
    expect(modelos[1]!.text()).toContain('1 item')
    expect(modelos[1]!.text()).toContain('17:30')
    expect(modelos[0]!.get('[data-teste="link-modelo"]').attributes('href')).toBe(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)
    const rail = wrapper.findAll('[data-teste="item-menu"]').find((item) => item.text() === 'Modelos')!
    expect(rail.attributes('aria-current')).toBe('page')
  })

  it('[COMPONENTE] cartões em grade larga com resumo no cabeçalho e referência no rodapé', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELOS, () =>
        respostaJson([resumoModeloCronograma(), resumoModeloCronograma({ id: 'm2', nome: 'Roteiro fazenda', sugerido: false, quantidadeItens: 1, horarioReferencia: '17:30', descricao: null })]),
      ),
    )

    const { wrapper } = await abrir('/modelos-cronograma')

    expect(wrapper.get('[data-teste="resumo-modelos"]').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.resumo(2))
    expect(TEXTOS_MODELOS_CRONOGRAMA.resumo(1)).toBe('1 modelo')
    expect(wrapper.get('[data-teste="resumo-modelos"]').attributes('aria-live')).toBe('polite')
    const grade = wrapper.get('[data-teste="lista-modelos"] ul.grade')
    expect(grade.classes()).toEqual(expect.arrayContaining(['grade', 'grade--larga']))
    expect(wrapper.findAllComponents({ name: 'CartaoModelo' })).toHaveLength(2)
    const cartoes = wrapper.findAll('[data-teste="modelo-cronograma"]')
    expect(cartoes[0]!.find('[data-teste="descricao-modelo"]').exists()).toBe(true)
    expect(cartoes[1]!.find('[data-teste="descricao-modelo"]').exists()).toBe(false)
    expect(cartoes[1]!.text()).not.toContain(TEXTOS_MODELOS_CRONOGRAMA.sugerido)
    expect(cartoes[1]!.get('[data-teste="referencia-modelo"]').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.referencia('17:30'))
    expect(cartoes[1]!.get('[data-teste="contagem-modelo"]').text()).toBe('1 item')
    expect(cartoes[0]!.get('[data-teste="menu-acoes"]').attributes('aria-label')).toBe(TEXTOS_MODELOS_CRONOGRAMA.maisAcoesAria('Roteiro clássico'))
    expect(wrapper.find('.abas-secao__aba--ativa').text()).toBe('Cronograma')
    expect(wrapper.find('[data-teste="novo-modelo"]').exists()).toBe(true)
  })

  it('[COMPONENTE] lista vazia não mostra resumo; erro esconde Novo modelo do cabeçalho', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaJson([])))
    const { wrapper } = await abrir('/modelos-cronograma')
    expect(wrapper.find('[data-teste="resumo-modelos"]').exists()).toBe(false)
    wrapper.unmount()

    fetchSimulado.mockReset()
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaProblema(500, { title: 'Erro' })))
    const segunda = await abrir('/modelos-cronograma')
    expect(segunda.wrapper.find('[data-teste="novo-modelo"]').exists()).toBe(false)
    expect(segunda.wrapper.find('[data-teste="resumo-modelos"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] sem permissão mostra aviso da assessoria sem lista', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaProblema(403, { title: 'Proibido' })))
    const { wrapper } = await abrir('/modelos-cronograma')
    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.semAcesso)
    expect(wrapper.find('[data-teste="lista-modelos"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilo da tela usa @container, sem @media, largura de leitura nem espaçamento solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../ModelosCronogramaView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).toContain('container: modelos com-lateral / inline-size')
    expect(estilo).toContain('@container com-lateral (min-width: 52rem)')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('largura-leitura')
    expect(estilo).not.toContain('--p-espaco-')
    expect(fonte).toContain('class="modelos com-lateral pilha pilha--cartao"')
  })

  it('[COMPONENTE] estado vazio convida a criar e erro oferece nova tentativa', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaJson([])))
    const { wrapper } = await abrir('/modelos-cronograma')
    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.vazioTitulo)
    expect(wrapper.find('[data-teste="novo-modelo-vazio"]').exists()).toBe(true)
    wrapper.unmount()

    fetchSimulado.mockReset()
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaProblema(500, { title: 'Erro' })))
    const segunda = await abrir('/modelos-cronograma')
    expect(segunda.wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.erroTitulo)
  })

  it('[COMPONENTE] agrupa por tipo com selo e referência pelo momento principal de cada tipo, sem tipo e desconhecido', async () => {
    const desconhecido = 'Formatura' as unknown as TipoEvento
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELOS, () =>
        respostaJson([
          resumoModeloCronograma({ id: 'c', nome: 'Roteiro casamento', tipoEvento: 'Casamento', horarioReferencia: '16:00' }),
          resumoModeloCronograma({ id: 'q', nome: 'Roteiro 15 anos', tipoEvento: 'QuinzeAnos', horarioReferencia: '20:00' }),
          resumoModeloCronograma({ id: 'a', nome: 'Roteiro aniversário', tipoEvento: 'Aniversario', horarioReferencia: '19:00' }),
          resumoModeloCronograma({ id: 'm', nome: 'Roteiro comemoração', tipoEvento: 'Comemoracao', horarioReferencia: '18:00' }),
          resumoModeloCronograma({ id: 'p', nome: 'Roteiro da casa', tipoEvento: null, sugerido: false, horarioReferencia: '17:00' }),
          resumoModeloCronograma({ id: 'f', nome: 'Formatura', tipoEvento: desconhecido, horarioReferencia: '21:00' }),
        ]),
      ),
    )

    const { wrapper } = await abrir('/modelos-cronograma')

    const grupos = wrapper.findAll('[data-teste="grupo-modelos"]')
    expect(grupos.map((grupo) => grupo.attributes('data-grupo'))).toEqual(['Casamento', 'QuinzeAnos', 'Aniversario', 'Comemoracao', 'qualquer', 'outros'])
    expect(grupos[1]!.get('[data-teste="grupo-modelos-nota"]').text()).toBe('Na lista ao aplicar o cronograma de cada festa de 15 anos.')
    expect(grupos[4]!.get('[data-teste="grupo-modelos-nota"]').text()).toBe('Na lista ao aplicar o cronograma de qualquer evento.')

    const cartao = (nome: string) => wrapper.findAll('[data-teste="modelo-cronograma"]').find((item) => item.text().includes(nome))!
    const referencia = (nome: string) => cartao(nome).get('[data-teste="referencia-modelo"]').text()
    expect(referencia('Roteiro casamento')).toBe('Referência: cerimônia às 16:00')
    expect(referencia('Roteiro 15 anos')).toBe('Referência: festa às 20:00')
    expect(referencia('Roteiro aniversário')).toBe('Referência: festa às 19:00')
    expect(referencia('Roteiro comemoração')).toBe('Referência: evento às 18:00')
    expect(referencia('Roteiro da casa')).toBe('Referência: evento às 17:00')
    expect(referencia('Formatura')).toBe('Referência: evento às 21:00')

    const selo = (nome: string) => cartao(nome).get('.cartao-modelo__selos').text().replace(/\s+/g, ' ')
    expect(selo('Roteiro casamento')).toContain('Sugerido para casamento')
    expect(selo('Roteiro 15 anos')).toContain('Sugerido para festa de 15 anos')
    expect(selo('Roteiro aniversário')).toContain('Sugerido para aniversário')
    expect(selo('Roteiro comemoração')).toContain('Sugerido para comemoração')
    expect(selo('Formatura')).toContain(TEXTOS_MODELOS_CRONOGRAMA.sugerido)
    expect(selo('Formatura')).not.toContain('Sugerido para')
    expect(cartao('Roteiro da casa').get('[data-teste="origem-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.origemAssessoria)
    expect(cartao('Roteiro casamento').find('[data-teste="origem-modelo"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-teste="modelo-cronograma"] h3')).toHaveLength(6)
    expect(cartao('Roteiro da casa').text()).not.toMatch(/cerimônia|casamento/i)
    expect(cartao('Formatura').text()).not.toMatch(/cerimônia|casamento/i)
  })

  it('[COMPONENTE] lateral por tipo com reaproveitamento do cronograma, depois dos grupos', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELOS, () =>
        respostaJson([resumoModeloCronograma(), resumoModeloCronograma({ id: 'p', nome: 'Roteiro da casa', tipoEvento: null, sugerido: false })]),
      ),
    )

    const { wrapper } = await abrir('/modelos-cronograma')

    const lateral = wrapper.get('[data-teste="cobertura-modelos"]')
    expect(lateral.text()).toContain('O que a equipe vê ao aplicar o cronograma.')
    const linhas = lateral.findAll('[data-teste="cobertura-tipo"]').map((linha) => linha.text().replace(/\s+/g, ' '))
    expect(linhas[0]).toContain('2 modelos')
    expect(linhas[0]).toContain('Inclui o sugerido para casamento.')
    expect(linhas[1]).toContain('1 modelo')
    const frases = lateral.get('[data-teste="reaproveitamento-modelos"]').findAll('li').map((item) => item.text())
    expect(frases).toEqual([...TEXTOS_MODELOS_CRONOGRAMA.reaproveitamento])
    expect(frases.join(' ')).not.toMatch(/prazo/i)
    expect(frases[1]).toBe(`Os horários contam a partir do momento principal: ${momentosPrincipaisEmFrase()}.`)
    expect(wrapper.get('[data-teste="lista-modelos"]').element.lastElementChild).toBe(lateral.element)
  })

  it('[UNITÁRIO] momento principal por tipo vem do vocabulário, com neutro para sem tipo e desconhecido', () => {
    expect(momentosPrincipaisEmFrase()).toBe('a cerimônia em casamentos; a festa em festas de 15 anos e aniversários; o evento em comemorações')
    expect(referenciaHorarioModelo('16:00', 'Casamento')).toBe('Referência: cerimônia às 16:00')
    expect(referenciaHorarioModelo('20:00', 'QuinzeAnos')).toBe('Referência: festa às 20:00')
    expect(referenciaHorarioModelo('19:00', 'Aniversario')).toBe('Referência: festa às 19:00')
    expect(referenciaHorarioModelo('18:00', 'Comemoracao')).toBe('Referência: evento às 18:00')
    expect(referenciaHorarioModelo('17:00', null)).toBe('Referência: evento às 17:00')
    expect(referenciaHorarioModelo('21:00', 'Formatura' as unknown as TipoEvento)).toBe('Referência: evento às 21:00')
    expect(TEXTOS_MODELOS_CRONOGRAMA.referencia('16:00')).toBe('Referência: cerimônia às 16:00')
  })

  it('[COMPONENTE] vazio ensina reaproveitamento sem casamento como conceito geral e sem lateral', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELOS, () => respostaJson([])))

    const { wrapper } = await abrir('/modelos-cronograma')

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.vazioTexto)
    expect(wrapper.find('[data-teste="cobertura-modelos"]').exists()).toBe(false)
    expect(TEXTOS_MODELOS_CRONOGRAMA.vazioTexto).not.toMatch(/casamento|casal|cerimônia/i)
    expect(TEXTOS_MODELOS_CRONOGRAMA.subtitulo).not.toMatch(/casamento|casal|cerimônia/i)
    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.subtitulo)
  })

  it('[COMPONENTE] excluir pede confirmação dizendo que cronogramas aplicados não mudam', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModeloCronograma()])),
      quando('DELETE', ROTA_MODELO, () => respostaVazia()),
    )
    const { wrapper, montagem } = await abrir('/modelos-cronograma')
    const confirmacao = useConfirmacaoExclusaoStore(montagem.pinia)

    wrapper.findComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'excluir')
    await flushPromises()

    expect(confirmacao.visivel).toBe(true)
    expect(confirmacao.nomeItem).toBe('Roteiro clássico')
    expect(confirmacao.mensagem).toContain('seus 20 itens serão excluídos')
    expect(confirmacao.mensagem).toContain('Cronogramas onde ele já foi aplicado não mudam.')
    await confirmacao.confirmar()
    await flushPromises()
    expect(chamadas(fetchSimulado, 'DELETE', ROTA_MODELO)).toHaveLength(1)
    expect(wrapper.findAll('[data-teste="modelo-cronograma"]')).toHaveLength(0)
  })
})

describe('ModeloCronogramaView', () => {
  it('[COMPONENTE] mostra o roteiro por dia com distância da cerimônia e nó da cerimônia', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())))

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    expect(wrapper.get('h1').text()).toBe('Roteiro clássico')
    expect(wrapper.get('[data-teste="apoio-referencia"]').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia('16:00', 'a cerimônia'))
    expect(wrapper.find('[data-teste="grupo-modelo-Vespera"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="grupo-modelo-DiaSeguinte"]').exists()).toBe(false)
    const linhas = wrapper.findAll('[data-teste="linha-cronograma"]')
    expect(linhas).toHaveLength(3)
    expect(linhas[0]!.text()).toContain('21 h antes da cerimônia')
    expect(linhas[0]!.text()).toContain('Local da cerimônia')
    expect(linhas[1]!.text()).toContain('6 h antes da cerimônia')
    expect(linhas[1]!.text()).toContain('Beleza')
    expect(linhas[2]!.classes()).toContain('linha-cronograma--cerimonia')
    expect(linhas[1]!.get('[data-teste="linha-cronograma-conteudo"]').attributes('aria-label')).toBe(
      'Editar Making of da noiva, 10:00, 6 h antes da cerimônia',
    )
  })

  it('[INTEGRAÇÃO] tocar na linha abre a edição do item', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())))
    const { montagem, wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    await wrapper.findAll('[data-teste="linha-cronograma-conteudo"]')[1]!.trigger('click')
    await flushPromises()

    await aguardarRota(montagem.roteador, 'item-modelo-cronograma-editar')
    expect(montagem.roteador.currentRoute.value.params.itemId).toBe(ID_ITEM_MODELO_CRONOGRAMA)
  })

  it('[COMPONENTE] modelo inexistente mostra não encontrado com volta', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.naoEncontradoTitulo)
    expect(wrapper.get('[data-teste="voltar"]').attributes('href')).toBe('/modelos-cronograma')
  })

  it('[COMPONENTE] cabeçalho mostra Sugerido, contagem e horário de referência', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())))

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    const resumo = wrapper.get('[data-teste="resumo-modelo"]')
    expect(resumo.element.tagName).toBe('P')
    expect(resumo.classes()).toContain('texto-legenda')
    expect(resumo.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.sugerido)
    expect(resumo.text()).toContain('3 itens')
    expect(resumo.get('[data-teste="referencia-modelo"]').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.referencia('16:00'))
    expect(wrapper.find('[data-teste="editar-modelo"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="adicionar-item"]').exists()).toBe(true)
  })

  it('[COMPONENTE] lateral resume total, dias com intervalo e posição em relação à cerimônia', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())))

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    const lateral = wrapper.get('[data-teste="lateral-modelo"]')
    expect(lateral.element.tagName).toBe('ASIDE')
    expect(lateral.attributes('aria-labelledby')).toBe('titulo-resumo-modelo')
    expect(wrapper.get('#titulo-resumo-modelo').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.resumoTitulo)
    expect(lateral.get('[data-teste="total-itens-modelo"]').text()).toBe('3 itens')
    expect(lateral.get('[data-teste="apoio-referencia"]').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia('16:00', 'a cerimônia'))
    expect(lateral.get('[data-teste="resumo-dia-Vespera"]').text()).toContain('1 item, das 19:00 às 20:00')
    expect(lateral.get('[data-teste="resumo-dia-DiaDoEvento"]').text()).toContain('2 itens, das 10:00 às 17:00')
    expect(lateral.find('[data-teste="resumo-dia-DiaSeguinte"]').exists()).toBe(false)
    expect(lateral.get('[data-teste="resumo-referencia"]').text()).toBe('16:00')
    expect(lateral.get('[data-teste="resumo-comeca"]').text()).toBe('21 h antes da cerimônia')
    expect(lateral.get('[data-teste="resumo-termina"]').text()).toBe('1 h depois da cerimônia')
    expect(lateral.get('[data-teste="voltar-lateral"]').attributes('href')).toBe('/modelos-cronograma')
  })

  it('[COMPONENTE] roteiro por dia em listas de cartão rotuladas pelo título do dia', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())))

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    const listas = wrapper.findAll('ol.modelo-cronograma__lista.cartao')
    expect(listas).toHaveLength(2)
    expect(listas[0]!.attributes('aria-labelledby')).toBe('grupo-modelo-Vespera')
    expect(wrapper.get('#grupo-modelo-Vespera').text()).toBe('Véspera')
    expect(listas[1]!.findAll('[data-teste="linha-cronograma"]')).toHaveLength(2)
    expect(wrapper.get('[data-teste="grupo-modelo-DiaDoEvento"]').classes()).toEqual(
      expect.arrayContaining(['pilha', 'pilha--grupo']),
    )
  })

  it('[COMPONENTE] item que termina no dia seguinte entra no intervalo do dia e no fim do roteiro', async () => {
    const festa = itemModeloCronograma({
      id: 'f',
      minutosDesdeCerimonia: 300,
      inicio: '21:00',
      duracaoMinutos: 300,
      termino: '02:00',
      terminaEmOutroDia: true,
      atividade: 'Festa',
    })
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto({ itens: [itemModeloCronograma(), festa] }))),
    )

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    expect(wrapper.get('[data-teste="resumo-dia-DiaDoEvento"]').text()).toContain('2 itens, das 10:00 às 02:00 do dia seguinte')
    expect(wrapper.get('[data-teste="resumo-comeca"]').text()).toBe('6 h antes da cerimônia')
    expect(wrapper.get('[data-teste="resumo-termina"]').text()).toBe('10 h depois da cerimônia')
    expect(wrapper.findAll('[data-teste="linha-cronograma-termino"]')[1]!.text()).toBe('02:00+1')
  })

  it('[COMPONENTE] modelo sem itens mostra o convite, sem lateral, com referência no cabeçalho', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto({ itens: [] }))))

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.itensVazioTitulo)
    expect(wrapper.find('[data-teste="adicionar-item-vazio"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="lateral-modelo"]').exists()).toBe(false)
    expect(wrapper.get('[data-teste="resumo-modelo"]').text()).toContain('0 itens')
    expect(wrapper.get('[data-teste="referencia-modelo"]').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.referencia('16:00'))
  })

  it('[COMPONENTE] erro de rede mostra tentar de novo sem lateral nem ações', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaProblema(500, { title: 'Erro' })))

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.erroTitulo)
    expect(wrapper.find('[data-teste="lateral-modelo"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="adicionar-item"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] sem permissão mostra o aviso da assessoria sem roteiro', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaProblema(403, { title: 'Proibido' })))

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.semAcesso)
    expect(wrapper.find('[data-teste="linha-cronograma"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="lateral-modelo"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilo do detalhe usa @container, sem @media, largura de leitura nem espaçamento solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../ModeloCronogramaView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).toContain('container: modelo-cronograma com-lateral / inline-size')
    expect(estilo).toContain('container: lateral-modelo-cronograma / inline-size')
    expect(estilo).toContain('@container com-lateral (min-width: 52rem)')
    expect(estilo).toContain('@container lateral-modelo-cronograma (min-width: 36rem)')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('largura-leitura')
    expect(estilo).not.toContain('--p-espaco-')
    expect(fonte).toContain('class="modelo-cronograma com-lateral pilha pilha--bloco"')
  })

  it('[UNITÁRIO] corpo do detalhe em grade de três filhos sem sticky, roteiro antes do resumo no DOM e Por dia oculto no estreito', () => {
    const fonte = readFileSync(resolve(__dirname, '../ModeloCronogramaView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).not.toContain('sticky')
    expect(estilo).toContain('grid-row: 1 / span 2')
    expect(estilo).toContain('@container modelo-cronograma (max-width: 35.99rem)')
    expect(fonte.indexOf('modelo-cronograma__principal pilha')).toBeLessThan(fonte.indexOf('data-teste="lateral-modelo"'))
    expect(fonte.indexOf('data-teste="lateral-modelo"')).toBeLessThan(fonte.indexOf('<ComoAplicarModelo'))
  })

  const TIPO_DESCONHECIDO = 'Formatura' as unknown as TipoEvento

  function modeloNeutro(tipoEvento: TipoEvento | null, sugerido = true) {
    return modeloCronogramaCompleto({
      tipoEvento,
      sugerido,
      horarioReferencia: '20:00',
      itens: [
        itemModeloCronograma({ id: 'a', minutosDesdeCerimonia: -120, inicio: '18:00', duracaoMinutos: 60, termino: '19:00', atividade: 'Recepção', referenciaLocal: 'Cerimonia', local: null, responsavel: 'Assessoria', categoriaFornecedor: null }),
        itemModeloCronograma({ id: 'b', minutosDesdeCerimonia: 0, inicio: '20:00', duracaoMinutos: 30, termino: '20:30', atividade: 'Entrada', referenciaLocal: 'Recepcao', local: null, responsavel: null, categoriaFornecedor: 'Musica' }),
        itemModeloCronograma({ id: 'd', minutosDesdeCerimonia: 120, inicio: '22:00', duracaoMinutos: null, termino: null, atividade: 'Brinde', referenciaLocal: null, local: 'Salão', responsavel: null, categoriaFornecedor: null }),
      ],
    })
  }

  it.each([
    ['Casamento', 'Sugerido para casamento', 'cerimônia', 'da cerimônia', 'à cerimônia', 'Cerimônia', 'Local da cerimônia', 'Local da recepção', 'Abra um casamento e entre em Cronograma.', 'Na lista ao aplicar o cronograma de cada casamento.', /comemoração|festa/i],
    ['QuinzeAnos', 'Sugerido para festa de 15 anos', 'festa', 'da festa', 'à festa', 'Festa', 'Local da festa', 'Outro local', 'Abra uma festa de 15 anos e entre em Cronograma.', 'Na lista ao aplicar o cronograma de cada festa de 15 anos.', /casamento|cerimônia|comemoração/i],
    ['Aniversario', 'Sugerido para aniversário', 'festa', 'da festa', 'à festa', 'Festa', 'Local da festa', 'Outro local', 'Abra um aniversário e entre em Cronograma.', 'Na lista ao aplicar o cronograma de cada aniversário.', /casamento|cerimônia|comemoração/i],
    ['Comemoracao', 'Sugerido para comemoração', 'evento', 'do evento', 'ao evento', 'Evento', 'Local do evento', 'Outro local', 'Abra uma comemoração e entre em Cronograma.', 'Na lista ao aplicar o cronograma de cada comemoração.', /casamento|cerimônia|festa/i],
  ] as const)(
    '[COMPONENTE] modelo de %s fala do momento principal do tipo no cabeçalho, linhas, resumo e passos',
    async (tipo, selo, nome, contracao, relativo, rotulo, principal, secundario, passo, onde, proibido) => {
      rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloNeutro(tipo))))

      const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

      expect(wrapper.get('[data-teste="resumo-modelo"]').text()).toContain(selo)
      expect(wrapper.get('[data-teste="referencia-modelo"]').text()).toBe(`Referência: ${nome} às 20:00`)
      expect(wrapper.get('[data-teste="onde-aparece-modelo"]').text()).toBe(onde)
      const linhas = wrapper.findAll('[data-teste="linha-cronograma"]')
      expect(linhas[0]!.text()).toContain(`2 h antes ${contracao}`)
      expect(linhas[0]!.text()).toContain(principal)
      expect(linhas[1]!.text()).toContain(`Hora ${contracao}`)
      expect(linhas[1]!.text()).toContain(secundario)
      expect(linhas[1]!.get('[data-teste="linha-cronograma-conteudo"]').attributes('aria-label')).toBe(`Editar Entrada, 20:00, Hora ${contracao}`)
      const momento = wrapper.get('[data-teste="resumo-cerimonia"]')
      expect(momento.get('h3').text()).toBe(`Em relação ${relativo}`)
      expect(momento.get('dt').text()).toBe(rotulo)
      expect(wrapper.get('[data-teste="resumo-comeca"]').text()).toBe(`2 h antes ${contracao}`)
      expect(wrapper.get('[data-teste="resumo-termina"]').text()).toBe(`2 h depois ${contracao}`)
      expect(wrapper.findAll('[data-teste="passo-aplicar-modelo"]')[0]!.text()).toContain(passo)
      expect(wrapper.findAll('[data-teste="passo-aplicar-modelo"]')[2]!.text()).toContain(`horário ${contracao} marcado`)
      expect(wrapper.get('main').text()).not.toMatch(proibido)
    },
  )

  it.each([
    ['sem tipo', null, 'Na lista ao aplicar o cronograma de qualquer evento.', 'Abra qualquer evento e entre em Cronograma.'],
    ['de tipo desconhecido', TIPO_DESCONHECIDO, TEXTOS_MODELOS_POR_TIPO.notaOutros, 'Abra um evento desse tipo e entre em Cronograma.'],
  ] as const)('[COMPONENTE] modelo %s usa "do evento", sem casamento, cerimônia nem comemoração', async (_rotulo, tipo, onde, passo) => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloNeutro(tipo, false))))

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    expect(wrapper.get('[data-teste="origem-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.origemAssessoria)
    expect(wrapper.get('[data-teste="referencia-modelo"]').text()).toBe('Referência: evento às 20:00')
    expect(wrapper.get('[data-teste="onde-aparece-modelo"]').text()).toBe(onde)
    expect(wrapper.findAll('[data-teste="linha-cronograma"]')[0]!.text()).toContain('2 h antes do evento')
    expect(wrapper.findAll('[data-teste="linha-cronograma"]')[0]!.text()).toContain('Local principal')
    expect(wrapper.get('[data-teste="resumo-cerimonia"] h3').text()).toBe('Em relação ao evento')
    expect(wrapper.findAll('[data-teste="passo-aplicar-modelo"]')[0]!.text()).toContain(passo)
    expect(wrapper.get('main').text()).not.toMatch(/casamento|cerimônia|comemoração/i)
  })

  it('[COMPONENTE] resumo traz começo e fim com dia, duração, posição no momento e quem entra no roteiro', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())))

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    const lateral = wrapper.get('[data-teste="lateral-modelo"]')
    expect(lateral.get('[data-teste="primeiro-horario-modelo"]').text()).toBe('Véspera, 19:00')
    expect(lateral.get('[data-teste="ultimo-horario-modelo"]').text()).toBe('Dia do evento, 17:00')
    expect(lateral.get('[data-teste="duracao-modelo"]').text()).toBe('22 h de roteiro')
    expect(lateral.get('[data-teste="resumo-antes"]').text()).toBe('2')
    expect(lateral.get('[data-teste="resumo-na-hora"]').text()).toBe('1')
    expect(lateral.get('[data-teste="resumo-depois"]').text()).toBe('0')
    expect(lateral.get('[data-teste="equipe-fornecedores"]').text()).toBe('Beleza (1)')
    expect(lateral.get('[data-teste="equipe-responsaveis"]').text()).toBe('Celebrante, Equipe de beleza')
    expect(lateral.find('[data-teste="equipe-sem-ninguem"]').exists()).toBe(false)
    expect(lateral.get('[data-teste="resumo-por-dia"]').classes()).toContain('modelo-cronograma__bloco--por-dia')
    expect(wrapper.get('[data-teste="intervalo-grupo-DiaDoEvento"]').text()).toBe('2 itens, das 10:00 às 17:00')
    expect(wrapper.get('[data-teste="nota-aplicar-modelo"]').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.notaAplicar)
  })

  it('[COMPONENTE] roteiro de um instante omite término e duração; sem responsável nem categoria omite quem entra', async () => {
    const unico = itemModeloCronograma({ minutosDesdeCerimonia: 0, inicio: '16:00', duracaoMinutos: null, termino: null, responsavel: null, categoriaFornecedor: null })
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto({ itens: [unico] }))))

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    expect(wrapper.get('[data-teste="primeiro-horario-modelo"]').text()).toBe('Dia do evento, 16:00')
    expect(wrapper.get('[data-teste="resumo-comeca"]').text()).toBe('Hora da cerimônia')
    expect(wrapper.find('[data-teste="resumo-termina"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="duracao-modelo"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="resumo-equipe"]').exists()).toBe(false)
  })

  it('[COMPONENTE] equipe avisa quantos itens estão sem responsável nem fornecedor', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloNeutro('QuinzeAnos'))))

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    expect(wrapper.get('[data-teste="equipe-fornecedores"]').text()).toBe('Música, DJ e banda (1)')
    expect(wrapper.get('[data-teste="equipe-sem-ninguem"]').text()).toBe('1 item sem responsável nem fornecedor.')
  })

  it.each([
    ['QuinzeAnos', 'da festa'],
    ['Casamento', 'da cerimônia'],
    [null, 'do evento'],
    [TIPO_DESCONHECIDO, 'do evento'],
  ] as const)('[COMPONENTE] vazio de %s ensina pela hora do momento, sem lateral nem passos', async (tipo, contracao) => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto({ tipoEvento: tipo, itens: [] }))))

    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}`)

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.itensVazioTextoPara(contracao))
    expect(wrapper.find('[data-teste="lateral-modelo"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="como-aplicar-modelo"]').exists()).toBe(false)
  })
})

describe('Formulários de modelo de cronograma', () => {
  it('[INTEGRAÇÃO] novo modelo envia horário de referência e abre o detalhe', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_MODELOS, () => respostaJson(modeloCronogramaCompleto({ itens: [] }), 201)),
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto({ itens: [] }))),
    )
    const { montagem, wrapper } = await abrir('/modelos-cronograma/novo')

    expect((wrapper.get('#modelo-cronograma-horarioReferencia').element as HTMLInputElement).value).toBe('16:00')
    await wrapper.get('#modelo-cronograma-nome').setValue('  Roteiro fazenda ')
    await wrapper.get('#modelo-cronograma-horarioReferencia').setValue('17:30')
    await wrapper.get('[data-teste="formulario-modelo"]').trigger('submit')
    await flushPromises()

    expect(corpoDaChamada(chamadas(fetchSimulado, 'POST', ROTA_MODELOS)[0]!)).toEqual({
      nome: 'Roteiro fazenda',
      descricao: null,
      horarioReferencia: '17:30',
    })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_MODELOS_CRONOGRAMA.toastCriado)
    await aguardarRota(montagem.roteador, 'modelo-cronograma')
  })

  it('[COMPONENTE] nome repetido do servidor aparece sob o campo', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_MODELOS, () =>
        respostaProblema(422, { title: 'Regra', detail: 'Já existe um modelo de cronograma com esse nome.', campo: 'nome' }),
      ),
    )
    const { wrapper } = await abrir('/modelos-cronograma/novo')

    await wrapper.get('#modelo-cronograma-nome').setValue('Roteiro clássico')
    await wrapper.get('[data-teste="formulario-modelo"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Já existe um modelo de cronograma com esse nome.')
  })

  it('[COMPONENTE] criação mostra orientação no cabeçalho e campos agrupados em "Sobre o modelo"', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir('/modelos-cronograma/novo')

    const pagina = wrapper.get('.pagina-formulario')
    expect(pagina.get('h1').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.formNovo)
    expect(pagina.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.formNovoDescricao)
    const grupo = pagina.get('[data-teste="grupo-modelo"]')
    expect(grupo.element.tagName).toBe('FIELDSET')
    expect(grupo.get('legend').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.grupoModelo)
    expect(grupo.get('legend').classes()).toContain('texto-rotulo')
    expect(grupo.find('[data-teste="campo-nome"]').exists()).toBe(true)
    expect(grupo.find('[data-teste="campo-descricao"]').exists()).toBe(true)
    expect(grupo.find('.formulario-modelo__colunas [data-teste="campo-horario-referencia"]').exists()).toBe(true)
    expect(wrapper.get('[data-teste="formulario-modelo"]').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    expect(wrapper.get('[data-teste="salvar-modelo"]').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.criarModelo)
  })

  it('[COMPONENTE] edição mostra o nome carregado no cabeçalho, salva com PUT e volta ao detalhe', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () =>
        respostaJson(modeloCronogramaCompleto({ nome: 'Roteiro fazenda', descricao: 'Ao ar livre', horarioReferencia: '16:30', itens: [] })),
      ),
      quando('PUT', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto({ nome: 'Fazenda e praia', itens: [] }))),
    )
    const { wrapper, montagem } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/editar`)

    expect(wrapper.get('h1').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.formEditar)
    expect(wrapper.get('.cabecalho-pagina__descricao').text()).toBe('Roteiro fazenda')
    expect((wrapper.get('[data-teste="campo-descricao"]').element as HTMLTextAreaElement).value).toBe('Ao ar livre')
    expect((wrapper.get('[data-teste="campo-horario-referencia"]').element as HTMLInputElement).value).toBe('16:30')
    expect(wrapper.get('[data-teste="salvar-modelo"]').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.salvarAlteracoes)

    await wrapper.get('[data-teste="campo-nome"]').setValue('Fazenda e praia')
    expect(wrapper.get('.cabecalho-pagina__descricao').text()).toBe('Roteiro fazenda')
    await wrapper.get('[data-teste="formulario-modelo"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'PUT', ROTA_MODELO)
    expect(corpoDaChamada(chamada!)).toEqual({ nome: 'Fazenda e praia', descricao: 'Ao ar livre', horarioReferencia: '16:30' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_MODELOS_CRONOGRAMA.toastSalvo)
    await aguardarRota(montagem.roteador, 'modelo-cronograma')
  })

  it('[COMPONENTE] erro só aparece depois da primeira tentativa e some ao digitar um nome válido', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir('/modelos-cronograma/novo')
    const campoNome = wrapper.get('[data-teste="campo-nome"]')

    await campoNome.trigger('blur')
    expect(wrapper.text()).not.toContain(TEXTOS_MODELOS_CRONOGRAMA.erroNomeTamanho)

    await campoNome.setValue('A')
    await campoNome.trigger('blur')
    expect(wrapper.text()).not.toContain(TEXTOS_MODELOS_CRONOGRAMA.erroNomeTamanho)

    await wrapper.get('[data-teste="formulario-modelo"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.erroNomeTamanho)
    expect(chamadas(fetchSimulado, 'POST', ROTA_MODELOS)).toHaveLength(0)

    await campoNome.setValue('Roteiro')
    expect(wrapper.text()).not.toContain(TEXTOS_MODELOS_CRONOGRAMA.erroNomeTamanho)

    await campoNome.setValue('B')
    expect(wrapper.text()).not.toContain(TEXTOS_MODELOS_CRONOGRAMA.erroNomeTamanho)
    await campoNome.trigger('blur')
    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.erroNomeTamanho)
  })

  it('[COMPONENTE] falha do servidor ao salvar mostra a mensagem geral e mantém os dados', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_MODELOS, () => respostaProblema(500, { title: 'Erro' })))
    const { wrapper } = await abrir('/modelos-cronograma/novo')

    await wrapper.get('[data-teste="campo-nome"]').setValue('Roteiro praia')
    await wrapper.get('[data-teste="formulario-modelo"]').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-teste="erro-formulario"]').text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.erroSalvar)
    expect((wrapper.get('[data-teste="campo-nome"]').element as HTMLInputElement).value).toBe('Roteiro praia')
    expect(notificacoes.sucesso).not.toHaveBeenCalled()
  })

  it('[COMPONENTE] edição de modelo inexistente mostra não encontrado sem formulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaProblema(404, { title: 'Não encontrado' })))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/editar`)

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.naoEncontradoTitulo)
    expect(wrapper.find('[data-teste="formulario-modelo"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] edição sem permissão mostra aviso da assessoria sem formulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaProblema(403, { title: 'Proibido' })))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/editar`)

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.semAcesso)
    expect(wrapper.find('[data-teste="formulario-modelo"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilo do formulário de modelo usa @container, sem @media, largura de leitura nem espaçamento solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../ModeloCronogramaFormularioView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(fonte).toContain('class="pagina-formulario formulario-modelo-tela__pagina com-lateral__pagina')
    expect(estilo).toContain('container: formulario-modelo / inline-size')
    expect(estilo).toContain('@container formulario-modelo (min-width: 40rem)')
    expect(estilo).not.toContain('container: formulario-modelo-tela /')
    expect(estilo).not.toContain('@container formulario-modelo-tela ')
    expect(estilo).toContain('repeat(2, minmax(0, 1fr))')
    expect(estilo).not.toContain('sticky')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('largura-leitura')
    expect(estilo).not.toContain('--p-espaco-')
    expect(fonte).not.toContain("validarCampo('")
  })

  it('[COMPONENTE] criação mostra lateral para qualquer evento, horário do evento e Depois de criar', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir('/modelos-cronograma/novo')

    expect(wrapper.get('.formulario-modelo-tela__pagina').classes()).toContain('com-lateral__pagina--ativa')
    expect(wrapper.get('label[for="modelo-cronograma-horarioReferencia"]').text()).toContain('Horário de referência do evento')
    expect(wrapper.get('[data-teste="formulario-modelo"]').text()).not.toMatch(/cerimônia|casamento|comemoração/i)
    expect(wrapper.get('.cabecalho-pagina__descricao').text()).not.toMatch(/cerimônia|casamento/i)
    const lateral = wrapper.get('[data-teste="lateral-formulario-modelo"]')
    expect(lateral.get('[data-teste="selo-modelo"]').text()).toBe(TEXTOS_MODELOS_POR_TIPO.origemAssessoria)
    expect(lateral.get('[data-teste="onde-aparece-modelo"]').text()).toBe('Na lista ao aplicar o cronograma de qualquer evento.')
    expect(lateral.find('[data-teste="contagem-modelo"]').exists()).toBe(false)
    expect(lateral.findAll('[data-teste="exemplos-nome-modelo"] dd')).toHaveLength(4)
    expect(lateral.get('[data-teste="dicas-modelo"]').text()).toContain(momentosPrincipaisEmFrase())
    const passos = lateral.findAll('[data-teste="passo-aplicar-modelo"]').map((passo) => passo.text())
    expect(passos).toHaveLength(3)
    expect(passos[0]).toContain(TEXTOS_MODELOS_CRONOGRAMA.depoisDeCriarItens)
    expect(passos[1]).toContain(TEXTOS_MODELOS_POR_TIPO.abrirQualquerEvento('Cronograma'))
    expect(passos[2]).toContain('Aplicar modelo')
    expect(lateral.get('[data-teste="como-aplicar-modelo"] h2').text()).toBe(TEXTOS_MODELOS_POR_TIPO.depoisDeCriarTitulo)
    expect(lateral.find('a, button').exists()).toBe(false)
  })

  it('[COMPONENTE] formulário de modelo de cronograma vem antes da lateral no DOM', async () => {
    rotearFetch(fetchSimulado)
    const { wrapper } = await abrir('/modelos-cronograma/novo')

    const formulario = wrapper.get('[data-teste="formulario-modelo"]').element
    const lateral = wrapper.get('[data-teste="lateral-formulario-modelo"]').element
    expect(formulario.compareDocumentPosition(lateral) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each([
    ['Casamento', 'Sugerido para casamento', 'de cada casamento', 'Horário de referência da cerimônia', 'até a cerimônia'],
    ['QuinzeAnos', 'Sugerido para festa de 15 anos', 'de cada festa de 15 anos', 'Horário de referência da festa', 'até a festa'],
    ['Aniversario', 'Sugerido para aniversário', 'de cada aniversário', 'Horário de referência da festa', 'até a festa'],
    ['Comemoracao', 'Sugerido para comemoração', 'de cada comemoração', 'Horário de referência do evento', 'até o evento'],
  ] as const)('[COMPONENTE] edição de sugerido %s mostra o tipo e o momento, sem Depois de criar', async (tipo, selo, onde, rotulo, dica) => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto({ tipoEvento: tipo }))))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/editar`)

    expect(wrapper.get('label[for="modelo-cronograma-horarioReferencia"]').text()).toContain(rotulo)
    expect(wrapper.get('[data-teste="formulario-modelo"]').text()).toContain(dica)
    const lateral = wrapper.get('[data-teste="lateral-formulario-modelo"]')
    expect(lateral.get('[data-teste="selo-modelo"]').text()).toBe(selo)
    expect(lateral.get('[data-teste="onde-aparece-modelo"]').text()).toContain(onde)
    expect(lateral.get('[data-teste="contagem-modelo"]').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.itens(modeloCronogramaCompleto().itens.length))
    expect(lateral.find('[data-teste="como-aplicar-modelo"]').exists()).toBe(false)
  })

  it.each([
    ['nulo', null, TEXTOS_MODELOS_POR_TIPO.origemAssessoria, false],
    ['desconhecido', 'Formatura' as unknown as TipoEvento, 'Sugerido', true],
  ] as const)('[COMPONENTE] edição de modelo de cronograma com tipo %s não cai em casamento, comemoração nem cerimônia', async (_, tipo, selo, sugerido) => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto({ tipoEvento: tipo, sugerido, nome: 'Evento no campo', descricao: null }))),
    )
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/editar`)

    expect(wrapper.get('[data-teste="formulario-modelo"]').text()).not.toMatch(/cerimônia|casamento|comemoração/i)
    const lateral = wrapper.get('[data-teste="lateral-formulario-modelo"]')
    expect(lateral.get('[data-teste="selo-modelo"]').text()).toBe(selo)
    expect(lateral.get('[data-teste="onde-modelo"]').text()).not.toMatch(/cerimônia|casamento|comemoração/i)
    expect(lateral.get('[data-teste="dicas-modelo"]').text()).toContain('depois do evento')
  })

  it.each([
    ['sem permissão', 403],
    ['não encontrado', 404],
  ] as const)('[COMPONENTE] %s não mostra a lateral nem alarga a página', async (_, status) => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaProblema(status, { title: 'Falha' })))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/editar`)

    expect(wrapper.find('[data-teste="lateral-formulario-modelo"]').exists()).toBe(false)
    expect(wrapper.get('.formulario-modelo-tela__pagina').classes()).not.toContain('com-lateral__pagina--ativa')
  })

  it('[INTEGRAÇÃO] novo item converte dia e horário em minutos desde a cerimônia', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())),
      quando('POST', ROTA_ITENS, () => respostaJson(itemModeloCronograma({ id: 'novo' }), 201)),
    )
    const { montagem, wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/novo`)

    await wrapper.get('#item-modelo-cronograma-inicio').setValue('19:00')
    await wrapper.get('#item-modelo-cronograma-termino').setValue('01:00')
    expect(wrapper.text()).toContain('3 h depois da cerimônia')
    expect(wrapper.text()).toContain('Termina no dia seguinte, 6 h')
    await wrapper.get('#item-modelo-cronograma-atividade').setValue('Festa')
    await wrapper.get('#item-modelo-cronograma-local').setValue('Salão nobre')
    await wrapper.get('#item-modelo-cronograma-responsavel').setValue('Banda')
    await wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').trigger('submit')
    await flushPromises()

    expect(corpoDaChamada(chamadas(fetchSimulado, 'POST', ROTA_ITENS)[0]!)).toEqual({
      minutosDesdeCerimonia: 180,
      duracaoMinutos: 360,
      atividade: 'Festa',
      referenciaLocal: null,
      local: 'Salão nobre',
      responsavel: 'Banda',
      categoriaFornecedor: null,
      instrucoes: null,
    })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_ITEM_MODELO_CRONOGRAMA.toastAdicionado)
    await aguardarRota(montagem.roteador, 'modelo-cronograma')
    expect(montagem.roteador.currentRoute.value.query.item).toBe('novo')
  })

  it('[COMPONENTE] edição carrega o item, troca o local pela referência e mostra erro de campo do servidor', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())),
      quando('PUT', ROTA_ITEM, () =>
        respostaProblema(422, { title: 'Regra', detail: 'Escolha um horário entre a véspera e o dia seguinte.', campo: 'minutosDesdeCerimonia' }),
      ),
    )
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/${ID_ITEM_MODELO_CRONOGRAMA}/editar`)

    expect((wrapper.get('#item-modelo-cronograma-inicio').element as HTMLInputElement).value).toBe('10:00')
    expect((wrapper.get('#item-modelo-cronograma-local').element as HTMLInputElement).value).toBe('Hotel Fasano')
    expect(wrapper.find('[data-teste="salvar-outro"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="excluir-item"]').exists()).toBe(true)

    const opcoes = wrapper.get('[data-teste="campo-opcao-local"]').findAll('button')
    await opcoes.find((opcao) => opcao.text() === 'Local da recepção')!.trigger('click')
    expect(wrapper.find('#item-modelo-cronograma-local').exists()).toBe(false)

    await wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').trigger('submit')
    await flushPromises()

    const corpo = corpoDaChamada(chamadas(fetchSimulado, 'PUT', ROTA_ITEM)[0]!) as Record<string, unknown>
    expect(corpo.referenciaLocal).toBe('Recepcao')
    expect(corpo.local).toBeNull()
    expect(corpo.minutosDesdeCerimonia).toBe(-360)
    expect(corpo.categoriaFornecedor).toBe('Beleza')
    expect(wrapper.text()).toContain('Escolha um horário entre a véspera e o dia seguinte.')
  })

  it('[COMPONENTE] validação local exige início e atividade antes de enviar', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/novo`)

    await wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_ITENS)).toHaveLength(0)
    const erros = wrapper.findAll('[data-teste="erro-campo"]').map((erro) => erro.text())
    expect(erros).toContain('Informe o horário de início.')
    expect(erros).toContain('Informe a atividade.')
  })

  it('[COMPONENTE] formulário de item agrupa "A atividade" e "Horário e local" com a referência no cabeçalho', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/novo`)

    const pagina = wrapper.get('.pagina-formulario')
    expect(pagina.get('h1').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.novo)
    expect(pagina.get('.cabecalho-pagina__descricao').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia('16:00', 'a cerimônia'))
    expect(wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))

    const grupoAtividade = pagina.get('[data-teste="grupo-atividade"]')
    expect(grupoAtividade.element.tagName).toBe('FIELDSET')
    expect(grupoAtividade.get('legend').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.grupoAtividade)
    expect(grupoAtividade.get('legend').classes()).toContain('texto-rotulo')
    for (const campo of ['campo-atividade', 'campo-responsavel', 'campo-categoria', 'campo-instrucoes']) {
      expect(grupoAtividade.find(`[data-teste="${campo}"]`).exists()).toBe(true)
    }
    expect(grupoAtividade.find('.formulario-item-cronograma__colunas [data-teste="campo-responsavel"]').exists()).toBe(true)

    const grupoHorario = pagina.get('[data-teste="grupo-horario-local"]')
    expect(grupoHorario.element.tagName).toBe('FIELDSET')
    expect(grupoHorario.get('legend').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.grupoHorarioLocal)
    expect(grupoHorario.get('legend').classes()).toContain('texto-rotulo')
    const subgrupoQuando = grupoHorario.get('[data-teste="campo-quando"]')
    expect(subgrupoQuando.element.tagName).toBe('FIELDSET')
    expect(subgrupoQuando.get('legend').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.campoQuando)
    for (const campo of ['campo-dia', 'campo-inicio', 'campo-termino']) {
      expect(subgrupoQuando.find(`[data-teste="${campo}"]`).exists()).toBe(true)
    }
    expect(subgrupoQuando.find('.formulario-item-cronograma__colunas [data-teste="campo-termino"]').exists()).toBe(true)
    expect(grupoHorario.find('[data-teste="campo-opcao-local"]').exists()).toBe(true)
    expect(grupoHorario.find('[data-teste="campo-local"]').exists()).toBe(true)
    expect(grupoHorario.find('[data-teste="campo-atividade"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="salvar-outro"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="excluir-item"]').exists()).toBe(false)
  })

  it('[COMPONENTE] erros do item só aparecem depois da tentativa, focam a atividade e somem ao digitar', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/novo`)
    await aguardarAte(() => expect(document.activeElement?.id).toBe('item-modelo-cronograma-atividade'))

    const atividade = wrapper.get('#item-modelo-cronograma-atividade')
    await atividade.trigger('blur')
    await wrapper.get('#item-modelo-cronograma-inicio').trigger('blur')
    expect(wrapper.findAll('[data-teste="erro-campo"]')).toHaveLength(0)

    await wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_CRONOGRAMA.erroAtividade)
    expect(wrapper.text()).toContain(TEXTOS_CRONOGRAMA.erroInicio)
    await aguardarAte(() => expect(document.activeElement?.id).toBe('item-modelo-cronograma-atividade'))
    expect(chamadas(fetchSimulado, 'POST', ROTA_ITENS)).toHaveLength(0)

    await atividade.setValue('Cortejo dos padrinhos')
    expect(wrapper.text()).not.toContain(TEXTOS_CRONOGRAMA.erroAtividade)
    await wrapper.get('#item-modelo-cronograma-inicio').setValue('15:40')
    expect(wrapper.text()).not.toContain(TEXTOS_CRONOGRAMA.erroInicio)
  })

  it('[COMPONENTE] mudar o início refaz a validação do término depois da tentativa', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/novo`)

    await wrapper.get('#item-modelo-cronograma-atividade').setValue('Recepção dos convidados')
    const inicio = wrapper.get('#item-modelo-cronograma-inicio')
    const termino = wrapper.get('#item-modelo-cronograma-termino')
    await inicio.setValue('17:00')
    await termino.setValue('17:00')
    await wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_CRONOGRAMA.erroTermino)
    await aguardarAte(() => expect(document.activeElement?.id).toBe('item-modelo-cronograma-termino'))
    expect(chamadas(fetchSimulado, 'POST', ROTA_ITENS)).toHaveLength(0)

    await inicio.setValue('16:30')
    expect(wrapper.text()).not.toContain(TEXTOS_CRONOGRAMA.erroTermino)

    await inicio.setValue('17:00')
    expect(wrapper.text()).not.toContain(TEXTOS_CRONOGRAMA.erroTermino)
    await inicio.trigger('blur')
    expect(wrapper.text()).toContain(TEXTOS_CRONOGRAMA.erroTermino)
  })

  it('[COMPONENTE] falha de rede ao salvar o item mostra a mensagem geral e mantém os dados', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())),
      quando('POST', ROTA_ITENS, () => respostaProblema(500, { title: 'Erro' })),
    )
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/novo`)

    await wrapper.get('#item-modelo-cronograma-atividade').setValue('Brinde')
    await wrapper.get('#item-modelo-cronograma-inicio').setValue('18:00')
    await wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-teste="erro-formulario"]').text()).toContain(TEXTOS_ITEM_MODELO_CRONOGRAMA.erroSalvar)
    expect((wrapper.get('#item-modelo-cronograma-atividade').element as HTMLInputElement).value).toBe('Brinde')
  })

  it('[SEGURANÇA] item sem permissão mostra aviso da assessoria sem formulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaProblema(403, { title: 'Proibido' })))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/${ID_ITEM_MODELO_CRONOGRAMA}/editar`)

    expect(wrapper.text()).toContain(TEXTOS_MODELOS_CRONOGRAMA.semAcesso)
    expect(wrapper.find('[data-teste="formulario-item-modelo-cronograma"]').exists()).toBe(false)
  })

  it.each([
    ['Casamento', 'a cerimônia', 'Ex.: Entrada dos padrinhos', ['Local da cerimônia', 'Local da recepção', 'Outro'], '30 min antes da cerimônia', 'de um casamento'],
    ['QuinzeAnos', 'a festa', 'Ex.: Valsa com a corte', ['Local da festa', 'Outro local', 'Outro'], '30 min antes da festa', 'de uma festa de 15 anos'],
    ['Aniversario', 'a festa', 'Ex.: Abertura da festa', ['Local da festa', 'Outro local', 'Outro'], '30 min antes da festa', 'de um aniversário'],
    ['Comemoracao', 'o evento', 'Ex.: Brinde de homenagem', ['Local do evento', 'Outro local', 'Outro'], '30 min antes do evento', 'de uma comemoração'],
  ] as const)('[COMPONENTE] item de modelo %s fala do momento principal no cabeçalho, locais, dica e lateral', async (tipo, artigo, placeholder, locais, previa, apoio) => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto({ tipoEvento: tipo }))))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/novo`)

    expect(wrapper.get('.cabecalho-pagina__descricao').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia('16:00', artigo))
    expect(wrapper.get('#item-modelo-cronograma-atividade').attributes('placeholder')).toBe(placeholder)
    expect(wrapper.get('[data-teste="campo-opcao-local"]').findAll('button').map((opcao) => opcao.text())).toEqual(locais)
    expect(wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').text()).toContain(TEXTOS_ITEM_MODELO_CRONOGRAMA.dicaInicioPara(artigo, '16:00'))

    await wrapper.get('#item-modelo-cronograma-atividade').setValue('Chegada')
    await wrapper.get('#item-modelo-cronograma-inicio').setValue('15:30')
    expect(wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').text()).toContain(previa)
    const lateral = wrapper.get('[data-teste="lateral-formulario-item"]')
    expect(lateral.get('[data-teste="previa-horario-item"]').text()).toBe(previa)
    const dia = lateral.get('[data-teste="dia-item-DiaDoEvento"]')
    expect(dia.classes()).toContain('posicao-cronograma__dia--atual')
    expect(dia.text()).toContain(TEXTOS_ITEM_MODELO_CRONOGRAMA.esteItemEntraAqui)
    expect(dia.get('[data-teste="contagem-dia-item"]').text()).toBe('3 itens, das 10:00 às 17:00')
    expect(dia.findAll('[data-teste="itens-dia-atual"] > li').map((linha) => linha.attributes('data-teste'))).toEqual(['vizinho-item', 'este-item', 'vizinho-item'])
    expect(lateral.get('[data-teste="este-item"]').text()).toContain('Chegada (este item)')
    expect(lateral.get('[data-teste="apoio-exemplos-item"]').text()).toContain(apoio)
    expect(lateral.findAll('[data-teste="exemplo-item"]')).toHaveLength(3)
  })

  it.each([
    ['nulo', null],
    ['desconhecido', 'Formatura' as unknown as TipoEvento],
  ] as const)('[COMPONENTE] item de modelo com tipo %s fala do evento no formulário e na posição', async (_, tipo) => {
    const itens = modeloCronogramaCompleto().itens.map((item, indice) => ({ ...item, atividade: `Item ${indice + 1}` }))
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto({ tipoEvento: tipo, itens }))))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/novo`)

    expect(wrapper.get('.cabecalho-pagina__descricao').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia('16:00', 'o evento'))
    expect(wrapper.get('#item-modelo-cronograma-atividade').attributes('placeholder')).toBe('Ex.: Recepção dos convidados')
    expect(wrapper.get('[data-teste="campo-opcao-local"]').findAll('button').map((opcao) => opcao.text())).toEqual(['Local principal', 'Outro local', 'Outro'])
    await wrapper.get('#item-modelo-cronograma-inicio').setValue('19:00')

    expect(wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').text()).toContain('3 h depois do evento')
    expect(wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').text()).not.toMatch(/casamento|comemoração|cerimônia/i)
    const posicao = wrapper.get('[data-teste="posicao-item-modelo-cronograma"]')
    expect(posicao.get('[data-teste="previa-horario-item"]').text()).toBe('3 h depois do evento')
    expect(posicao.text()).not.toMatch(/casamento|comemoração|cerimônia/i)
    expect(wrapper.findAll('[data-teste="tipo-exemplo-item"]')).toHaveLength(4)
  })

  it('[COMPONENTE] prévia acompanha dia e início e some com início inválido', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto({ tipoEvento: 'QuinzeAnos' }))))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/novo`)

    const previa = () => wrapper.get('[data-teste="previa-horario-item"]').text()
    expect(previa()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.posicaoSemInicio)
    expect(wrapper.find('.posicao-cronograma__dia--atual').exists()).toBe(false)

    await wrapper.get('#item-modelo-cronograma-inicio').setValue('16:00')
    expect(previa()).toBe('Hora da festa')

    const dias = wrapper.get('[data-teste="campo-dia"]').findAll('button')
    await dias.find((opcao) => opcao.text() === 'Véspera')!.trigger('click')
    expect(previa()).toBe('24 h antes da festa')
    expect(wrapper.get('[data-teste="dia-item-Vespera"]').classes()).toContain('posicao-cronograma__dia--atual')
    expect(wrapper.get('[data-teste="nota-alcance-item"]').text()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.ampliaComeco)

    await wrapper.get('#item-modelo-cronograma-inicio').setValue('')
    expect(previa()).toBe(TEXTOS_ITEM_MODELO_CRONOGRAMA.posicaoSemInicio)
    expect(wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').text()).toContain(TEXTOS_ITEM_MODELO_CRONOGRAMA.dicaInicioPara('a festa', '16:00'))
  })

  it('[COMPONENTE] edição não mostra o próprio item como vizinho e o formulário vem antes da lateral', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())))
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/${ID_ITEM_MODELO_CRONOGRAMA}/editar`)

    expect(wrapper.get('.formulario-item-tela__pagina').classes()).toContain('com-lateral__pagina--ativa')
    const lateral = wrapper.get('[data-teste="lateral-formulario-item"]')
    expect(lateral.get('[data-teste="previa-horario-item"]').text()).toBe('6 h antes da cerimônia')
    expect(lateral.findAll('[data-teste="vizinho-item"]').map((linha) => linha.text())).toEqual(['Cerimônia16:00, hora da cerimônia'])
    expect(lateral.get('[data-teste="este-item"]').text()).toContain('Making of da noiva (este item)')
    expect(lateral.get('[data-teste="dia-item-DiaDoEvento"] [data-teste="contagem-dia-item"]').text()).toBe('2 itens, das 10:00 às 17:00')
    expect(lateral.find('a, button').exists()).toBe(false)

    const formulario = wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').element
    expect(formulario.compareDocumentPosition(lateral.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('[INTEGRAÇÃO] salvar e adicionar outro leva o item salvo para a posição sem nova leitura do modelo', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCronogramaCompleto())),
      quando('POST', ROTA_ITENS, () =>
        respostaJson(itemModeloCronograma({ id: 'novo', minutosDesdeCerimonia: 120, inicio: '18:00', duracaoMinutos: null, termino: null, atividade: 'Brinde' }), 201),
      ),
    )
    const { wrapper } = await abrir(`/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/novo`)

    await wrapper.get('#item-modelo-cronograma-atividade').setValue('Brinde')
    await wrapper.get('#item-modelo-cronograma-inicio').setValue('18:00')
    await wrapper.get('[data-teste="salvar-outro"]').trigger('click')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'GET', ROTA_MODELO)).toHaveLength(1)
    expect((wrapper.get('#item-modelo-cronograma-inicio').element as HTMLInputElement).value).toBe('18:00')
    const lateral = wrapper.get('[data-teste="lateral-formulario-item"]')
    expect(lateral.findAll('[data-teste="vizinho-item"]').map((linha) => linha.text())).toContain('Brinde18:00, 2 h depois da cerimônia')
    expect(lateral.get('[data-teste="dia-item-DiaDoEvento"] [data-teste="contagem-dia-item"]').text()).toContain('4 itens')
  })

  it.each([
    ['sem permissão', () => respostaProblema(403, { title: 'Proibido' }), `/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/novo`],
    ['modelo não encontrado', () => respostaProblema(404, { title: 'Não encontrado' }), `/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/novo`],
    ['item inexistente', () => respostaJson(modeloCronogramaCompleto({ itens: [] })), `/modelos-cronograma/${ID_MODELO_CRONOGRAMA}/itens/${ID_ITEM_MODELO_CRONOGRAMA}/editar`],
  ] as const)('[COMPONENTE] item com %s não mostra a lateral nem alarga a página', async (_, resposta, caminho) => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_MODELO, resposta))
    const { wrapper } = await abrir(caminho)

    expect(wrapper.find('[data-teste="lateral-formulario-item"]').exists()).toBe(false)
    expect(wrapper.get('.formulario-item-tela__pagina').classes()).not.toContain('com-lateral__pagina--ativa')
  })

  it('[UNITÁRIO] estilo do formulário de item usa @container, sem @media, largura de leitura nem espaçamento solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../ItemModeloCronogramaFormularioView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(fonte).toContain('class="pagina-formulario formulario-item-tela__pagina com-lateral__pagina')
    expect(estilo).toContain('container: formulario-item-cronograma / inline-size')
    expect(estilo).toContain('@container formulario-item-cronograma (min-width: 40rem)')
    expect(estilo).not.toContain('container: formulario-item-tela /')
    expect(estilo).not.toContain('@container formulario-item-tela ')
    expect(estilo).toContain('flex: 1 1 auto')
    expect(estilo).not.toContain('sticky')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('largura-leitura')
    expect(estilo).not.toContain('--p-espaco-')
    expect(estilo).not.toContain('overflow-x')
    expect(fonte).not.toContain("validarCampo('")
  })
})
