import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import { TEXTOS_DUPLICACAO_EVENTO } from '@/textos/duplicacaoEvento'
import type { SessaoDto } from '@/tipos/api'
import type { PreviaDuplicacaoDto } from '@/tipos/duplicacaoEvento'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, resumoEvento, rotearFetch, type Rota } from './auxiliaresEventos'

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ID_NOVO = '33333333-3333-4333-8333-333333333333'
const ROTA_DUPLICACAO = `/api/eventos/${ID_EVENTO}/duplicacao`
const ROTA_PREVIA = `${ROTA_DUPLICACAO}/previa`
const CAMINHO_TELA = `/eventos/novo/a-partir-de-outro?origem=${ID_EVENTO}`

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

function previa(dados: Partial<PreviaDuplicacaoDto> = {}): PreviaDuplicacaoDto {
  return {
    origem: resumoEvento({ nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'João' }),
    tarefas: 29,
    tarefasDoChecklist: 26,
    tarefasNascemAtrasadas: 0,
    tarefasCanceladasIgnoradas: 1,
    fornecedores: 3,
    fornecedoresIgnorados: 1,
    itensCronograma: 0,
    ...dados,
  }
}

function previaPorData(porData: (data: string | null) => Response): Rota {
  return (url, init) => {
    if ((init?.method ?? 'GET') !== 'GET' || !url.startsWith(ROTA_PREVIA)) {
      return undefined
    }
    const data = new URL(url, 'http://local').searchParams.get('data')
    return porData(data)
  }
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

async function abrir(caminho = CAMINHO_TELA) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return montagem
}

async function preencher(dados: { primeiro?: string; segundo?: string; data?: string } = {}) {
  await wrapper!.get('#duplicacao-nomePrimeiraPessoa').setValue(dados.primeiro ?? 'Carla')
  await wrapper!.get('#duplicacao-nomeSegundaPessoa').setValue(dados.segundo ?? 'Diego')
  await wrapper!.get('#duplicacao-data').setValue(dados.data ?? '2028-05-13')
}

describe('Duplicar evento', () => {
  it('[COMPONENTE] mostra a origem, o que vai e o que fica, e cria o evento novo', async () => {
    rotearFetch(
      fetchSimulado,
      previaPorData(() => respostaJson(previa({ itensCronograma: 7 }))),
      quando('POST', ROTA_DUPLICACAO, () =>
        respostaJson({ evento: eventoCompleto({ id: ID_NOVO, nomePrimeiraPessoa: 'Carla', nomeSegundaPessoa: 'Diego' }), tarefasCopiadas: 29, fornecedoresCopiados: 3, itensCronogramaCopiados: 7 }, 201),
      ),
    )

    const montagem = await abrir()

    expect(wrapper!.get('[data-teste="resumo-origem"]').text()).toContain('Ana')
    expect(wrapper!.find('[data-teste="trocar-origem"]').exists()).toBe(false)
    const numeros = wrapper!.findAll('[data-teste="opcao-copia-quantidade"]').map((numero) => numero.text())
    expect(numeros).toEqual(['29', '3', '7'])
    expect(wrapper!.get('[data-teste="opcao-cronograma"]').text()).toContain(TEXTOS_DUPLICACAO_EVENTO.opcaoCronogramaDetalhe)
    expect(wrapper!.text()).toContain('26 do checklist')
    expect(wrapper!.text()).toContain(TEXTOS_DUPLICACAO_EVENTO.tarefasCanceladas(1))
    expect(wrapper!.text()).toContain(TEXTOS_DUPLICACAO_EVENTO.fornecedoresIgnorados(1))
    const fica = wrapper!.get('[data-teste="lista-nao-copiado"]').text()
    expect(fica).toContain('Fica com Ana & João')
    for (const item of TEXTOS_DUPLICACAO_EVENTO.ficaItens) {
      expect(fica).toContain(item)
    }
    expect(document.activeElement?.id).toBe('duplicacao-nomePrimeiraPessoa')

    await preencher()
    await wrapper!.get('[data-teste="formulario-duplicacao"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', ROTA_DUPLICACAO)
    expect(corpoDaChamada(chamada!)).toEqual({
      nomePrimeiraPessoa: 'Carla',
      nomeSegundaPessoa: 'Diego',
      data: '2028-05-13',
      horario: null,
      localCerimonia: null,
      localRecepcao: null,
      copiarTarefas: true,
      copiarFornecedores: true,
      copiarCronograma: true,
    })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Evento criado com 29 tarefas, 3 fornecedores e 7 itens do cronograma.')
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('evento'))
    expect(montagem.roteador.currentRoute.value.params.id).toBe(ID_NOVO)
  })

  it('[COMPONENTE] cronograma do dia pode ser desmarcado e avisa que vai sem fornecedor quando fornecedores fica de fora', async () => {
    rotearFetch(
      fetchSimulado,
      previaPorData(() => respostaJson(previa({ itensCronograma: 7 }))),
      quando('POST', ROTA_DUPLICACAO, () =>
        respostaJson({ evento: eventoCompleto({ id: ID_NOVO }), tarefasCopiadas: 29, fornecedoresCopiados: 0, itensCronogramaCopiados: 7 }, 201),
      ),
    )

    await abrir()
    await wrapper!.get('#duplicacao-copiarFornecedores').setValue(false)

    expect(wrapper!.get('[data-teste="opcao-cronograma"]').text()).toContain(TEXTOS_DUPLICACAO_EVENTO.cronogramaSemFornecedores)
    expect(wrapper!.get('[data-teste="resumo-previa"]').text()).toContain('7 itens do cronograma')

    await preencher()
    await wrapper!.get('[data-teste="formulario-duplicacao"]').trigger('submit')
    await flushPromises()

    expect(corpoDaChamada(chamadas(fetchSimulado, 'POST', ROTA_DUPLICACAO)[0]!)).toMatchObject({ copiarFornecedores: false, copiarCronograma: true })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Evento criado com 29 tarefas e 7 itens do cronograma.')
  })

  it('[COMPONENTE] origem sem cronograma desabilita a opção e não pede cópia', async () => {
    rotearFetch(
      fetchSimulado,
      previaPorData(() => respostaJson(previa({ itensCronograma: 0 }))),
      quando('POST', ROTA_DUPLICACAO, () =>
        respostaJson({ evento: eventoCompleto({ id: ID_NOVO }), tarefasCopiadas: 29, fornecedoresCopiados: 3, itensCronogramaCopiados: 0 }, 201),
      ),
    )

    await abrir()

    expect(wrapper!.get('#duplicacao-copiarCronograma').attributes('disabled')).toBeDefined()
    expect(wrapper!.get('[data-teste="opcao-cronograma"]').text()).toContain(TEXTOS_DUPLICACAO_EVENTO.opcaoCronogramaVazia)

    await preencher()
    await wrapper!.get('[data-teste="formulario-duplicacao"]').trigger('submit')
    await flushPromises()

    expect(corpoDaChamada(chamadas(fetchSimulado, 'POST', ROTA_DUPLICACAO)[0]!)).toMatchObject({ copiarCronograma: false })
  })

  it('[COMPONENTE] recalcula a prévia ao informar a data e avisa tarefas atrasadas', async () => {
    rotearFetch(
      fetchSimulado,
      previaPorData((data) => respostaJson(previa({ tarefasNascemAtrasadas: data === '2026-10-20' ? 4 : 0 }))),
    )

    await abrir()
    expect(wrapper!.get('[data-teste="aviso-previa"]').text()).toBe(TEXTOS_DUPLICACAO_EVENTO.semData)

    await wrapper!.get('#duplicacao-data').setValue('2026-10-20')

    await vi.waitFor(() => expect(wrapper!.find('[data-teste="aviso-previa"]').text()).toBe(TEXTOS_DUPLICACAO_EVENTO.nascemAtrasadas(4)))
    const urls = fetchSimulado.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith(ROTA_PREVIA))
    expect(urls).toEqual([ROTA_PREVIA, `${ROTA_PREVIA}?data=2026-10-20`])
    const anuncio = wrapper!.get('[data-teste="resumo-previa"]')
    expect(anuncio.attributes('aria-live')).toBe('polite')
    expect(anuncio.text()).toBe('29 tarefas e 3 fornecedores vão para o evento novo. 4 tarefas nascem atrasadas pela nova data.')
  })

  it('[COMPONENTE] desmarcar fornecedores envia a escolha e o toast diz só o que foi criado', async () => {
    rotearFetch(
      fetchSimulado,
      previaPorData(() => respostaJson(previa())),
      quando('POST', ROTA_DUPLICACAO, () => respostaJson({ evento: eventoCompleto({ id: ID_NOVO }), tarefasCopiadas: 29, fornecedoresCopiados: 0 }, 201)),
    )

    await abrir()
    await wrapper!.get('#duplicacao-copiarFornecedores').setValue(false)
    await preencher()

    expect(wrapper!.get('[data-teste="resumo-previa"]').text()).toBe('29 tarefas vão para o evento novo.')
    await wrapper!.get('[data-teste="formulario-duplicacao"]').trigger('submit')
    await flushPromises()

    const [chamada] = chamadas(fetchSimulado, 'POST', ROTA_DUPLICACAO)
    expect(corpoDaChamada(chamada!)).toMatchObject({ copiarTarefas: true, copiarFornecedores: false })
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Evento criado com 29 tarefas.')
  })

  it('[COMPONENTE] origem sem tarefas desabilita a opção e não pede para copiar', async () => {
    rotearFetch(
      fetchSimulado,
      previaPorData(() => respostaJson(previa({ tarefas: 0, tarefasDoChecklist: 0, tarefasCanceladasIgnoradas: 0 }))),
      quando('POST', ROTA_DUPLICACAO, () => respostaJson({ evento: eventoCompleto({ id: ID_NOVO }), tarefasCopiadas: 0, fornecedoresCopiados: 3 }, 201)),
    )

    await abrir()

    const tarefas = wrapper!.get('#duplicacao-copiarTarefas')
    expect(tarefas.attributes('disabled')).toBeDefined()
    expect(wrapper!.text()).toContain(TEXTOS_DUPLICACAO_EVENTO.opcaoTarefasVazia)
    await preencher()
    await wrapper!.get('[data-teste="formulario-duplicacao"]').trigger('submit')
    await flushPromises()
    expect(corpoDaChamada(chamadas(fetchSimulado, 'POST', ROTA_DUPLICACAO)[0]!)).toMatchObject({ copiarTarefas: false, copiarFornecedores: true })
  })

  it('[COMPONENTE] valida os campos obrigatórios antes de enviar e foca o primeiro inválido', async () => {
    rotearFetch(fetchSimulado, previaPorData(() => respostaJson(previa())))

    await abrir()
    await wrapper!.get('[data-teste="formulario-duplicacao"]').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_DUPLICACAO)).toHaveLength(0)
    expect(wrapper!.text()).toContain('Preencha este campo')
    expect(document.activeElement?.id).toBe('duplicacao-nomePrimeiraPessoa')
  })

  it('[COMPONENTE] mostra os erros de campo devolvidos pelo servidor', async () => {
    rotearFetch(
      fetchSimulado,
      previaPorData(() => respostaJson(previa())),
      quando('POST', ROTA_DUPLICACAO, () => respostaProblema(400, { errors: { Horario: ['Informe o horário no formato 24 h, como 16:30.'] } })),
    )

    await abrir()
    await preencher()
    await wrapper!.get('[data-teste="formulario-duplicacao"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.text()).toContain('Informe o horário no formato 24 h, como 16:30.')
    expect(document.activeElement?.id).toBe('duplicacao-horario')
    expect(notificacoes.sucesso).not.toHaveBeenCalled()
  })

  it('[COMPONENTE] falha de rede ao criar mantém os dados e avisa por toast', async () => {
    rotearFetch(fetchSimulado, previaPorData(() => respostaJson(previa())), (url, init) => {
      if (url === ROTA_DUPLICACAO && init?.method === 'POST') {
        throw new TypeError('Failed to fetch')
      }
      return undefined
    })

    const montagem = await abrir()
    await preencher()
    await wrapper!.get('[data-teste="formulario-duplicacao"]').trigger('submit')
    await flushPromises()

    expect(notificacoes.erro).toHaveBeenCalled()
    expect((wrapper!.get('#duplicacao-nomePrimeiraPessoa').element as HTMLInputElement).value).toBe('Carla')
    expect(montagem.roteador.currentRoute.value.name).toBe('evento-duplicar')
  })

  it('[SEGURANÇA] origem de outra organização aparece como evento não encontrado', async () => {
    rotearFetch(fetchSimulado, previaPorData(() => respostaProblema(404, { title: 'Recurso não encontrado.' })))

    await abrir()

    expect(wrapper!.text()).toContain(TEXTOS_EVENTOS.naoEncontradoTitulo)
    expect(wrapper!.find('[data-teste="formulario-duplicacao"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] 403 mostra o estado sem permissão', async () => {
    rotearFetch(fetchSimulado, previaPorData(() => respostaProblema(403)))

    await abrir()

    expect(wrapper!.text()).toContain(TEXTOS_DUPLICACAO_EVENTO.semPermissao)
    expect(wrapper!.find('[data-teste="formulario-duplicacao"]').exists()).toBe(false)
  })

  it('[COMPONENTE] falha ao recalcular a prévia não bloqueia a criação', async () => {
    let chamadasPrevia = 0
    rotearFetch(
      fetchSimulado,
      previaPorData(() => {
        chamadasPrevia++
        return chamadasPrevia === 1 ? respostaJson(previa()) : respostaProblema(500)
      }),
    )

    await abrir()
    await wrapper!.get('#duplicacao-data').setValue('2028-05-13')

    await vi.waitFor(() => expect(wrapper!.find('[data-teste="erro-previa"]').exists()).toBe(true))
    expect(wrapper!.find('[data-teste="formulario-duplicacao"]').exists()).toBe(true)
    expect(wrapper!.get('[data-teste="criar-evento"]').attributes('disabled')).toBeUndefined()
  })

  it('[COMPONENTE] sem origem mostra o seletor e, sem eventos, o estado vazio', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([])),
      quando('GET', '/api/eventos?situacao=Arquivados', () => respostaJson([])),
    )

    await abrir('/eventos/novo/a-partir-de-outro')

    expect(wrapper!.text()).toContain(TEXTOS_DUPLICACAO_EVENTO.vazioTitulo)
    expect(wrapper!.find('[data-teste="vazio-novo-evento"]').exists()).toBe(true)
  })

  it('[COMPONENTE] sem origem com eventos mostra o seletor e exige a escolha', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([resumoEvento()])),
      quando('GET', '/api/eventos?situacao=Arquivados', () => respostaJson([])),
    )

    await abrir('/eventos/novo/a-partir-de-outro')
    expect(wrapper!.find('[data-teste="campo-origem"]').exists()).toBe(true)
    await preencher()
    await wrapper!.get('[data-teste="formulario-duplicacao"]').trigger('submit')
    await flushPromises()

    expect(wrapper!.text()).toContain(TEXTOS_DUPLICACAO_EVENTO.origemObrigatoria)
    expect(chamadas(fetchSimulado, 'POST', ROTA_DUPLICACAO)).toHaveLength(0)
  })
})

describe('Entradas da duplicação', () => {
  it('[COMPONENTE] a página do evento oferece Duplicar e leva à tela com a origem', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto())), previaPorData(() => respostaJson(previa())))

    const montagem = await abrir(`/eventos/${ID_EVENTO}`)
    const botao = wrapper!.get('[data-teste="duplicar-evento"]')
    expect(botao.attributes('aria-label')).toBe('Duplicar Ana Beatriz & Bruno')
    await botao.trigger('click')
    await flushPromises()

    expect(montagem.roteador.currentRoute.value.name).toBe('evento-duplicar')
    expect(montagem.roteador.currentRoute.value.query.origem).toBe(ID_EVENTO)
  })

  it('[COMPONENTE] evento arquivado também pode ser duplicado', async () => {
    rotearFetch(fetchSimulado, quando('GET', `/api/eventos/${ID_EVENTO}`, () => respostaJson(eventoCompleto({ arquivado: true, arquivadoEm: '2026-09-29T12:00:00Z' }))))

    await abrir(`/eventos/${ID_EVENTO}`)

    expect(wrapper!.find('[data-teste="duplicar-evento"]').exists()).toBe(true)
  })

  it('[COMPONENTE] Novo evento oferece começar a partir de outro evento', async () => {
    rotearFetch(fetchSimulado)

    await abrir('/eventos/novo')

    const link = wrapper!.get('[data-teste="a-partir-de-outro"]')
    expect(link.text()).toBe(TEXTOS_DUPLICACAO_EVENTO.acaoAPartirDeOutro)
    expect(link.attributes('href')).toBe('/eventos/novo/a-partir-de-outro')
  })

  it('[SEGURANÇA] os anfitriões não veem Duplicar e são levados ao próprio evento ao abrir a tela', async () => {
    fetchSimulado.mockImplementation(async (entrada) => {
      const url = String(entrada)
      if (url === '/api/autenticacao/renovar') {
        return respostaJson(SESSAO_ANFITRIAO)
      }
      if (url === `/api/eventos/${ID_EVENTO}`) {
        return respostaJson(eventoCompleto({ observacoes: null }))
      }
      return respostaProblema(404, { title: 'Recurso não encontrado.' })
    })

    const montagem = await abrir(CAMINHO_TELA)

    expect(montagem.roteador.currentRoute.value.name).toBe('evento')
    expect(wrapper!.find('[data-teste="duplicar-evento"]').exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', ROTA_PREVIA)).toHaveLength(0)
  })
})
