import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import Select from 'primevue/select'

import { aguardarAte, precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_FORMULARIO_EVENTO } from '@/textos/eventos'
import { TEXTOS_DUPLICACAO_EVENTO } from '@/textos/duplicacaoEvento'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import type { PreviaDuplicacaoDto } from '@/tipos/duplicacaoEvento'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import { ID_EVENTO, RaizRotas, quando, resumoEvento, rotearFetch, type Rota } from './auxiliaresEventos'

await precarregarRotas('evento-duplicar')

const ESPERA_PREVIA_MS = 300
const ROTA_PREVIA = `/api/eventos/${ID_EVENTO}/duplicacao/previa`
const CAMINHO_TELA = `/eventos/novo/a-partir-de-outro?origem=${ID_EVENTO}`

const RELATIVO_ESPERADO: Record<TipoEvento, string> = {
  Casamento: 'em relação à cerimônia',
  QuinzeAnos: 'em relação à festa',
  Aniversario: 'em relação à festa',
  Comemoracao: 'em relação ao evento',
}

const INDEFINIDO_ESPERADO: Record<TipoEvento, string> = {
  Casamento: 'um casamento',
  QuinzeAnos: 'uma festa de 15 anos',
  Aniversario: 'um aniversário',
  Comemoracao: 'uma comemoração',
}

function previa(tipo: TipoEvento = 'Casamento', dados: Partial<PreviaDuplicacaoDto> = {}): PreviaDuplicacaoDto {
  return {
    origem: resumoEvento({ tipo, nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: tipo === 'Casamento' ? 'João' : null }),
    tarefas: 29,
    tarefasDoChecklist: 26,
    tarefasNascemAtrasadas: 0,
    tarefasCanceladasIgnoradas: 1,
    fornecedores: 3,
    fornecedoresIgnorados: 1,
    itensCronograma: 7,
    ...dados,
  }
}

function previaPorData(porData: (data: string | null) => Response): Rota {
  return (url, init) => {
    if ((init?.method ?? 'GET') !== 'GET' || !url.startsWith(ROTA_PREVIA)) {
      return undefined
    }
    return porData(new URL(url, 'http://local').searchParams.get('data'))
  }
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
  vi.useRealTimers()
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  registrarProvedorAutenticacao(null)
})

async function abrir(caminho = CAMINHO_TELA) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

function resumo(linha: string) {
  return wrapper!.get(`[data-teste="resumo-${linha}"]`)
}

describe('Duplicar evento por tipo de evento', () => {
  it.each(TIPOS_EVENTO)('[COMPONENTE] %s: herança do tipo, homenageados, cronograma e orientação vêm do vocabulário', async (tipo) => {
    rotearFetch(fetchSimulado, previaPorData(() => respostaJson(previa(tipo))))
    await abrir()
    const vocabulario = VOCABULARIO_TIPO_EVENTO[tipo]

    expect(wrapper!.get('[data-teste="tipo-herdado"]').text()).toBe(`O evento novo será ${INDEFINIDO_ESPERADO[tipo]}, como o de origem.`)
    expect(wrapper!.get('[data-teste="tipo-origem"]').text()).toBe(vocabulario.rotulo)
    expect(wrapper!.findAll('legend')[0]!.text()).toBe(vocabulario.homenageados.grupo)
    expect(wrapper!.get('[data-teste="opcao-cronograma"]').text()).toContain(RELATIVO_ESPERADO[tipo])
    expect(resumo('tipo').text()).toContain(vocabulario.rotulo)
    expect(resumo('tipo').text()).toContain(TEXTOS_DUPLICACAO_EVENTO.resumoTipoDetalhe)
    expect(wrapper!.get('[data-teste="lateral-formulario-evento"] aside h2').text()).toBe(
      TEXTOS_FORMULARIO_EVENTO.orientacaoTitulo(vocabulario.referencia.artigo),
    )
    expect(wrapper!.find('#duplicacao-nomeSegundaPessoa').exists()).toBe(vocabulario.homenageados.segundo !== null)
    expect(/cerimônia|noiv/i.test(wrapper!.get('[data-teste="formulario-duplicacao"]').text())).toBe(tipo === 'Casamento')
  })

  it('[UNITÁRIO] cada tipo tem artigo indefinido e referência ao momento principal próprios', () => {
    for (const tipo of TIPOS_EVENTO) {
      expect(VOCABULARIO_TIPO_EVENTO[tipo].referencia.indefinido).toBe(INDEFINIDO_ESPERADO[tipo])
      expect(`em relação ${VOCABULARIO_TIPO_EVENTO[tipo].referencia.relativoAoMomento}`).toBe(RELATIVO_ESPERADO[tipo])
    }
  })

  it('[COMPONENTE] o seletor de origem mostra o tipo de cada evento', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Ativos', () =>
        respostaJson([
          resumoEvento({ nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'João', data: '2026-05-15' }),
          resumoEvento({ id: '22222222-2222-4222-8222-222222222222', tipo: 'QuinzeAnos', nomePrimeiraPessoa: 'Valentina', nomeSegundaPessoa: null, data: '2026-03-02' }),
        ]),
      ),
      quando('GET', '/api/eventos?situacao=Arquivados', () =>
        respostaJson([resumoEvento({ id: '44444444-4444-4444-8444-444444444444', tipo: 'Aniversario', nomePrimeiraPessoa: 'Seu Antônio', nomeSegundaPessoa: null, data: '2025-08-10', arquivado: true })]),
      ),
    )
    await abrir('/eventos/novo/a-partir-de-outro')

    const opcoes = wrapper!.getComponent(Select).props('options') as { rotulo: string }[]
    expect(opcoes.map((opcao) => opcao.rotulo)).toEqual([
      'Ana & João (Casamento, 15 mai 2026)',
      'Valentina (15 anos, 02 mar 2026)',
      'Seu Antônio (Aniversário, 10 ago 2025, arquivado)',
    ])
  })

  it('[COMPONENTE] sem origem, a lateral explica a duplicação e os rótulos não assumem casamento', async () => {
    rotearFetch(
      fetchSimulado,
      quando('GET', '/api/eventos?situacao=Ativos', () => respostaJson([resumoEvento()])),
      quando('GET', '/api/eventos?situacao=Arquivados', () => respostaJson([])),
    )
    await abrir('/eventos/novo/a-partir-de-outro')

    const comoFunciona = wrapper!.get('[data-teste="como-funciona-duplicacao"]')
    expect(comoFunciona.get('h2').text()).toBe(TEXTOS_DUPLICACAO_EVENTO.comoFuncionaTitulo)
    expect(comoFunciona.findAll('h3').map((titulo) => titulo.text())).toEqual(['O mesmo tipo', 'O que vai', 'O que fica'])
    expect(wrapper!.find('[data-teste="resumo-duplicacao"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="formulario-duplicacao"]').text()).not.toMatch(/cerimônia|noiv/i)
  })
})

describe('Resumo do evento novo', () => {
  it('[COMPONENTE] mostra por módulo o que vai e o que fica de fora, conforme as opções marcadas', async () => {
    rotearFetch(fetchSimulado, previaPorData(() => respostaJson(previa())))
    await abrir()

    expect(resumo('data').text()).toContain(TEXTOS_DUPLICACAO_EVENTO.semData)
    expect(resumo('tarefas').text()).toContain('29 tarefas vão')
    expect(resumo('tarefas-canceladas').text()).toBe('1 cancelada fica de fora')
    expect(resumo('fornecedores').text()).toContain('3 fornecedores vão')
    expect(resumo('fornecedores-ignorados').text()).toBe('1 fica de fora')
    expect(resumo('cronograma').text()).toContain('7 itens vão')

    await wrapper!.get('#duplicacao-copiarFornecedores').setValue(false)

    expect(resumo('fornecedores').text()).toContain(TEXTOS_DUPLICACAO_EVENTO.naoVao)
    expect(resumo('fornecedores').text()).not.toContain('3 fornecedores vão')
    expect(resumo('tarefas').text()).toContain('29 tarefas vão')
  })

  it('[COMPONENTE] módulo vazio na origem aparece como nada para levar', async () => {
    rotearFetch(fetchSimulado, previaPorData(() => respostaJson(previa('Aniversario', { tarefas: 0, tarefasCanceladasIgnoradas: 0, itensCronograma: 1 }))))
    await abrir()

    expect(resumo('tarefas').text()).toContain(TEXTOS_DUPLICACAO_EVENTO.nadaParaLevar)
    expect(wrapper!.find('[data-teste="resumo-tarefas-canceladas"]').exists()).toBe(false)
    expect(resumo('cronograma').text()).toContain('1 item vai')
  })

  it('[COMPONENTE] com a data, mostra as tarefas que nascem atrasadas após o debounce da prévia', async () => {
    rotearFetch(fetchSimulado, previaPorData((data) => respostaJson(previa('QuinzeAnos', { tarefasNascemAtrasadas: data === '2026-10-20' ? 2 : 0 }))))
    await abrir()
    expect(wrapper!.find('[data-teste="resumo-tarefas-atrasadas"]').exists()).toBe(false)

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await wrapper!.get('#duplicacao-data').setValue('2026-10-20')
    await vi.advanceTimersByTimeAsync(ESPERA_PREVIA_MS - 1)
    const chamadasPrevia = () => fetchSimulado.mock.calls.filter(([url]) => String(url).startsWith(ROTA_PREVIA)).length
    expect(chamadasPrevia()).toBe(1)
    await vi.advanceTimersByTimeAsync(1)

    await aguardarAte(() => expect(wrapper!.find('[data-teste="resumo-tarefas-atrasadas"]').text()).toBe('2 nascem atrasadas'))
    expect(chamadasPrevia()).toBe(2)
    expect(resumo('data').text()).toContain('20 out 2026')

    await wrapper!.get('#duplicacao-copiarTarefas').setValue(false)
    expect(wrapper!.find('[data-teste="resumo-tarefas-atrasadas"]').exists()).toBe(false)
  })
})
