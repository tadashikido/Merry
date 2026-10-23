import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { h } from 'vue'
import { RouterView } from 'vue-router'

import { aguardarAte, aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { listaTarefas, tarefaExemplo } from '@/__tests__/auxiliaresTarefas'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import ProvedorFeedback from '@/componentes/base/ProvedorFeedback.vue'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useAlteracoesNaoSalvasStore } from '@/stores/alteracoesNaoSalvas'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { TEXTOS_ALTERACOES_NAO_SALVAS } from '@/textos/mensagens'
import type { ConviteDto, ListaConvitesDto } from '@/tipos/convidados'
import { ID_EVENTO, eventoCompleto, chamadas, quando, rotearFetch, type Rota } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('tarefa-nova', 'evento', 'evento-tarefas', 'tarefa-editar', 'entrar', 'convite-editar', 'convite-novo', 'esqueci-senha')

const ID_TAREFA = '33333333-3333-4333-8333-333333333333'
const ID_CONVITE = '44444444-4444-4444-8444-444444444444'
const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_TAREFAS = `${ROTA_EVENTO}/tarefas`
const ROTA_CONVITES = `${ROTA_EVENTO}/convites`
const CAMINHO_NOVA_TAREFA = `/eventos/${ID_EVENTO}/tarefas/nova`
const CAMINHO_EDITAR_TAREFA = `/eventos/${ID_EVENTO}/tarefas/${ID_TAREFA}/editar`
const CAMINHO_LISTA_TAREFAS = `/eventos/${ID_EVENTO}/tarefas`
const CAMINHO_EVENTO = `/eventos/${ID_EVENTO}`

const Raiz = () => h('div', [h(RouterView), h(ProvedorFeedback)])

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

function convite(): ConviteDto {
  return {
    id: ID_CONVITE,
    nome: 'Família Souza',
    grupo: 'Família da noiva',
    limiteAcompanhantes: 1,
    statusEnvio: 'NaoEnviado',
    convidados: [
      { id: 'p1', nome: 'Carla Souza', telefone: '11987654321', email: 'carla@exemplo.com', faixaEtaria: 'Adulto', resposta: 'Confirmado', acompanhante: false, possuiRestricao: false },
    ],
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: null,
  }
}

function listaConvites(): ListaConvitesDto {
  return {
    convites: [convite()],
    totais: {
      convites: 1,
      pessoas: 1,
      adultos: 1,
      criancas: 0,
      acompanhantesPermitidos: 1,
      confirmados: { adultos: 1, criancas: 0, total: 1 },
      pendentes: { adultos: 0, criancas: 0, total: 0 },
      recusados: { adultos: 0, criancas: 0, total: 0 },
    },
    convidadosEstimados: 150,
    eventoArquivado: false,
  }
}

function rotasTarefas(...extras: Rota[]): Rota[] {
  return [
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
    quando('GET', `${ROTA_TAREFAS}/${ID_TAREFA}`, () => respostaJson(tarefaExemplo({ id: ID_TAREFA, titulo: 'Confirmar buffet' }))),
    quando('GET', ROTA_TAREFAS, () => respostaJson(listaTarefas([]))),
    ...extras,
  ]
}

async function abrir(caminho: string) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(Raiz, montagem)
  await flushPromises()
  return { roteador: montagem.roteador, wrapper }
}

function dialogoAberto(): boolean {
  return useAlteracoesNaoSalvasStore().visivel && (document.body.textContent ?? '').includes(TEXTOS_ALTERACOES_NAO_SALVAS.titulo)
}

function botaoDialogo(dataTeste: 'dialogo-confirmacao-cancelar' | 'dialogo-confirmacao-confirmar'): HTMLButtonElement {
  const botao = document.body.querySelector<HTMLButtonElement>(`[role="alertdialog"] [data-teste="${dataTeste}"]`)
  if (!botao) {
    throw new Error(`Botão ${dataTeste} não encontrado`)
  }
  return botao
}

beforeEach(() => {
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

describe('Proteção de alterações não salvas — formulário de tarefa', () => {
  it('[INTEGRAÇÃO] com alterações, navegar abre o diálogo; continuar editando mantém os dados e descartar sai', async () => {
    rotearFetch(fetchSimulado, ...rotasTarefas())
    const { roteador } = await abrir(CAMINHO_NOVA_TAREFA)
    await wrapper!.get('[data-teste="campo-titulo"]').setValue('Enviar lista de padrinhos')

    const primeira = roteador.push(CAMINHO_EVENTO)
    await flushPromises()
    expect(dialogoAberto()).toBe(true)
    expect(roteador.currentRoute.value.name).toBe('tarefa-nova')

    botaoDialogo('dialogo-confirmacao-cancelar').click()
    await primeira
    await flushPromises()
    expect(roteador.currentRoute.value.name).toBe('tarefa-nova')
    expect((wrapper!.get('[data-teste="campo-titulo"]').element as HTMLInputElement).value).toBe('Enviar lista de padrinhos')

    const segunda = roteador.push(CAMINHO_EVENTO)
    await flushPromises()
    botaoDialogo('dialogo-confirmacao-confirmar').click()
    await segunda
    await flushPromises()
    expect(roteador.currentRoute.value.name).toBe('evento')
    expect(useAlteracoesNaoSalvasStore().visivel).toBe(false)
  })

  it('[COMPONENTE] sem alterações, navegar não abre o diálogo', async () => {
    rotearFetch(fetchSimulado, ...rotasTarefas())
    const { roteador } = await abrir(CAMINHO_NOVA_TAREFA)

    await roteador.push(CAMINHO_EVENTO)
    await flushPromises()

    expect(roteador.currentRoute.value.name).toBe('evento')
    expect(dialogoAberto()).toBe(false)
  })

  it('[COMPONENTE] cancelar explicitamente volta sem diálogo', async () => {
    rotearFetch(fetchSimulado, ...rotasTarefas())
    const { roteador } = await abrir(CAMINHO_NOVA_TAREFA)
    await wrapper!.get('[data-teste="campo-titulo"]').setValue('Rascunho descartado')

    await wrapper!.get('[data-teste="cancelar"]').trigger('click')
    await flushPromises()

    await aguardarAte(() => expect(roteador.currentRoute.value.path).toBe(CAMINHO_LISTA_TAREFAS))
    expect(dialogoAberto()).toBe(false)
  })

  it('[INTEGRAÇÃO] salvar com sucesso redireciona sem diálogo', async () => {
    rotearFetch(fetchSimulado, ...rotasTarefas(quando('POST', ROTA_TAREFAS, () => respostaJson(tarefaExemplo({ id: 'nova' }), 201))))
    const { roteador } = await abrir(CAMINHO_NOVA_TAREFA)
    await wrapper!.get('[data-teste="campo-titulo"]').setValue('Contratar fotógrafo')

    await wrapper!.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_TAREFAS)).toHaveLength(1)
    await aguardarAte(() => expect(roteador.currentRoute.value.path).toBe(CAMINHO_LISTA_TAREFAS))
    expect(dialogoAberto()).toBe(false)
  })

  it('[INTEGRAÇÃO] erro do servidor ao salvar mantém a proteção ativa', async () => {
    rotearFetch(fetchSimulado, ...rotasTarefas(quando('POST', ROTA_TAREFAS, () => respostaProblema(500, { title: 'Erro interno.' }))))
    const { roteador } = await abrir(CAMINHO_NOVA_TAREFA)
    await wrapper!.get('[data-teste="campo-titulo"]').setValue('Contratar fotógrafo')
    await wrapper!.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()
    expect(roteador.currentRoute.value.name).toBe('tarefa-nova')

    const navegacao = roteador.push(CAMINHO_EVENTO)
    await flushPromises()

    expect(dialogoAberto()).toBe(true)
    botaoDialogo('dialogo-confirmacao-cancelar').click()
    await navegacao
    await flushPromises()
    expect(roteador.currentRoute.value.name).toBe('tarefa-nova')
  })

  it('[COMPONENTE] edição recém-carregada não pede confirmação; alterar só o status pede', async () => {
    rotearFetch(fetchSimulado, ...rotasTarefas())
    const { roteador } = await abrir(CAMINHO_EDITAR_TAREFA)
    expect((wrapper!.get('[data-teste="campo-titulo"]').element as HTMLInputElement).value).toBe('Confirmar buffet')

    await roteador.push(CAMINHO_EVENTO)
    await flushPromises()
    expect(roteador.currentRoute.value.name).toBe('evento')
    expect(dialogoAberto()).toBe(false)

    await roteador.push(CAMINHO_EDITAR_TAREFA)
    await flushPromises()
    const cancelada = wrapper!
      .get('[data-teste="campo-status"]')
      .findAll('[role="radio"], button, [data-pc-section="pcbutton"]')
      .find((opcao) => opcao.text() === 'Cancelada')!
    await cancelada.trigger('click')

    const navegacao = roteador.push(CAMINHO_EVENTO)
    await flushPromises()
    expect(dialogoAberto()).toBe(true)
    botaoDialogo('dialogo-confirmacao-confirmar').click()
    await navegacao
    await flushPromises()
    expect(roteador.currentRoute.value.name).toBe('evento')
  })

  it('[SEGURANÇA] sair da conta com alterações pendentes leva à tela de entrada sem diálogo', async () => {
    rotearFetch(fetchSimulado, ...rotasTarefas(quando('POST', '/api/autenticacao/sair', () => respostaJson({}))))
    const { roteador } = await abrir(CAMINHO_NOVA_TAREFA)
    await wrapper!.get('[data-teste="campo-titulo"]').setValue('Dados que não devem ficar na tela')

    await useAutenticacaoStore().sair()
    await flushPromises()

    await aguardarRota(roteador, 'entrar')
    expect(dialogoAberto()).toBe(false)
  })

  it('[COMPONENTE] fechar ou recarregar a aba com alterações aciona o aviso nativo', async () => {
    rotearFetch(fetchSimulado, ...rotasTarefas())
    await abrir(CAMINHO_NOVA_TAREFA)

    const semAlteracoes = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(semAlteracoes)
    expect(semAlteracoes.defaultPrevented).toBe(false)

    await wrapper!.get('[data-teste="campo-titulo"]').setValue('Lista de músicas')
    const comAlteracoes = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(comAlteracoes)
    expect(comAlteracoes.defaultPrevented).toBe(true)
  })
})

describe('Proteção de alterações não salvas — formulário de convite', () => {
  function rotasConvite(): Rota[] {
    return [
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', `${ROTA_CONVITES}/${ID_CONVITE}`, () => respostaJson(convite())),
      quando('GET', ROTA_CONVITES, () => respostaJson(listaConvites())),
    ]
  }

  it('[COMPONENTE] edição carregada com telefone formatado não gera falso positivo', async () => {
    rotearFetch(fetchSimulado, ...rotasConvite())
    const { roteador } = await abrir(`/eventos/${ID_EVENTO}/convidados/${ID_CONVITE}/editar`)
    expect((wrapper!.get('[data-teste="campo-nome-convite"]').element as HTMLInputElement).value).toBe('Família Souza')

    await roteador.push(CAMINHO_EVENTO)
    await flushPromises()

    expect(roteador.currentRoute.value.name).toBe('evento')
    expect(dialogoAberto()).toBe(false)
  })

  it('[COMPONENTE] adicionar uma pessoa ao convite novo conta como alteração', async () => {
    rotearFetch(fetchSimulado, ...rotasConvite())
    const { roteador } = await abrir(`/eventos/${ID_EVENTO}/convidados/novo`)

    await wrapper!.get('[data-teste="adicionar-item"]').trigger('click')
    const navegacao = roteador.push(CAMINHO_EVENTO)
    await flushPromises()

    expect(dialogoAberto()).toBe(true)
    botaoDialogo('dialogo-confirmacao-cancelar').click()
    await navegacao
    await flushPromises()
    expect(roteador.currentRoute.value.name).toBe('convite-novo')
  })
})

describe('Proteção de alterações não salvas — fora do escopo', () => {
  it('[SEGURANÇA] formulário de autenticação preenchido não prende a pessoa na tela', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(401))
    const { roteador } = await abrir('/entrar')
    await wrapper!.get('#entrar-email').setValue('renata@exemplo.com')

    await roteador.push('/esqueci-senha')
    await flushPromises()

    expect(roteador.currentRoute.value.name).toBe('esqueci-senha')
    expect(dialogoAberto()).toBe(false)
  })
})
