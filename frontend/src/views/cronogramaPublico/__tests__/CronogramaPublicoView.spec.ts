import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { TOKEN_CRONOGRAMA, cronogramaPublico, itemPublico } from '@/__tests__/auxiliaresCronogramaPublico'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { razaoContraste } from '@/design/contraste'
import { cores } from '@/design/tokens'
import { rotas } from '@/router'
import { TEXTOS_CRONOGRAMA_PUBLICO } from '@/textos/cronogramaPublico'
import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'
import { RaizRotas, chamadas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('cronograma-publico')

const ROTA_CONSULTA = '/api/cronograma-publico/consulta'

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  fetchSimulado = simularFetch()
  simularMatchMedia(true)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

async function abrir(token = TOKEN_CRONOGRAMA) {
  const montagem = await prepararAplicacao(`/cronograma/${token}`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

describe('CronogramaPublicoView', () => {
  it('[E2E] mostra o cabeçalho, o filtro, os locais e os itens agrupados no modo operação', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(cronogramaPublico())))

    await abrir()

    expect(wrapper!.find('.layout-publico--operacao').exists()).toBe(true)
    expect(wrapper!.get('h1').text()).toContain('Ana Beatriz & Bruno')
    expect(wrapper!.get('[data-teste="cabecalho-operacao-filtro"]').text()).toBe('Seus horários · Buffet Sabor')
    expect(wrapper!.text()).toContain('16:30 · Capela São José')
    expect(wrapper!.text()).toContain('Espaço Jardim')
    expect(wrapper!.findAll('[data-teste^="dia-roteiro-"]').map((secao) => secao.attributes('data-teste'))).toEqual([
      'dia-roteiro-Vespera',
      'dia-roteiro-DiaDoEvento',
    ])
    const itens = wrapper!.findAll('[data-teste="item-roteiro"]')
    expect(itens.map((item) => item.get('time').text())).toEqual(['19:00', '14:00', '16:30', '21:30'])
    expect(itens[2]!.classes()).toContain('item-roteiro--cerimonia')
    expect(itens[3]!.find('[data-teste="item-roteiro-feito"]').exists()).toBe(true)
    expect(wrapper!.text()).toContain('Entrada pela rua lateral.')
    expect(wrapper!.get('[data-teste="cronograma-publico-atualizado"]').text()).toMatch(/^Atualizado às \d{2}:\d{2}$/)
    expect(wrapper!.text()).toContain('Vale até 22 de maio de 2027')
    expect(corpoDaChamada(chamadas(fetchSimulado, 'POST', ROTA_CONSULTA)[0]!)).toEqual({ token: TOKEN_CRONOGRAMA })
  })

  it('[SEGURANÇA] rota pública marcada para não indexar e sem autenticação', () => {
    const rota = createRouter({ history: createMemoryHistory(), routes: rotas }).resolve(`/cronograma/${TOKEN_CRONOGRAMA}`)

    expect(rota.name).toBe('cronograma-publico')
    expect(rota.meta.semIndexacao).toBe(true)
    expect(rota.meta.requerAutenticacao).toBeUndefined()
    expect(rota.params.token).toBe(TOKEN_CRONOGRAMA)
  })

  it('[E2E] Atualizar consulta de novo e mostra o horário alterado', async () => {
    let versao = 0
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () => {
        versao += 1
        return respostaJson(cronogramaPublico({ itens: [itemPublico({ inicio: versao === 1 ? '14:00' : '14:30' })] }))
      }),
    )
    await abrir()
    expect(wrapper!.get('time').text()).toBe('14:00')

    await wrapper!.get('[data-teste="cronograma-publico-atualizar"]').trigger('click')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_CONSULTA)).toHaveLength(2)
    expect(wrapper!.get('time').text()).toBe('14:30')
  })

  it('[COMPONENTE] link geral mostra Equipe completa e vazio orienta a atualizar', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () => respostaJson(cronogramaPublico({ filtro: { tipo: 'Geral', rotulo: null, categoria: null }, itens: [] }))),
    )

    await abrir()

    expect(wrapper!.get('[data-teste="cabecalho-operacao-filtro"]').text()).toBe('Equipe completa')
    expect(wrapper!.get('[data-teste="cronograma-publico-vazio"]').text()).toContain(TEXTOS_CRONOGRAMA_PUBLICO.vazioTitulo)
    expect(wrapper!.find('[data-teste="cronograma-publico-atualizar"]').exists()).toBe(true)
  })

  it('[SEGURANÇA] link revogado ou expirado mostra link inativo sem tentar de novo', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaProblema(404, { title: 'Recurso não encontrado.' })))

    await abrir()

    const erro = wrapper!.get('[data-teste="cronograma-publico-erro"]')
    expect(erro.text()).toContain(TEXTOS_CRONOGRAMA_PUBLICO.inativoTitulo)
    expect(erro.text()).toContain(TEXTOS_CRONOGRAMA_PUBLICO.inativoTexto)
    expect(erro.find('button').exists()).toBe(false)
  })

  it('[SEGURANÇA] token malformado na URL não chama a API', async () => {
    rotearFetch(fetchSimulado)

    await abrir('nao-e-token')

    expect(chamadas(fetchSimulado, 'POST', ROTA_CONSULTA)).toHaveLength(0)
    expect(wrapper!.text()).toContain(TEXTOS_CRONOGRAMA_PUBLICO.inativoTitulo)
  })

  it('[COMPONENTE] 429 mostra muitas tentativas com tentar de novo', async () => {
    let tentativas = 0
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () => {
        tentativas += 1
        return tentativas === 1 ? respostaProblema(429, { title: 'Muitas tentativas.' }) : respostaJson(cronogramaPublico())
      }),
    )

    await abrir()
    expect(wrapper!.text()).toContain(TEXTOS_CRONOGRAMA_PUBLICO.limiteTitulo)

    await wrapper!.get('[data-teste="cronograma-publico-erro"] button').trigger('click')
    await flushPromises()

    expect(wrapper!.findAll('[data-teste="item-roteiro"]')).toHaveLength(4)
  })

  it('[COMPONENTE] sem conexão ao atualizar mantém a última versão e avisa', async () => {
    let tentativas = 0
    fetchSimulado.mockImplementation(async (entrada) => {
      if (String(entrada) !== ROTA_CONSULTA) {
        return respostaProblema(404, {})
      }
      tentativas += 1
      if (tentativas > 1) {
        throw new TypeError('Failed to fetch')
      }
      return respostaJson(cronogramaPublico())
    })

    await abrir()
    await wrapper!.get('[data-teste="cronograma-publico-atualizar"]').trigger('click')
    await flushPromises()

    expect(wrapper!.findAll('[data-teste="item-roteiro"]')).toHaveLength(4)
    expect(wrapper!.get('[data-teste="cronograma-publico-sem-conexao"]').text()).toContain('Sem conexão')
  })
})

describe('CronogramaPublicoView — agora / próximo', () => {
  const NO_DIA = cronogramaPublico({
    momento: { agora: '2027-05-15T14:20:00', fase: 'NoDia', diasParaOEvento: 0 },
    itens: [
      itemPublico({ situacao: 'Agora' }),
      itemPublico({ inicio: '19:00', termino: '21:00', atividade: 'Jantar', situacao: 'Proximo' }),
      itemPublico({ inicio: '21:30', termino: '23:00', atividade: 'Bolo', situacao: 'Depois' }),
    ],
  })

  it('[E2E] no dia mostra relógio ao vivo, Agora e Próximo do filtro, acima do roteiro', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(NO_DIA)))

    await abrir()

    expect(wrapper!.get('[data-teste="relogio-operacao-hora"]').text()).toBe('14:20')
    expect(wrapper!.get('[data-teste="relogio-operacao-selo"]').text()).toBe(TEXTOS_GRANDE_DIA.aoVivo)
    expect(wrapper!.get('[data-teste="cartao-agora-atividade"]').text()).toBe('Montagem do buffet')
    expect(wrapper!.get('[data-teste="linha-proximo-atividade"]').text()).toBe('Jantar')
    expect(wrapper!.get('[data-teste="linha-proximo-quando"]').text()).toContain('em 4 h 40')
    expect(wrapper!.get('[data-teste="painel-depois"]').text()).toContain('Bolo')
    expect(wrapper!.findAll('[data-teste="item-roteiro"]')).toHaveLength(3)
    expect(wrapper!.find('[data-teste="faixa-fase-dia"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] a visão pública não tem ações de marcar nem contatos', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(NO_DIA)))

    await abrir()

    const painel = wrapper!.get('[data-teste="painel-agora-proximo"]')
    expect(painel.find('button').exists()).toBe(false)
    expect(painel.find('a').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="contato-um-toque"]').exists()).toBe(false)
    expect(wrapper!.findAll('button').map((botao) => botao.attributes('data-teste'))).toEqual(['cronograma-publico-atualizar'])
  })

  it('[COMPONENTE] fora do dia mostra a faixa da fase e não o painel', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(cronogramaPublico())))

    await abrir()

    expect(wrapper!.get('[data-teste="faixa-fase-dia-titulo"]').text()).toBe(TEXTOS_GRANDE_DIA.antesTitulo)
    expect(wrapper!.find('[data-teste="painel-agora-proximo"]').exists()).toBe(false)
  })

  it('[COMPONENTE] volta ao primeiro plano consulta de novo; link inativo não volta a consultar', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(NO_DIA)))
    await abrir()

    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(chamadas(fetchSimulado, 'POST', ROTA_CONSULTA)).toHaveLength(2)

    wrapper!.unmount()
    fetchSimulado.mockReset()
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaProblema(404, { title: 'Link inválido' })))
    await abrir()
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(chamadas(fetchSimulado, 'POST', ROTA_CONSULTA)).toHaveLength(1)
  })
})

describe('CronogramaPublicoView — estrutura da fundação', () => {
  const estiloView = readFileSync(resolve(__dirname, '../CronogramaPublicoView.vue'), 'utf-8').split('<style scoped>')[1] ?? ''
  const estiloLayout = readFileSync(resolve(__dirname, '../../../layouts/LayoutPublico.vue'), 'utf-8')

  it('[COMPONENTE] com dados usa a folha ampla e agrupa os dias numa grade por contêiner', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(cronogramaPublico())))

    await abrir()

    expect(wrapper!.get('.layout-publico--operacao').classes()).toContain('layout-publico--amplo')
    const roteiro = wrapper!.get('[data-teste="cronograma-publico-roteiro"]')
    expect(roteiro.findAll('section[data-teste^="dia-roteiro-"]')).toHaveLength(2)
    expect(wrapper!.get('[data-teste="cronograma-publico"]').classes()).not.toContain('cronograma-publico__conteudo--ao-vivo')
    expect(wrapper!.find('[data-teste="relogio-operacao"]').exists()).toBe(false)
  })

  it('[COMPONENTE] no dia marca o conteúdo como ao vivo com o painel antes do roteiro', async () => {
    const noDia = cronogramaPublico({
      momento: { agora: '2027-05-15T14:20:00', fase: 'NoDia', diasParaOEvento: 0 },
      itens: [itemPublico({ situacao: 'Agora' })],
    })
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(noDia)))

    await abrir()

    const conteudo = wrapper!.get('[data-teste="cronograma-publico"]')
    expect(conteudo.classes()).toContain('cronograma-publico__conteudo--ao-vivo')
    const ordem = conteudo.findAll('.cronograma-publico__painel, [data-teste="cronograma-publico-roteiro"]').map((no) => no.classes()[0])
    expect(ordem).toEqual(['cronograma-publico__painel', 'cronograma-publico__roteiro'])
    expect(conteudo.find('.cronograma-publico__identificacao [data-teste="relogio-operacao"]').exists()).toBe(true)
  })

  it('[COMPONENTE] erro e carregamento ficam na coluna estreita, sem folha ampla', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaProblema(404, { title: 'Recurso não encontrado.' })))

    await abrir()

    expect(wrapper!.get('.layout-publico--operacao').classes()).not.toContain('layout-publico--amplo')
    expect(wrapper!.find('[data-teste="cronograma-publico"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilos da tela usam só o ritmo, ajustes por contêiner e nenhuma sombra ou gradiente', () => {
    expect(estiloView).not.toMatch(/--p-espaco-/)
    expect(estiloView).not.toMatch(/^\s*(gap|row-gap|column-gap|margin[\w-]*|padding[\w-]*|top):[^;]*\d+px/m)
    expect(estiloView).not.toMatch(/margin[^;]*-\d/)
    expect(estiloView).not.toMatch(/box-shadow|gradient|@media/)
    expect(estiloView).not.toMatch(/position:\s*sticky/)
    expect(estiloView).toContain('container: cronograma-publico / inline-size')
    expect(estiloView).toMatch(/@container cronograma-publico \(min-width: 40rem\)/)
    expect(estiloView).toMatch(/@container cronograma-publico \(min-width: 60rem\)/)
  })

  it('[UNITÁRIO] a variante operação aceita a folha ampla sem mudar o padrão', () => {
    expect(estiloLayout).toMatch(/\.layout-publico--operacao\.layout-publico--amplo \.layout-publico__folha \{\s*max-width: var\(--p-dimensao-largura-ampla\);/)
    expect(estiloLayout).toContain('amplo: false')
  })

  it('[UNITÁRIO] contorno dos controles no tema operação tem contraste mínimo de 3:1', () => {
    expect(razaoContraste(cores.operacaoBorda, cores.operacaoFundo)).toBeGreaterThanOrEqual(3)
    expect(razaoContraste(cores.operacaoBorda, cores.operacaoSuperficie)).toBeGreaterThanOrEqual(3)
  })
})
