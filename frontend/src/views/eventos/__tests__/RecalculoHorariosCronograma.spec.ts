import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CHECKLIST } from '@/textos/checklist'
import { TEXTOS_RECALCULO_HORARIOS } from '@/textos/modelosCronograma'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch } from './auxiliaresEventos'

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_RECALCULO_HORARIOS = `${ROTA_EVENTO}/cronograma/recalculo-horarios`
const ROTA_RECALCULO_PRAZOS = `${ROTA_EVENTO}/checklist/recalculo-prazos`

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

async function editar(campos: { horario?: string; data?: string }) {
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}/editar`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  if (campos.data) {
    await wrapper.get('#evento-data').setValue(campos.data)
  }
  if (campos.horario !== undefined) {
    await wrapper.get('#evento-horario').setValue(campos.horario)
  }
  await wrapper.get('[data-teste="formulario-evento"]').trigger('submit')
  await flushPromises()
  return montagem
}

function dialogoHorarios(): HTMLElement | null {
  return document.body.querySelector('[data-teste="dialogo-recalculo-horarios"]')
}

function clicar(seletor: string) {
  const botoes = document.body.querySelectorAll<HTMLButtonElement>(seletor)
  botoes[botoes.length - 1]!.click()
}

describe('Recalcular horários do cronograma ao mudar o horário da cerimônia', () => {
  it('[COMPONENTE] pergunta antes, com foco em manter, e só recalcula com confirmação', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: '16:30' }))),
      quando('PUT', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: '17:30' }))),
      quando('GET', ROTA_RECALCULO_HORARIOS, () => respostaJson({ itens: 18 })),
      quando('POST', ROTA_RECALCULO_HORARIOS, () => respostaJson({ itens: 18 })),
    )

    const montagem = await editar({ horario: '17:30' })

    await vi.waitFor(() => expect(dialogoHorarios()).not.toBeNull())
    expect(dialogoHorarios()!.textContent).toContain(TEXTOS_RECALCULO_HORARIOS.titulo)
    expect(dialogoHorarios()!.textContent).toContain('18 itens vieram de modelo')
    expect(dialogoHorarios()!.textContent).toContain('cerimônia das 17:30')
    expect(dialogoHorarios()!.textContent).toContain(TEXTOS_RECALCULO_HORARIOS.manter)
    expect(document.activeElement?.getAttribute('data-teste')).toBe('dialogo-confirmacao-cancelar')
    expect(chamadas(fetchSimulado, 'POST', ROTA_RECALCULO_HORARIOS)).toHaveLength(0)
    expect(chamadas(fetchSimulado, 'GET', ROTA_RECALCULO_PRAZOS)).toHaveLength(0)
    expect(montagem.roteador.currentRoute.value.name).toBe('evento-editar')

    clicar('[data-teste="dialogo-confirmacao-confirmar"]')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_RECALCULO_HORARIOS)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Horários de 18 itens recalculados.')
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('evento'), { timeout: 5000 })
  })

  it('[COMPONENTE] manter horários só navega, sem recalcular', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: '16:30' }))),
      quando('PUT', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: '15:00' }))),
      quando('GET', ROTA_RECALCULO_HORARIOS, () => respostaJson({ itens: 4 })),
    )

    const montagem = await editar({ horario: '15:00' })
    await vi.waitFor(() => expect(dialogoHorarios()).not.toBeNull())
    clicar('[data-teste="dialogo-confirmacao-cancelar"]')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_RECALCULO_HORARIOS)).toHaveLength(0)
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('evento'), { timeout: 5000 })
  })

  it('[COMPONENTE] sem itens afetados, sem mudança de horário ou removendo o horário não pergunta', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: '16:30' }))),
      quando('PUT', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: '18:00' }))),
      quando('GET', ROTA_RECALCULO_HORARIOS, () => respostaJson({ itens: 0 })),
    )
    const montagem = await editar({ horario: '18:00' })
    expect(dialogoHorarios()).toBeNull()
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('evento'), { timeout: 5000 })
    wrapper!.unmount()
    wrapper = undefined

    fetchSimulado.mockReset()
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: '16:30' }))),
      quando('PUT', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: '16:30' }))),
    )
    await editar({})
    expect(chamadas(fetchSimulado, 'GET', ROTA_RECALCULO_HORARIOS)).toHaveLength(0)
    wrapper!.unmount()
    wrapper = undefined

    fetchSimulado.mockReset()
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: '16:30' }))),
      quando('PUT', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: null }))),
    )
    await editar({ horario: '' })
    expect(chamadas(fetchSimulado, 'GET', ROTA_RECALCULO_HORARIOS)).toHaveLength(0)
    expect(dialogoHorarios()).toBeNull()
  })

  it('[COMPONENTE] data e horário mudando juntos: primeiro prazos do checklist, depois horários', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: '16:30', percentualChecklist: 20 }))),
      quando('PUT', ROTA_EVENTO, () => respostaJson(eventoCompleto({ data: '2027-06-30', horario: '17:00', percentualChecklist: 20 }))),
      quando('GET', ROTA_RECALCULO_PRAZOS, () => respostaJson({ tarefas: 5 })),
      quando('GET', ROTA_RECALCULO_HORARIOS, () => respostaJson({ itens: 7 })),
      quando('POST', ROTA_RECALCULO_HORARIOS, () => respostaJson({ itens: 7 })),
    )

    const montagem = await editar({ data: '2027-06-30', horario: '17:00' })

    await vi.waitFor(() => expect(document.body.querySelector('[data-teste="dialogo-recalculo"]')).not.toBeNull())
    expect(document.body.textContent).toContain(TEXTOS_CHECKLIST.recalculoTitulo)
    expect(dialogoHorarios()).toBeNull()

    clicar('[data-teste="dialogo-confirmacao-cancelar"]')
    await flushPromises()

    await vi.waitFor(() => expect(dialogoHorarios()).not.toBeNull())
    expect(montagem.roteador.currentRoute.value.name).toBe('evento-editar')
    clicar('[data-teste="dialogo-confirmacao-confirmar"]')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_RECALCULO_PRAZOS)).toHaveLength(0)
    expect(chamadas(fetchSimulado, 'POST', ROTA_RECALCULO_HORARIOS)).toHaveLength(1)
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('evento'), { timeout: 5000 })
  })

  it('[COMPONENTE] falha no recálculo mostra erro e segue para o evento', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: '16:30' }))),
      quando('PUT', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: '17:30' }))),
      quando('GET', ROTA_RECALCULO_HORARIOS, () => respostaJson({ itens: 3 })),
      quando('POST', ROTA_RECALCULO_HORARIOS, () => respostaProblema(500, { title: 'Erro' })),
    )

    const montagem = await editar({ horario: '17:30' })
    await vi.waitFor(() => expect(dialogoHorarios()).not.toBeNull())
    clicar('[data-teste="dialogo-confirmacao-confirmar"]')
    await flushPromises()

    expect(notificacoes.erro).toHaveBeenCalledWith(TEXTOS_RECALCULO_HORARIOS.erro)
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('evento'), { timeout: 5000 })
  })
})
