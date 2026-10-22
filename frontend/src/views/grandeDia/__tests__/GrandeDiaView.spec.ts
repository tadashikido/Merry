import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'

import { SESSAO_EXEMPLO, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { grandeDia, itemGrandeDia } from '@/__tests__/auxiliaresGrandeDia'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'
import type { SessaoDto } from '@/tipos/api'
import type { GrandeDiaDto } from '@/tipos/grandeDia'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_GRANDE_DIA = `${ROTA_EVENTO}/grande-dia`
const CAMINHO = `/eventos/${ID_EVENTO}/grande-dia`

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

async function abrir(sessao: SessaoDto, resposta: () => Response, ...extras: Rota[]) {
  rotear(
    fetchSimulado,
    sessao,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
    quando('GET', ROTA_GRANDE_DIA, resposta),
    ...extras,
  )
  const montagem = await prepararAplicacao(CAMINHO)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return montagem
}

function texto(seletor: string): string {
  return wrapper!.get(seletor).text()
}

describe('GrandeDiaView — assessoria no dia', { timeout: 20_000 }, () => {
  it('[COMPONENTE] mostra relógio ao vivo, Agora com contatos, Próximo, Depois, sem marcar, feitos e a ação no rodapé', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(grandeDia()))

    expect(wrapper!.find('.tema-operacao').exists()).toBe(true)
    expect(wrapper!.get('h1').text()).toContain('Luísa')
    expect(texto('[data-teste="relogio-operacao-hora"]')).toBe('16:34')
    expect(texto('[data-teste="relogio-operacao-selo"]')).toBe(TEXTOS_GRANDE_DIA.aoVivo)
    expect(texto('[data-teste="cartao-agora-atividade"]')).toBe('Cerimônia')
    expect(texto('[data-teste="cartao-agora"]')).toContain('Desde 16:30 · até 17:15')
    expect(wrapper!.get('[data-teste="contato-ligar"]').attributes('href')).toBe('tel:11987654321')
    expect(wrapper!.get('[data-teste="contato-whatsapp"]').attributes('href')).toBe('https://wa.me/5511987654321')
    expect(texto('[data-teste="painel-tambem-agora"]')).toContain('Maquiagem')
    expect(texto('[data-teste="linha-proximo"]')).toContain('Fotos com a família')
    expect(texto('[data-teste="linha-proximo-quando"]')).toContain('em 41 min')
    expect(texto('[data-teste="painel-depois"]')).toContain('Recepção')
    expect(texto('[data-teste="grande-dia-sem-marcar"]')).toContain('Ficou sem marcar (1)')
    expect(texto('[data-teste="grande-dia-feitos"]')).toContain('Feitos (1)')
    expect(texto('[data-teste="grande-dia-feitos"]')).toContain('Feito às 13:20')
    expect(wrapper!.get('[data-teste="grande-dia-marcar-feito"]').attributes('aria-label')).toBe('Marcar “Cerimônia” como feito')
    expect(wrapper!.find('.barra-acao-fixa--operacao').exists()).toBe(true)
    expect(texto('[data-teste="grande-dia-atualizado"]')).toMatch(/^Atualizado às \d{2}:\d{2}$/)
    const itemMenu = wrapper!.findAll('[data-teste="item-evento"]').find((item) => item.text() === 'Grande Dia')
    expect(itemMenu?.attributes('aria-current')).toBe('page')
    expect(document.title).toBe('Grande Dia · Luísa & Pedro')
  })

  it('[COMPONENTE] marca o item atual como feito com um toque e desfaz pelo toast', async () => {
    const feito = grandeDia({ itens: [itemGrandeDia({ id: 'c', status: 'Concluido', situacao: 'Feito', concluidoEm: '2027-05-15T19:35:00Z' })] })
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(grandeDia()),
      quando('PUT', `${ROTA_GRANDE_DIA}/itens/c/conclusao`, () => respostaJson(feito)),
      quando('DELETE', `${ROTA_GRANDE_DIA}/itens/c/conclusao`, () => respostaJson(grandeDia())),
    )

    await wrapper!.get('[data-teste="grande-dia-marcar-feito"]').trigger('click')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'PUT', `${ROTA_GRANDE_DIA}/itens/c/conclusao`)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Cerimônia marcada como feita.', expect.objectContaining({ desfazer: expect.any(Function) }))
    expect(wrapper!.find('[data-teste="cartao-agora"]').exists()).toBe(false)
    expect(document.activeElement?.id).toBe('grande-dia-agora')

    const { desfazer } = notificacoes.sucesso.mock.calls[0]![1] as { desfazer: () => Promise<void> }
    await desfazer()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_GRANDE_DIA}/itens/c/conclusao`)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenLastCalledWith('Cerimônia voltou para o roteiro.')
    expect(texto('[data-teste="cartao-agora-atividade"]')).toBe('Cerimônia')
  })

  it('[COMPONENTE] marca item paralelo e item que ficou sem marcar; reabre pelos feitos', async () => {
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(grandeDia()),
      quando('PUT', `${ROTA_GRANDE_DIA}/itens/mk/conclusao`, () => respostaJson(grandeDia())),
      quando('PUT', `${ROTA_GRANDE_DIA}/itens/m/conclusao`, () => respostaJson(grandeDia())),
      quando('DELETE', `${ROTA_GRANDE_DIA}/itens/b/conclusao`, () => respostaJson(grandeDia())),
    )

    await wrapper!.get('[data-teste="grande-dia-feito-paralelo"]').trigger('click')
    await flushPromises()
    await wrapper!.get('[data-teste="grande-dia-feito-pendente"]').trigger('click')
    await flushPromises()
    await wrapper!.get('[data-teste="grande-dia-reabrir"]').trigger('click')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'PUT', `${ROTA_GRANDE_DIA}/itens/mk/conclusao`)).toHaveLength(1)
    expect(chamadas(fetchSimulado, 'PUT', `${ROTA_GRANDE_DIA}/itens/m/conclusao`)).toHaveLength(1)
    expect(chamadas(fetchSimulado, 'DELETE', `${ROTA_GRANDE_DIA}/itens/b/conclusao`)).toHaveLength(1)
    expect(notificacoes.sucesso).toHaveBeenCalledWith('Buquê voltou para o roteiro.')
  })

  it('[COMPONENTE] conflito de outro aparelho mostra mensagem amigável e recarrega', async () => {
    await abrir(
      SESSAO_EXEMPLO,
      () => respostaJson(grandeDia()),
      quando('PUT', `${ROTA_GRANDE_DIA}/itens/c/conclusao`, () => respostaProblema(409, { title: 'Conflito' })),
    )

    await wrapper!.get('[data-teste="grande-dia-marcar-feito"]').trigger('click')
    await flushPromises()

    expect(notificacoes.erro).toHaveBeenCalledWith(TEXTOS_GRANDE_DIA.conflito)
    expect(chamadas(fetchSimulado, 'GET', ROTA_GRANDE_DIA).length).toBeGreaterThanOrEqual(2)
  })

  it('[COMPONENTE] falha de rede ao marcar avisa sem perder a tela', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(grandeDia()), (url, init) => {
      if (init?.method === 'PUT' && url.endsWith('/conclusao')) {
        throw new TypeError('Failed to fetch')
      }
      return undefined
    })

    await wrapper!.get('[data-teste="grande-dia-marcar-feito"]').trigger('click')
    await flushPromises()

    expect(notificacoes.erro).toHaveBeenCalledWith(TEXTOS_GRANDE_DIA.erroAcao)
    expect(texto('[data-teste="cartao-agora-atividade"]')).toBe('Cerimônia')
  })

  it('[COMPONENTE] Atualizar busca de novo e sem rede mantém a última versão com a faixa', async () => {
    let falhar = false
    await abrir(SESSAO_EXEMPLO, () => {
      if (falhar) {
        throw new TypeError('Failed to fetch')
      }
      return respostaJson(grandeDia())
    })

    falhar = true
    await wrapper!.get('[data-teste="grande-dia-atualizar"]').trigger('click')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'GET', ROTA_GRANDE_DIA)).toHaveLength(2)
    expect(texto('[data-teste="grande-dia-sem-conexao"]')).toMatch(/^Sem conexão\. Mostrando a versão das \d{2}:\d{2}\.$/)
    expect(texto('[data-teste="cartao-agora-atividade"]')).toBe('Cerimônia')
  })

  it('[COMPONENTE] volta ao primeiro plano atualiza a tela', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(grandeDia()))

    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()

    expect(chamadas(fetchSimulado, 'GET', ROTA_GRANDE_DIA)).toHaveLength(2)
  })
})

describe('GrandeDiaView — leitura, fases e estados', { timeout: 20_000 }, () => {
  it('[SEGURANÇA] anfitriões veem Agora e contatos, sem nenhuma ação de marcar ou reabrir', async () => {
    await abrir(SESSAO_ANFITRIAO, () => respostaJson(grandeDia({ somenteLeitura: true })))

    expect(texto('[data-teste="cartao-agora-atividade"]')).toBe('Cerimônia')
    expect(wrapper!.find('[data-teste="contato-ligar"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="grande-dia-marcar-feito"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="grande-dia-feito-paralelo"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="grande-dia-feito-pendente"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="grande-dia-reabrir"]').exists()).toBe(false)
  })

  it('[COMPONENTE] antes do dia mostra a fase, os dias que faltam e o roteiro em leitura', async () => {
    const antes: GrandeDiaDto = grandeDia({
      momento: { agora: '2027-05-03T10:12:00', fase: 'AntesDoDia', diasParaOEvento: 12 },
      itens: [
        itemGrandeDia({ id: 'e', dia: 'Vespera', data: '2027-05-14', inicio: '19:00', atividade: 'Ensaio', situacao: 'Depois' }),
        itemGrandeDia({ id: 'c', situacao: 'Depois' }),
      ],
    })
    await abrir(SESSAO_EXEMPLO, () => respostaJson(antes))

    expect(texto('[data-teste="relogio-operacao-selo"]')).toBe('Faltam 12 dias')
    expect(texto('[data-teste="faixa-fase-dia-titulo"]')).toBe(TEXTOS_GRANDE_DIA.antesTitulo)
    expect(wrapper!.find('[data-teste="grande-dia-roteiro-Vespera"]').exists()).toBe(true)
    expect(wrapper!.findAll('[data-teste="item-roteiro"]')).toHaveLength(2)
    expect(wrapper!.find('[data-teste="cartao-agora"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="grande-dia-marcar-feito"]').exists()).toBe(false)
  })

  it('[COMPONENTE] depois do dia mostra que já passou e os feitos', async () => {
    const depois = grandeDia({
      momento: { agora: '2027-05-18T09:00:00', fase: 'DepoisDoDia', diasParaOEvento: -3 },
      itens: [itemGrandeDia({ status: 'Concluido', situacao: 'Feito', concluidoEm: '2027-05-15T20:00:00Z' })],
    })
    await abrir(SESSAO_EXEMPLO, () => respostaJson(depois))

    expect(texto('[data-teste="relogio-operacao-selo"]')).toBe(TEXTOS_GRANDE_DIA.diaPassou)
    expect(texto('[data-teste="faixa-fase-dia-titulo"]')).toBe(TEXTOS_GRANDE_DIA.depoisTitulo)
    expect(wrapper!.find('[data-teste="item-roteiro-feito"]').exists()).toBe(true)
  })

  it('[COMPONENTE] arquivado mostra a faixa e esconde as ações', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(grandeDia({ arquivado: true, somenteLeitura: true })))

    expect(texto('[data-teste="grande-dia-arquivado"]')).toContain(TEXTOS_GRANDE_DIA.arquivadoAcao)
    expect(wrapper!.find('[data-teste="grande-dia-marcar-feito"]').exists()).toBe(false)
  })

  it('[COMPONENTE] vazio convida a assessoria a montar o cronograma', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(grandeDia({ itens: [] })))

    expect(texto('[data-teste="grande-dia-vazio"]')).toContain(TEXTOS_GRANDE_DIA.vazioTitulo)
    expect(wrapper!.get('[data-teste="grande-dia-montar"]').attributes('href')).toBe(`/eventos/${ID_EVENTO}/cronograma`)
  })

  it('[COMPONENTE] vazio para os anfitriões não oferece montar', async () => {
    await abrir(SESSAO_ANFITRIAO, () => respostaJson(grandeDia({ itens: [], somenteLeitura: true })))

    expect(texto('[data-teste="grande-dia-vazio"]')).toContain(TEXTOS_GRANDE_DIA.vazioTextoAnfitriao)
    expect(wrapper!.find('[data-teste="grande-dia-montar"]').exists()).toBe(false)
  })

  it('[COMPONENTE] erro do servidor oferece tentar de novo', async () => {
    let tentativas = 0
    await abrir(SESSAO_EXEMPLO, () => {
      tentativas++
      return tentativas === 1 ? respostaProblema(500, { title: 'Erro' }) : respostaJson(grandeDia())
    })

    expect(texto('[data-teste="grande-dia-erro"]')).toContain(TEXTOS_GRANDE_DIA.erroTitulo)
    await wrapper!.get('[data-teste="grande-dia-erro"] button').trigger('click')
    await flushPromises()
    expect(texto('[data-teste="cartao-agora-atividade"]')).toBe('Cerimônia')
  })

  it('[SEGURANÇA] sem permissão não oferece nova tentativa e 404 mostra não encontrado', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaProblema(403, { title: 'Proibido' }))
    expect(wrapper!.get('[data-teste="grande-dia-erro"]').attributes('data-variante')).toBe('semPermissao')
    expect(wrapper!.find('[data-teste="grande-dia-erro"] button').exists()).toBe(false)
    wrapper!.unmount()

    await abrir(SESSAO_EXEMPLO, () => respostaProblema(404, { title: 'Não encontrado' }))
    expect(wrapper!.text()).toContain(TEXTOS_GRANDE_DIA.naoEncontradoTitulo)
    expect(wrapper!.get('[data-teste="voltar"]').text()).toBe(TEXTOS_GRANDE_DIA.voltarEventos)
  })
})

const cssView = (() => {
  const fonte = readFileSync(resolve(__dirname, '../GrandeDiaView.vue'), 'utf-8')
  return fonte.slice(fonte.indexOf('<style scoped>'))
})()

describe('GrandeDiaView — layout reestruturado', { timeout: 20_000 }, () => {
  it('[COMPONENTE] no dia, com pendências, usa a superfície ampla com painel, lateral e a ação como último bloco', async () => {
    await abrir(SESSAO_EXEMPLO, () => respostaJson(grandeDia()))

    const superficie = wrapper!.get('[data-teste="superficie-operacao"]')
    expect(superficie.classes()).toEqual(expect.arrayContaining(['superficie-operacao--ampla', 'grande-dia-superficie']))
    const envelope = wrapper!.get('[data-teste="grande-dia"]')
    expect(envelope.classes()).toEqual(expect.arrayContaining(['grande-dia--com-lateral', 'grande-dia--com-acao']))
    expect(envelope.get('.grande-dia__topo').find('[data-teste="relogio-operacao"]').exists()).toBe(true)
    expect(envelope.get('.grande-dia__painel').attributes('data-teste')).toBe('painel-agora-proximo')
    const lateral = envelope.get('.grande-dia__lateral')
    expect(lateral.find('[data-teste="grande-dia-sem-marcar"]').exists()).toBe(true)
    expect(lateral.find('[data-teste="grande-dia-feitos"]').exists()).toBe(true)
    const filhos = Array.from(envelope.element.children)
    expect(filhos[filhos.length - 1]?.getAttribute('data-teste')).toBe('barra-acao-fixa')
    expect(filhos[filhos.length - 2]?.classList.contains('grande-dia__rodape')).toBe(true)
  })

  it('[COMPONENTE] no dia, sem itens pendentes nem feitos, não cria coluna lateral', async () => {
    const semPendencias = grandeDia({
      itens: [itemGrandeDia({ id: 'c' }), itemGrandeDia({ id: 'f', inicio: '17:15', termino: '18:00', atividade: 'Fotos com a família', fornecedor: null, situacao: 'Proximo' })],
    })
    await abrir(SESSAO_EXEMPLO, () => respostaJson(semPendencias))

    const envelope = wrapper!.get('[data-teste="grande-dia"]')
    expect(envelope.classes()).not.toContain('grande-dia--com-lateral')
    expect(envelope.find('.grande-dia__lateral').exists()).toBe(false)
    expect(envelope.find('[data-teste="cartao-agora"]').exists()).toBe(true)
  })

  it('[SEGURANÇA] anfitriões no dia não recebem a área de ação principal', async () => {
    await abrir(SESSAO_ANFITRIAO, () => respostaJson(grandeDia({ somenteLeitura: true })))

    const envelope = wrapper!.get('[data-teste="grande-dia"]')
    expect(envelope.classes()).not.toContain('grande-dia--com-acao')
    expect(envelope.find('[data-teste="barra-acao-fixa"]').exists()).toBe(false)
  })

  it('[COMPONENTE] antes do dia agrupa o roteiro por dia na grade, sem lateral', async () => {
    const antes = grandeDia({
      momento: { agora: '2027-05-03T10:12:00', fase: 'AntesDoDia', diasParaOEvento: 12 },
      itens: [
        itemGrandeDia({ id: 'e', dia: 'Vespera', data: '2027-05-14', inicio: '19:00', atividade: 'Ensaio', situacao: 'Depois' }),
        itemGrandeDia({ id: 'c', situacao: 'Depois' }),
      ],
    })
    await abrir(SESSAO_EXEMPLO, () => respostaJson(antes))

    const envelope = wrapper!.get('[data-teste="grande-dia"]')
    expect(envelope.classes()).not.toContain('grande-dia--com-lateral')
    const roteiro = envelope.get('.grande-dia__roteiro')
    expect(roteiro.findAll('section')).toHaveLength(2)
    expect(envelope.get('.grande-dia__fase').find('[data-teste="faixa-fase-dia"]').exists()).toBe(true)
  })

  it('[UNITÁRIO] o estilo usa container queries, o ritmo da fundação e nenhum valor solto', () => {
    expect(cssView).toContain('container: grande-dia / inline-size')
    expect(cssView).toContain('@container grande-dia (min-width: 60rem)')
    expect(cssView).toContain('@container grande-dia (min-width: 40rem)')
    expect(cssView).toMatch(/grid-template-columns: minmax\(0, 3fr\) minmax\(20rem, 2fr\)/)
    expect(cssView).toContain('repeat(auto-fit, minmax(min(22rem, 100%), 1fr))')
    expect(cssView).toContain('var(--p-ritmo-cartao)')
    expect(cssView).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(cssView).not.toMatch(/\d+px(?! solid)/)
    expect(cssView).not.toMatch(/margin:\s*-|calc\(-/)
    expect(cssView).not.toContain('box-shadow')
    expect(cssView).not.toContain('gradient')
    expect(cssView).not.toContain('max-width')
  })
})
