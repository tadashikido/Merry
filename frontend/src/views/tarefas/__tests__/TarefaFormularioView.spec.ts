import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import Button from 'primevue/button'

import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { tarefaExemplo } from '@/__tests__/auxiliaresTarefas'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_TAREFAS } from '@/textos/tarefas'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch } from '../../eventos/__tests__/auxiliaresEventos'

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_TAREFAS = `${ROTA_EVENTO}/tarefas`
const ID_TAREFA = '33333333-3333-4333-8333-333333333333'
const ROTA_TAREFA = `${ROTA_TAREFAS}/${ID_TAREFA}`
const CAMINHO_NOVA = `/eventos/${ID_EVENTO}/tarefas/nova`
const CAMINHO_EDITAR = `/eventos/${ID_EVENTO}/tarefas/${ID_TAREFA}/editar`

const TAREFA = tarefaExemplo({
  id: ID_TAREFA,
  titulo: 'Confirmar horário do DJ',
  descricao: 'Ligar na quarta',
  responsavel: 'Anfitriao',
  categoria: 'Fornecedores',
  status: 'AFazer',
  prazo: '2027-03-10',
})

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  fetchSimulado = simularFetch()
  simularMatchMedia(false)
  notificacoes.sucesso.mockReset()
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

function rotasPadrao(arquivado = false) {
  return [
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ arquivado }))),
    quando('GET', ROTA_TAREFA, () => respostaJson(TAREFA)),
    quando('POST', ROTA_TAREFAS, () => respostaJson(tarefaExemplo({ id: 't2', titulo: 'Nova' }))),
    quando('PUT', ROTA_TAREFA, () => respostaJson({ ...TAREFA, titulo: 'Confirmar horário do DJ e do bolo' })),
    quando('PATCH', `${ROTA_TAREFA}/status`, () => respostaJson({ ...TAREFA, status: 'EmAndamento' })),
  ]
}

async function abrir(caminho: string, arquivado = false) {
  rotearFetch(fetchSimulado, ...rotasPadrao(arquivado))
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return montagem
}

function erroDe(campo: string) {
  return wrapper!.find(`#tarefa-${campo}-erro`)
}

function grupoDe(campo: string) {
  return wrapper!.get(`#tarefa-${campo}`).element.closest('fieldset')
}

describe('TarefaFormularioView no design system Celebri', () => {
  it('[COMPONENTE] cabeçalho e formulário dividem a largura de formulário', async () => {
    await abrir(CAMINHO_NOVA)

    const pagina = wrapper!.get('.pagina-formulario')
    expect(pagina.find('header').text()).toContain(TEXTOS_TAREFAS.formNova)
    expect(pagina.find('[data-teste="formulario-tarefa"]').exists()).toBe(true)
  })

  it('[COMPONENTE] dois grupos nomeados no ritmo de bloco e grupo', async () => {
    await abrir(CAMINHO_NOVA)

    const formulario = wrapper!.get('[data-teste="formulario-tarefa"]')
    expect(formulario.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    const grupos = formulario.findAll('fieldset')
    expect(grupos).toHaveLength(2)
    for (const grupo of grupos) {
      expect(grupo.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--grupo']))
      expect(grupo.get('legend').classes()).toContain('texto-rotulo')
    }
    expect(grupos.map((grupo) => grupo.get('legend').text())).toEqual([
      TEXTOS_TAREFAS.grupoTarefa,
      TEXTOS_TAREFAS.grupoOrganizacao,
    ])
  })

  it('[COMPONENTE] título e descrição ficam em "A tarefa"; prazo e categoria formam par em "Organização"', async () => {
    await abrir(CAMINHO_NOVA)

    const tarefa = wrapper!.get('[data-teste="grupo-tarefa"]').element
    const organizacao = wrapper!.get('[data-teste="grupo-organizacao"]').element
    expect(grupoDe('titulo')).toBe(tarefa)
    expect(grupoDe('descricao')).toBe(tarefa)
    expect(grupoDe('prazo')).toBe(organizacao)
    const colunaPrazo = wrapper!.get('#tarefa-prazo').element.closest('.formulario-tarefa__colunas')
    expect(colunaPrazo).not.toBeNull()
    expect(colunaPrazo?.contains(wrapper!.get('[data-teste="campo-categoria"]').element)).toBe(true)
    expect(wrapper!.find('[data-teste="campo-status"]').exists()).toBe(false)
  })

  it('[COMPONENTE] sair do título vazio antes de tentar salvar não mostra erro', async () => {
    await abrir(CAMINHO_NOVA)

    await wrapper!.get('#tarefa-titulo').trigger('blur')
    await wrapper!.get('#tarefa-descricao').trigger('blur')
    await flushPromises()

    expect(erroDe('titulo').exists()).toBe(false)
    expect(wrapper!.findAll('[data-teste="erro-campo"]')).toHaveLength(0)
  })

  it('[COMPONENTE] após a tentativa, digitar um título válido remove o erro sem sair do campo', async () => {
    await abrir(CAMINHO_NOVA)

    await wrapper!.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()
    expect(erroDe('titulo').exists()).toBe(true)
    expect(chamadas(fetchSimulado, 'POST', ROTA_TAREFAS)).toHaveLength(0)

    await wrapper!.get('#tarefa-titulo').setValue('Provar o bolo')
    await flushPromises()

    expect(erroDe('titulo').exists()).toBe(false)
  })

  it('[COMPONENTE] criar envia o request montado e volta para a lista de tarefas', async () => {
    const { roteador } = await abrir(CAMINHO_NOVA)

    await wrapper!.get('#tarefa-titulo').setValue('  Provar o bolo  ')
    await wrapper!.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()

    const envios = chamadas(fetchSimulado, 'POST', ROTA_TAREFAS)
    expect(envios).toHaveLength(1)
    expect(corpoDaChamada(envios[0]!)).toEqual({
      titulo: 'Provar o bolo',
      descricao: null,
      responsavel: 'Assessoria',
      categoria: 'Geral',
      prazo: null,
    })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_TAREFAS.toastCriada)
    await vi.waitFor(() => expect(roteador.currentRoute.value.name).toBe('evento-tarefas'), { timeout: 4000 })
  })

  it('[COMPONENTE] editar preenche os campos, mostra a situação e salva com mudança de situação', async () => {
    const { roteador } = await abrir(CAMINHO_EDITAR)

    expect(wrapper!.get('.pagina-formulario header').text()).toContain(TEXTOS_TAREFAS.formEditar)
    expect((wrapper!.get('#tarefa-titulo').element as HTMLInputElement).value).toBe(TAREFA.titulo)
    expect((wrapper!.get('#tarefa-descricao').element as HTMLTextAreaElement).value).toBe(TAREFA.descricao)
    expect((wrapper!.get('#tarefa-prazo').element as HTMLInputElement).value).toBe(TAREFA.prazo)
    const status = wrapper!.get('[data-teste="campo-status"]')
    expect(status.element.closest('fieldset')).toBe(wrapper!.get('[data-teste="grupo-organizacao"]').element)
    const salvar = wrapper!.findAllComponents(Button).find((botao) => botao.attributes('data-teste') === 'salvar-tarefa')
    expect(salvar?.props('label')).toBe(TEXTOS_TAREFAS.salvar)

    await wrapper!.get('#tarefa-titulo').setValue('Confirmar horário do DJ e do bolo')
    const emAndamento = status.findAll('button, [role="radio"], .p-togglebutton').find((opcao) => opcao.text() === 'Em andamento')
    expect(emAndamento).toBeDefined()
    await emAndamento!.trigger('click')
    await wrapper!.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()

    const atualizacoes = chamadas(fetchSimulado, 'PUT', ROTA_TAREFA)
    expect(atualizacoes).toHaveLength(1)
    expect(corpoDaChamada(atualizacoes[0]!)).toEqual({
      titulo: 'Confirmar horário do DJ e do bolo',
      descricao: 'Ligar na quarta',
      responsavel: 'Anfitriao',
      categoria: 'Fornecedores',
      prazo: '2027-03-10',
    })
    const mudancas = chamadas(fetchSimulado, 'PATCH', `${ROTA_TAREFA}/status`)
    expect(mudancas).toHaveLength(1)
    expect(corpoDaChamada(mudancas[0]!)).toMatchObject({ status: 'EmAndamento' })
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_TAREFAS.toastSalva)
    await vi.waitFor(() => expect(roteador.currentRoute.value.name).toBe('evento-tarefas'), { timeout: 4000 })
  })

  it('[COMPONENTE] falha de rede ao salvar mantém os dados e mostra a mensagem geral', async () => {
    await abrir(CAMINHO_NOVA)
    rotearFetch(fetchSimulado, quando('POST', ROTA_TAREFAS, () => respostaProblema(500, { title: 'Erro' })))

    await wrapper!.get('#tarefa-titulo').setValue('Provar o bolo')
    await wrapper!.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('[data-teste="erro-formulario"]').text()).toContain(TEXTOS_TAREFAS.erroSalvar)
    expect((wrapper!.get('#tarefa-titulo').element as HTMLInputElement).value).toBe('Provar o bolo')
  })

  it('[SEGURANÇA] permissão negada ao salvar mostra o aviso de acesso restrito', async () => {
    await abrir(CAMINHO_NOVA)
    rotearFetch(fetchSimulado, quando('POST', ROTA_TAREFAS, () => respostaProblema(403, { title: 'Proibido' })))

    await wrapper!.get('#tarefa-titulo').setValue('Provar o bolo')
    await wrapper!.get('[data-teste="formulario-tarefa"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('[data-teste="erro-formulario"]').text()).toContain(TEXTOS_TAREFAS.semPermissao)
  })

  it('[COMPONENTE] evento arquivado mostra o aviso e desabilita o salvar', async () => {
    await abrir(CAMINHO_NOVA, true)

    expect(wrapper!.find('[data-teste="aviso-arquivado"]').exists()).toBe(true)
    const salvar = wrapper!.findAllComponents(Button).find((botao) => botao.attributes('data-teste') === 'salvar-tarefa')
    expect((salvar?.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('[ESTILO] espaçamentos só com tokens de ritmo, sem largura própria nem espaço solto', () => {
    const fonte = readFileSync(resolve(__dirname, '../TarefaFormularioView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style'))
    expect(estilo).not.toMatch(/--p-espaco-/)
    expect(estilo).not.toMatch(/max-width:\s*var\(--p-dimensao-largura/)
    expect(estilo).not.toMatch(/(gap|margin[\w-]*|padding[\w-]*):[^;]*\d+px/)
    expect(estilo).not.toMatch(/margin[\w-]*:\s*-/)
    expect(fonte).not.toMatch(/validarCampo\(/)
  })
})
