import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

import { montarView, prepararAplicacao, respostaJson, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { mapaExemplo } from '@/__tests__/auxiliaresMesas'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import OcupacaoMesa from '@/componentes/base/OcupacaoMesa.vue'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_MESAS } from '@/textos/mesas'
import { ID_CASAMENTO, RaizRotas, casamentoCompleto, chamadas, quando, rotearFetch } from '@/views/casamentos/__tests__/auxiliaresCasamentos'

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => ({ sucesso: vi.fn(), erro: vi.fn() }),
  DURACAO_TOAST_SUCESSO: 4000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_CASAMENTO = `/api/casamentos/${ID_CASAMENTO}`
const ROTA_MESAS = `${ROTA_CASAMENTO}/mesas`

function estilo(arquivo: string): string {
  const fonte = readFileSync(resolve(__dirname, arquivo), 'utf-8')
  return fonte.slice(fonte.indexOf('<style'))
}

function fonte(arquivo: string): string {
  return readFileSync(resolve(__dirname, arquivo), 'utf-8')
}

const ESTILO_VIEW = estilo('../MesasView.vue')
const FONTE_DIALOGO_MESA = fonte('../../../componentes/mesas/DialogoMesa.vue')

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
  vi.restoreAllMocks()
})

async function abrir() {
  rotearFetch(
    fetchSimulado,
    quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
    quando('GET', ROTA_MESAS, () => respostaJson(mapaExemplo())),
  )
  const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}/mesas`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

function digitar(campo: HTMLInputElement, valor: string) {
  campo.value = valor
  campo.dispatchEvent(new Event('input'))
}

describe('MesasView reestruturada', { timeout: 30_000 }, () => {
  it('[UNITÁRIO] estilos da view usam @container e ritmo, sem @media, espaços soltos, sombras nem gradientes', () => {
    expect(ESTILO_VIEW).not.toMatch(/@media/)
    expect(ESTILO_VIEW).toContain('container: mesas / inline-size')
    expect(ESTILO_VIEW).toContain('container: lista-mesas / inline-size')
    expect(ESTILO_VIEW).toContain('@container mesas (min-width: 40rem)')
    expect(ESTILO_VIEW).toContain('@container lista-mesas (min-width: 34rem)')
    expect(ESTILO_VIEW).not.toMatch(/--p-espaco-/)
    expect(ESTILO_VIEW).not.toMatch(/(gap|padding|margin)[^;]*\d+px/)
    expect(ESTILO_VIEW).not.toMatch(/box-shadow|gradient/)
    expect(ESTILO_VIEW).not.toMatch(/margin[^:]*:\s*-/)
  })

  it('[COMPONENTE] no desktop a lateral Sem mesa fica ao lado da grade de mesas, cada mesa com título, ocupação e menu', async () => {
    await abrir()

    const raiz = wrapper!.get('div.mesas')
    expect(raiz.classes()).toEqual(expect.arrayContaining(['pilha', 'pilha--bloco']))
    const colunas = wrapper!.get('.mesas__colunas')
    expect(colunas.classes()).not.toContain('mesas__colunas--abas')
    const filhos = colunas.element.children
    expect(filhos[0]!.getAttribute('data-teste')).toBe('coluna-sem-mesa')
    expect(filhos[1]!.getAttribute('data-teste')).toBe('coluna-mesas')
    const grade = wrapper!.get('[data-teste="coluna-mesas"] .mesas__grade')
    const mesas = grade.findAll('[data-teste="mesa"]')
    expect(mesas).toHaveLength(3)
    const cabecalho = mesas[1]!.get('.mesas__mesa-cabecalho')
    expect(cabecalho.get('h3').text()).toBe('Mesa 2 · Padrinhos')
    expect(cabecalho.get('[data-teste="texto-ocupacao"]').text()).toBe('1 de 3')
    expect(cabecalho.find('[data-teste="menu-mesa"]').exists()).toBe(true)
    expect(mesas[1]!.attributes('aria-labelledby')).toBe(cabecalho.get('h3').attributes('id'))
  })

  it('[COMPONENTE] no celular a grade de colunas fica em uma coluna por abas', async () => {
    simularMatchMedia(true)
    await abrir()

    expect(wrapper!.get('.mesas__colunas').classes()).toContain('mesas__colunas--abas')
    expect(wrapper!.find('[data-teste="abas-mesas"]').exists()).toBe(true)
  })

  it('[COMPONENTE] sem mesas cadastradas a coluna mostra o estado vazio e não renderiza a grade', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', ROTA_CASAMENTO, () => respostaJson(casamentoCompleto())),
      quando('GET', ROTA_MESAS, () =>
        respostaJson(mapaExemplo({ mesas: [], pessoas: mapaExemplo().pessoas.map((pessoa) => ({ ...pessoa, mesaId: null })) })),
      ),
    )
    const montagem = await prepararAplicacao(`/casamentos/${ID_CASAMENTO}/mesas`)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()

    const coluna = wrapper!.get('[data-teste="coluna-mesas"]')
    expect(coluna.find('.mesas__grade').exists()).toBe(false)
    expect(coluna.text()).toContain(TEXTOS_MESAS.vazioMesasTitulo)
    expect(coluna.find('[data-teste="nova-mesa-lista"]').exists()).toBe(true)
  })

  it('[COMPONENTE] diálogo de mesa só valida no blur depois de tentar salvar e revalida ao digitar', async () => {
    await abrir()
    await wrapper!.get('[data-teste="nova-mesa"]').trigger('click')
    await flushPromises()

    const nome = document.body.querySelector('#mesa-nome') as HTMLInputElement
    digitar(nome, 'x'.repeat(61))
    nome.dispatchEvent(new Event('blur'))
    await flushPromises()
    expect(document.body.textContent).not.toContain(TEXTOS_MESAS.erroNomeTamanho)

    ;(document.body.querySelector('[data-teste="salvar-mesa"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(document.body.textContent).toContain(TEXTOS_MESAS.erroNomeTamanho)
    expect(chamadas(fetchSimulado, 'POST', ROTA_MESAS)).toHaveLength(0)

    digitar(nome, 'Padrinhos')
    await flushPromises()
    expect(document.body.textContent).not.toContain(TEXTOS_MESAS.erroNomeTamanho)
  })

  it('[UNITÁRIO] diálogo de mesa usa validarAoSair e revalidarAoDigitar em todos os campos validados', () => {
    for (const campo of ['numero', 'capacidade', 'nome']) {
      expect(FONTE_DIALOGO_MESA).toContain(`@blur="formulario.validarAoSair('${campo}')"`)
      expect(FONTE_DIALOGO_MESA).toContain(`@update:model-value="formulario.revalidarAoDigitar('${campo}')"`)
    }
    expect(FONTE_DIALOGO_MESA).not.toContain('validarCampo(')
  })
})

describe('OcupacaoMesa', () => {
  it('[COMPONENTE] lugares ocupados cheios, livres tracejados e texto "6 de 8" sempre visível', () => {
    const ocupacao = mount(OcupacaoMesa, { props: { ocupados: 6, lugares: 8 } })

    const lugares = ocupacao.findAll('[data-teste="lugar-mesa"]')
    expect(lugares).toHaveLength(8)
    expect(lugares.filter((lugar) => lugar.classes().includes('ocupacao-mesa__lugar--ocupado'))).toHaveLength(6)
    expect(ocupacao.get('[data-teste="texto-ocupacao"]').text()).toBe('6 de 8')
    expect(ocupacao.get('[role="img"]').attributes('aria-label')).toBe(TEXTOS_MESAS.ocupacaoAcessivel(6, 8))
    ocupacao.unmount()
  })

  it('[UNITÁRIO] estilo do lugar livre é tracejado e o ocupado usa a cor primária (terracota)', () => {
    const css = estilo('../../../componentes/base/OcupacaoMesa.vue')
    expect(css).toMatch(/\.ocupacao-mesa__lugar \{[^}]*border: 1px dashed var\(--p-cor-borda-campo\)/)
    expect(css).toMatch(/\.ocupacao-mesa__lugar--ocupado \{[^}]*background: var\(--p-cor-primaria\)/)
    expect(css).not.toMatch(/--p-espaco-2\) var\(--p-espaco-3\)/)
  })
})
