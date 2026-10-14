import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'

import {
  SESSAO_EXEMPLO,
  corpoDaChamada,
  montarView,
  prepararAplicacao,
  respostaJson,
  respostaProblema,
  respostaVazia,
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'
import { listaTarefas, pendenciasExemplo, tarefaExemplo } from '@/__tests__/auxiliaresTarefas'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { TEXTOS_TAREFAS } from '@/textos/tarefas'
import type { SessaoDto } from '@/tipos/api'
import type { ListaTarefasDto } from '@/tipos/tarefas'
import { ID_CASAMENTO, RaizRotas, casamentoCompleto, chamadas, quando, resumoCasamento, type Rota } from '../../casamentos/__tests__/auxiliaresCasamentos'

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_CASAMENTO = `/api/casamentos/${ID_CASAMENTO}`
const ROTA_TAREFAS = `${ROTA_CASAMENTO}/tarefas`

const SESSAO_CASAL: SessaoDto = {
  tokenAcesso: 'token-casal',
  expiraEm: '2026-09-28T12:15:00Z',
  usuario: {
    id: 'u-casal',
    nome: 'Lívia Moraes',
    email: 'livia@exemplo.com',
    papel: 'Casal',
    organizacao: { id: 'o1', nome: 'Albuquerque Assessoria' },
    casamentoId: ID_CASAMENTO,
  },
}

const ATRASADA = tarefaExemplo({
  id: 'a',
  titulo: 'Assinar contrato da decoração',
  responsavel: 'Casal',
  categoria: 'Documentos',
  atrasada: true,
  diasParaPrazo: -4,
  prazo: '2026-09-26',
})
const SEMANA = tarefaExemplo({ id: 's', titulo: 'Confirmar buffet', venceNaSemana: true, diasParaPrazo: 2, prazo: '2026-10-02' })
const SEM_PRAZO = tarefaExemplo({ id: 'n', titulo: 'Revisar roteiro', prazo: null, diasParaPrazo: null, categoria: 'Cerimonia' })
const CONCLUIDA = tarefaExemplo({ id: 'c', titulo: 'Escolher música', status: 'Concluida', concluidaEm: '2026-09-28T15:00:00Z', concluidaPor: 'Casal', responsavel: 'Casal' })

function rotear(fetchSimulado: Mock<typeof fetch>, sessao: SessaoDto, ...rotas: Rota[]) {
  fetchSimulado.mockImplementation(async (entrada, init) => {
    const url = String(entrada)
    if (url === '/api/autenticacao/renovar') {
      return respostaJson(sessao)
    }
    for (const rota of rotas) {
      const resposta = rota(url, init)
      if (resposta) {
        return resposta
      }
    }
    return respostaProblema(404, { title: 'Recurso não encontrado.' })
  })
}

function listaPadrao(): ListaTarefasDto {
  return listaTarefas([ATRASADA, SEMANA, SEM_PRAZO, CONCLUIDA])
}

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

describe('TarefasView — assessoria', () => {
  it('[COMPONENTE] lista agrupada por horizonte com atrasada destacada e número editorial', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaPadrao())),
    )

    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas`)

    expect(wrapper.get('h1').text()).toBe(TEXTOS_TAREFAS.titulo)
    expect(wrapper.get('[data-teste="resumo-tarefas"]').text()).toBe('3 abertas · 1 concluída')
    expect(wrapper.get('[data-teste="destaque-atrasadas"]').text()).toContain('1')
    expect(wrapper.find('[data-teste="grupo-atrasadas"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="grupo-semana"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="grupo-semPrazo"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="grupo-adiante"]').exists()).toBe(false)
    const grupoAtrasadas = wrapper.get('[data-teste="grupo-atrasadas"]')
    expect(grupoAtrasadas.get('[data-teste="badge-status"]').attributes('data-variante')).toBe('erro')
    expect(grupoAtrasadas.text()).toContain('Atrasada')
    expect(grupoAtrasadas.text()).toContain('venceu há 4 dias')
    expect(grupoAtrasadas.text()).toContain('Documentos')
    expect(wrapper.text()).not.toContain('Escolher música')
    expect(wrapper.find('[data-teste="nova-tarefa"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-teste="menu-acoes"]')).toHaveLength(3)
    const itemMenu = wrapper.findAll('[data-teste="item-casamento"]').find((item) => item.text() === 'Tarefas')
    expect(itemMenu?.attributes('aria-current')).toBe('page')
  })

  it('[COMPONENTE] filtros por situação, responsável e categoria; a situação vai para a URL', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaPadrao())),
    )
    const { wrapper, montagem } = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas?situacao=concluidas`)

    expect(wrapper.findAll('[data-teste="titulo-tarefa"]').map((item) => item.text())).toEqual(['Escolher música'])
    expect(wrapper.text()).toContain('Concluída pelo casal em 28/09/2026')

    const opcoes = wrapper.get('[data-teste="filtro-situacao"]').findAll('[role="radio"], button, [data-pc-section="pcbutton"]')
    const todas = opcoes.find((opcao) => opcao.text() === 'Todas')!
    await todas.trigger('click')
    await flushPromises()
    expect(montagem.roteador.currentRoute.value.query.situacao).toBe('todas')
    expect(wrapper.findAll('[data-teste="titulo-tarefa"]')).toHaveLength(4)

    const casal = wrapper.get('[data-teste="filtro-responsavel"]').findAll('[role="radio"], button, [data-pc-section="pcbutton"]').find((opcao) => opcao.text() === 'Casal')!
    await casal.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-teste="titulo-tarefa"]').map((item) => item.text())).toEqual(['Assinar contrato da decoração', 'Escolher música'])
  })

  it('[COMPONENTE] concluir pelo anel envia PATCH, avisa e oferece Desfazer que reabre', async () => {
    let lista = listaPadrao()
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(lista)),
      (url, init) => {
        if (url !== `${ROTA_TAREFAS}/a/status` || init?.method !== 'PATCH') {
          return undefined
        }
        const status = (JSON.parse(String(init.body)) as { status: string }).status
        const atualizada =
          status === 'Concluida'
            ? { ...ATRASADA, status: 'Concluida' as const, atrasada: false, concluidaPor: 'Assessoria' as const, concluidaEm: '2026-09-30T12:00:00Z' }
            : ATRASADA
        lista = listaTarefas([atualizada, SEMANA, SEM_PRAZO, CONCLUIDA])
        return respostaJson(atualizada)
      },
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas`)

    const anel = wrapper.get('[data-teste="grupo-atrasadas"] [data-teste="alternar-tarefa"]')
    expect(anel.attributes('aria-label')).toBe('Concluir: Assinar contrato da decoração')
    await anel.trigger('click')
    await flushPromises()

    const patch = chamadas(fetchSimulado, 'PATCH', `${ROTA_TAREFAS}/a/status`)
    expect(patch).toHaveLength(1)
    expect(corpoDaChamada(patch[0]!)).toEqual({ status: 'Concluida' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_TAREFAS.toastConcluida, expect.objectContaining({ desfazer: expect.any(Function) }))
    expect(wrapper.find('[data-teste="grupo-atrasadas"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="destaque-em-dia"]').exists()).toBe(true)

    const { desfazer } = notificacoes.sucesso.mock.calls[0]![1] as { desfazer: () => Promise<void> }
    await desfazer()
    await flushPromises()

    const segunda = chamadas(fetchSimulado, 'PATCH', `${ROTA_TAREFAS}/a/status`)[1]!
    expect(corpoDaChamada(segunda)).toEqual({ status: 'AFazer' })
    expect(notificacoes.sucesso).toHaveBeenLastCalledWith(TEXTOS_TAREFAS.toastReaberta)
  })

  it('[COMPONENTE] falha ao concluir mostra erro com a mensagem da regra', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaPadrao())),
      quando('PATCH', `${ROTA_TAREFAS}/s/status`, () => respostaProblema(422, { detail: 'Este casamento está arquivado. Restaure para voltar a editar.' })),
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas`)

    await wrapper.get('[data-teste="grupo-semana"] [data-teste="alternar-tarefa"]').trigger('click')
    await flushPromises()

    expect(notificacoes.erro).toHaveBeenCalledWith('Este casamento está arquivado. Restaure para voltar a editar.')
    expect(notificacoes.sucesso).not.toHaveBeenCalled()
  })

  it('[COMPONENTE] excluir pede confirmação nomeando a tarefa e envia DELETE', async () => {
    let removida = false
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(removida ? listaTarefas([ATRASADA, SEMANA, CONCLUIDA]) : listaPadrao())),
      quando('DELETE', `${ROTA_TAREFAS}/n`, () => {
        removida = true
        return respostaVazia()
      }),
    )
    const { wrapper, montagem } = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas`)
    const confirmacao = useConfirmacaoExclusaoStore(montagem.pinia)
    const menus = wrapper.findAllComponents({ name: 'MenuAcoes' })
    const menuSemPrazo = menus.find((menu) => String(menu.props('rotuloAcessivel')).includes('Revisar roteiro'))!

    menuSemPrazo.vm.$emit('selecionar', 'excluir')
    await flushPromises()

    expect(confirmacao.visivel).toBe(true)
    expect(confirmacao.nomeItem).toBe('Revisar roteiro')
    expect(confirmacao.mensagem).toBe(TEXTOS_TAREFAS.confirmarExclusaoTexto)
    await confirmacao.confirmar()
    await flushPromises()
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_TAREFAS}/n`)).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Revisar roteiro')
  })

  it('[COMPONENTE] menu leva à edição e muda status para iniciar', async () => {
    const ID_TAREFA = '44444444-4444-4444-8444-444444444444'
    const semana = { ...SEMANA, id: ID_TAREFA }
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([ATRASADA, semana]))),
      quando('PATCH', `${ROTA_TAREFAS}/${ID_TAREFA}/status`, () => respostaJson({ ...semana, status: 'EmAndamento' })),
      quando('GET', `${ROTA_TAREFAS}/${ID_TAREFA}`, () => respostaJson(semana)),
    )
    const { wrapper, montagem } = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas`)
    const menu = wrapper.findAllComponents({ name: 'MenuAcoes' }).find((item) => String(item.props('rotuloAcessivel')).includes('Confirmar buffet'))!

    expect((menu.props('itens') as { chave: string }[]).map((item) => item.chave)).toEqual(['editar', 'iniciar', 'cancelar', 'excluir'])
    menu.vm.$emit('selecionar', 'iniciar')
    await flushPromises()
    expect(corpoDaChamada(chamadas(fetchSimulado, 'PATCH', `${ROTA_TAREFAS}/${ID_TAREFA}/status`)[0]!)).toEqual({ status: 'EmAndamento' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_TAREFAS.toastIniciada, undefined)

    const menuAtual = wrapper.findAllComponents({ name: 'MenuAcoes' }).find((item) => String(item.props('rotuloAcessivel')).includes('Confirmar buffet'))!
    menuAtual.vm.$emit('selecionar', 'editar')
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('tarefa-editar'))
    expect(montagem.roteador.currentRoute.value.params.tarefaId).toBe(ID_TAREFA)
  })

  it('[COMPONENTE] estados: vazio com ação, erro com nova tentativa e casamento arquivado em somente leitura', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([]))),
    )
    const vazio = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas`)
    expect(vazio.wrapper.get('[data-teste="estado-vazio"]').text()).toContain(TEXTOS_TAREFAS.vazioTitulo)
    expect(vazio.wrapper.find('[data-teste="nova-tarefa-vazio"]').exists()).toBe(true)
    vazio.wrapper.unmount()

    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())), quando('GET', ROTA_TAREFAS, () => respostaProblema(500)))
    const erro = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas`)
    expect(erro.wrapper.text()).toContain(TEXTOS_TAREFAS.erroTitulo)
    expect(erro.wrapper.text()).toContain('Tentar novamente')
    erro.wrapper.unmount()

    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ arquivado: true, arquivadoEm: '2026-09-01T12:00:00Z' }))),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([SEMANA], { casamentoArquivado: true }))),
    )
    const arquivado = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas`)
    expect(arquivado.wrapper.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_TAREFAS.arquivado)
    expect(arquivado.wrapper.find('[data-teste="nova-tarefa"]').exists()).toBe(false)
    expect(arquivado.wrapper.find('[data-teste="menu-acoes"]').exists()).toBe(false)
    const anel = arquivado.wrapper.get('[data-teste="alternar-tarefa"]')
    expect(anel.attributes('aria-disabled')).toBe('true')
    await anel.trigger('click')
    expect(chamadas(fetchSimulado, 'PATCH', `${ROTA_TAREFAS}/s/status`)).toHaveLength(0)
  })

  it('[SEGURANÇA] casamento de outra organização mostra não encontrado', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO)

    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas`)

    expect(wrapper.text()).toContain(TEXTOS_TAREFAS.naoEncontradoTitulo)
    expect(wrapper.find('[data-teste="nova-tarefa"]').exists()).toBe(false)
  })
})

describe('TarefasView — casal', () => {
  it('[SEGURANÇA] casal vê "Tarefas de vocês" sem ações da assessoria nem filtros de gestão', async () => {
    rotear(
      fetchSimulado,
      SESSAO_CASAL,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ observacoes: null }))),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([ATRASADA, CONCLUIDA], { somenteDoCasal: true }))),
      quando('PATCH', `${ROTA_TAREFAS}/a/status`, () => respostaJson({ ...ATRASADA, status: 'Concluida', atrasada: false, concluidaPor: 'Casal', concluidaEm: '2026-09-30T12:00:00Z' })),
    )

    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas`)

    expect(wrapper.get('h1').text()).toBe(TEXTOS_TAREFAS.tituloCasal)
    expect(wrapper.get('[data-teste="resumo-tarefas"]').text()).toBe('1 esperando por vocês')
    expect(wrapper.find('[data-teste="nova-tarefa"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="menu-acoes"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="filtro-responsavel"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="filtro-categoria"]').exists()).toBe(false)
    expect(wrapper.text()).toContain(TEXTOS_TAREFAS.rodapeCasal)
    expect(wrapper.get('[data-teste="metadados-tarefa"]').text()).toBe('venceu há 4 dias')

    await wrapper.get('[data-teste="alternar-tarefa"]').trigger('click')
    await flushPromises()

    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_TAREFAS.toastConcluidaCasal, expect.objectContaining({ desfazer: expect.any(Function) }))
  })

  it('[SEGURANÇA] casal que abre nova/editar tarefa é levado de volta ao próprio casamento', async () => {
    rotear(fetchSimulado, SESSAO_CASAL, quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ observacoes: null }))))

    for (const caminho of [`/casamentos/${ID_CASAMENTO}/tarefas/nova`, `/casamentos/${ID_CASAMENTO}/tarefas/${ID_CASAMENTO}/editar`]) {
      const montagem = await prepararAplicacao(caminho)
      expect(montagem.roteador.currentRoute.value.name).toBe('casamento')
    }
  })
})

describe('TarefaFormularioView', () => {
  it('[COMPONENTE] valida antes de enviar e cria com os campos escolhidos', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('POST', ROTA_TAREFAS, () => respostaJson(tarefaExemplo({ id: 'nova' }), 201)),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([tarefaExemplo({ id: 'nova' })]))),
    )
    const { wrapper, montagem } = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas/nova`)

    expect(wrapper.get('h1').text()).toBe(TEXTOS_TAREFAS.formNova)
    await wrapper.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Preencha este campo.')
    expect(chamadas(fetchSimulado, 'POST', ROTA_TAREFAS)).toHaveLength(0)

    await wrapper.get('[data-teste="campo-titulo"]').setValue('  Enviar lista de padrinhos ')
    await wrapper.get('[data-teste="campo-prazo"]').setValue('2026-10-10')
    const casal = wrapper.get('[data-teste="campo-responsavel"]').findAll('[role="radio"], button, [data-pc-section="pcbutton"]').find((opcao) => opcao.text() === 'Casal')!
    await casal.trigger('click')
    await wrapper.get('[data-teste="campo-descricao"]').setValue('Nomes completos')
    await wrapper.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()

    const envio = chamadas(fetchSimulado, 'POST', ROTA_TAREFAS)
    expect(envio).toHaveLength(1)
    expect(corpoDaChamada(envio[0]!)).toEqual({
      titulo: 'Enviar lista de padrinhos',
      descricao: 'Nomes completos',
      responsavel: 'Casal',
      categoria: 'Geral',
      prazo: '2026-10-10',
    })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_TAREFAS.toastCriada)
    expect(montagem.roteador.currentRoute.value.name).toBe('casamento-tarefas')
  })

  it('[SEGURANÇA] edição de tarefa inexistente ou de outro casamento mostra não encontrada; id inválido cai no 404 da aplicação', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())))

    const inexistente = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas/33333333-3333-4333-8333-333333333333/editar`)
    expect(inexistente.wrapper.text()).toContain(TEXTOS_TAREFAS.tarefaNaoEncontradaTitulo)
    expect(inexistente.wrapper.find('[data-teste="formulario-tarefa"]').exists()).toBe(false)
    inexistente.wrapper.unmount()

    const invalido = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}/tarefas/abc/editar`)
    expect(invalido.roteador.currentRoute.value.name).toBe('nao-encontrado')
  })

  it('[COMPONENTE] edição com id válido preenche os campos e salva status alterado', async () => {
    const ID_TAREFA = '33333333-3333-4333-8333-333333333333'
    const tarefa = tarefaExemplo({ id: ID_TAREFA, titulo: 'Confirmar buffet', descricao: 'Ligar para o buffet', prazo: '2026-10-02' })
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', `${ROTA_TAREFAS}/${ID_TAREFA}`, () => respostaJson(tarefa)),
      quando('PUT', `${ROTA_TAREFAS}/${ID_TAREFA}`, () => respostaJson(tarefa)),
      quando('PATCH', `${ROTA_TAREFAS}/${ID_TAREFA}/status`, () => respostaJson({ ...tarefa, status: 'Cancelada' })),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([tarefa]))),
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas/${ID_TAREFA}/editar`)

    expect(wrapper.get('h1').text()).toBe(TEXTOS_TAREFAS.formEditar)
    expect((wrapper.get('[data-teste="campo-titulo"]').element as HTMLInputElement).value).toBe('Confirmar buffet')
    expect((wrapper.get('[data-teste="campo-prazo"]').element as HTMLInputElement).value).toBe('2026-10-02')
    const cancelada = wrapper.get('[data-teste="campo-status"]').findAll('[role="radio"], button, [data-pc-section="pcbutton"]').find((opcao) => opcao.text() === 'Cancelada')!
    await cancelada.trigger('click')
    await wrapper.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'PUT', `${ROTA_TAREFAS}/${ID_TAREFA}`)).toHaveLength(1)
    expect(corpoDaChamada(chamadas(fetchSimulado, 'PATCH', `${ROTA_TAREFAS}/${ID_TAREFA}/status`)[0]!)).toEqual({ status: 'Cancelada' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_TAREFAS.toastSalva)
  })

  it('[COMPONENTE] erro 400 do servidor aparece sob o campo e 422 no topo', async () => {
    let tentativa = 0
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('POST', ROTA_TAREFAS, () => {
        tentativa += 1
        return tentativa === 1
          ? respostaProblema(400, { errors: { Titulo: ['Use entre 2 e 160 caracteres.'] } })
          : respostaProblema(422, { detail: 'Este casamento já tem 500 tarefas. Exclua ou conclua algumas antes de criar novas.' })
      }),
    )
    const { wrapper } = await abrir(`/casamentos/${ID_CASAMENTO}/tarefas/nova`)

    await wrapper.get('[data-teste="campo-titulo"]').setValue('Tarefa válida')
    await wrapper.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-teste="erro-campo"]').text()).toContain('Use entre 2 e 160 caracteres.')

    await wrapper.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-teste="erro-formulario"]').text()).toContain('500 tarefas')
  })
})

describe('Dashboard — pendências de tarefas', () => {
  it('[COMPONENTE] assessoria vê o bloco de pendências com link para o casamento', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson([resumoCasamento()])),
      quando('GET', '/api/tarefas/pendencias', () => respostaJson(pendenciasExemplo())),
    )

    const { wrapper } = await abrir('/')

    const bloco = wrapper.get('[data-teste="bloco-pendencias-tarefas"]')
    expect(bloco.get('[data-teste="total-atrasadas"]').text()).toBe('1')
    expect(bloco.text()).toContain('Confirmar horário do DJ')
    expect(bloco.get('a').attributes('href')).toBe(`/casamentos/${ID_CASAMENTO}/tarefas?situacao=atrasadas`)
  })

  it('[COMPONENTE] sem casamentos o bloco não aparece e erro nas pendências não derruba o dashboard', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson([])),
      quando('GET', '/api/tarefas/pendencias', () => respostaProblema(500)),
    )
    const vazio = await abrir('/')
    expect(vazio.wrapper.find('[data-teste="bloco-pendencias-tarefas"]').exists()).toBe(false)
    vazio.wrapper.unmount()

    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson([resumoCasamento()])),
      quando('GET', '/api/tarefas/pendencias', () => respostaProblema(500)),
    )
    const comErro = await abrir('/')
    expect(comErro.wrapper.get('[data-teste="bloco-pendencias-tarefas"]').text()).toContain(TEXTOS_TAREFAS.dashErro)
    expect(comErro.wrapper.find('[data-teste="proximos-casamentos"]').exists()).toBe(true)
  })
})
