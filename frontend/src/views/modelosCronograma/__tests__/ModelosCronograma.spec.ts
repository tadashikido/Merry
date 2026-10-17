import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

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
import { TEXTOS_ITEM_MODELO_CRONOGRAMA, TEXTOS_MODELOS_CRONOGRAMA } from '@/textos/modelosCronograma'
import { RaizRotas, chamadas, quando, rotearFetch } from '../../casamentos/__tests__/auxiliaresCasamentos'

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
    const lista = wrapper.get('[data-teste="lista-modelos"]')
    expect(lista.element.tagName).toBe('UL')
    expect(lista.classes()).toEqual(expect.arrayContaining(['grade', 'grade--larga']))
    expect(lista.attributes('aria-label')).toBe(TEXTOS_MODELOS_CRONOGRAMA.listaRotulo)
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
    expect(estilo).toContain('container: modelos / inline-size')
    expect(estilo).toContain('@container modelos')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('largura-leitura')
    expect(estilo).not.toContain('--p-espaco-')
    expect(fonte).toContain('class="modelos pilha pilha--cartao"')
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
    expect(wrapper.get('[data-teste="apoio-referencia"]').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia('16:00'))
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

    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('item-modelo-cronograma-editar'), { timeout: 5000 })
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
    expect(lateral.get('[data-teste="apoio-referencia"]').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia('16:00'))
    expect(lateral.get('[data-teste="resumo-dia-Vespera"]').text()).toContain('1 item, das 19:00 às 20:00')
    expect(lateral.get('[data-teste="resumo-dia-DiaDoCasamento"]').text()).toContain('2 itens, das 10:00 às 17:00')
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
    expect(wrapper.get('[data-teste="grupo-modelo-DiaDoCasamento"]').classes()).toEqual(
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

    expect(wrapper.get('[data-teste="resumo-dia-DiaDoCasamento"]').text()).toContain('2 itens, das 10:00 às 02:00 do dia seguinte')
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
    expect(estilo).toContain('container: modelo-cronograma / inline-size')
    expect(estilo).toContain('container: lateral-modelo-cronograma / inline-size')
    expect(estilo).toContain('@container modelo-cronograma (min-width: 64rem)')
    expect(estilo).toContain('@container lateral-modelo-cronograma (min-width: 36rem)')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('largura-leitura')
    expect(estilo).not.toContain('--p-espaco-')
    expect(fonte).toContain('class="modelo-cronograma pilha pilha--bloco"')
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
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('modelo-cronograma'), { timeout: 5000 })
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
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('modelo-cronograma'), { timeout: 5000 })
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
    expect(fonte).toContain('class="pagina-formulario"')
    expect(estilo).toContain('container: formulario-modelo / inline-size')
    expect(estilo).toContain('@container formulario-modelo (min-width: 40rem)')
    expect(estilo).toContain('repeat(2, minmax(0, 1fr))')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('largura-leitura')
    expect(estilo).not.toContain('--p-espaco-')
    expect(fonte).not.toContain("validarCampo('")
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
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('modelo-cronograma'), { timeout: 5000 })
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
    expect(pagina.get('.cabecalho-pagina__descricao').text()).toBe(TEXTOS_MODELOS_CRONOGRAMA.apoioReferencia('16:00'))
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
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('item-modelo-cronograma-atividade'))

    const atividade = wrapper.get('#item-modelo-cronograma-atividade')
    await atividade.trigger('blur')
    await wrapper.get('#item-modelo-cronograma-inicio').trigger('blur')
    expect(wrapper.findAll('[data-teste="erro-campo"]')).toHaveLength(0)

    await wrapper.get('[data-teste="formulario-item-modelo-cronograma"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain(TEXTOS_CRONOGRAMA.erroAtividade)
    expect(wrapper.text()).toContain(TEXTOS_CRONOGRAMA.erroInicio)
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('item-modelo-cronograma-atividade'))
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
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('item-modelo-cronograma-termino'))
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

  it('[UNITÁRIO] estilo do formulário de item usa @container, sem @media, largura de leitura nem espaçamento solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../ItemModeloCronogramaFormularioView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(fonte).toContain('class="pagina-formulario"')
    expect(estilo).toContain('container: formulario-item-cronograma / inline-size')
    expect(estilo).toContain('@container formulario-item-cronograma (min-width: 40rem)')
    expect(estilo).toContain('flex: 1 1 auto')
    expect(estilo).not.toContain('@media')
    expect(estilo).not.toContain('largura-leitura')
    expect(estilo).not.toContain('--p-espaco-')
    expect(estilo).not.toContain('overflow-x')
    expect(fonte).not.toContain("validarCampo('")
  })
})
