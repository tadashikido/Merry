import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import { defineComponent, h } from 'vue'
import { RouterView } from 'vue-router'
import ProvedorFeedback from '@/componentes/base/ProvedorFeedback.vue'
import {
  ID_CASAMENTO,
  ID_OUTRO,
  RaizRotas,
  casamentoCompleto,
  chamadas,
  quando,
  resumoCasamento,
  rotearFetch,
} from './auxiliaresCasamentos'

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

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

async function abrir(caminho: string) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  return { montagem, wrapper }
}

describe('rotas de casamentos', () => {
  it('[SEGURANÇA] exigem sessão: sem sessão válida redirecionam para entrar', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(401))

    const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}`)

    expect(montagem.roteador.currentRoute.value.name).toBe('entrar')
    expect(montagem.roteador.currentRoute.value.query.destino).toBe(`/casamentos/${ID_CASAMENTO}`)
  })

  it('[UNITÁRIO] id fora do formato de GUID cai em página não encontrada', async () => {
    rotearFetch(fetchSimulado)
    const montagem = await prepararAplicacao('/casamentos/abc')

    expect(montagem.roteador.currentRoute.value.name).toBe('nao-encontrado')
  })
})

describe('CasamentosView', () => {
  const lista = [
    resumoCasamento(),
    resumoCasamento({ id: ID_OUTRO, nomePrimeiraPessoa: 'Carla', nomeSegundaPessoa: 'Diego', fase: 'Realizado', diasRestantes: -3, horario: null }),
  ]

  it('[COMPONENTE] lista casamentos com nomes, data, fase e contagem', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson(lista)))

    await abrir('/casamentos')

    const texto = wrapper!.text()
    expect(wrapper!.get('h1').text()).toBe(TEXTOS_CASAMENTOS.listaTitulo)
    expect(texto).toContain('Ana Beatriz')
    expect(texto).toContain('15/05/2027, 16:30')
    expect(texto).toContain('Reta final')
    expect(texto).toContain('Faltam 42 dias')
    expect(texto).toContain('Realizado')
    expect(texto).toContain('Foi há 3 dias')
    expect(wrapper!.findAll('[data-teste="link-casamento"]')[0]?.attributes('href')).toBe(`/casamentos/${ID_CASAMENTO}`)
  })

  it('[COMPONENTE] busca por nome sem diferenciar acento e caixa', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/casamentos')

    await wrapper!.get('[data-teste="busca-listagem"]').setValue('DIÉGO')
    await flushPromises()

    expect(wrapper!.text()).toContain('Carla')
    expect(wrapper!.text()).not.toContain('Ana Beatriz')
  })

  it('[INTEGRAÇÃO] alternar para Arquivados atualiza a URL e busca arquivados', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson(lista)),
      quando('GET', '/api/casamentos?situacao=Arquivados', () => respostaJson([])),
    )
    const { montagem } = await abrir('/casamentos')

    const opcao = wrapper!.findAll('[data-teste="filtro-situacao"] button').find((botao) => botao.text() === TEXTOS_CASAMENTOS.arquivados)
    await opcao!.trigger('click')
    await flushPromises()

    expect(montagem.roteador.currentRoute.value.query.situacao).toBe('arquivados')
    expect(chamadas(fetchSimulado, 'GET', '/api/casamentos?situacao=Arquivados')).toHaveLength(1)
    expect(wrapper!.text()).toContain(TEXTOS_CASAMENTOS.vazioArquivadosTitulo)
  })

  it('[INTEGRAÇÃO] arquivar chama a API e tira a linha dos ativos', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson(lista)),
      quando('POST', `/api/casamentos/${ID_CASAMENTO}/arquivar`, () => respostaJson(casamentoCompleto({ arquivado: true }))),
    )
    await abrir('/casamentos')

    const botao = wrapper!.findAll('[data-teste="arquivar-casamento"]')[0]!
    expect(botao.attributes('aria-label')).toBe('Arquivar Ana Beatriz & Bruno')
    await botao.trigger('click')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', `/api/casamentos/${ID_CASAMENTO}/arquivar`)).toHaveLength(1)
    expect(wrapper!.text()).not.toContain('Ana Beatriz')
    expect(wrapper!.text()).toContain('Carla')
  })

  it('[COMPONENTE] em Arquivados oferece Restaurar e não oferece Editar', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/casamentos?situacao=Arquivados', () => respostaJson([resumoCasamento({ arquivado: true })])),
    )
    await abrir('/casamentos?situacao=arquivados')

    expect(wrapper!.find('[data-teste="restaurar-casamento"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="editar-casamento"]').exists()).toBe(false)
    expect(wrapper!.text()).toContain(TEXTOS_CASAMENTOS.statusArquivado)
  })

  it('[COMPONENTE] falha ao carregar mostra erro com tentar novamente', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaProblema(500)))
    await abrir('/casamentos')

    expect(wrapper!.get('[data-teste="estado-erro"]').text()).toContain(TEXTOS_CASAMENTOS.erroCarregarTexto)

    await wrapper!.get('[data-teste="tentar-novamente"]').trigger('click')
    await flushPromises()
    expect(chamadas(fetchSimulado, 'GET', '/api/casamentos?situacao=Ativos')).toHaveLength(2)
  })

  it('[COMPONENTE] lista vazia de ativos convida a cadastrar', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/casamentos?situacao=Ativos', () => respostaJson([])))
    await abrir('/casamentos')

    expect(wrapper!.text()).toContain(TEXTOS_CASAMENTOS.vazioAtivosTitulo)
  })
})

describe('CasamentoFormularioView', () => {
  it('[COMPONENTE] salvar vazio mostra erros sob os campos obrigatórios, foca o primeiro e não chama a API', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/casamentos/novo')

    await wrapper!.get('[data-teste="formulario-casamento"]').trigger('submit')
    await flushPromises()

    const erros = wrapper!.findAll('[data-teste="erro-campo"]').map((erro) => erro.text())
    expect(erros).toEqual(['Preencha este campo.', 'Preencha este campo.', 'Preencha este campo.'])
    expect(document.activeElement?.id).toBe('casamento-nomePrimeiraPessoa')
    expect(chamadas(fetchSimulado, 'POST', '/api/casamentos')).toHaveLength(0)
  })

  it('[INTEGRAÇÃO] cadastra enviando data como AAAA-MM-DD e abre a página do casamento', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', '/api/casamentos', () => respostaJson(casamentoCompleto(), 201)),
      quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto())),
    )
    const { montagem } = await abrir('/casamentos/novo')

    await wrapper!.get('#casamento-nomePrimeiraPessoa').setValue('  Ana Beatriz ')
    await wrapper!.get('#casamento-nomeSegundaPessoa').setValue('Bruno')
    await wrapper!.get('#casamento-data').setValue('2027-05-15')
    await wrapper!.get('#casamento-horario').setValue('16:30')
    await wrapper!.get('#casamento-convidadosEstimados').setValue('150')
    await wrapper!.get('[data-teste="formulario-casamento"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', '/api/casamentos')
    expect(corpoDaChamada(chamada!)).toEqual({
      nomePrimeiraPessoa: 'Ana Beatriz',
      nomeSegundaPessoa: 'Bruno',
      data: '2027-05-15',
      horario: '16:30',
      localCerimonia: null,
      localRecepcao: null,
      convidadosEstimados: 150,
      observacoes: null,
      dataLimiteRsvp: null,
    })
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('casamento'))
    expect(montagem.roteador.currentRoute.value.params.id).toBe(ID_CASAMENTO)
  })

  it('[COMPONENTE] limites inválidos aparecem sob os campos', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/casamentos/novo')

    await wrapper!.get('#casamento-nomePrimeiraPessoa').setValue('A')
    await wrapper!.get('#casamento-nomeSegundaPessoa').setValue('Bruno')
    await wrapper!.get('#casamento-data').setValue('1999-12-31')
    await wrapper!.get('#casamento-convidadosEstimados').setValue('0')
    await wrapper!.get('[data-teste="formulario-casamento"]').trigger('submit')
    await flushPromises()

    const erros = wrapper!.findAll('[data-teste="erro-campo"]').map((erro) => erro.text())
    expect(erros).toEqual(['Use entre 2 e 80 caracteres.', 'Informe uma data entre 2000 e 2100.', 'Informe um número entre 1 e 5.000.'])
  })

  it('[INTEGRAÇÃO] erro 400 da API é mostrado no campo correspondente', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', '/api/casamentos', () =>
        respostaProblema(400, { errors: { NomeSegundaPessoa: ['Use entre 2 e 80 caracteres.'] } }),
      ),
    )
    await abrir('/casamentos/novo')

    await wrapper!.get('#casamento-nomePrimeiraPessoa').setValue('Ana')
    await wrapper!.get('#casamento-nomeSegundaPessoa').setValue('Bruno')
    await wrapper!.get('#casamento-data').setValue('2027-05-15')
    await wrapper!.get('[data-teste="formulario-casamento"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('#casamento-nomeSegundaPessoa-erro').text()).toBe('Use entre 2 e 80 caracteres.')
    expect(document.activeElement?.id).toBe('casamento-nomeSegundaPessoa')
  })

  it('[INTEGRAÇÃO] editar carrega os dados e salva com PUT', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto())),
      quando('PUT', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto({ nomeSegundaPessoa: 'Bruna' }))),
    )
    const { montagem } = await abrir(`/casamentos/${ID_CASAMENTO}/editar`)

    expect(wrapper!.get('h1').text()).toBe(TEXTOS_CASAMENTOS.tituloEdicao)
    expect((wrapper!.get('#casamento-data').element as HTMLInputElement).value).toBe('2027-05-15')
    expect((wrapper!.get('#casamento-observacoes').element as HTMLTextAreaElement).value).toBe('Flores brancas')

    await wrapper!.get('#casamento-nomeSegundaPessoa').setValue('Bruna')
    await wrapper!.get('[data-teste="formulario-casamento"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'PUT', `/api/casamentos/${ID_CASAMENTO}`)
    expect(corpoDaChamada(chamada!)).toMatchObject({ nomeSegundaPessoa: 'Bruna', data: '2027-05-15', convidadosEstimados: 150 })
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('casamento'))
  })

  it('[COMPONENTE] casamento arquivado: aviso e salvar desabilitado', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto({ arquivado: true }))))
    await abrir(`/casamentos/${ID_CASAMENTO}/editar`)

    expect(wrapper!.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_CASAMENTOS.avisoArquivado)
    expect(wrapper!.get('[data-teste="salvar-casamento"]').attributes('disabled')).toBeDefined()
  })

  it('[INTEGRAÇÃO] 422 da API aparece como mensagem do formulário', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto())),
      quando('PUT', `/api/casamentos/${ID_CASAMENTO}`, () => respostaProblema(422, { detail: TEXTOS_CASAMENTOS.avisoArquivado })),
    )
    await abrir(`/casamentos/${ID_CASAMENTO}/editar`)

    await wrapper!.get('[data-teste="formulario-casamento"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('[data-teste="erro-formulario"]').text()).toContain(TEXTOS_CASAMENTOS.avisoArquivado)
  })

  it('[SEGURANÇA] editar casamento inexistente ou de outra assessoria mostra não encontrado sem formulário', async () => {
    rotearFetch(fetchSimulado)
    await abrir(`/casamentos/${ID_OUTRO}/editar`)

    expect(wrapper!.text()).toContain(TEXTOS_CASAMENTOS.naoEncontradoTitulo)
    expect(wrapper!.find('[data-teste="formulario-casamento"]').exists()).toBe(false)
  })
})

describe('CasamentoView', () => {
  it('[COMPONENTE] mostra nomes, fase, contagem em destaque e detalhes', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto())))
    await abrir(`/casamentos/${ID_CASAMENTO}`)

    expect(wrapper!.get('h1').text()).toContain('Ana Beatriz')
    expect(wrapper!.get('h1 .nomes-casal__e').text()).toBe('&')
    expect(wrapper!.text()).toContain('Reta final')
    expect(wrapper!.get('.contagem__numero').text()).toBe('42')
    expect(wrapper!.text()).toContain('sábado, 15 de maio de 2027, 16:30')
    const valores = wrapper!.findAll('.lista-detalhes__valor').map((valor) => valor.text())
    expect(valores).toEqual(['15 de maio de 2027', '16:30', 'Capela São José', '—', '150', 'Flores brancas'])
    expect(document.title).toBe('Ana Beatriz & Bruno · Enlace')
    expect(wrapper!.find('[data-teste="editar-casamento"]').exists()).toBe(true)
  })

  it('[INTEGRAÇÃO] arquivar mostra o aviso e troca a ação para Restaurar', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto())),
      quando('POST', `/api/casamentos/${ID_CASAMENTO}/arquivar`, () =>
        respostaJson(casamentoCompleto({ arquivado: true, arquivadoEm: '2026-09-28T13:00:00Z' })),
      ),
    )
    await abrir(`/casamentos/${ID_CASAMENTO}`)

    await wrapper!.get('[data-teste="arquivar-casamento"]').trigger('click')
    await flushPromises()

    expect(wrapper!.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_CASAMENTOS.avisoArquivado)
    expect(wrapper!.find('[data-teste="restaurar-casamento"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="editar-casamento"]').exists()).toBe(false)
  })

  it('[COMPONENTE] mostra o workspace do casamento com nomes, data e grupos existentes, e o rail com Casamentos ativo', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto())))
    await abrir(`/casamentos/${ID_CASAMENTO}`)

    const navegacao = wrapper!.get('[data-teste="navegacao-casamento"]')
    expect(navegacao.attributes('aria-label')).toBe('Módulos do casamento')
    expect(navegacao.text()).toContain('Ana Beatriz')
    expect(navegacao.get('[data-teste="navegacao-casamento-quando"]').text()).toBe('15 mai 2027 · faltam 42 dias')
    const grupos = navegacao.findAll('[data-teste="grupo-casamento"]')
    expect(grupos.map((grupo) => grupo.find('span').text())).toEqual(['Planejar', 'Pessoas', 'Dinheiro & documentos', 'Execução'])
    const itens = navegacao.findAll('[data-teste="item-casamento"]')
    expect(itens.map((item) => item.text())).toEqual(['Visão geral', 'Tarefas', 'Checklist', 'Cronograma', 'Fornecedores', 'Convidados', 'Confirmações', 'Restrições alimentares', 'Mesas', 'Financeiro', 'Grande Dia'])
    expect(itens[0]!.attributes('aria-current')).toBe('page')
    const casamentos = wrapper!.findAll('[data-teste="item-menu"]').find((item) => item.text() === TEXTOS_CASAMENTOS.menu)
    expect(casamentos!.attributes('aria-current')).toBe('page')
    expect(chamadas(fetchSimulado, 'GET', `/api/casamentos/${ID_CASAMENTO}`)).toHaveLength(1)
  })

  it('[COMPONENTE] casamento sem horário e sem local mostra os dados incompletos com o caminho para a edição', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto({ horario: null, localCerimonia: null }))))
    await abrir(`/casamentos/${ID_CASAMENTO}`)

    const avisos = wrapper!.findAll('[data-teste="dados-incompletos"]')
    expect(avisos.map((aviso) => aviso.text())).toEqual([
      expect.stringContaining(TEXTOS_CASAMENTOS.faltaHorario.titulo),
      expect.stringContaining(TEXTOS_CASAMENTOS.faltaLocal.titulo),
    ])
    expect(avisos[0]!.get('a').attributes('href')).toBe(`/casamentos/${ID_CASAMENTO}/editar`)
  })

  it('[COMPONENTE] casamento arquivado não pede dados incompletos', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto({ horario: null, arquivado: true }))))
    await abrir(`/casamentos/${ID_CASAMENTO}`)

    expect(wrapper!.find('[data-teste="dados-incompletos"]').exists()).toBe(false)
  })

  it('[INTEGRAÇÃO] arquivar oferece Desfazer no toast, que restaura o casamento pela API existente', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaJson(casamentoCompleto())),
      quando('POST', `/api/casamentos/${ID_CASAMENTO}/arquivar`, () => respostaJson(casamentoCompleto({ arquivado: true }))),
      quando('POST', `/api/casamentos/${ID_CASAMENTO}/restaurar`, () => respostaJson(casamentoCompleto())),
    )
    const RaizComFeedback = defineComponent({ render: () => h('div', [h(RouterView), h(ProvedorFeedback)]) })
    const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}`)
    wrapper = await montarView(RaizComFeedback, montagem)

    await wrapper.get('[data-teste="arquivar-casamento"]').trigger('click')
    await flushPromises()

    const desfazer = document.body.querySelector<HTMLButtonElement>('[data-teste="toast-desfazer"]')
    expect(desfazer).not.toBeNull()
    expect(document.body.textContent).toContain(TEXTOS_CASAMENTOS.arquivado('Ana Beatriz & Bruno'))
    desfazer!.click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', `/api/casamentos/${ID_CASAMENTO}/restaurar`)).toHaveLength(1)
    expect(wrapper.find('[data-teste="arquivar-casamento"]').exists()).toBe(true)
    expect(document.body.textContent).toContain(TEXTOS_CASAMENTOS.restaurado('Ana Beatriz & Bruno'))
  })

  it('[SEGURANÇA] 404 mostra "Casamento não encontrado" sem revelar dados e com volta para a lista', async () => {
    rotearFetch(fetchSimulado)
    await abrir(`/casamentos/${ID_OUTRO}`)

    expect(wrapper!.text()).toContain(TEXTOS_CASAMENTOS.naoEncontradoTitulo)
    expect(wrapper!.find('[data-teste="tentar-novamente"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="voltar-casamentos"]').attributes('href')).toBe('/casamentos')
  })

  it('[SEGURANÇA] 403 informa falta de acesso sem tentar novamente', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/casamentos/${ID_CASAMENTO}`, () => respostaProblema(403)))
    await abrir(`/casamentos/${ID_CASAMENTO}`)

    expect(wrapper!.text()).toContain(TEXTOS_CASAMENTOS.semAcesso)
    expect(wrapper!.find('[data-teste="tentar-novamente"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="estado-erro"]').attributes('data-variante')).toBe('semPermissao')
  })
})
