import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { SESSAO_EXEMPLO, corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, respostaVazia, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { ID_ITEM, ID_MODELO, itemModelo, modeloCompleto, resumoModelo } from '@/__tests__/auxiliaresChecklist'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { TEXTOS_ITEM_MODELO, TEXTOS_MODELOS_CHECKLIST } from '@/textos/checklist'
import { RaizRotas, chamadas, quando, rotearFetch } from '../../casamentos/__tests__/auxiliaresCasamentos'

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
            itemModelo({ id: 'i2', titulo: 'Prova final dos trajes', diasAntesDoCasamento: 30, responsavel: 'Casal', categoria: 'TrajesBeleza' }),
            itemModelo({ id: 'i3', titulo: 'Entregar o álbum', diasAntesDoCasamento: -20, categoria: 'Geral' }),
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
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('modelo-checklist'))
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

  it('[COMPONENTE] item com "depois do casamento" envia dias negativos', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([]))),
      quando('POST', ROTA_ITENS, () => respostaJson(itemModelo({ diasAntesDoCasamento: -15 }), 201)),
    )
    const { wrapper, montagem } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/novo`)

    expect(wrapper.get('legend').text()).toBe(TEXTOS_ITEM_MODELO.campoQuando)
    await wrapper.get('[data-teste="campo-titulo"]').setValue('Enviar fotos para o álbum')
    const dias = wrapper.get('[data-teste="campo-dias"] input')
    await dias.setValue('15')
    await dias.trigger('input')
    await dias.trigger('blur')
    const depois = wrapper.get('[data-teste="campo-sentido"]').findAll('[role="radio"], button, [data-pc-section="pcbutton"]').find((opcao) => opcao.text() === 'depois do casamento')!
    await depois.trigger('click')
    await wrapper.get('[data-teste="formulario-item-modelo"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', ROTA_ITENS)
    expect(corpoDaChamada(chamada!)).toMatchObject({ titulo: 'Enviar fotos para o álbum', diasAntesDoCasamento: -15, responsavel: 'Assessoria', categoria: 'Geral' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_ITEM_MODELO.toastCriado)
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('modelo-checklist'))
  })

  it('[COMPONENTE] edição preenche o item e mapeia erro do servidor para o campo Dias', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_MODELO, () => respostaJson(modeloCompleto([itemModelo({ diasAntesDoCasamento: -10 })]))),
      quando('PUT', `${ROTA_ITENS}/${ID_ITEM}`, () =>
        respostaProblema(400, { title: 'Dados inválidos', errors: { DiasAntesDoCasamento: ['Use de 0 a 1.095 dias antes ou até 365 dias depois.'] } }),
      ),
    )
    const { wrapper } = await abrir(`/modelos-checklist/${ID_MODELO}/itens/${ID_ITEM}/editar`)

    expect((wrapper.get('[data-teste="campo-titulo"]').element as HTMLInputElement).value).toBe('Reservar local da cerimônia e da recepção')
    expect((wrapper.get('[data-teste="campo-dias"] input').element as HTMLInputElement).value).toBe('10')
    await wrapper.get('[data-teste="formulario-item-modelo"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Use de 0 a 1.095 dias antes ou até 365 dias depois.')
    expect(corpoDaChamada(chamadas(fetchSimulado, 'PUT', `${ROTA_ITENS}/${ID_ITEM}`)[0]!)).toMatchObject({ diasAntesDoCasamento: -10 })
  })

  it('[SEGURANÇA] casal é redirecionado para fora das rotas de modelos', async () => {
    const sessaoCasal = { ...SESSAO_EXEMPLO, usuario: { ...SESSAO_EXEMPLO.usuario, papel: 'Casal' as const, casamentoId: '11111111-1111-4111-8111-111111111111' } }
    fetchSimulado.mockImplementation(async (entrada) => {
      const url = String(entrada)
      if (url === '/api/autenticacao/renovar') {
        return respostaJson(sessaoCasal)
      }
      if (url === '/api/casamentos/11111111-1111-4111-8111-111111111111') {
        return respostaJson({})
      }
      return respostaProblema(404, { title: 'Não encontrado' })
    })

    const { montagem } = await abrir('/modelos-checklist')

    expect(montagem.roteador.currentRoute.value.name).toBe('casamento')
    expect(chamadas(fetchSimulado, 'GET', ROTA_MODELOS)).toHaveLength(0)
  })
})
