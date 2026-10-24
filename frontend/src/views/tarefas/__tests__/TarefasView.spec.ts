import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
import { aguardarAte, aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { listaTarefas, pendenciasExemplo, tarefaExemplo } from '@/__tests__/auxiliaresTarefas'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { TEXTOS_TAREFAS } from '@/textos/tarefas'
import type { SessaoDto } from '@/tipos/api'
import type { ListaTarefasDto } from '@/tipos/tarefas'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, resumoEvento, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-tarefas', 'tarefa-editar', 'evento', 'tarefa-nova', 'nao-encontrado')

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_TAREFAS = `${ROTA_EVENTO}/tarefas`

const SESSAO_ANFITRIAO: SessaoDto = {
  tokenAcesso: 'token-anfitriao',
  expiraEm: '2026-09-28T12:15:00Z',
  usuario: {
    id: 'u-anfitriao',
    nome: 'Lívia Moraes',
    email: 'livia@exemplo.com',
    papel: 'Anfitriao',
    organizacao: { id: 'o1', nome: 'Albuquerque Assessoria' },
    eventoId: ID_EVENTO,
  },
}

const ATRASADA = tarefaExemplo({
  id: 'a',
  titulo: 'Assinar contrato da decoração',
  responsavel: 'Anfitriao',
  categoria: 'Documentos',
  atrasada: true,
  diasParaPrazo: -4,
  prazo: '2026-09-26',
})
const SEMANA = tarefaExemplo({ id: 's', titulo: 'Confirmar buffet', venceNaSemana: true, diasParaPrazo: 2, prazo: '2026-10-02' })
const SEM_PRAZO = tarefaExemplo({ id: 'n', titulo: 'Revisar roteiro', prazo: null, diasParaPrazo: null, categoria: 'Cerimonia' })
const CONCLUIDA = tarefaExemplo({ id: 'c', titulo: 'Escolher música', status: 'Concluida', concluidaEm: '2026-09-28T15:00:00Z', concluidaPor: 'Anfitriao', responsavel: 'Anfitriao' })

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
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaPadrao())),
    )

    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/tarefas`)

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
    const itemMenu = wrapper.findAll('[data-teste="item-evento"]').find((item) => item.text() === 'Tarefas')
    expect(itemMenu?.attributes('aria-current')).toBe('page')
  })

  it('[COMPONENTE] filtros por situação, responsável e categoria; a situação vai para a URL', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaPadrao())),
    )
    const { wrapper, montagem } = await abrir(`/eventos/${ID_EVENTO}/tarefas?situacao=concluidas`)

    expect(wrapper.findAll('[data-teste="titulo-tarefa"]').map((item) => item.text())).toEqual(['Escolher música'])
    expect(wrapper.text()).toContain('Concluída pelos anfitriões em 28/09/2026')

    const opcoes = wrapper.get('[data-teste="filtro-situacao"]').findAll('[role="radio"], button, [data-pc-section="pcbutton"]')
    const todas = opcoes.find((opcao) => opcao.text() === 'Todas')!
    await todas.trigger('click')
    await flushPromises()
    await aguardarAte(() => expect(montagem.roteador.currentRoute.value.query.situacao).toBe('todas'))
    expect(wrapper.findAll('[data-teste="titulo-tarefa"]')).toHaveLength(4)

    const anfitriao = wrapper.get('[data-teste="filtro-responsavel"]').findAll('[role="radio"], button, [data-pc-section="pcbutton"]').find((opcao) => opcao.text() === 'Anfitriões')!
    await anfitriao.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-teste="titulo-tarefa"]').map((item) => item.text())).toEqual(['Assinar contrato da decoração', 'Escolher música'])
  })

  it('[COMPONENTE] concluir pelo anel envia PATCH, avisa e oferece Desfazer que reabre', async () => {
    let lista = listaPadrao()
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
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
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/tarefas`)

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
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaPadrao())),
      quando('PATCH', `${ROTA_TAREFAS}/s/status`, () => respostaProblema(422, { detail: 'Este evento está arquivado. Restaure para voltar a editar.' })),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/tarefas`)

    await wrapper.get('[data-teste="grupo-semana"] [data-teste="alternar-tarefa"]').trigger('click')
    await flushPromises()

    expect(notificacoes.erro).toHaveBeenCalledWith('Este evento está arquivado. Restaure para voltar a editar.')
    expect(notificacoes.sucesso).not.toHaveBeenCalled()
  })

  it('[COMPONENTE] excluir pede confirmação nomeando a tarefa e envia DELETE', async () => {
    let removida = false
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(removida ? listaTarefas([ATRASADA, SEMANA, CONCLUIDA]) : listaPadrao())),
      quando('DELETE', `${ROTA_TAREFAS}/n`, () => {
        removida = true
        return respostaVazia()
      }),
    )
    const { wrapper, montagem } = await abrir(`/eventos/${ID_EVENTO}/tarefas`)
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
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([ATRASADA, semana]))),
      quando('PATCH', `${ROTA_TAREFAS}/${ID_TAREFA}/status`, () => respostaJson({ ...semana, status: 'EmAndamento' })),
      quando('GET', `${ROTA_TAREFAS}/${ID_TAREFA}`, () => respostaJson(semana)),
    )
    const { wrapper, montagem } = await abrir(`/eventos/${ID_EVENTO}/tarefas`)
    const menu = wrapper.findAllComponents({ name: 'MenuAcoes' }).find((item) => String(item.props('rotuloAcessivel')).includes('Confirmar buffet'))!

    expect((menu.props('itens') as { chave: string }[]).map((item) => item.chave)).toEqual(['editar', 'iniciar', 'cancelar', 'excluir'])
    menu.vm.$emit('selecionar', 'iniciar')
    await flushPromises()
    expect(corpoDaChamada(chamadas(fetchSimulado, 'PATCH', `${ROTA_TAREFAS}/${ID_TAREFA}/status`)[0]!)).toEqual({ status: 'EmAndamento' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_TAREFAS.toastIniciada, undefined)

    const menuAtual = wrapper.findAllComponents({ name: 'MenuAcoes' }).find((item) => String(item.props('rotuloAcessivel')).includes('Confirmar buffet'))!
    menuAtual.vm.$emit('selecionar', 'editar')
    await aguardarRota(montagem.roteador, 'tarefa-editar')
    expect(montagem.roteador.currentRoute.value.params.tarefaId).toBe(ID_TAREFA)
  })

  it('[COMPONENTE] estados: vazio com ação, erro com nova tentativa e evento arquivado em somente leitura', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([]))),
    )
    const vazio = await abrir(`/eventos/${ID_EVENTO}/tarefas`)
    expect(vazio.wrapper.get('[data-teste="estado-vazio"]').text()).toContain(TEXTOS_TAREFAS.vazioTitulo)
    expect(vazio.wrapper.find('[data-teste="nova-tarefa-vazio"]').exists()).toBe(true)
    vazio.wrapper.unmount()

    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())), quando('GET', ROTA_TAREFAS, () => respostaProblema(500)))
    const erro = await abrir(`/eventos/${ID_EVENTO}/tarefas`)
    expect(erro.wrapper.text()).toContain(TEXTOS_TAREFAS.erroTitulo)
    expect(erro.wrapper.text()).toContain('Tentar novamente')
    erro.wrapper.unmount()

    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ arquivado: true, arquivadoEm: '2026-09-01T12:00:00Z' }))),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([SEMANA], { eventoArquivado: true }))),
    )
    const arquivado = await abrir(`/eventos/${ID_EVENTO}/tarefas`)
    expect(arquivado.wrapper.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_TAREFAS.arquivado)
    expect(arquivado.wrapper.find('[data-teste="nova-tarefa"]').exists()).toBe(false)
    expect(arquivado.wrapper.find('[data-teste="menu-acoes"]').exists()).toBe(false)
    const anel = arquivado.wrapper.get('[data-teste="alternar-tarefa"]')
    expect(anel.attributes('aria-disabled')).toBe('true')
    await anel.trigger('click')
    expect(chamadas(fetchSimulado, 'PATCH', `${ROTA_TAREFAS}/s/status`)).toHaveLength(0)
  })

  it('[SEGURANÇA] evento de outra organização mostra não encontrado', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO)

    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/tarefas`)

    expect(wrapper.text()).toContain(TEXTOS_TAREFAS.naoEncontradoTitulo)
    expect(wrapper.find('[data-teste="nova-tarefa"]').exists()).toBe(false)
  })
})

describe('TarefasView — anfitriões', () => {
  it('[SEGURANÇA] anfitriões veem "Tarefas de vocês" sem ações da assessoria nem filtros de gestão', async () => {
    rotear(
      fetchSimulado,
      SESSAO_ANFITRIAO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ observacoes: null }))),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([ATRASADA, CONCLUIDA], { somenteDoAnfitriao: true }))),
      quando('PATCH', `${ROTA_TAREFAS}/a/status`, () => respostaJson({ ...ATRASADA, status: 'Concluida', atrasada: false, concluidaPor: 'Anfitriao', concluidaEm: '2026-09-30T12:00:00Z' })),
    )

    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/tarefas`)

    expect(wrapper.get('h1').text()).toBe(TEXTOS_TAREFAS.tituloAnfitriao)
    expect(wrapper.get('[data-teste="resumo-tarefas"]').text()).toBe('1 esperando por vocês')
    expect(wrapper.find('[data-teste="nova-tarefa"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="menu-acoes"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="filtro-responsavel"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="filtro-categoria"]').exists()).toBe(false)
    expect(wrapper.text()).toContain(TEXTOS_TAREFAS.rodapeAnfitriao)
    expect(wrapper.get('[data-teste="metadados-tarefa"]').text()).toBe('venceu há 4 dias')

    await wrapper.get('[data-teste="alternar-tarefa"]').trigger('click')
    await flushPromises()

    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_TAREFAS.toastConcluidaAnfitriao, expect.objectContaining({ desfazer: expect.any(Function) }))
  })

  it('[SEGURANÇA] anfitriões que abrem nova/editar tarefa são levados de volta ao próprio evento', async () => {
    rotear(fetchSimulado, SESSAO_ANFITRIAO, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ observacoes: null }))))

    for (const caminho of [`/eventos/${ID_EVENTO}/tarefas/nova`, `/eventos/${ID_EVENTO}/tarefas/${ID_EVENTO}/editar`]) {
      const montagem = await prepararAplicacao(caminho)
      expect(montagem.roteador.currentRoute.value.name).toBe('evento')
    }
  })
})

describe('TarefaFormularioView', () => {
  it('[COMPONENTE] valida antes de enviar e cria com os campos escolhidos', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('POST', ROTA_TAREFAS, () => respostaJson(tarefaExemplo({ id: 'nova' }), 201)),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([tarefaExemplo({ id: 'nova' })]))),
    )
    const { wrapper, montagem } = await abrir(`/eventos/${ID_EVENTO}/tarefas/nova`)

    expect(wrapper.get('h1').text()).toBe(TEXTOS_TAREFAS.formNova)
    await wrapper.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Preencha este campo.')
    expect(chamadas(fetchSimulado, 'POST', ROTA_TAREFAS)).toHaveLength(0)

    await wrapper.get('[data-teste="campo-titulo"]').setValue('  Enviar lista de padrinhos ')
    await wrapper.get('[data-teste="campo-prazo"]').setValue('2026-10-10')
    const anfitriao = wrapper.get('[data-teste="campo-responsavel"]').findAll('[role="radio"], button, [data-pc-section="pcbutton"]').find((opcao) => opcao.text() === 'Anfitriões')!
    await anfitriao.trigger('click')
    await wrapper.get('[data-teste="campo-descricao"]').setValue('Nomes completos')
    await wrapper.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()

    const envio = chamadas(fetchSimulado, 'POST', ROTA_TAREFAS)
    expect(envio).toHaveLength(1)
    expect(corpoDaChamada(envio[0]!)).toEqual({
      titulo: 'Enviar lista de padrinhos',
      descricao: 'Nomes completos',
      responsavel: 'Anfitriao',
      categoria: 'Geral',
      prazo: '2026-10-10',
    })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_TAREFAS.toastCriada)
    await aguardarRota(montagem.roteador, 'evento-tarefas')
  })

  it('[SEGURANÇA] edição de tarefa inexistente ou de outro evento mostra não encontrada; id inválido cai no 404 da aplicação', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())))

    const inexistente = await abrir(`/eventos/${ID_EVENTO}/tarefas/33333333-3333-4333-8333-333333333333/editar`)
    expect(inexistente.wrapper.text()).toContain(TEXTOS_TAREFAS.tarefaNaoEncontradaTitulo)
    expect(inexistente.wrapper.find('[data-teste="formulario-tarefa"]').exists()).toBe(false)
    inexistente.wrapper.unmount()

    const invalido = await prepararAplicacao(`/eventos/${ID_EVENTO}/tarefas/abc/editar`)
    expect(invalido.roteador.currentRoute.value.name).toBe('nao-encontrado')
  })

  it('[COMPONENTE] edição com id válido preenche os campos e salva status alterado', async () => {
    const ID_TAREFA = '33333333-3333-4333-8333-333333333333'
    const tarefa = tarefaExemplo({ id: ID_TAREFA, titulo: 'Confirmar buffet', descricao: 'Ligar para o buffet', prazo: '2026-10-02' })
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', `${ROTA_TAREFAS}/${ID_TAREFA}`, () => respostaJson(tarefa)),
      quando('PUT', `${ROTA_TAREFAS}/${ID_TAREFA}`, () => respostaJson(tarefa)),
      quando('PATCH', `${ROTA_TAREFAS}/${ID_TAREFA}/status`, () => respostaJson({ ...tarefa, status: 'Cancelada' })),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([tarefa]))),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/tarefas/${ID_TAREFA}/editar`)

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
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('POST', ROTA_TAREFAS, () => {
        tentativa += 1
        return tentativa === 1
          ? respostaProblema(400, { errors: { Titulo: ['Use entre 2 e 160 caracteres.'] } })
          : respostaProblema(422, { detail: 'Este evento já tem 500 tarefas. Exclua ou conclua algumas antes de criar novas.' })
      }),
    )
    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/tarefas/nova`)

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
  it('[COMPONENTE] assessoria vê o bloco de pendências com link para o evento', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([resumoEvento()])),
      quando('GET', '/api/tarefas/pendencias', () => respostaJson(pendenciasExemplo())),
    )

    const { wrapper } = await abrir('/')

    const bloco = wrapper.get('[data-teste="bloco-pendencias-tarefas"]')
    expect(bloco.get('[data-teste="total-atrasadas"]').text()).toBe('1')
    expect(bloco.text()).toContain('Confirmar horário do DJ')
    expect(bloco.get('a').attributes('href')).toBe(`/eventos/${ID_EVENTO}/tarefas?situacao=atrasadas`)
  })

  it('[COMPONENTE] sem eventos o bloco não aparece e erro nas pendências não derruba o dashboard', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([])),
      quando('GET', '/api/tarefas/pendencias', () => respostaProblema(500)),
    )
    const vazio = await abrir('/')
    expect(vazio.wrapper.find('[data-teste="bloco-pendencias-tarefas"]').exists()).toBe(false)
    vazio.wrapper.unmount()

    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([resumoEvento()])),
      quando('GET', '/api/tarefas/pendencias', () => respostaProblema(500)),
    )
    const comErro = await abrir('/')
    expect(comErro.wrapper.get('[data-teste="bloco-pendencias-tarefas"]').text()).toContain(TEXTOS_TAREFAS.dashErro)
    expect(comErro.wrapper.find('[data-teste="proximos-eventos"]').exists()).toBe(true)
  })
})

const lerFonte = (caminho: string) => readFileSync(resolve(__dirname, '../../..', caminho), 'utf-8')
const estiloDe = (fonte: string) => fonte.slice(fonte.indexOf('<style'))

describe('TarefasView — reestruturação da fundação', () => {
  it('[COMPONENTE] assessoria vê a lateral de progresso derivada do resumo, sem contar canceladas', async () => {
    const cancelada = tarefaExemplo({ id: 'x', titulo: 'Contratar segundo fotógrafo', status: 'Cancelada' })
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([ATRASADA, SEMANA, SEM_PRAZO, CONCLUIDA, cancelada]))),
    )

    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/tarefas`)

    const lateral = wrapper.get('[data-teste="lateral-tarefas"]')
    expect(lateral.element.tagName).toBe('ASIDE')
    expect(lateral.attributes('aria-labelledby')).toBe('titulo-progresso-tarefas')
    expect(lateral.get('#titulo-progresso-tarefas').text()).toBe(TEXTOS_TAREFAS.progressoTitulo)
    expect(lateral.get('[data-teste="percentual-tarefas"]').text()).toBe('25%')
    expect(lateral.get('[data-teste="legenda-progresso-tarefas"]').text()).toBe('1 de 4 concluídas')

    const barra = lateral.get('[data-teste="barra-progresso-tarefas"]')
    expect(barra.attributes('role')).toBe('progressbar')
    expect(barra.attributes('aria-valuenow')).toBe('25')
    expect(barra.attributes('aria-valuemin')).toBe('0')
    expect(barra.attributes('aria-valuemax')).toBe('100')
    expect(barra.attributes('aria-valuetext')).toBe('25% concluído: 1 de 4 tarefas')
    expect(barra.get('span').attributes('style')).toContain('inline-size: 25%')

    expect(lateral.get('[data-teste="indicador-abertas"] dd').text()).toBe('3')
    expect(lateral.get('[data-teste="indicador-atrasadas"] dd').text()).toBe('1')
    expect(lateral.get('[data-teste="indicador-atrasadas"]').classes()).toContain('tarefas__indicador--atraso')
    expect(lateral.get('[data-teste="indicador-semana"] dd').text()).toBe('1')
    expect(lateral.get('[data-teste="indicador-canceladas"] dd').text()).toBe('1')
    expect(lateral.text()).not.toContain(TEXTOS_TAREFAS.rodapeAnfitriao)
  })

  it('[COMPONENTE] grupos usam rótulo da fundação e listas em cartão, com a lista antes da lateral', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaPadrao())),
    )

    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/tarefas`)

    expect(wrapper.get('#grupo-atrasadas').classes()).toEqual(expect.arrayContaining(['texto-rotulo', 'tarefas__titulo-grupo--atraso']))
    expect(wrapper.get('#grupo-semana').classes()).not.toContain('tarefas__titulo-grupo--atraso')
    expect(wrapper.get('[data-teste="grupo-atrasadas"] ul').classes()).toContain('cartao')

    const filhos = Array.from(wrapper.get('.tarefas__corpo').element.children)
    expect(filhos[0]?.classList.contains('tarefas__principal')).toBe(true)
    expect(filhos[1]?.getAttribute('data-teste')).toBe('lateral-tarefas')
  })

  it('[COMPONENTE] anfitriões veem o progresso no plural, sem canceladas, e o rodapé dentro da lateral', async () => {
    rotear(
      fetchSimulado,
      SESSAO_ANFITRIAO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ observacoes: null }))),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([ATRASADA, CONCLUIDA], { somenteDoAnfitriao: true }))),
    )

    const { wrapper } = await abrir(`/eventos/${ID_EVENTO}/tarefas`)

    const lateral = wrapper.get('[data-teste="lateral-tarefas"]')
    expect(lateral.get('#titulo-progresso-tarefas').text()).toBe(TEXTOS_TAREFAS.progressoTituloAnfitriao)
    expect(lateral.get('[data-teste="percentual-tarefas"]').text()).toBe('50%')
    expect(lateral.get('[data-teste="legenda-progresso-tarefas"]').text()).toBe('Vocês concluíram 1 de 2')
    expect(lateral.find('[data-teste="indicador-canceladas"]').exists()).toBe(false)
    expect(lateral.text()).toContain(TEXTOS_TAREFAS.rodapeAnfitriao)
  })

  it('[COMPONENTE] sem tarefas, com erro de serviço ou sem permissão a lateral não aparece', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([]))),
    )
    const vazio = await abrir(`/eventos/${ID_EVENTO}/tarefas`)
    expect(vazio.wrapper.find('[data-teste="estado-vazio"]').exists()).toBe(true)
    expect(vazio.wrapper.find('[data-teste="lateral-tarefas"]').exists()).toBe(false)
    vazio.wrapper.unmount()
    wrapper = undefined

    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaProblema(500, { title: 'Erro interno.' })),
    )
    const erro = await abrir(`/eventos/${ID_EVENTO}/tarefas`)
    expect(erro.wrapper.text()).toContain(TEXTOS_TAREFAS.erroTitulo)
    expect(erro.wrapper.find('[data-teste="lateral-tarefas"]').exists()).toBe(false)
    erro.wrapper.unmount()
    wrapper = undefined

    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_TAREFAS, () => respostaProblema(403, { title: 'Acesso negado.' })),
    )
    const negado = await abrir(`/eventos/${ID_EVENTO}/tarefas`)
    expect(negado.wrapper.text()).toContain(TEXTOS_TAREFAS.semAcesso)
    expect(negado.wrapper.find('[data-teste="lateral-tarefas"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilos usam o ritmo da fundação, sem largura de leitura, com lateral por container query', () => {
    const estiloView = estiloDe(lerFonte('views/tarefas/TarefasView.vue'))
    expect(estiloView).not.toMatch(/--p-espaco-/)
    expect(estiloView).not.toMatch(/--p-dimensao-largura-leitura/)
    expect(estiloView).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(estiloView).not.toMatch(/--p-cor-primaria/)
    expect(estiloView).toMatch(/container: tarefas com-lateral \/ inline-size/)
    expect(estiloView).toMatch(/@container com-lateral \(min-width: 52rem\) \{\s*\.tarefas__corpo \{\s*grid-template-columns: minmax\(0, 1fr\) var\(--com-lateral-largura\)/)
    expect(estiloView).toMatch(/\.tarefas__preenchimento \{[^}]*background: var\(--p-cor-sucesso\)/)
    expect(estiloView).toMatch(/\.tarefas__destaque--em-dia \{[^}]*color: var\(--p-cor-sucesso-texto\)/)
  })

  it('[UNITÁRIO] ItemTarefa concluído usa verde de sucesso e nunca a cor primária', () => {
    const estiloItem = estiloDe(lerFonte('componentes/base/ItemTarefa.vue'))
    expect(estiloItem).not.toMatch(/--p-cor-primaria/)
    expect(estiloItem).toMatch(/\.item-tarefa--concluida \.item-tarefa__circulo \{[^}]*background: var\(--p-cor-sucesso\)/)
    expect(estiloItem).toMatch(/\.item-tarefa--concluida \.item-tarefa__anel \{[^}]*color: var\(--p-cor-sucesso\)/)
  })

  it('[UNITÁRIO] CabecalhoPagina mantém destaque e ações juntos, sem o destaque descer sozinho nem fio solto', () => {
    const fonteCabecalho = lerFonte('componentes/base/CabecalhoPagina.vue')
    const estiloCabecalho = estiloDe(fonteCabecalho)
    expect(estiloCabecalho).toMatch(/\.cabecalho-pagina \{[^}]*container: cabecalho-pagina \/ inline-size/)
    expect(fonteCabecalho).toMatch(/class="cabecalho-pagina__complementos"[\s\S]*class="cabecalho-pagina__destaque"[\s\S]*class="cabecalho-pagina__acoes"/)
    const desktop = estiloCabecalho.slice(estiloCabecalho.indexOf('@container cabecalho-pagina (min-width: 40rem)'))
    expect(desktop).toMatch(/\.cabecalho-pagina__textos \{\s*flex: 999 1 auto;/)
    expect(desktop).toMatch(/\.cabecalho-pagina__complementos \{\s*flex: 1 1 auto;\s*flex-direction: row;\s*flex-wrap: wrap;/)
    expect(estiloCabecalho).not.toMatch(/border-left/)
  })
})
