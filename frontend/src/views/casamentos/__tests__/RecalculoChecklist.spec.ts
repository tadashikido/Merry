import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { montarView, prepararAplicacao, respostaJson, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CHECKLIST } from '@/textos/checklist'
import { ID_CASAMENTO, RaizRotas, casamentoCompleto, chamadas, quando, rotearFetch } from './auxiliaresCasamentos'

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_CASAMENTO = `/api/casamentos/${ID_CASAMENTO}`
const ROTA_RECALCULO = `${ROTA_CASAMENTO}/checklist/recalculo-prazos`

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

async function editarData(novaData: string) {
  const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}/editar`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  await wrapper.get('#casamento-data').setValue(novaData)
  await wrapper.get('[data-teste="formulario-casamento"]').trigger('submit')
  await flushPromises()
  return montagem
}

function dialogo(): HTMLElement | null {
  return document.body.querySelector('[data-teste="dialogo-recalculo"]')
}

describe('Recalcular prazos ao mudar a data do casamento', () => {
  it('[COMPONENTE] pergunta antes de recalcular e só recalcula com confirmação', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ percentualChecklist: 20 }))),
      quando('PUT', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ data: '2027-06-30', percentualChecklist: 20 }))),
      quando('GET', ROTA_RECALCULO, () => respostaJson({ tarefas: 18 })),
      quando('POST', ROTA_RECALCULO, () => respostaJson({ tarefas: 18 })),
    )

    const montagem = await editarData('2027-06-30')

    await vi.waitFor(() => expect(dialogo()).not.toBeNull())
    expect(dialogo()!.textContent).toContain(TEXTOS_CHECKLIST.recalculoTitulo)
    expect(dialogo()!.textContent).toContain('A data mudou para 30/06/2027. 18 tarefas do checklist ainda abertas')
    expect(chamadas(fetchSimulado, 'POST', ROTA_RECALCULO)).toHaveLength(0)
    expect(document.activeElement?.getAttribute('data-teste')).toBe('dialogo-confirmacao-cancelar')
    expect(montagem.roteador.currentRoute.value.name).toBe('casamento-editar')

    document.body.querySelector<HTMLButtonElement>('[data-teste="dialogo-confirmacao-confirmar"]')!.click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_RECALCULO)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Prazos de 18 tarefas recalculados.')
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('casamento'))
  })

  it('[COMPONENTE] manter prazos só navega, sem recalcular', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ percentualChecklist: 20 }))),
      quando('PUT', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ data: '2027-06-30', percentualChecklist: 20 }))),
      quando('GET', ROTA_RECALCULO, () => respostaJson({ tarefas: 2 })),
    )

    const montagem = await editarData('2027-06-30')
    await vi.waitFor(() => expect(dialogo()).not.toBeNull())
    document.body.querySelector<HTMLButtonElement>('[data-teste="dialogo-confirmacao-cancelar"]')!.click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_RECALCULO)).toHaveLength(0)
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('casamento'))
  })

  it('[COMPONENTE] sem tarefas afetadas ou sem checklist não pergunta', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ percentualChecklist: 20 }))),
      quando('PUT', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ data: '2027-06-30', percentualChecklist: 20 }))),
      quando('GET', ROTA_RECALCULO, () => respostaJson({ tarefas: 0 })),
    )
    const montagem = await editarData('2027-06-30')
    expect(dialogo()).toBeNull()
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('casamento'))
    wrapper!.unmount()
    wrapper = undefined

    fetchSimulado.mockReset()
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ percentualChecklist: null }))),
      quando('PUT', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ data: '2027-06-30', percentualChecklist: null }))),
    )
    await editarData('2027-06-30')
    expect(dialogo()).toBeNull()
    expect(chamadas(fetchSimulado, 'GET', ROTA_RECALCULO)).toHaveLength(0)
  })

  it('[COMPONENTE] salvar sem mudar a data não consulta o checklist', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ percentualChecklist: 20 }))),
      quando('PUT', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ percentualChecklist: 20 }))),
    )

    await editarData('2027-05-15')

    expect(dialogo()).toBeNull()
    expect(chamadas(fetchSimulado, 'GET', ROTA_RECALCULO)).toHaveLength(0)
  })
})
