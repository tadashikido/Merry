import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { TOKEN_CRONOGRAMA, cronogramaPublico, itemPublico } from '@/__tests__/auxiliaresCronogramaPublico'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { rotas } from '@/router'
import { TEXTOS_CRONOGRAMA_PUBLICO } from '@/textos/cronogramaPublico'
import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'
import { RaizRotas, chamadas, quando, rotearFetch } from '@/views/casamentos/__tests__/auxiliaresCasamentos'

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

describe('CronogramaPublicoView', { timeout: 20_000 }, () => {
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
      'dia-roteiro-DiaDoCasamento',
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

describe('CronogramaPublicoView — agora / próximo', { timeout: 20_000 }, () => {
  const NO_DIA = cronogramaPublico({
    momento: { agora: '2027-05-15T14:20:00', fase: 'NoDia', diasParaOCasamento: 0 },
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
