import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { corpoDaChamada, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { TEXTOS_RSVP } from '@/textos/rsvp'
import type { RsvpPublicoDto } from '@/tipos/rsvp'
import { RaizRotas, chamadas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('rsvp')

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde'
const ROTA_CONSULTA = '/api/rsvp/consulta'
const ROTA_RESPOSTA = '/api/rsvp/resposta'

function dados(extra: Partial<RsvpPublicoDto> = {}): RsvpPublicoDto {
  return {
    evento: {
      tipo: 'Casamento',
      nomePrimeiraPessoa: 'Ana Beatriz',
      nomeSegundaPessoa: 'Bruno',
      data: '2027-05-22',
      horario: '16:30',
      localCerimonia: 'Igreja São José',
      localRecepcao: 'Espaço Jardim',
    },
    nomeConvite: 'Família Souza',
    limiteAcompanhantes: 1,
    dataLimiteResposta: '2027-05-12',
    podeResponder: true,
    respondidoEm: null,
    pessoas: [
      { id: 'p1', nome: 'Célia Souza', faixaEtaria: 'Adulto', resposta: 'Pendente', possuiRestricao: false },
      { id: 'p2', nome: 'Antônio Souza', faixaEtaria: 'Adulto', resposta: 'Pendente', possuiRestricao: false },
      { id: 'p3', nome: 'Lia Souza', faixaEtaria: 'Crianca', resposta: 'Pendente', possuiRestricao: false },
    ],
    acompanhantes: [],
    privacidade: { versaoTermo: '2026-09-29', diasRetencao: 30 },
    ...extra,
  }
}

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

async function abrir(token = TOKEN) {
  const montagem = await prepararAplicacao(`/rsvp/${token}`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

async function clicar(seletor: string) {
  await wrapper!.get(seletor).trigger('click')
  await flushPromises()
}

describe('RsvpView', () => {
  it('[E2E] convite de uma pessoa no visual Celebri: abrir, Vou e Enviar resposta (3 toques)', async () => {
    const umaPessoa = dados({ nomeConvite: 'Helena Duarte', limiteAcompanhantes: 0, pessoas: [{ id: 'p1', nome: 'Helena Duarte', faixaEtaria: 'Adulto', resposta: 'Pendente', possuiRestricao: false }] })
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () => respostaJson(umaPessoa)),
      quando('PUT', ROTA_RESPOSTA, () =>
        respostaJson({ ...umaPessoa, respondidoEm: '2026-10-01T12:00:00Z', pessoas: [{ ...umaPessoa.pessoas[0]!, resposta: 'Confirmado' as const }] }),
      ),
    )

    await abrir()
    expect(wrapper!.find('.layout-publico--convite').exists()).toBe(true)
    expect(wrapper!.find('.cabecalho-convite__frase').exists()).toBe(true)
    expect(wrapper!.find('.layout-publico__cabecalho').exists()).toBe(false)

    await wrapper!.get('[data-teste="opcao-Confirmado"] input').setValue(true)
    await flushPromises()
    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    const envio = chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)
    expect(envio).toHaveLength(1)
    expect(corpoDaChamada(envio[0]!)).toMatchObject({ token: TOKEN, pessoas: [{ id: 'p1', resposta: 'Confirmado' }] })
    expect(wrapper!.find('[data-teste="rsvp-resumo"]').exists()).toBe(true)
  })

  it('[E2E] confirma todos em 3 toques: abrir, Todos vão, Enviar resposta', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () => respostaJson(dados())),
      quando('PUT', ROTA_RESPOSTA, () =>
        respostaJson(
          dados({
            respondidoEm: '2026-10-01T12:00:00Z',
            pessoas: dados().pessoas.map((pessoa) => ({ ...pessoa, resposta: 'Confirmado' as const })),
          }),
        ),
      ),
    )

    await abrir()
    expect(wrapper!.get('h1').text()).toContain('Ana Beatriz')
    expect(wrapper!.text()).toContain('Família Souza')
    expect(wrapper!.text()).toContain('Responda até 12 de maio')
    expect(wrapper!.get('[data-teste="rsvp-contador"]').text()).toBe('Falta responder por 3 pessoas')

    await clicar('[data-teste="rsvp-todos-vao"]')
    expect(wrapper!.get('[data-teste="rsvp-contador"]').text()).toBe('3 de 3 vão')

    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    const envio = chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)
    expect(envio).toHaveLength(1)
    expect(corpoDaChamada(envio[0]!)).toEqual({
      token: TOKEN,
      pessoas: [
        { id: 'p1', resposta: 'Confirmado' },
        { id: 'p2', resposta: 'Confirmado' },
        { id: 'p3', resposta: 'Confirmado' },
      ],
      acompanhantes: [],
    })
    expect(wrapper!.get('[data-teste="selo-confirmacao"]').text()).toContain(TEXTOS_RSVP.enviada)
    expect(wrapper!.text()).toContain('Obrigado, Família Souza.')
    expect(document.activeElement?.textContent?.trim()).toBe(TEXTOS_RSVP.enviada)
    expect(wrapper!.findAll('[data-teste="rsvp-linha-resumo"]')).toHaveLength(3)
  })

  it('[COMPONENTE] faltando escolha, não envia e foca a primeira pessoa sem resposta', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())))
    await abrir()

    await wrapper!.findAll('[data-teste="rsvp-pessoa"]')[0]!.find('input[value="Confirmado"]').setValue(true)
    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)).toHaveLength(0)
    expect(wrapper!.findAll('[data-teste="erro-escolha"]')).toHaveLength(2)
    expect(document.activeElement?.id).toBe('rsvp-pessoa-p2')
    expect(wrapper!.get('[data-teste="rsvp-contador"]').text()).toBe('Falta responder por 2 pessoas')
  })

  it('[COMPONENTE] acompanhantes só aparecem quando alguém vai e são enviados com nome', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () => respostaJson(dados())),
      quando('PUT', ROTA_RESPOSTA, () => respostaJson(dados({ respondidoEm: '2026-10-01T12:00:00Z' }))),
    )
    await abrir()
    expect(wrapper!.find('[data-teste="rsvp-acompanhantes"]').exists()).toBe(false)

    await clicar('[data-teste="rsvp-todos-vao"]')
    expect(wrapper!.find('[data-teste="rsvp-acompanhantes"]').exists()).toBe(true)
    await clicar('[data-teste="adicionar-item"]')
    await wrapper!.get('[data-teste="rsvp-nome-acompanhante"]').setValue('P')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()
    expect(chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)).toHaveLength(0)
    expect(wrapper!.text()).toContain(TEXTOS_RSVP.erroNomeAcompanhante)

    await wrapper!.get('[data-teste="rsvp-nome-acompanhante"]').setValue(' Pedro Lima ')
    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(corpoDaChamada(chamadas(fetchSimulado, 'PUT', ROTA_RESPOSTA)[0]!)).toMatchObject({
      acompanhantes: [{ id: null, nome: 'Pedro Lima', faixaEtaria: 'Adulto' }],
    })
  })

  it('[COMPONENTE] seletor de faixa etária do acompanhante tem rótulo visível associado', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())))
    await abrir()

    await clicar('[data-teste="rsvp-todos-vao"]')
    await clicar('[data-teste="adicionar-item"]')

    const rotulo = wrapper!.get('[data-teste="rsvp-rotulo-faixa-acompanhante"]')
    expect(rotulo.text()).toBe('Faixa etária')
    expect(rotulo.isVisible()).toBe(true)
    const idRotulo = rotulo.attributes('id')
    expect(idRotulo).toBeTruthy()
    const grupo = wrapper!.get(`[role="group"][aria-labelledby="${idRotulo}"]`)
    const seletor = grupo.get('[data-teste="rsvp-faixa-acompanhante"]')
    expect(seletor.attributes('aria-labelledby')).toBe(idRotulo)
    expect(seletor.attributes('aria-label')).toBeUndefined()
    expect(seletor.text()).toContain('Adulto')
    expect(seletor.text()).toContain('Criança')
  })

  it('[COMPONENTE] ninguém vai retira acompanhantes com aviso', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())))
    await abrir()
    await clicar('[data-teste="rsvp-todos-vao"]')
    await clicar('[data-teste="adicionar-item"]')

    await clicar('[data-teste="rsvp-ninguem-vai"]')

    expect(wrapper!.find('[data-teste="rsvp-acompanhantes"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="rsvp-aviso"]').text()).toContain(TEXTOS_RSVP.acompanhantesRetirados)
    expect(wrapper!.get('[data-teste="rsvp-contador"]').text()).toBe('0 de 3 vão')
  })

  it('[SEGURANÇA] token fora do formato mostra link inativo sem chamar a API', async () => {
    rotearFetch(fetchSimulado)
    await abrir('token-curto')

    expect(wrapper!.get('[data-teste="estado-erro"]').text()).toContain(TEXTOS_RSVP.linkInativoTitulo)
    expect(chamadas(fetchSimulado, 'POST', ROTA_CONSULTA)).toHaveLength(0)
    expect(wrapper!.find('[data-teste="tentar-novamente"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] 404 da API mostra o mesmo estado de link inativo', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaProblema(404, { title: 'Recurso não encontrado.' })))
    await abrir()

    expect(wrapper!.get('[data-teste="estado-erro"]').text()).toContain(TEXTOS_RSVP.linkInativoTexto)
  })

  it('[COMPONENTE] 429 e falha de rede permitem tentar novamente', async () => {
    let tentativas = 0
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () => {
        tentativas += 1
        return tentativas === 1 ? respostaProblema(429, { title: 'Muitas tentativas.' }) : respostaJson(dados())
      }),
    )
    await abrir()
    expect(wrapper!.text()).toContain(TEXTOS_RSVP.muitasTentativasTitulo)

    await clicar('[data-teste="tentar-novamente"]')

    expect(wrapper!.find('form').exists()).toBe(true)
  })

  it('[COMPONENTE] já respondido abre no resumo e permite alterar até o prazo', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () =>
        respostaJson(
          dados({
            respondidoEm: '2026-10-01T12:00:00Z',
            pessoas: [
              { id: 'p1', nome: 'Célia Souza', faixaEtaria: 'Adulto', resposta: 'Confirmado', possuiRestricao: false },
              { id: 'p2', nome: 'Antônio Souza', faixaEtaria: 'Adulto', resposta: 'Recusado', possuiRestricao: false },
            ],
            acompanhantes: [{ id: 'a1', nome: 'Pedro Lima', faixaEtaria: 'Adulto', possuiRestricao: false }],
          }),
        ),
      ),
    )
    await abrir()

    expect(wrapper!.get('[data-teste="selo-confirmacao"]').text()).toContain(TEXTOS_RSVP.suaResposta)
    expect(wrapper!.text()).toContain('Pedro Lima (acompanhante)')
    expect(wrapper!.text()).toContain('Você pode alterar até 12 de maio.')

    await clicar('[data-teste="rsvp-alterar"]')

    const pessoas = wrapper!.findAll('[data-teste="rsvp-pessoa"]')
    expect((pessoas[0]!.get('input[value="Confirmado"]').element as HTMLInputElement).checked).toBe(true)
    expect((pessoas[1]!.get('input[value="Recusado"]').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper!.get('[data-teste="rsvp-nome-acompanhante"]').element as HTMLInputElement).value).toBe('Pedro Lima')
  })

  it('[COMPONENTE] prazo encerrado mostra só leitura sem botão de alterar', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados({ podeResponder: false }))))
    await abrir()

    expect(wrapper!.find('form').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="rsvp-prazo-encerrado"]').text()).toContain('O prazo para responder terminou em 12 de maio')
    expect(wrapper!.find('[data-teste="rsvp-alterar"]').exists()).toBe(false)
  })

  it('[COMPONENTE] 422 no envio mostra a mensagem do servidor e recarrega o prazo', async () => {
    let consultas = 0
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () => {
        consultas += 1
        return respostaJson(dados({ podeResponder: consultas === 1 }))
      }),
      quando('PUT', ROTA_RESPOSTA, () => respostaProblema(422, { title: 'Regra', detail: 'O prazo para responder terminou.' })),
    )
    await abrir()
    await clicar('[data-teste="rsvp-todos-vao"]')

    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper!.find('form').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="rsvp-prazo-encerrado"]').exists()).toBe(true)
  })

  it('[COMPONENTE] 422 de regra com prazo aberto mantém o formulário e mostra a mensagem', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () => respostaJson(dados())),
      quando('PUT', ROTA_RESPOSTA, () =>
        respostaProblema(422, { title: 'Regra', detail: 'O número de acompanhantes passou do limite deste convite.' }),
      ),
    )
    await abrir()
    await clicar('[data-teste="rsvp-todos-vao"]')

    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('[data-teste="rsvp-erro"]').text()).toBe('O número de acompanhantes passou do limite deste convite.')
    expect(wrapper!.get('[data-teste="rsvp-contador"]').text()).toBe('3 de 3 vão')
  })

  it('[COMPONENTE] falha de rede no envio preserva escolhas e orienta', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())))
    await abrir()
    await clicar('[data-teste="rsvp-todos-vao"]')
    fetchSimulado.mockRejectedValueOnce(new TypeError('rede'))

    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('[data-teste="rsvp-erro"]').text()).toBe(TEXTOS_RSVP.erroEnviar)
    expect(wrapper!.get('[data-teste="rsvp-contador"]').text()).toBe('3 de 3 vão')
  })

  it('[COMPONENTE] 409 recarrega a versão mais recente e avisa', async () => {
    rotearFetch(
      fetchSimulado,
      quando('POST', ROTA_CONSULTA, () => respostaJson(dados())),
      quando('PUT', ROTA_RESPOSTA, () => respostaProblema(409, { title: 'Conflito' })),
    )
    await abrir()
    await clicar('[data-teste="rsvp-todos-vao"]')

    await wrapper!.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper!.get('[data-teste="rsvp-aviso"]').text()).toContain(TEXTOS_RSVP.conflito)
    expect(chamadas(fetchSimulado, 'POST', ROTA_CONSULTA)).toHaveLength(2)
  })

  it('[SEGURANÇA] não envia Authorization mesmo com sessão ativa e define noindex', async () => {
    rotearFetch(fetchSimulado, quando('POST', ROTA_CONSULTA, () => respostaJson(dados())))
    const { registrarProvedorAutenticacao } = await import('@/servicos/clienteHttp')
    registrarProvedorAutenticacao({ obterToken: () => 'jwt', renovar: vi.fn(async () => false) })

    await abrir()

    const [, init] = chamadas(fetchSimulado, 'POST', ROTA_CONSULTA)[0]!
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
    registrarProvedorAutenticacao(null)
  })
})
