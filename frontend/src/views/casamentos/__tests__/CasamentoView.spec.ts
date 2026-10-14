import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'

import ListaDetalhes from '@/componentes/base/ListaDetalhes.vue'
import { SESSAO_EXEMPLO, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { alertasExemplo } from '@/__tests__/auxiliaresFinanceiro'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import type { SessaoDto } from '@/tipos/api'
import { ID_CASAMENTO, RaizRotas, casamentoCompleto, quando, type Rota } from './auxiliaresCasamentos'

const ROTA_CASAMENTO = `/api/casamentos/${ID_CASAMENTO}`
const ROTA_ALERTAS = `${ROTA_CASAMENTO}/financeiro/alertas`

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
  const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}`)
  wrapper = await montarView(RaizRotas, montagem)
  return wrapper
}

function filhosDiretos(elemento: Element): string[] {
  return Array.from(elemento.children).map((filho) => filho.getAttribute('data-teste') ?? filho.className)
}

describe('CasamentoView — estrutura reestruturada', () => {
  it('[COMPONENTE] coloca Pagamentos e Detalhes na faixa de resumo, nessa ordem, e Convidados e Acesso do casal abaixo em largura total', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_ALERTAS, () => respostaJson(alertasExemplo())),
    )
    const tela = await abrir()

    const conteudo = tela.get('.casamento')
    expect(conteudo.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    const resumo = tela.get('[data-teste="resumo-casamento"]')
    expect(filhosDiretos(resumo.element)).toEqual(['bloco-alertas-pagamentos', 'detalhes-casamento'])
    const ordem = filhosDiretos(conteudo.element)
    expect(ordem).toEqual(['resumo-casamento', 'bloco-convidados', 'bloco-acesso-casal'])
  })

  it('[COMPONENTE] Detalhes é um cartão com título próprio e lista embutida, sem moldura duplicada', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())))
    const tela = await abrir()

    const detalhes = tela.get('[data-teste="detalhes-casamento"]')
    expect(detalhes.element.tagName).toBe('SECTION')
    expect(detalhes.classes()).toContain('cartao')
    expect(detalhes.attributes('aria-labelledby')).toBe('titulo-detalhes')
    expect(detalhes.get('h2#titulo-detalhes').text()).toBe(TEXTOS_CASAMENTOS.detalhesTitulo)
    expect(detalhes.get('[data-teste="lista-detalhes"]').classes()).toContain('lista-detalhes--embutida')
    expect(detalhes.text()).toContain(TEXTOS_CASAMENTOS.observacoes)
  })

  it('[COMPONENTE] casamento arquivado: aviso agrupado no topo e Detalhes sozinho na faixa de resumo', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ arquivado: true }))))
    const tela = await abrir()

    const conteudo = tela.get('.casamento')
    const avisos = conteudo.element.children[0]!
    expect(avisos.classList.contains('pilha--grupo')).toBe(true)
    expect(avisos.querySelector('[data-teste="aviso-arquivado"]')).not.toBeNull()
    expect(filhosDiretos(tela.get('[data-teste="resumo-casamento"]').element)).toEqual(['detalhes-casamento'])
    expect(tela.find('[data-teste="bloco-alertas-pagamentos"]').exists()).toBe(false)
  })

  it('[COMPONENTE] dados incompletos ficam agrupados acima do resumo; sem avisos o grupo não é renderizado', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto({ horario: null, localCerimonia: null }))))
    const tela = await abrir()

    const grupo = tela.get('.casamento > .pilha--grupo')
    expect(grupo.findAll('[data-teste="dados-incompletos"]')).toHaveLength(2)
    wrapper?.unmount()

    rotear(fetchSimulado, SESSAO_EXEMPLO, quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())))
    const completo = await abrir()
    expect(completo.find('.casamento > .pilha--grupo').exists()).toBe(false)
  })

  it('[SEGURANÇA] casal vê Pagamentos e Detalhes sem ações, sem Observações e sem Acesso do casal', async () => {
    rotear(
      fetchSimulado,
      SESSAO_CASAL,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_ALERTAS, () => respostaJson(alertasExemplo())),
    )
    const tela = await abrir()

    expect(filhosDiretos(tela.get('[data-teste="resumo-casamento"]').element)).toEqual(['bloco-alertas-pagamentos', 'detalhes-casamento'])
    expect(tela.find('[data-teste="bloco-acesso-casal"]').exists()).toBe(false)
    expect(tela.find('[data-teste="editar-casamento"]').exists()).toBe(false)
    expect(tela.find('[data-teste="duplicar-casamento"]').exists()).toBe(false)
    expect(tela.get('[data-teste="detalhes-casamento"]').text()).not.toContain(TEXTOS_CASAMENTOS.observacoes)
  })

  it('[SEGURANÇA] 404 agrupa o erro e a volta para a lista sem renderizar dados do casamento', async () => {
    rotear(fetchSimulado, SESSAO_EXEMPLO)
    const tela = await abrir()

    const voltar = tela.get('[data-teste="voltar-casamentos"]')
    const grupo = voltar.element.parentElement!
    expect(grupo.classList.contains('pilha--grupo')).toBe(true)
    expect(grupo.querySelector('[data-teste="estado-erro"]')).not.toBeNull()
    expect(voltar.classes()).toContain('casamento__voltar')
    expect(tela.find('[data-teste="resumo-casamento"]').exists()).toBe(false)
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
    const estiloView = estiloDe(lerFonte('views/casamentos/CasamentoView.vue'))
    expect(estiloView).not.toMatch(/--p-espaco-/)
    expect(estiloView).not.toMatch(/\d+px/)
    expect(estiloView).not.toMatch(/margin/)
    expect(estiloView).toMatch(/repeat\(auto-fit, minmax\(min\(28rem, 100%\), 1fr\)\)/)
    expect(estiloView).toMatch(/gap: var\(--p-ritmo-cartao\)/)

    const estiloCabecalho = estiloDe(lerFonte('componentes/base/CabecalhoPagina.vue'))
    const desktop = estiloCabecalho.slice(estiloCabecalho.indexOf('@media (min-width: 1024px)'))
    expect(desktop).toMatch(/flex-wrap: wrap/)
    expect(desktop).toMatch(/min-width: min\(100%, 24rem\)/)

    const estiloLista = estiloDe(lerFonte('componentes/base/ListaDetalhes.vue'))
    expect(estiloLista).toMatch(/\.lista-detalhes--embutida \{[^}]*border: 0/)
  })
})
