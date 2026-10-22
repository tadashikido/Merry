import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { defineComponent, h } from 'vue'
import { RouterView } from 'vue-router'
import ProvedorFeedback from '@/componentes/base/ProvedorFeedback.vue'
import {
  ID_EVENTO,
  ID_OUTRO,
  RaizRotas,
  eventoCompleto,
  chamadas,
  quando,
  resumoEvento,
  rotearFetch,
} from './auxiliaresEventos'

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

describe('rotas de eventos', () => {
  it('[SEGURANÇA] exigem sessão: sem sessão válida redirecionam para entrar', async () => {
    fetchSimulado.mockResolvedValue(respostaProblema(401))

    const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}`)

    expect(montagem.roteador.currentRoute.value.name).toBe('entrar')
    expect(montagem.roteador.currentRoute.value.query.destino).toBe(`/eventos/${ID_EVENTO}`)
  })

  it('[UNITÁRIO] id fora do formato de GUID cai em página não encontrada', async () => {
    rotearFetch(fetchSimulado)
    const montagem = await prepararAplicacao('/eventos/abc')

    expect(montagem.roteador.currentRoute.value.name).toBe('nao-encontrado')
  })
})

describe('EventosView', () => {
  const lista = [
    resumoEvento(),
    resumoEvento({ id: ID_OUTRO, nomePrimeiraPessoa: 'Carla', nomeSegundaPessoa: 'Diego', fase: 'Realizado', diasRestantes: -3, horario: null }),
  ]

  it('[COMPONENTE] lista eventos com nomes, data, fase e contagem', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))

    await abrir('/eventos')

    const texto = wrapper!.text()
    expect(wrapper!.get('h1').text()).toBe(TEXTOS_EVENTOS.listaTitulo)
    expect(texto).toContain('Ana Beatriz')
    expect(texto).toContain('15/05/2027, 16:30')
    expect(texto).toContain('Reta final')
    expect(texto).toContain('Faltam 42 dias')
    expect(texto).toContain('Realizado')
    expect(texto).toContain('Foi há 3 dias')
    expect(wrapper!.findAll('[data-teste="link-evento"]')[0]?.attributes('href')).toBe(`/eventos/${ID_EVENTO}`)
  })

  it('[COMPONENTE] busca por nome sem diferenciar acento e caixa', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    await wrapper!.get('[data-teste="busca-listagem"]').setValue('DIÉGO')
    await flushPromises()

    expect(wrapper!.text()).toContain('Carla')
    expect(wrapper!.text()).not.toContain('Ana Beatriz')
  })

  it('[INTEGRAÇÃO] alternar para Arquivados atualiza a URL e busca arquivados', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)),
      quando('GET', '/api/eventos?situacao=Arquivados', () => respostaJson([])),
    )
    const { montagem } = await abrir('/eventos')

    const opcao = wrapper!.findAll('[data-teste="filtro-situacao"] button').find((botao) => botao.text() === TEXTOS_EVENTOS.arquivados)
    await opcao!.trigger('click')
    await flushPromises()

    expect(montagem.roteador.currentRoute.value.query.situacao).toBe('arquivados')
    expect(chamadas(fetchSimulado, 'GET', '/api/eventos?situacao=Arquivados')).toHaveLength(1)
    expect(wrapper!.text()).toContain(TEXTOS_EVENTOS.vazioArquivadosTitulo)
  })

  it('[INTEGRAÇÃO] arquivar chama a API e tira a linha dos ativos', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)),
      quando('POST', `/api/eventos/${ID_EVENTO}/arquivar`, () => respostaJson(eventoCompleto({ arquivado: true }))),
    )
    await abrir('/eventos')

    const botao = wrapper!.findAll('[data-teste="arquivar-evento"]')[0]!
    expect(botao.attributes('aria-label')).toBe('Arquivar Ana Beatriz & Bruno')
    await botao.trigger('click')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', `/api/eventos/${ID_EVENTO}/arquivar`)).toHaveLength(1)
    expect(wrapper!.text()).not.toContain('Ana Beatriz')
    expect(wrapper!.text()).toContain('Carla')
  })

  it('[COMPONENTE] em Arquivados oferece Restaurar e não oferece Editar', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Arquivados', () => respostaJson([resumoEvento({ arquivado: true })])),
    )
    await abrir('/eventos?situacao=arquivados')

    expect(wrapper!.find('[data-teste="restaurar-evento"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="editar-evento"]').exists()).toBe(false)
    expect(wrapper!.text()).toContain(TEXTOS_EVENTOS.statusArquivado)
  })

  it('[COMPONENTE] falha ao carregar mostra erro com tentar novamente', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaProblema(500)))
    await abrir('/eventos')

    expect(wrapper!.get('[data-teste="estado-erro"]').text()).toContain(TEXTOS_EVENTOS.erroCarregarTexto)

    await wrapper!.get('[data-teste="tentar-novamente"]').trigger('click')
    await flushPromises()
    expect(chamadas(fetchSimulado, 'GET', '/api/eventos?situacao=Ativos')).toHaveLength(2)
  })

  it('[COMPONENTE] lista vazia de ativos convida a cadastrar', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([])))
    await abrir('/eventos')

    expect(wrapper!.text()).toContain(TEXTOS_EVENTOS.vazioAtivosTitulo)
  })
})

describe('EventoFormularioView', () => {
  it('[COMPONENTE] salvar vazio mostra erros sob os campos obrigatórios, foca o primeiro e não chama a API', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/eventos/novo')

    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()

    const erros = wrapper!.findAll('[data-teste="erro-campo"]').map((erro) => erro.text())
    expect(erros).toEqual(['Preencha este campo.', 'Preencha este campo.', 'Preencha este campo.'])
    expect(document.activeElement?.id).toBe('evento-nomePrimeiraPessoa')
    expect(chamadas(fetchSimulado, 'POST', '/api/eventos')).toHaveLength(0)
  })

  it('[INTEGRAÇÃO] cadastra enviando data como AAAA-MM-DD e abre a página do evento', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', '/api/eventos', () => respostaJson(eventoCompleto(), 201)),
      quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto())),
    )
    const { montagem } = await abrir('/eventos/novo')

    await wrapper!.get('#evento-nomePrimeiraPessoa').setValue('  Ana Beatriz ')
    await wrapper!.get('#evento-nomeSegundaPessoa').setValue('Bruno')
    await wrapper!.get('#evento-data').setValue('2027-05-15')
    await wrapper!.get('#evento-horario').setValue('16:30')
    await wrapper!.get('#evento-convidadosEstimados').setValue('150')
    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', '/api/eventos')
    expect(corpoDaChamada(chamada!)).toEqual({
      tipo: 'Casamento',
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
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('evento'))
    expect(montagem.roteador.currentRoute.value.params.id).toBe(ID_EVENTO)
  })

  it('[COMPONENTE] limites inválidos aparecem sob os campos', async () => {
    rotearFetch(fetchSimulado)
    await abrir('/eventos/novo')

    await wrapper!.get('#evento-nomePrimeiraPessoa').setValue('A')
    await wrapper!.get('#evento-nomeSegundaPessoa').setValue('Bruno')
    await wrapper!.get('#evento-data').setValue('1999-12-31')
    await wrapper!.get('#evento-convidadosEstimados').setValue('0')
    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()

    const erros = wrapper!.findAll('[data-teste="erro-campo"]').map((erro) => erro.text())
    expect(erros).toEqual(['Use entre 2 e 80 caracteres.', 'Informe uma data entre 2000 e 2100.', 'Informe um número entre 1 e 5.000.'])
  })

  it('[INTEGRAÇÃO] erro 400 da API é mostrado no campo correspondente', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', '/api/eventos', () =>
        respostaProblema(400, { errors: { NomeSegundaPessoa: ['Use entre 2 e 80 caracteres.'] } }),
      ),
    )
    await abrir('/eventos/novo')

    await wrapper!.get('#evento-nomePrimeiraPessoa').setValue('Ana')
    await wrapper!.get('#evento-nomeSegundaPessoa').setValue('Bruno')
    await wrapper!.get('#evento-data').setValue('2027-05-15')
    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('#evento-nomeSegundaPessoa-erro').text()).toBe('Use entre 2 e 80 caracteres.')
    expect(document.activeElement?.id).toBe('evento-nomeSegundaPessoa')
  })

  it('[INTEGRAÇÃO] editar carrega os dados e salva com PUT', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto())),
      quando('PUT', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto({ nomeSegundaPessoa: 'Bruna' }))),
    )
    const { montagem } = await abrir(`/eventos/${ID_EVENTO}/editar`)

    expect(wrapper!.get('h1').text()).toBe(TEXTOS_EVENTOS.tituloEdicao)
    expect((wrapper!.get('#evento-data').element as HTMLInputElement).value).toBe('2027-05-15')
    expect((wrapper!.get('#evento-observacoes').element as HTMLTextAreaElement).value).toBe('Flores brancas')

    await wrapper!.get('#evento-nomeSegundaPessoa').setValue('Bruna')
    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'PUT', `/api/eventos/${ID_EVENTO}`)
    expect(corpoDaChamada(chamada!)).toMatchObject({ nomeSegundaPessoa: 'Bruna', data: '2027-05-15', convidadosEstimados: 150 })
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('evento'))
  })

  it('[COMPONENTE] evento arquivado: aviso e salvar desabilitado', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto({ arquivado: true }))))
    await abrir(`/eventos/${ID_EVENTO}/editar`)

    expect(wrapper!.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_EVENTOS.avisoArquivado)
    expect(wrapper!.get('[data-teste="salvar-evento"]').attributes('disabled')).toBeDefined()
  })

  it('[INTEGRAÇÃO] 422 da API aparece como mensagem do formulário', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto())),
      quando('PUT', `/api/eventos/${ID_EVENTO}`, () => respostaProblema(422, { detail: TEXTOS_EVENTOS.avisoArquivado })),
    )
    await abrir(`/eventos/${ID_EVENTO}/editar`)

    await wrapper!.get('[data-teste="formulario-evento"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('[data-teste="erro-formulario"]').text()).toContain(TEXTOS_EVENTOS.avisoArquivado)
  })

  it('[SEGURANÇA] editar evento inexistente ou de outra assessoria mostra não encontrado sem formulário', async () => {
    rotearFetch(fetchSimulado)
    await abrir(`/eventos/${ID_OUTRO}/editar`)

    expect(wrapper!.text()).toContain(TEXTOS_EVENTOS.naoEncontradoTitulo)
    expect(wrapper!.find('[data-teste="formulario-evento"]').exists()).toBe(false)
  })
})

describe('EventoView', () => {
  it('[COMPONENTE] mostra nomes, fase, contagem em destaque e detalhes', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto())))
    await abrir(`/eventos/${ID_EVENTO}`)

    expect(wrapper!.get('h1').text()).toContain('Ana Beatriz')
    expect(wrapper!.get('h1 .nomes-anfitrioes__e').text()).toBe('&')
    expect(wrapper!.text()).toContain('Reta final')
    expect(wrapper!.get('.contagem__numero').text()).toBe('42')
    expect(wrapper!.text()).toContain('sábado, 15 de maio de 2027, 16:30')
    const valores = wrapper!.findAll('.lista-detalhes__valor').map((valor) => valor.text())
    expect(valores).toEqual(['15 de maio de 2027', '16:30', 'Capela São José', '—', '150', 'Flores brancas'])
    expect(document.title).toBe('Ana Beatriz & Bruno · Celebri')
    expect(wrapper!.find('[data-teste="editar-evento"]').exists()).toBe(true)
  })

  it('[INTEGRAÇÃO] arquivar mostra o aviso e troca a ação para Restaurar', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto())),
      quando('POST', `/api/eventos/${ID_EVENTO}/arquivar`, () =>
        respostaJson(eventoCompleto({ arquivado: true, arquivadoEm: '2026-09-28T13:00:00Z' })),
      ),
    )
    await abrir(`/eventos/${ID_EVENTO}`)

    await wrapper!.get('[data-teste="arquivar-evento"]').trigger('click')
    await flushPromises()

    expect(wrapper!.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_EVENTOS.avisoArquivado)
    expect(wrapper!.find('[data-teste="restaurar-evento"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="editar-evento"]').exists()).toBe(false)
  })

  it('[COMPONENTE] mostra o workspace do evento com nomes, data e grupos existentes, e o rail com Eventos ativo', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto())))
    await abrir(`/eventos/${ID_EVENTO}`)

    const navegacao = wrapper!.get('[data-teste="navegacao-evento"]')
    expect(navegacao.attributes('aria-label')).toBe('Módulos do evento')
    expect(navegacao.text()).toContain('Ana Beatriz')
    expect(navegacao.get('[data-teste="navegacao-evento-quando"]').text()).toBe('15 mai 2027 · faltam 42 dias')
    const grupos = navegacao.findAll('[data-teste="grupo-evento"]')
    expect(grupos.map((grupo) => grupo.find('span').text())).toEqual(['Planejar', 'Pessoas', 'Dinheiro & documentos', 'Execução'])
    const itens = navegacao.findAll('[data-teste="item-evento"]')
    expect(itens.map((item) => item.text())).toEqual(['Visão geral', 'Tarefas', 'Checklist', 'Cronograma', 'Fornecedores', 'Convidados', 'Confirmações', 'Restrições alimentares', 'Mesas', 'Financeiro', 'Grande Dia'])
    expect(itens[0]!.attributes('aria-current')).toBe('page')
    const eventos = wrapper!.findAll('[data-teste="item-menu"]').find((item) => item.text() === TEXTOS_EVENTOS.menu)
    expect(eventos!.attributes('aria-current')).toBe('page')
    expect(chamadas(fetchSimulado, 'GET', `/api/eventos/${ID_EVENTO}`)).toHaveLength(1)
  })

  it('[COMPONENTE] evento sem horário e sem local mostra os dados incompletos com o caminho para a edição', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto({ horario: null, localCerimonia: null }))))
    await abrir(`/eventos/${ID_EVENTO}`)

    const avisos = wrapper!.findAll('[data-teste="dados-incompletos"]')
    expect(avisos.map((aviso) => aviso.text())).toEqual([
      expect.stringContaining(VOCABULARIO_TIPO_EVENTO.Casamento.faltaHorario),
      expect.stringContaining(VOCABULARIO_TIPO_EVENTO.Casamento.faltaLocal),
    ])
    expect(avisos[0]!.get('a').attributes('href')).toBe(`/eventos/${ID_EVENTO}/editar`)
  })

  it('[COMPONENTE] evento arquivado não pede dados incompletos', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto({ horario: null, arquivado: true }))))
    await abrir(`/eventos/${ID_EVENTO}`)

    expect(wrapper!.find('[data-teste="dados-incompletos"]').exists()).toBe(false)
  })

  it('[INTEGRAÇÃO] arquivar oferece Desfazer no toast, que restaura o evento pela API existente', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto())),
      quando('POST', `/api/eventos/${ID_EVENTO}/arquivar`, () => respostaJson(eventoCompleto({ arquivado: true }))),
      quando('POST', `/api/eventos/${ID_EVENTO}/restaurar`, () => respostaJson(eventoCompleto())),
    )
    const RaizComFeedback = defineComponent({ render: () => h('div', [h(RouterView), h(ProvedorFeedback)]) })
    const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}`)
    wrapper = await montarView(RaizComFeedback, montagem)

    await wrapper.get('[data-teste="arquivar-evento"]').trigger('click')
    await flushPromises()

    const desfazer = document.body.querySelector<HTMLButtonElement>('[data-teste="toast-desfazer"]')
    expect(desfazer).not.toBeNull()
    expect(document.body.textContent).toContain(TEXTOS_EVENTOS.arquivado('Ana Beatriz & Bruno'))
    desfazer!.click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', `/api/eventos/${ID_EVENTO}/restaurar`)).toHaveLength(1)
    expect(wrapper.find('[data-teste="arquivar-evento"]').exists()).toBe(true)
    expect(document.body.textContent).toContain(TEXTOS_EVENTOS.restaurado('Ana Beatriz & Bruno'))
  })

  it('[SEGURANÇA] 404 mostra "Evento não encontrado" sem revelar dados e com volta para a lista', async () => {
    rotearFetch(fetchSimulado)
    await abrir(`/eventos/${ID_OUTRO}`)

    expect(wrapper!.text()).toContain(TEXTOS_EVENTOS.naoEncontradoTitulo)
    expect(wrapper!.find('[data-teste="tentar-novamente"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="voltar-eventos"]').attributes('href')).toBe('/eventos')
  })

  it('[SEGURANÇA] 403 informa falta de acesso sem tentar novamente', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaProblema(403)))
    await abrir(`/eventos/${ID_EVENTO}`)

    expect(wrapper!.text()).toContain(TEXTOS_EVENTOS.semAcesso)
    expect(wrapper!.find('[data-teste="tentar-novamente"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="estado-erro"]').attributes('data-variante')).toBe('semPermissao')
  })
})
