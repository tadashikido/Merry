import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import {
  DATA_CASAMENTO,
  ID_MODELO,
  aplicacaoExemplo,
  checklistExemplo,
  resumoModelo,
  tarefaChecklist,
} from '@/__tests__/auxiliaresChecklist'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CHECKLIST } from '@/textos/checklist'
import type { ChecklistCasamentoDto } from '@/tipos/checklist'
import { ID_CASAMENTO, RaizRotas, casamentoCompleto, chamadas, quando, rotearFetch } from '../../casamentos/__tests__/auxiliaresCasamentos'

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_CASAMENTO = `/api/casamentos/${ID_CASAMENTO}`
const ROTA_CHECKLIST = `${ROTA_CASAMENTO}/checklist`
const ROTA_PREVIA = `${ROTA_CHECKLIST}/previa?modeloId=${ID_MODELO}`
const ROTA_APLICACOES = `${ROTA_CHECKLIST}/aplicacoes`
const ROTA_MODELOS = '/api/modelos-checklist'

const LOCAL = tarefaChecklist({ id: 'a', titulo: 'Reservar local', prazo: '2026-12-12', status: 'Concluida', concluidaEm: '2026-09-01T12:00:00Z', concluidaPor: 'Assessoria' })
const BUFFET = tarefaChecklist({ id: 'b', titulo: 'Contratar buffet', prazo: '2026-12-12' })
const PROVA = tarefaChecklist({ id: 'c', titulo: 'Prova final dos trajes', prazo: '2027-11-12', responsavel: 'Casal', categoria: 'TrajesBeleza' })

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

async function abrir() {
  const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}/checklist`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return { montagem, wrapper }
}

describe('ChecklistView', () => {
  it('[COMPONENTE] casamento sem checklist oferece o modelo sugerido com prévia e aplica', async () => {
    let checklist: ChecklistCasamentoDto = checklistExemplo([])
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ data: DATA_CASAMENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklist)),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo({ id: 'outro', nome: 'Outro', sugerido: false }), resumoModelo()])),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoExemplo({ tarefasCriadas: 26, nascemAtrasadas: 3 }))),
      quando('POST', ROTA_APLICACOES, () => {
        checklist = checklistExemplo([BUFFET, PROVA])
        return respostaJson(aplicacaoExemplo({ tarefasCriadas: 26, nascemAtrasadas: 3 }))
      }),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('h1').text()).toBe(TEXTOS_CHECKLIST.titulo)
    expect(wrapper.text()).toContain(TEXTOS_CHECKLIST.vazioTitulo)
    expect(wrapper.text()).toContain('Sem checklist ainda')
    const previa = wrapper.get('[data-teste="previa-aplicacao"]')
    expect(previa.attributes('aria-live')).toBe('polite')
    expect(previa.text()).toContain('Vai criar 26 tarefas.')
    expect(previa.text()).toContain('3 nascem atrasadas')

    await wrapper.get('[data-teste="aplicar-modelo"]').trigger('click')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', ROTA_APLICACOES)
    expect(corpoDaChamada(chamada!)).toEqual({ modeloId: ID_MODELO })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('26 tarefas criadas no checklist. 3 já nascem atrasadas.')
    expect(wrapper.find('[data-teste="painel-aplicar"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="regua-marcos"]').exists()).toBe(true)
  })

  it('[COMPONENTE] agrupa as tarefas por marco, mostra o percentual e o indicador na navegação', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ data: DATA_CASAMENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([LOCAL, BUFFET, PROVA]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('[data-teste="percentual-checklist"]').text()).toBe('33%')
    expect(wrapper.get('[data-teste="frase-progresso"]').text()).toBe('1 de 3 concluídas')
    expect(wrapper.find('[data-teste="marco-dozeMeses"]').text()).toContain('Contratar buffet')
    expect(wrapper.find('[data-teste="marco-trintaDias"]').text()).toContain('Prova final dos trajes')
    expect(wrapper.find('[data-teste="marco-seisMeses"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="painel-aplicar"]').exists()).toBe(false)
    const item = wrapper.findAll('[data-teste="item-casamento"]').find((atual) => atual.text().startsWith('Checklist'))!
    expect(item.attributes('aria-current')).toBe('page')
    expect(item.get('[data-teste="indicador-modulo"]').text()).toContain('33%')
    expect(wrapper.get('[data-teste="ver-tarefas"]').attributes('href')).toBe(`/casamentos/${ID_CASAMENTO}/tarefas`)

    await wrapper.get('[data-teste="abrir-aplicar"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-teste="painel-aplicar"]').exists()).toBe(true)
  })

  it('[COMPONENTE] concluir pelo anel atualiza a tarefa e oferece Desfazer', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ data: DATA_CASAMENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([BUFFET]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('PATCH', `${ROTA_CASAMENTO}/tarefas/b/status`, () => respostaJson({ ...BUFFET, status: 'Concluida', concluidaPor: 'Assessoria', concluidaEm: '2026-09-30T12:00:00Z' })),
    )
    const { wrapper } = await abrir()

    await wrapper.get('[data-teste="alternar-tarefa"]').trigger('click')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'PATCH', `${ROTA_CASAMENTO}/tarefas/b/status`)
    expect(corpoDaChamada(chamada!)).toEqual({ status: 'Concluida' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Tarefa concluída.', expect.objectContaining({ desfazer: expect.any(Function) }))
  })

  it('[COMPONENTE] limite de 500 bloqueia a aplicação com mensagem clara', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ data: DATA_CASAMENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoExemplo({ tarefasCriadas: 30, tarefasNoCasamento: 480, excedeLimite: true }))),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('[data-teste="previa-limite"]').text()).toContain('passaria de 500 tarefas (hoje tem 480, o modelo cria 30)')
    expect(wrapper.get('[data-teste="aplicar-modelo"]').attributes('disabled')).toBeDefined()
  })

  it('[COMPONENTE] reaplicar sem itens novos desabilita o botão', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ data: DATA_CASAMENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoExemplo({ tarefasCriadas: 0, jaAplicadas: 26 }))),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('[data-teste="previa-aplicacao"]').text()).toContain(TEXTOS_CHECKLIST.previaNada)
    expect(wrapper.get('[data-teste="aplicar-modelo"]').attributes('disabled')).toBeDefined()
  })

  it('[COMPONENTE] 422 na aplicação aparece no painel', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ data: DATA_CASAMENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([]))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('GET', ROTA_PREVIA, () => respostaJson(aplicacaoExemplo())),
      quando('POST', ROTA_APLICACOES, () => respostaProblema(422, { title: 'Regra', detail: 'Este casamento está arquivado.' })),
    )
    const { wrapper } = await abrir()

    await wrapper.get('[data-teste="aplicar-modelo"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-teste="erro-aplicacao"]').text()).toContain('Este casamento está arquivado.')
  })

  it('[COMPONENTE] prazos desatualizados pedem confirmação antes de recalcular', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ data: DATA_CASAMENTO }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([BUFFET], { prazosDesatualizados: 1 }))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
      quando('POST', `${ROTA_CHECKLIST}/recalculo-prazos`, () => respostaJson({ tarefas: 1 })),
    )
    const { wrapper } = await abrir()

    expect(wrapper.get('[data-teste="aviso-prazos"]').text()).toContain('1 prazo não acompanha a data do casamento.')
    await wrapper.get('[data-teste="recalcular-prazos"]').trigger('click')
    await flushPromises()
    expect(chamadas(fetchSimulado, 'POST', `${ROTA_CHECKLIST}/recalculo-prazos`)).toHaveLength(0)

    const confirmar = document.body.querySelector<HTMLButtonElement>('[data-teste="dialogo-confirmacao-confirmar"]')!
    confirmar.click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', `${ROTA_CHECKLIST}/recalculo-prazos`)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Prazo de 1 tarefa recalculado.')
  })

  it('[COMPONENTE] casamento arquivado fica em leitura', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ data: DATA_CASAMENTO, arquivado: true }))),
      quando('GET', ROTA_CHECKLIST, () => respostaJson(checklistExemplo([BUFFET], { casamentoArquivado: true, prazosDesatualizados: 1 }))),
      quando('GET', ROTA_MODELOS, () => respostaJson([resumoModelo()])),
    )

    const { wrapper } = await abrir()

    expect(wrapper.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_CHECKLIST.arquivado)
    expect(wrapper.find('[data-teste="aviso-prazos"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="abrir-aplicar"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="menu-acoes"]').exists()).toBe(false)
  })

  it('[COMPONENTE] sem permissão e erro de rede usam os estados padrão', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_CHECKLIST, () => respostaProblema(403, { title: 'Proibido' })),
      quando('GET', ROTA_MODELOS, () => respostaJson([])),
    )
    const { wrapper } = await abrir()
    expect(wrapper.text()).toContain(TEXTOS_CHECKLIST.semAcesso)
    wrapper.unmount()

    fetchSimulado.mockReset()
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_CHECKLIST, () => respostaProblema(500, { title: 'Erro' })),
      quando('GET', ROTA_MODELOS, () => respostaJson([])),
    )
    const segunda = await abrir()
    expect(segunda.wrapper.text()).toContain(TEXTOS_CHECKLIST.erroTitulo)
  })
})
