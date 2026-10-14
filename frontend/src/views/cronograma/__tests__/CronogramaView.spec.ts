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
import { cronogramaExemplo, itemCronograma } from '@/__tests__/auxiliaresCronograma'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { TEXTOS_CRONOGRAMA } from '@/textos/cronograma'
import type { SessaoDto } from '@/tipos/api'
import type { CronogramaDto } from '@/tipos/cronograma'
import { ID_CASAMENTO, RaizRotas, casamentoCompleto, chamadas, quando, type Rota } from '../../casamentos/__tests__/auxiliaresCasamentos'

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_CASAMENTO = `/api/casamentos/${ID_CASAMENTO}`
const ROTA_CRONOGRAMA = `${ROTA_CASAMENTO}/cronograma`
const CAMINHO = `/casamentos/${ID_CASAMENTO}/cronograma`

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

const MAKING = itemCronograma({ id: 'm', inicio: '13:00', termino: '15:00', duracaoMinutos: 120, atividade: 'Making of', minutosDesdeCerimonia: -210, responsavel: 'Ana', notasInternas: 'Pagar em dinheiro' })
const CERIMONIA = itemCronograma({
  id: 'c',
  fornecedor: { fornecedorCasamentoId: 'v1', nomeEmpresa: 'Coral Harmonia', categoria: 'Musica' },
  conflitos: [{ itemId: 'r', atividade: 'Retoque', inicio: '17:00', dia: 'DiaDoCasamento', motivo: 'Responsavel' }],
})
const RETOQUE = itemCronograma({
  id: 'r',
  inicio: '17:00',
  termino: '17:20',
  duracaoMinutos: 20,
  atividade: 'Retoque',
  minutosDesdeCerimonia: 30,
  conflitos: [{ itemId: 'c', atividade: 'Cerimônia', inicio: '16:30', dia: 'DiaDoCasamento', motivo: 'Responsavel' }],
})
const MONTAGEM = itemCronograma({ id: 'v', dia: 'Vespera', data: '2027-05-14', inicio: '18:00', termino: '22:00', atividade: 'Montagem', minutosDesdeCerimonia: -1350 })

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
    quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
    quando('GET', ROTA_CRONOGRAMA, cronograma),
    ...extras,
  )
  const montagem = await prepararAplicacao(CAMINHO)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return montagem
}

function campo(seletor: string): HTMLInputElement {
  return document.body.querySelector<HTMLInputElement>(seletor)!
}

async function digitar(seletor: string, valor: string) {
  const elemento = campo(seletor)
  elemento.value = valor
  elemento.dispatchEvent(new Event('input'))
  await flushPromises()
}

async function clicar(seletor: string) {
  document.body.querySelector<HTMLElement>(seletor)!.click()
  await flushPromises()
}

describe('CronogramaView — assessoria', () => {
  it('[COMPONENTE] agrupa por dia, mostra o fio com a cerimônia, a distância e os conflitos', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(cronogramaExemplo([MONTAGEM, MAKING, CERIMONIA, RETOQUE])))

    expect(wrapper!.get('h1').text()).toBe(TEXTOS_CRONOGRAMA.titulo)
    expect(wrapper!.text()).toContain('cerimônia às 16:30')
    expect(wrapper!.get('[data-teste="grupo-cronograma-Vespera"] h2').text()).toContain('Véspera')
    const dia = wrapper!.get('[data-teste="grupo-cronograma-DiaDoCasamento"]')
    expect(dia.findAll('[data-teste="linha-cronograma-atividade"]').map((linha) => linha.text())).toEqual(['Making of', 'Cerimônia', 'Retoque'])
    expect(dia.text()).toContain('3 itens')
    expect(dia.text()).toContain('3 h 30 antes da cerimônia')
    expect(dia.findAll('.linha-cronograma--cerimonia')).toHaveLength(1)
    expect(dia.text()).toContain('Coral Harmonia')
    expect(wrapper!.get('[data-teste="aviso-conflitos"]').text()).toBe(TEXTOS_CRONOGRAMA.conflitosFaixa(2))
    expect(dia.findAll('[data-teste="linha-cronograma-conflito"]')).toHaveLength(2)
    expect(dia.find('[data-teste="linha-cronograma-nota"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="aviso-sem-horario"]').exists()).toBe(false)
    const itemMenu = wrapper!.findAll('[data-teste="item-casamento"]').find((item) => item.text() === 'Cronograma')
    expect(itemMenu?.attributes('aria-current')).toBe('page')
  })

  it('[COMPONENTE] adiciona item pela folha na mesma rota, calcula a duração e usa o atalho de local', async () => {
    let lista: CronogramaDto = cronogramaExemplo([CERIMONIA])
    const montagem = await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(lista),
      quando('POST', ROTA_CRONOGRAMA, () => {
        const criado = itemCronograma({ id: 'n', atividade: 'Pista de dança', inicio: '21:30', termino: '02:00', terminaEmOutroDia: true })
        lista = cronogramaExemplo([CERIMONIA, criado])
        return respostaJson(criado, 201)
      }),
    )

    await wrapper!.get('[data-teste="adicionar-item-cronograma"]').trigger('click')
    await flushPromises()

    expect(document.body.querySelector('[data-teste="dialogo-item-cronograma"]')).not.toBeNull()
    expect(document.body.textContent).toContain(TEXTOS_CRONOGRAMA.dialogoNovo)
    await digitar('#cronograma-inicio', '21:30')
    await digitar('#cronograma-termino', '02:00')
    expect(document.body.textContent).toContain('Termina no dia seguinte, 4 h 30')
    await digitar('#cronograma-atividade', 'Pista de dança')
    const atalhos = [...document.body.querySelectorAll<HTMLButtonElement>('[data-teste="atalho-preenchimento"]')]
    expect(atalhos.map((atalho) => atalho.textContent?.trim())).toEqual(['Cerimônia: Capela São José', 'Recepção: Espaço Jardim'])
    atalhos[1]!.click()
    await flushPromises()
    expect(campo('#cronograma-local').value).toBe('Espaço Jardim')
    await clicar('[data-teste="salvar-item-cronograma"]')

    const [post] = chamadas(fetchSimulado, 'POST', ROTA_CRONOGRAMA)
    expect(corpoDaChamada(post!)).toEqual({
      dia: 'DiaDoCasamento',
      inicio: '21:30',
      duracaoMinutos: 270,
      atividade: 'Pista de dança',
      local: 'Espaço Jardim',
      responsavel: null,
      fornecedorCasamentoId: null,
      instrucoes: null,
      notasInternas: null,
    })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_CRONOGRAMA.sucessoCriado)
    expect(wrapper!.text()).toContain('Pista de dança')
    expect(montagem.roteador.currentRoute.value.name).toBe('casamento-cronograma')
  })

  it('[COMPONENTE] valida campos obrigatórios antes de enviar', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(cronogramaExemplo([CERIMONIA])))

    await wrapper!.get('[data-teste="adicionar-item-cronograma"]').trigger('click')
    await flushPromises()
    await clicar('[data-teste="salvar-item-cronograma"]')

    expect(chamadas(fetchSimulado, 'POST', ROTA_CRONOGRAMA)).toHaveLength(0)
    expect(document.body.textContent).toContain(TEXTOS_CRONOGRAMA.erroInicio)
    expect(document.body.textContent).toContain(TEXTOS_CRONOGRAMA.erroAtividade)
  })

  it('[COMPONENTE] salvar e adicionar outro mantém a folha aberta com o próximo início sugerido', async () => {
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(cronogramaExemplo([CERIMONIA])),
      quando('POST', ROTA_CRONOGRAMA, () => respostaJson(itemCronograma({ id: 'x' }), 201)),
    )

    await wrapper!.get('[data-teste="adicionar-item-cronograma"]').trigger('click')
    await flushPromises()
    await digitar('#cronograma-inicio', '16:30')
    await digitar('#cronograma-termino', '17:15')
    await digitar('#cronograma-atividade', 'Cerimônia')
    await clicar('[data-teste="salvar-outro-item-cronograma"]')

    expect(chamadas(fetchSimulado, 'POST', ROTA_CRONOGRAMA)).toHaveLength(1)
    expect(document.body.querySelector('[data-teste="dialogo-item-cronograma"]')).not.toBeNull()
    expect(campo('#cronograma-inicio').value).toBe('17:15')
    expect(campo('#cronograma-atividade').value).toBe('')
  })

  it('[COMPONENTE] editar abre a folha preenchida, mostra o conflito e erro 422 aparece no campo', async () => {
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(cronogramaExemplo([CERIMONIA, RETOQUE])),
      quando('PUT', `${ROTA_CRONOGRAMA}/c`, () =>
        respostaProblema(422, { detail: 'Escolha um fornecedor deste casamento.', campo: 'fornecedorCasamentoId' }),
      ),
    )

    const linha = wrapper!.findAll('button[data-teste="linha-cronograma-conteudo"]').find((botao) => botao.text().includes('Cerimônia'))!
    expect(linha.attributes('aria-label')).toBe('Editar Cerimônia, das 16:30 às 17:15')
    await linha.trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain(TEXTOS_CRONOGRAMA.dialogoEditar)
    expect(campo('#cronograma-inicio').value).toBe('16:30')
    expect(campo('#cronograma-termino').value).toBe('17:15')
    expect(campo('#cronograma-atividade').value).toBe('Cerimônia')
    expect(document.body.querySelector('[data-teste="conflito-dialogo"]')?.textContent).toContain('Conflito com Retoque às 17:00 (Fernanda).')
    await clicar('[data-teste="salvar-item-cronograma"]')

    expect(document.body.textContent).toContain('Escolha um fornecedor deste casamento.')
    expect(document.body.querySelector('[data-teste="dialogo-item-cronograma"]')).not.toBeNull()
  })

  it('[COMPONENTE] excluir pela folha pede confirmação nomeando a atividade e envia DELETE', async () => {
    const montagem = await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(cronogramaExemplo([CERIMONIA])),
      quando('DELETE', `${ROTA_CRONOGRAMA}/c`, () => respostaVazia(204)),
    )
    const confirmacao = useConfirmacaoExclusaoStore(montagem.pinia)

    await wrapper!.get('button[data-teste="linha-cronograma-conteudo"]').trigger('click')
    await flushPromises()
    await clicar('[data-teste="excluir-item-cronograma"]')

    expect(confirmacao.visivel).toBe(true)
    expect(confirmacao.nomeItem).toBe('Cerimônia')
    expect(confirmacao.mensagem).toBe(TEXTOS_CRONOGRAMA.confirmarExcluir)
    await confirmacao.confirmar()
    await flushPromises()
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_CRONOGRAMA}/c`)).toHaveLength(1)
  })

  it('[COMPONENTE] sem horário da cerimônia mostra dados incompletos com atalho para informar', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(cronogramaExemplo([CERIMONIA], { horarioCerimonia: null })))

    const aviso = wrapper!.get('[data-teste="aviso-sem-horario"]')
    expect(aviso.text()).toContain(TEXTOS_CRONOGRAMA.incompletoTitulo)
    expect(aviso.text()).toContain(TEXTOS_CRONOGRAMA.incompletoTexto)
    expect(aviso.get('[data-teste="adicionar-horario"]').attributes('href')).toBe(`/casamentos/${ID_CASAMENTO}/editar`)
    expect(wrapper!.text()).toContain('sem horário da cerimônia')
  })

  it('[COMPONENTE] vazio convida a montar o roteiro', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(cronogramaExemplo([])))

    expect(wrapper!.get('[data-teste="estado-vazio"]').text()).toContain(TEXTOS_CRONOGRAMA.vazioTitulo)
    expect(wrapper!.find('[data-teste="adicionar-item-cronograma"]').exists()).toBe(true)
  })

  it('[COMPONENTE] arquivado fica só para consulta', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(cronogramaExemplo([CERIMONIA], { arquivado: true, somenteLeitura: true })))

    expect(wrapper!.get('[data-teste="aviso-arquivado"]').text()).toBe(TEXTOS_CRONOGRAMA.arquivado)
    expect(wrapper!.find('[data-teste="adicionar-item-cronograma"]').exists()).toBe(false)
    expect(wrapper!.find('button[data-teste="linha-cronograma-conteudo"]').exists()).toBe(false)
  })

  it('[COMPONENTE] erro ao carregar oferece tentar novamente', async () => {
    let falhar = true
    await abrir(SESSAO_EXEMPLO, () => (falhar ? respostaProblema(500) : respostaJson(cronogramaExemplo([CERIMONIA]))))

    expect(wrapper!.text()).toContain(TEXTOS_CRONOGRAMA.erroTitulo)
    falhar = false
    const botao = wrapper!.findAll('button').find((item) => item.text() === 'Tentar novamente')!
    await botao.trigger('click')
    await flushPromises()
    expect(wrapper!.text()).toContain('Cerimônia')
  })

  it('[SEGURANÇA] 403 mostra sem permissão e 404 mostra casamento não encontrado', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaProblema(403))
    expect(wrapper!.text()).toContain(TEXTOS_CRONOGRAMA.semAcesso)
    wrapper!.unmount()
    wrapper = undefined
    document.body.innerHTML = ''

    await abrir(SESSAO_EXEMPLO, () => respostaProblema(404, { title: 'Recurso não encontrado.' }))
    expect(wrapper!.text()).toContain(TEXTOS_CRONOGRAMA.naoEncontradoTitulo)
    expect(wrapper!.get('[data-teste="voltar"]').text()).toBe(TEXTOS_CRONOGRAMA.voltarCasamentos)
  })
})

describe('CronogramaView — casal', () => {
  it('[SEGURANÇA] casal vê o roteiro em leitura, sem ações nem atalho de horário', async () => {
    await abrir(
      SESSAO_CASAL,
      () => respostaJson(cronogramaExemplo([{ ...CERIMONIA, conflitos: [] }], { somenteLeitura: true, fornecedoresDisponiveis: [], horarioCerimonia: null })),
    )

    expect(wrapper!.find('[data-teste="adicionar-item-cronograma"]').exists()).toBe(false)
    expect(wrapper!.find('button[data-teste="linha-cronograma-conteudo"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="aviso-sem-horario"]').find('[data-teste="adicionar-horario"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="apoio-casal"]').text()).toBe(TEXTOS_CRONOGRAMA.apoioCasal)
    expect(wrapper!.find('[data-teste="linha-cronograma-nota"]').exists()).toBe(false)
    expect(document.body.querySelector('[data-teste="dialogo-item-cronograma"]')).toBeNull()
  })

  it('[COMPONENTE] casal com cronograma vazio vê a explicação sem ação', async () => {
    await abrir(SESSAO_CASAL, () => respostaJson(cronogramaExemplo([], { somenteLeitura: true })))

    expect(wrapper!.get('[data-teste="estado-vazio"]').text()).toContain(TEXTOS_CRONOGRAMA.vazioCasalTitulo)
    expect(wrapper!.find('[data-teste="adicionar-item-cronograma"]').exists()).toBe(false)
  })
})
