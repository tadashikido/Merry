import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { TEXTOS_DADOS_SENSIVEIS, VERSAO_TERMO_PRIVACIDADE } from '@/textos/dadosSensiveis'
import type { RsvpPublicoDto } from '@/tipos/rsvp'
import { RaizRotas, chamadas, quando, rotearFetch } from '@/views/casamentos/__tests__/auxiliaresCasamentos'

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'
const ROTA_CONSULTA = '/api/rsvp/consulta'
const ROTA_RESPOSTA = '/api/rsvp/resposta'

function dados(extra: Partial<RsvpPublicoDto> = {}): RsvpPublicoDto {
  return {
    casamento: {
      nomePrimeiraPessoa: 'Ana Beatriz',
      nomeSegundaPessoa: 'Bruno',
      data: '2027-05-22',
      horario: '16:30',
      localCerimonia: null,
      localRecepcao: null,
    },
    nomeConvite: 'Família Souza',
    limiteAcompanhantes: 1,
    dataLimiteResposta: '2027-05-12',
    podeResponder: true,
    respondidoEm: null,
    pessoas: [
      { id: 'p1', nome: 'Célia Souza', faixaEtaria: 'Adulto', resposta: 'Pendente', possuiRestricao: false },
      { id: 'p2', nome: 'Lia Souza', faixaEtaria: 'Crianca', resposta: 'Pendente', possuiRestricao: false },
    ],
    acompanhantes: [],
    privacidade: { versaoTermo: VERSAO_TERMO_PRIVACIDADE, diasRetencao: 30 },
    ...extra,
  }
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  fetchSimulado = simularFetch()
  simularMatchMedia(true)
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
})

async function abrir() {
  const montagem = await prepararAplicacao(`/rsvp/${TOKEN}`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

async function clicar(seletor: string, indice = 0) {
  await wrapper!.findAll(seletor)[indice]!.trigger('click')
  await flushPromises()
}

async function enviar() {
  await wrapper!.get('form').trigger('submit')
  await flushPromises()
}

function respostaEnviada() {
  return respostaJson(dados({ respondidoEm: '2026-10-01T12:00:00Z' }))
}

describe('RsvpView — restrição alimentar e consentimento', { timeout: 20_000 }, () => {
  it('[COMPONENTE] seção por pessoa só aparece para quem vai; aviso mostra os dias da API', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados({ privacidade: { versaoTermo: VERSAO_TERMO_PRIVACIDADE, diasRetencao: 45 } }))))
    await abrir()

    expect(wrapper!.find('[data-teste="seletor-restricao"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="aviso-privacidade"]').exists()).toBe(false)

    await clicar('[data-teste="rsvp-todos-vao"]')

    expect(wrapper!.findAll('[data-teste="seletor-restricao"]')).toHaveLength(2)
    expect(wrapper!.get('[data-teste="aviso-privacidade"]').text()).toContain('45 dias depois do casamento')
    expect(wrapper!.find('[data-teste="caixa-consentimento"]').exists()).toBe(false)
  })

  it('[E2E] sem restrição, o fluxo de 3 toques não pede consentimento', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())), quando('PUT', ROTA_RESPOSTA, respostaEnviada))
    await abrir()

    await clicar('[data-teste="rsvp-todos-vao"]')
    await enviar()

    const envio = chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)
    expect(envio).toHaveLength(1)
    expect(corpoDaChamada(envio[0]!)).toEqual({
      token: TOKEN,
      pessoas: [
        { id: 'p1', resposta: 'Confirmado' },
        { id: 'p2', resposta: 'Confirmado' },
      ],
      acompanhantes: [],
    })
  })

  it('[SEGURANÇA] com restrição e sem consentimento não envia, mostra erro e foca a caixa', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())), quando('PUT', ROTA_RESPOSTA, respostaEnviada))
    await abrir()
    await clicar('[data-teste="rsvp-todos-vao"]')

    await clicar('[data-teste="restricao-abrir"]', 1)
    await clicar('[data-teste="restricao-tipo-SemGluten"]')
    expect(wrapper!.get('[data-teste="consentimento-entrada"]').element).toHaveProperty('checked', false)

    await enviar()

    expect(chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)).toHaveLength(0)
    expect(wrapper!.get('[data-teste="consentimento-erro"]').text()).toBe(TEXTOS_DADOS_SENSIVEIS.erroConsentimento)
    expect(document.activeElement?.id).toBe('rsvp-consentimento')
  })

  it('[E2E] com consentimento envia restrição só da pessoa informada e a versão do termo', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())), quando('PUT', ROTA_RESPOSTA, respostaEnviada))
    await abrir()
    await clicar('[data-teste="rsvp-todos-vao"]')
    await clicar('[data-teste="restricao-abrir"]', 1)
    await clicar('[data-teste="restricao-tipo-SemGluten"]')
    await wrapper!.get('[data-teste="restricao-outra"]').setValue('  sem   porco ')
    await wrapper!.get('[data-teste="consentimento-entrada"]').setValue(true)

    await enviar()

    const envio = chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)
    expect(envio).toHaveLength(1)
    expect(corpoDaChamada(envio[0]!)).toEqual({
      token: TOKEN,
      pessoas: [
        { id: 'p1', resposta: 'Confirmado' },
        { id: 'p2', resposta: 'Confirmado', restricao: { tipos: ['SemGluten'], outraRestricao: 'sem porco', necessidadeEspecial: null } },
      ],
      acompanhantes: [],
      consentimento: { aceito: true, versaoTermo: VERSAO_TERMO_PRIVACIDADE },
    })
  })

  it('[COMPONENTE] texto longo demais é barrado antes do envio', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())))
    await abrir()
    await clicar('[data-teste="rsvp-todos-vao"]')
    await clicar('[data-teste="restricao-abrir"]')
    const campo = wrapper!.get<HTMLInputElement>('[data-teste="restricao-outra"]')
    campo.element.removeAttribute('maxlength')
    await campo.setValue('x'.repeat(90))
    await wrapper!.get('[data-teste="consentimento-entrada"]').setValue(true)

    await enviar()

    expect(chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)).toHaveLength(0)
    expect(wrapper!.get('[data-teste="restricao-erro"]').text()).toBe(TEXTOS_DADOS_SENSIVEIS.erroOutraLonga)
  })

  it('[SEGURANÇA] registro existente não expõe conteúdo; remover envia objeto vazio sem pedir consentimento', async () => {
    const comRegistro = dados({
      respondidoEm: '2026-10-01T12:00:00Z',
      pessoas: [
        { id: 'p1', nome: 'Célia Souza', faixaEtaria: 'Adulto', resposta: 'Confirmado', possuiRestricao: true },
        { id: 'p2', nome: 'Lia Souza', faixaEtaria: 'Crianca', resposta: 'Confirmado', possuiRestricao: false },
      ],
    })
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(comRegistro)), quando('PUT', ROTA_RESPOSTA, () => respostaJson(comRegistro)))
    await abrir()

    expect(wrapper!.findAll('[data-teste="rsvp-resumo-restricao"]')).toHaveLength(1)
    await clicar('[data-teste="rsvp-alterar"]')
    expect(wrapper!.get('[data-teste="restricao-registrada"]').text()).toContain(TEXTOS_DADOS_SENSIVEIS.naoExibimos)

    await clicar('[data-teste="restricao-remover"]')
    await enviar()

    const envio = chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)
    expect(corpoDaChamada(envio[0]!)).toEqual({
      token: TOKEN,
      pessoas: [
        { id: 'p1', resposta: 'Confirmado', restricao: { tipos: [], outraRestricao: null, necessidadeEspecial: null } },
        { id: 'p2', resposta: 'Confirmado' },
      ],
      acompanhantes: [],
    })
  })

  it('[COMPONENTE] quem tinha restrição e passa a não ir vê aviso de apagamento e nada é enviado para ela', async () => {
    const comRegistro = dados({
      respondidoEm: '2026-10-01T12:00:00Z',
      pessoas: [
        { id: 'p1', nome: 'Célia Souza', faixaEtaria: 'Adulto', resposta: 'Confirmado', possuiRestricao: true },
        { id: 'p2', nome: 'Lia Souza', faixaEtaria: 'Crianca', resposta: 'Confirmado', possuiRestricao: false },
      ],
    })
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(comRegistro)), quando('PUT', ROTA_RESPOSTA, () => respostaJson(comRegistro)))
    await abrir()
    await clicar('[data-teste="rsvp-alterar"]')

    await wrapper!.findAll('[data-teste="rsvp-pessoa"]')[0]!.find('input[value="Recusado"]').setValue(true)
    await flushPromises()

    expect(wrapper!.get('[data-teste="rsvp-restricao-sera-apagada"]').text()).toBe(TEXTOS_DADOS_SENSIVEIS.seraApagadaRecusa('Célia Souza'))
    await enviar()
    expect(corpoDaChamada(chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)[0]!)).toEqual({
      token: TOKEN,
      pessoas: [
        { id: 'p1', resposta: 'Recusado' },
        { id: 'p2', resposta: 'Confirmado' },
      ],
      acompanhantes: [],
    })
  })

  it('[E2E] acompanhante novo pode informar necessidade especial', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())), quando('PUT', ROTA_RESPOSTA, respostaEnviada))
    await abrir()
    await clicar('[data-teste="rsvp-todos-vao"]')
    await clicar('[data-teste="adicionar-item"]')
    await wrapper!.get('[data-teste="rsvp-nome-acompanhante"]').setValue('Pedro Lima')
    await clicar('[data-teste="restricao-abrir"]', 2)
    await wrapper!.get('[data-teste="restricao-necessidade"]').setValue('rampa de acesso')
    await wrapper!.get('[data-teste="consentimento-entrada"]').setValue(true)

    await enviar()

    const corpo = corpoDaChamada(chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)[0]!) as { acompanhantes: unknown[]; consentimento: unknown }
    expect(corpo.acompanhantes).toEqual([
      { id: null, nome: 'Pedro Lima', faixaEtaria: 'Adulto', restricao: { tipos: [], outraRestricao: null, necessidadeEspecial: 'rampa de acesso' } },
    ])
    expect(corpo.consentimento).toEqual({ aceito: true, versaoTermo: VERSAO_TERMO_PRIVACIDADE })
  })

  it('[INTEGRAÇÃO] 422 de termo desatualizado aparece e as escolhas continuam na tela', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () => respostaJson(dados())),
      quando('PUT', ROTA_RESPOSTA, () => respostaProblema(422, { title: 'Regra', detail: 'O texto de privacidade foi atualizado. Recarregue a página e confira antes de enviar.' })),
    )
    await abrir()
    await clicar('[data-teste="rsvp-todos-vao"]')
    await clicar('[data-teste="restricao-abrir"]')
    await clicar('[data-teste="restricao-tipo-Vegana"]')
    await wrapper!.get('[data-teste="consentimento-entrada"]').setValue(true)

    await enviar()

    expect(wrapper!.get('[data-teste="rsvp-erro"]').text()).toContain('texto de privacidade foi atualizado')
    expect(wrapper!.get('[data-teste="restricao-tipo-Vegana"]').attributes('aria-pressed')).toBe('true')
  })

  it('[INTEGRAÇÃO] falha de rede preserva restrições e consentimento', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())))
    fetchSimulado.mockImplementationOnce(async () => respostaJson(dados()))
    await abrir()
    await clicar('[data-teste="rsvp-todos-vao"]')
    await clicar('[data-teste="restricao-abrir"]')
    await clicar('[data-teste="restricao-tipo-Vegana"]')
    await wrapper!.get('[data-teste="consentimento-entrada"]').setValue(true)
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await enviar()

    expect(wrapper!.find('[data-teste="rsvp-erro"]').exists()).toBe(true)
    expect(wrapper!.get('[data-teste="restricao-tipo-Vegana"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper!.get('[data-teste="consentimento-entrada"]').element).toHaveProperty('checked', true)
  })
})
