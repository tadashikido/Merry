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
})
