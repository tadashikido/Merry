import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import ListaDetalhes from '@/componentes/base/ListaDetalhes.vue'
import { SESSAO_EXEMPLO, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { alertasExemplo } from '@/__tests__/auxiliaresFinanceiro'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import type { SessaoDto } from '@/tipos/api'
import { ID_EVENTO, RaizRotas, eventoCompleto, quando, type Rota } from './auxiliaresEventos'

await precarregarRotas('evento')

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_ALERTAS = `${ROTA_EVENTO}/financeiro/alertas`

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

const lerFonte = (caminho: string) => readFileSync(resolve(__dirname, '../../..', caminho), 'utf-8')
const estiloDe = (fonte: string) => fonte.slice(fonte.indexOf('<style'))

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
  const montagem = await prepararAplicacao(`/eventos/${ID_EVENTO}`)
  wrapper = await montarView(RaizRotas, montagem)
  return wrapper
}

function filhosDiretos(elemento: Element): string[] {
  return Array.from(elemento.children).map((filho) => filho.getAttribute('data-teste') ?? filho.className)
}

describe('EventoView — estrutura reestruturada', () => {
  it('[COMPONENTE] organiza o painel em topo (próximos passos e andamento), resumo (Pagamentos e Detalhes) e base (Convidados e Acesso dos anfitriões), nessa ordem', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_ALERTAS, () => respostaJson(alertasExemplo())),
      quando('GET', `${ROTA_EVENTO}/proximos-passos`, () =>
        respostaJson({ anfitriaoConvidado: false, checklistAplicado: false, convidadosCadastrados: false, convitesEnviados: false, todosConcluidos: false }),
      ),
    )
    const tela = await abrir()

    const conteudo = tela.get('.evento')
    expect(conteudo.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    expect(filhosDiretos(conteudo.element)).toEqual(['painel-evento'])
    const painel = tela.get('[data-teste="painel-evento"]')
    const [topo, resumo, base] = Array.from(painel.element.children)
    expect(topo!.classList.contains('evento__topo')).toBe(true)
    expect(filhosDiretos(topo!)).toEqual(['bloco-proximos-passos', 'andamento-evento'])
    expect(resumo!.getAttribute('data-teste')).toBe('resumo-evento')
    expect(filhosDiretos(resumo!)).toEqual(['bloco-alertas-pagamentos', 'detalhes-evento'])
    expect(base!.classList.contains('evento__base')).toBe(true)
    expect(filhosDiretos(base!)).toEqual(['bloco-convidados', 'bloco-acesso-anfitriao'])
  })

  it('[COMPONENTE] Detalhes é um cartão com título próprio e lista embutida, sem moldura duplicada', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())))
    const tela = await abrir()

    const detalhes = tela.get('[data-teste="detalhes-evento"]')
    expect(detalhes.element.tagName).toBe('SECTION')
    expect(detalhes.classes()).toContain('cartao')
    expect(detalhes.attributes('aria-labelledby')).toBe('titulo-detalhes')
    expect(detalhes.get('h2#titulo-detalhes').text()).toBe(TEXTOS_EVENTOS.detalhesTitulo)
    expect(detalhes.get('[data-teste="lista-detalhes"]').classes()).toContain('lista-detalhes--embutida')
    expect(detalhes.text()).toContain(TEXTOS_EVENTOS.observacoes)
  })

  it('[COMPONENTE] evento arquivado: aviso agrupado no topo e Detalhes sozinho na faixa de resumo', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ arquivado: true }))))
    const tela = await abrir()

    const conteudo = tela.get('.evento')
    const avisos = conteudo.element.children[0]!
    expect(avisos.classList.contains('pilha--grupo')).toBe(true)
    expect(avisos.querySelector('[data-teste="aviso-arquivado"]')).not.toBeNull()
    expect(filhosDiretos(tela.get('[data-teste="resumo-evento"]').element)).toEqual(['detalhes-evento'])
    expect(tela.find('[data-teste="bloco-alertas-pagamentos"]').exists()).toBe(false)
    expect(tela.find('.evento__topo').exists()).toBe(false)
    expect(tela.find('[data-teste="andamento-evento"]').exists()).toBe(false)
    expect(tela.get('[data-teste="painel-evento"]').classes()).toContain('evento__painel--sem-topo')
  })

  it('[COMPONENTE] dados incompletos ficam agrupados acima do resumo; sem avisos o grupo não é renderizado', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ horario: null, localCerimonia: null }))))
    const tela = await abrir()

    const grupo = tela.get('.evento > .pilha--grupo')
    expect(grupo.findAll('[data-teste="dados-incompletos"]')).toHaveLength(2)
    wrapper?.unmount()

    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())))
    const completo = await abrir()
    expect(completo.find('.evento > .pilha--grupo').exists()).toBe(false)
  })

  it('[SEGURANÇA] anfitriões veem Pagamentos e Detalhes sem ações, sem Observações e sem Acesso dos anfitriões', async () => {
    rotear(
      fetchSimulado,
      SESSAO_ANFITRIAO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
      quando('GET', ROTA_ALERTAS, () => respostaJson(alertasExemplo())),
    )
    const tela = await abrir()

    expect(filhosDiretos(tela.get('[data-teste="resumo-evento"]').element)).toEqual(['bloco-alertas-pagamentos', 'detalhes-evento'])
    expect(tela.find('[data-teste="bloco-acesso-anfitriao"]').exists()).toBe(false)
    expect(tela.find('[data-teste="editar-evento"]').exists()).toBe(false)
    expect(tela.find('[data-teste="duplicar-evento"]').exists()).toBe(false)
    expect(tela.get('[data-teste="detalhes-evento"]').text()).not.toContain(TEXTOS_EVENTOS.observacoes)
    expect(tela.find('[data-teste="bloco-proximos-passos"]').exists()).toBe(false)
    expect(tela.find('[data-teste="andamento-checklist"]').exists()).toBe(false)
    expect(tela.find('[data-teste="andamento-confirmacao"]').exists()).toBe(true)
  })

  it('[SEGURANÇA] 404 agrupa o erro e a volta para a lista sem renderizar dados do evento', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO)
    const tela = await abrir()

    const voltar = tela.get('[data-teste="voltar-eventos"]')
    const grupo = voltar.element.parentElement!
    expect(grupo.classList.contains('pilha--grupo')).toBe(true)
    expect(grupo.querySelector('[data-teste="estado-erro"]')).not.toBeNull()
    expect(voltar.classes()).toContain('evento__voltar')
    expect(tela.find('[data-teste="resumo-evento"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] ListaDetalhes só perde a moldura quando embutida', () => {
    const itens = [{ rotulo: 'Data', valor: '15 de maio de 2027' }]
    const padrao = mount(ListaDetalhes, { props: { itens } })
    const embutida = mount(ListaDetalhes, { props: { itens, embutida: true } })

    expect(padrao.classes()).not.toContain('lista-detalhes--embutida')
    expect(embutida.classes()).toContain('lista-detalhes--embutida')
    expect(embutida.text()).toContain('15 de maio de 2027')
  })

  it('[UNITÁRIO] estilos seguem o ritmo da fundação e o cabeçalho quebra as ações em vez de espremer o título', () => {
    const estiloView = estiloDe(lerFonte('views/eventos/EventoView.vue'))
    expect(estiloView).not.toMatch(/--p-espaco-/)
    expect(estiloView).not.toMatch(/\d+px/)
    expect(estiloView).not.toMatch(/margin/)
    expect(estiloView).toMatch(/repeat\(auto-fit, minmax\(min\(28rem, 100%\), 1fr\)\)/)
    expect(estiloView).toMatch(/gap: var\(--p-ritmo-cartao\)/)
    expect(estiloView).not.toMatch(/@media/)
    expect(estiloView).toMatch(/container: evento \/ inline-size/)
    expect(estiloView).toMatch(/@container evento \(min-width: 64rem\)/)

    const estiloCabecalho = estiloDe(lerFonte('componentes/base/CabecalhoPagina.vue'))
    const desktop = estiloCabecalho.slice(estiloCabecalho.indexOf('@container cabecalho-pagina (min-width: 40rem)'))
    expect(desktop).toMatch(/flex-wrap: wrap/)
    expect(desktop).toMatch(/min-width: min\(100%, 24rem\)/)

    const estiloLista = estiloDe(lerFonte('componentes/base/ListaDetalhes.vue'))
    expect(estiloLista).toMatch(/\.lista-detalhes--embutida \{[^}]*border: 0/)
  })
})
