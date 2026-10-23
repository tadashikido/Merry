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
  simularFetch,
} from '@/__tests__/auxiliaresAutenticacao'
import { aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { cronogramaExemplo, itemCronograma } from '@/__tests__/auxiliaresCronograma'
import {
  ID_MODELO_CRONOGRAMA,
  aplicacaoModeloCronograma,
  modeloCronogramaCompleto,
  resumoModeloCronograma,
} from '@/__tests__/auxiliaresModelosCronograma'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import {
  TEXTOS_APLICAR_MODELO_CRONOGRAMA,
  TEXTOS_RECALCULO_HORARIOS,
  TEXTOS_SALVAR_COMO_MODELO,
} from '@/textos/modelosCronograma'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import type { SessaoDto } from '@/tipos/api'
import type { CronogramaDto } from '@/tipos/cronograma'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-cronograma', 'modelo-cronograma')

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_CRONOGRAMA = `${ROTA_EVENTO}/cronograma`
const ROTA_PREVIA = `${ROTA_CRONOGRAMA}/previa?modeloId=${ID_MODELO_CRONOGRAMA}`
const ROTA_APLICACOES = `${ROTA_CRONOGRAMA}/aplicacoes`
const ROTA_SALVAR = `${ROTA_CRONOGRAMA}/modelos`
const ROTA_RECALCULO = `${ROTA_CRONOGRAMA}/recalculo-horarios`
const ROTA_MODELOS = '/api/modelos-cronograma'
const CAMINHO = `/eventos/${ID_EVENTO}/cronograma`

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

const CERIMONIA = itemCronograma({ id: 'c' })

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

async function abrir(sessao: SessaoDto, cronograma: () => Response, ...extras: Rota[]) {
  rotear(
    fetchSimulado,
    sessao,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
    quando('GET', ROTA_CRONOGRAMA, cronograma),
    quando('GET', ROTA_MODELOS, () => respostaJson([resumoModeloCronograma()])),
    ...extras,
  )
  const montagem = await prepararAplicacao(CAMINHO)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return montagem
}

async function abrirPainel() {
  await wrapper!.get('[data-teste="abrir-aplicar-modelo"]').trigger('click')
  await flushPromises()
}

describe('Aplicar modelo no cronograma', () => {
  it('[INTEGRAÇÃO] cronograma vazio oferece aplicar modelo, mostra a prévia e aplica', async () => {
    let lista: CronogramaDto = cronogramaExemplo([])
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(lista),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoModeloCronograma())),
      quando('POST', ROTA_APLICACOES, () => {
        lista = cronogramaExemplo([CERIMONIA])
        return respostaJson(aplicacaoModeloCronograma())
      }),
    )

    const botao = wrapper!.get('[data-teste="abrir-aplicar-modelo"]')
    expect(botao.attributes('aria-expanded')).toBe('false')
    await abrirPainel()

    const painel = wrapper!.get('[data-teste="painel-aplicar-modelo"]')
    const previa = painel.get('[data-teste="previa-modelo-cronograma"]')
    expect(previa.attributes('aria-live')).toBe('polite')
    expect(previa.text()).toContain('Vai criar 20 itens.')
    expect(previa.text()).toContain('De Véspera 19:30 (Ensaio da cerimônia) a Dia seguinte 02:00 (Desmontagem).')
    expect(previa.text()).toContain('2 fornecedores serão preenchidos pela categoria.')
    expect(wrapper!.find('[data-teste="grupo-cronograma-DiaDoEvento"]').exists()).toBe(false)

    await painel.get('[data-teste="confirmar-aplicar-modelo"]').trigger('click')
    await flushPromises()

    expect(corpoDaChamada(chamadas(fetchSimulado, 'POST', ROTA_APLICACOES)[0]!)).toEqual({ modeloId: ID_MODELO_CRONOGRAMA })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('20 itens adicionados ao cronograma.')
    expect(wrapper!.find('[data-teste="painel-aplicar-modelo"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="grupo-cronograma-DiaDoEvento"]').exists()).toBe(true)
  })

  it('[COMPONENTE] sem horário da cerimônia a prévia orienta e o botão fica desabilitado', async () => {
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(cronogramaExemplo([CERIMONIA], { horarioCerimonia: null })),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoModeloCronograma({ semHorarioCerimonia: true, horarioCerimonia: null, primeiroItem: null, ultimoItem: null }))),
    )

    await abrirPainel()

    const painel = wrapper!.get('[data-teste="painel-aplicar-modelo"]')
    expect(painel.get('[data-teste="previa-sem-horario"]').text()).toContain(VOCABULARIO_TIPO_EVENTO.Casamento.faltaHorario)
    expect(painel.get('[data-teste="previa-adicionar-horario"]').attributes('href')).toBe(`/eventos/${ID_EVENTO}/editar`)
    expect(painel.get('[data-teste="confirmar-aplicar-modelo"]').attributes('disabled')).toBeDefined()
  })

  it('[COMPONENTE] reaplicação sem novidades e limite desabilitam o botão', async () => {
    let previa = aplicacaoModeloCronograma({ itensCriados: 0, jaAplicados: 20 })
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(cronogramaExemplo([CERIMONIA])),
      quando('GET', ROTA_PREVIA, () => respostaJson(previa)),
    )

    await abrirPainel()
    expect(wrapper!.get('[data-teste="previa-modelo-cronograma"]').text()).toContain(TEXTOS_APLICAR_MODELO_CRONOGRAMA.previaNada)
    expect(wrapper!.get('[data-teste="confirmar-aplicar-modelo"]').attributes('disabled')).toBeDefined()

    await wrapper!.get('[data-teste="fechar-aplicar-modelo"]').trigger('click')
    await flushPromises()
    previa = aplicacaoModeloCronograma({ excedeLimite: true, itensNoCronograma: 190, itensCriados: 15 })
    await abrirPainel()
    expect(wrapper!.get('[data-teste="previa-limite"]').text()).toContain('hoje tem 190, o modelo cria 15')
    expect(wrapper!.get('[data-teste="confirmar-aplicar-modelo"]').attributes('disabled')).toBeDefined()
  })

  it('[COMPONENTE] aplicação concorrente avisa e recarrega; regra do servidor aparece no painel', async () => {
    let resposta = () => respostaProblema(409, { title: 'Conflito', detail: 'O cronograma mudou.' })
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(cronogramaExemplo([CERIMONIA])),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoModeloCronograma())),
      quando('POST', ROTA_APLICACOES, () => resposta()),
    )

    await abrirPainel()
    await wrapper!.get('[data-teste="confirmar-aplicar-modelo"]').trigger('click')
    await flushPromises()
    expect(notificacoes.erro).toHaveBeenCalledWith(TEXTOS_APLICAR_MODELO_CRONOGRAMA.erroConcorrente)

    resposta = () => respostaProblema(422, { title: 'Regra', detail: 'Este evento está arquivado.' })
    await wrapper!.get('[data-teste="confirmar-aplicar-modelo"]').trigger('click')
    await flushPromises()
    expect(wrapper!.get('[data-teste="erro-aplicacao"]').text()).toContain('Este evento está arquivado.')
  })
})

describe('Salvar como modelo e recalcular horários', () => {
  it('[INTEGRAÇÃO] salva o cronograma como modelo pelo menu e abre o modelo', async () => {
    const montagem = await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(cronogramaExemplo([CERIMONIA])),
      quando('POST', ROTA_SALVAR, () => respostaJson(modeloCronogramaCompleto({ nome: 'Roteiro da Ana', sugerido: false }), 201)),
      quando('GET', `${ROTA_MODELOS}/${ID_MODELO_CRONOGRAMA}`, () => respostaJson(modeloCronogramaCompleto({ nome: 'Roteiro da Ana', sugerido: false }))),
    )

    wrapper!.findComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'salvar-modelo')
    await flushPromises()

    const dialogo = document.body.querySelector<HTMLElement>('[data-teste="dialogo-salvar-modelo"]')!
    expect(dialogo.textContent).toContain(TEXTOS_SALVAR_COMO_MODELO.titulo)
    expect(dialogo.textContent).toContain('relativos à cerimônia (16:30)')
    const nome = document.body.querySelector<HTMLInputElement>('#salvar-modelo-nome')!
    nome.value = 'Roteiro da Ana'
    nome.dispatchEvent(new Event('input'))
    await flushPromises()
    document.body.querySelector<HTMLButtonElement>('[data-teste="confirmar-salvar-modelo"]')!.click()
    await flushPromises()

    expect(corpoDaChamada(chamadas(fetchSimulado, 'POST', ROTA_SALVAR)[0]!)).toEqual({ nome: 'Roteiro da Ana', descricao: null })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Modelo “Roteiro da Ana” salvo.')
    await aguardarRota(montagem.roteador, 'modelo-cronograma')
  })

  it('[COMPONENTE] salvar sem nome não envia e sem horário fica desabilitado', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(cronogramaExemplo([CERIMONIA], { horarioCerimonia: null })))

    wrapper!.findComponent({ name: 'MenuAcoes' }).vm.$emit('selecionar', 'salvar-modelo')
    await flushPromises()

    expect(document.body.querySelector('[data-teste="salvar-modelo-sem-horario"]')).not.toBeNull()
    expect(document.body.querySelector<HTMLButtonElement>('[data-teste="confirmar-salvar-modelo"]')!.disabled).toBe(true)
    expect(chamadas(fetchSimulado, 'POST', ROTA_SALVAR)).toHaveLength(0)
  })

  it('[INTEGRAÇÃO] faixa de horários desatualizados pede confirmação e recalcula', async () => {
    let lista = cronogramaExemplo([CERIMONIA], { horariosDesatualizados: 3 })
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(lista),
      quando('POST', ROTA_RECALCULO, () => {
        lista = cronogramaExemplo([CERIMONIA], { horariosDesatualizados: 0 })
        return respostaJson({ itens: 3 })
      }),
    )

    expect(wrapper!.get('[data-teste="aviso-horarios-desatualizados"]').text()).toContain(TEXTOS_RECALCULO_HORARIOS.faixa(3))
    await wrapper!.get('[data-teste="abrir-recalculo-horarios"]').trigger('click')
    await flushPromises()

    const dialogo = document.body.querySelector<HTMLElement>('[data-teste="dialogo-recalculo-horarios"]')!
    expect(dialogo.textContent).toContain(TEXTOS_RECALCULO_HORARIOS.titulo)
    expect(chamadas(fetchSimulado, 'POST', ROTA_RECALCULO)).toHaveLength(0)
    document.body.querySelector<HTMLButtonElement>('[data-teste="dialogo-confirmacao-confirmar"]')!.click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_RECALCULO)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Horários de 3 itens recalculados.')
    expect(wrapper!.find('[data-teste="aviso-horarios-desatualizados"]').exists()).toBe(false)
  })
})

describe('Permissões nas ações de modelo', () => {
  it('[SEGURANÇA] anfitriões não veem aplicar, salvar como modelo nem recálculo', async () => {
    await abrir(SESSAO_ANFITRIAO, () => respostaJson(cronogramaExemplo([CERIMONIA], { somenteLeitura: true, horariosDesatualizados: 2, fornecedoresDisponiveis: [] })))

    expect(wrapper!.find('[data-teste="abrir-aplicar-modelo"]').exists()).toBe(false)
    expect(wrapper!.findComponent({ name: 'MenuAcoes' }).exists()).toBe(false)
    expect(wrapper!.find('[data-teste="aviso-horarios-desatualizados"]').exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', ROTA_MODELOS)).toHaveLength(0)
  })

  it('[COMPONENTE] evento arquivado só permite salvar como modelo', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(cronogramaExemplo([CERIMONIA], { arquivado: true, somenteLeitura: true, horariosDesatualizados: 2 })))

    expect(wrapper!.find('[data-teste="abrir-aplicar-modelo"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="aviso-horarios-desatualizados"]').exists()).toBe(false)
    expect(wrapper!.findComponent({ name: 'MenuAcoes' }).exists()).toBe(true)
  })
})
