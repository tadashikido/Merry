import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import Button from 'primevue/button'
import Select from 'primevue/select'

import { aguardarRota, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_EVENTOS, resumoListaEventos } from '@/textos/eventos'
import { ID_EVENTO, ID_OUTRO, RaizRotas, chamadas, eventoCompleto, quando, resumoEvento, rotearFetch } from './auxiliaresEventos'

await precarregarRotas('eventos')

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

const lista = [
  resumoEvento(),
  resumoEvento({ id: ID_OUTRO, nomePrimeiraPessoa: 'Carla', nomeSegundaPessoa: 'Diego', fase: 'Realizado', diasRestantes: -3 }),
]

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
  return wrapper
}

async function abrirComRoteador(caminho: string) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  return { montagem, wrapper }
}

function resumo() {
  return wrapper!.find('[data-teste="resumo-eventos"]')
}

describe('resumoListaEventos', () => {
  it('[UNITÁRIO] concorda número e situação', () => {
    expect(resumoListaEventos(7, 7, 'Ativos')).toBe('7 eventos ativos')
    expect(resumoListaEventos(1, 1, 'Ativos')).toBe('1 evento ativo')
    expect(resumoListaEventos(3, 3, 'Arquivados')).toBe('3 eventos arquivados')
    expect(resumoListaEventos(1, 1, 'Arquivados')).toBe('1 evento arquivado')
  })

  it('[UNITÁRIO] com busca mostra exibidos de total', () => {
    expect(resumoListaEventos(2, 7, 'Ativos')).toBe('2 de 7 eventos ativos')
    expect(resumoListaEventos(0, 7, 'Arquivados')).toBe('0 de 7 eventos arquivados')
    expect(resumoListaEventos(1200, 1500, 'Ativos')).toBe('1.200 de 1.500 eventos ativos')
  })
})

describe('EventosView no design system Celebri', () => {
  it('[COMPONENTE] cabeçalho mostra o resumo da quantidade em região viva educada', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    expect(resumo().text()).toBe('2 eventos ativos')
    expect(resumo().attributes('aria-live')).toBe('polite')
    expect(resumo().classes()).toContain('texto-legenda')
    expect(wrapper!.get('header').find('[data-teste="resumo-eventos"]').exists()).toBe(true)
  })

  it('[COMPONENTE] busca atualiza o resumo para exibidos de total', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    await wrapper!.get('[data-teste="busca-listagem"]').setValue('diego')
    await flushPromises()

    expect(resumo().text()).toBe('1 de 2 eventos ativos')
  })

  it('[COMPONENTE] em Arquivados o resumo nomeia a situação no singular', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Arquivados', () => respostaJson([resumoEvento({ arquivado: true })])),
    )
    await abrir('/eventos?situacao=arquivados')

    expect(resumo().text()).toBe('1 evento arquivado')
  })

  it('[INTEGRAÇÃO] arquivar reduz o resumo junto com a lista', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)),
      quando('POST', `/api/eventos/${ID_EVENTO}/arquivar`, () => respostaJson(eventoCompleto({ arquivado: true }))),
    )
    await abrir('/eventos')

    await wrapper!.findAll('[data-teste="arquivar-evento"]')[0]!.trigger('click')
    await flushPromises()

    expect(resumo().text()).toBe('1 evento ativo')
  })

  it('[COMPONENTE] erro de serviço não mostra resumo', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaProblema(500)))
    await abrir('/eventos')

    expect(wrapper!.find('[data-teste="estado-erro"]').exists()).toBe(true)
    expect(resumo().exists()).toBe(false)
  })

  it('[COMPONENTE] lista vazia não mostra resumo', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([])))
    await abrir('/eventos')

    expect(wrapper!.text()).toContain(TEXTOS_EVENTOS.vazioAtivosTitulo)
    expect(resumo().exists()).toBe(false)
  })

  it('[SEGURANÇA] sem acesso à assessoria mostra a mensagem própria e nenhuma contagem', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaProblema(403)))
    await abrir('/eventos')

    expect(wrapper!.text()).toContain(TEXTOS_EVENTOS.semAcesso)
    expect(resumo().exists()).toBe(false)
  })

  it('[COMPONENTE] "Novo evento" é a única ação primária e as ações de linha são texto neutro', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    const botoes = wrapper!.findAllComponents(Button)
    const novo = botoes.find((botao) => botao.props('label') === TEXTOS_EVENTOS.novoEvento)!
    expect(novo.props('severity')).toBeNull()
    expect(novo.props('text')).toBe(false)
    expect(novo.props('outlined')).toBe(false)

    const deLinha = botoes.filter((botao) =>
      ([TEXTOS_EVENTOS.editar, TEXTOS_EVENTOS.arquivar] as string[]).includes(String(botao.props('label'))),
    )
    expect(deLinha.length).toBe(4)
    for (const botao of deLinha) {
      expect(botao.props('severity')).toBe('secondary')
      expect(botao.props('text')).toBe(true)
    }
  })

  it('[COMPONENTE] nomes dos anfitriões ficam dentro do link e a data mantém o horário', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    expect(wrapper!.findAll('[data-teste="link-evento"] .nomes-anfitrioes')).toHaveLength(2)
    expect(wrapper!.text()).toContain('15/05/2027, 16:30')
  })

  it('[COMPONENTE] coluna Evento reserva largura para nomes comuns sem anular a quebra de nomes longos', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    const cabecalhoEvento = wrapper!.findAll('th').find((th) => th.text().includes(TEXTOS_EVENTOS.colunaEvento))!
    expect(cabecalhoEvento.attributes('style')).toContain('width: 36%')
    expect(wrapper!.findAll('th').map((th) => th.text())).not.toContain('Tipo')
  })

  it('[UNITÁRIO] estilos da tela usam só tokens, sem largura própria, sombra ou valores soltos', () => {
    const fonte = readFileSync(resolve(__dirname, '../EventosView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style scoped>'))
    const semConsultas = estilo
      .split('\n')
      .filter((linha) => !linha.startsWith('@container'))
      .join('\n')

    expect(estilo).toContain('gap: var(--p-ritmo-campo)')
    expect(estilo).toContain('border-radius: var(--p-raio-campo)')
    expect(estilo).not.toContain('overflow-wrap')
    expect(semConsultas).not.toMatch(/\d+(px|rem|em)\b/)
    expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(semConsultas).not.toContain('max-width')
    expect(estilo).not.toContain('box-shadow')
    expect(estilo).not.toContain('--p-espaco-')
  })

  it('[UNITÁRIO] largura ajustada só pelo contêiner da lista, com colunas secundárias e rótulos de ação ocultos quando estreito', () => {
    const fonte = readFileSync(resolve(__dirname, '../EventosView.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style scoped>'))

    expect(estilo).not.toContain('@media')
    expect(estilo).toContain('container: eventos / inline-size')
    expect(estilo).not.toContain(':deep(')
    expect(fonte).toMatch(/<ListagemDados[^>]*ocultar-secundarias-abaixo="larga"[^>]*acoes-somente-icone-abaixo="larga"/)
    const estreito = estilo.slice(estilo.indexOf('@container listagem (max-width: 63.99rem)'))
    expect(estreito).toMatch(/^@container listagem \(max-width: 63\.99rem\) \{\s*\.listagem__tabela \.eventos__contagem-na-fase \{\s*display: block;/)
  })
})

describe('EventosView com tipos e fases', () => {
  const carteira = [
    resumoEvento({ id: 'e1', tipo: 'Casamento', fase: 'RetaFinal', convidadosEstimados: 150 }),
    resumoEvento({ id: 'e2', tipo: 'Casamento', nomePrimeiraPessoa: 'Carla', nomeSegundaPessoa: 'Diego', fase: 'Planejamento' }),
    resumoEvento({
      id: 'e3',
      tipo: 'QuinzeAnos',
      nomePrimeiraPessoa: 'Júlia',
      nomeSegundaPessoa: null,
      fase: 'RetaFinal',
      convidadosEstimados: null,
    }),
  ]

  function filtro(teste: 'filtro-tipo' | 'filtro-fase') {
    return wrapper!.findAllComponents(Select).find((select) => select.attributes('data-teste') === teste)!
  }

  function rotulosDe(teste: 'filtro-tipo' | 'filtro-fase') {
    return (filtro(teste).props('options') as { rotulo: string }[]).map((opcao) => opcao.rotulo)
  }

  async function escolher(teste: 'filtro-tipo' | 'filtro-fase', valor: string | null) {
    filtro(teste).vm.$emit('update:modelValue', valor)
    await flushPromises()
  }

  function nomesExibidos() {
    return wrapper!.findAll('[data-teste="link-evento"]').map((link) => link.text())
  }

  it('[COMPONENTE] cabeçalho mostra a composição da carteira por tipo pelo vocabulário', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(carteira)))
    await abrir('/eventos')

    expect(resumo().text()).toBe('3 eventos ativos')
    expect(wrapper!.get('header [data-teste="resumo-tipos"]').text()).toBe('2 casamentos e 1 festa de 15 anos')
  })

  it('[COMPONENTE] carteira de um tipo só não repete o total na composição', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    expect(resumo().text()).toBe('2 eventos ativos')
    expect(wrapper!.find('[data-teste="resumo-tipos"]').exists()).toBe(false)
  })

  it('[COMPONENTE] cada linha mostra o rótulo do seu tipo para os quatro tipos e os convidados estimados quando houver', async () => {
    const quatro = [
      resumoEvento({ id: 'c', tipo: 'Casamento', convidadosEstimados: 1 }),
      resumoEvento({ id: 'q', tipo: 'QuinzeAnos', nomeSegundaPessoa: null, convidadosEstimados: 1200 }),
      resumoEvento({ id: 'a', tipo: 'Aniversario', nomeSegundaPessoa: null, convidadosEstimados: null }),
      resumoEvento({ id: 'm', tipo: 'Comemoracao', nomeSegundaPessoa: null, convidadosEstimados: 80 }),
    ]
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(quatro)))
    await abrir('/eventos')

    expect(wrapper!.findAll('[data-teste="tipo-evento"]').map((tipo) => tipo.text())).toEqual([
      'Casamento',
      '15 anos',
      'Aniversário',
      'Comemoração',
    ])
    expect(wrapper!.findAll('[data-teste="convidados-estimados"]').map((item) => item.text())).toEqual([
      '1 convidado estimado',
      '1.200 convidados estimados',
      '80 convidados estimados',
    ])
    expect(wrapper!.get('header [data-teste="resumo-tipos"]').text()).toBe(
      '1 casamento, 1 festa de 15 anos, 1 aniversário e 1 comemoração',
    )
  })

  it('[COMPONENTE] opções dos filtros trazem a quantidade de cada tipo e fase presentes', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(carteira)))
    await abrir('/eventos')

    expect(rotulosDe('filtro-tipo')).toEqual([TEXTOS_EVENTOS.todosOsTipos, 'Casamento (2)', '15 anos (1)'])
    expect(rotulosDe('filtro-fase')).toEqual([TEXTOS_EVENTOS.todasAsFases, 'Planejamento (1)', 'Reta final (2)'])
    expect(filtro('filtro-tipo').get('[role="combobox"]').attributes('aria-label')).toBe(TEXTOS_EVENTOS.filtroTipo)
    expect(filtro('filtro-fase').get('[role="combobox"]').attributes('aria-label')).toBe(TEXTOS_EVENTOS.filtroFase)
  })

  it('[INTEGRAÇÃO] filtrar por tipo e por fase combina com a busca e atualiza o resumo sem nova requisição', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(carteira)))
    await abrir('/eventos')
    const requisicoes = chamadas(fetchSimulado, 'GET', '/api/eventos?situacao=Ativos').length

    await escolher('filtro-tipo', 'QuinzeAnos')
    expect(nomesExibidos()).toEqual(['Júlia'])
    expect(resumo().text()).toBe('1 de 3 eventos ativos')

    await escolher('filtro-tipo', null)
    await escolher('filtro-fase', 'RetaFinal')
    expect(nomesExibidos()).toHaveLength(2)
    expect(resumo().text()).toBe('2 de 3 eventos ativos')

    await wrapper!.get('[data-teste="busca-listagem"]').setValue('júlia')
    await flushPromises()
    expect(nomesExibidos()).toEqual(['Júlia'])
    expect(chamadas(fetchSimulado, 'GET', '/api/eventos?situacao=Ativos')).toHaveLength(requisicoes)
  })

  it('[COMPONENTE] filtro sem correspondência oferece limpar filtros, que zera tipo, fase e busca', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(carteira)))
    await abrir('/eventos')

    await escolher('filtro-tipo', 'QuinzeAnos')
    await escolher('filtro-fase', 'Planejamento')
    expect(nomesExibidos()).toEqual([])
    expect(wrapper!.text()).toContain('Nenhum resultado para essa busca')

    await wrapper!.get('[data-teste="limpar-filtros"]').trigger('click')
    await flushPromises()

    expect(nomesExibidos()).toHaveLength(3)
    expect(filtro('filtro-tipo').props('modelValue')).toBeNull()
    expect(filtro('filtro-fase').props('modelValue')).toBeNull()
    expect(resumo().text()).toBe('3 eventos ativos')
  })

  it('[COMPONENTE] tabela traz a contagem também na célula da fase para a largura estreita', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson(lista)))
    await abrir('/eventos')

    expect(wrapper!.findAll('[data-teste="contagem-na-fase"]').map((item) => item.text())).toEqual([
      'Faltam 42 dias',
      'Foi há 3 dias',
    ])
  })

  it('[COMPONENTE] estado vazio de ativos cita os tipos de evento que dá para cadastrar', async () => {
    rotearFetch(fetchSimulado, quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([])))
    await abrir('/eventos')

    expect(TEXTOS_EVENTOS.vazioAtivosTexto).toBe(
      'Casamentos, festas de 15 anos, aniversários e comemorações: cadastre o primeiro evento para organizar datas, convidados e pagamentos.',
    )
    expect(wrapper!.text()).toContain(TEXTOS_EVENTOS.vazioAtivosTexto)
    expect(wrapper!.find('[data-teste="resumo-tipos"]').exists()).toBe(false)
  })

  it('[INTEGRAÇÃO] ao voltar de Arquivados, a recarga dos ativos não mostra composição nem contagens antigas e trava os filtros', async () => {
    let liberarAtivos: (resposta: Response) => void = () => undefined
    let pedidosAtivos = 0
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Arquivados', () =>
        respostaJson([
          resumoEvento({ id: 'x1', tipo: 'Aniversario', arquivado: true }),
          resumoEvento({ id: 'x2', tipo: 'Comemoracao', arquivado: true }),
        ]),
      ),
    )
    const roteadoPadrao = fetchSimulado.getMockImplementation()!
    fetchSimulado.mockImplementation(async (entrada, init) => {
      if (String(entrada) === '/api/eventos?situacao=Ativos') {
        pedidosAtivos += 1
        return new Promise<Response>((resolver) => {
          liberarAtivos = resolver
        })
      }
      return roteadoPadrao(entrada, init)
    })
    const { montagem } = await abrirComRoteador('/eventos?situacao=arquivados')
    expect(wrapper!.get('[data-teste="resumo-tipos"]').text()).toBe('1 aniversário e 1 comemoração')

    await montagem.roteador.replace({ name: 'eventos' })
    await aguardarRota(montagem.roteador, 'eventos')
    await flushPromises()

    expect(pedidosAtivos).toBe(1)
    expect(wrapper!.find('[data-teste="resumo-tipos"]').exists()).toBe(false)
    expect(resumo().exists()).toBe(false)
    expect(rotulosDe('filtro-tipo')).toEqual([TEXTOS_EVENTOS.todosOsTipos])
    expect(filtro('filtro-tipo').props('disabled')).toBe(true)
    expect(filtro('filtro-fase').props('disabled')).toBe(true)

    liberarAtivos(respostaJson(carteira))
    await flushPromises()

    expect(wrapper!.get('[data-teste="resumo-tipos"]').text()).toBe('2 casamentos e 1 festa de 15 anos')
    expect(filtro('filtro-tipo').props('disabled')).toBe(false)
  })
})
