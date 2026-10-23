import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { SESSAO_EXEMPLO, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { ID_TITULO_ACESSO_ANFITRIAO } from '@/textos/acessoAnfitriao'
import { PASSOS_ONBOARDING, TEXTOS_PROXIMOS_PASSOS } from '@/textos/proximosPassos'
import type { AcessoAnfitriaoDto } from '@/tipos/acessoAnfitriao'
import type { SessaoDto } from '@/tipos/api'
import type { ProximosPassosEventoDto } from '@/tipos/proximosPassos'
import { CHAVE_DISPENSA_PROXIMOS_PASSOS } from '@/utilitarios/dispensaProximosPassos'
import { ID_EVENTO, ID_OUTRO, RaizRotas, eventoCompleto, chamadas, quando, type Rota } from './auxiliaresEventos'

await precarregarRotas('evento')

const notificacoes = vi.hoisted(() => ({ sucesso: vi.fn(), erro: vi.fn() }))

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => notificacoes,
  DURACAO_TOAST_SUCESSO: 4000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_PASSOS = `${ROTA_EVENTO}/proximos-passos`
const ROTA_ACESSOS = `${ROTA_EVENTO}/acessos-anfitriao`

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

function passos(dados: Partial<ProximosPassosEventoDto> = {}): ProximosPassosEventoDto {
  const base = {
    anfitriaoConvidado: false,
    checklistAplicado: false,
    convidadosCadastrados: false,
    convitesEnviados: false,
    ...dados,
  }
  return {
    ...base,
    todosConcluidos: base.anfitriaoConvidado && base.checklistAplicado && base.convidadosCadastrados && base.convitesEnviados,
  }
}

function acesso(dados: Partial<AcessoAnfitriaoDto> = {}): AcessoAnfitriaoDto {
  return {
    id: 'a1',
    nome: 'Lívia Moraes',
    email: 'livia@exemplo.com',
    situacao: 'Pendente',
    convidadoEm: '2026-09-29T12:00:00Z',
    conviteExpiraEm: '2026-10-06T12:00:00Z',
    aceitoEm: null,
    ...dados,
  }
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

function rotasDona(...extras: Rota[]) {
  rotear(
    fetchSimulado,
    SESSAO_EXEMPLO,
    ...extras,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())),
    quando('GET', ROTA_ACESSOS, () => respostaJson([])),
  )
}

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
  notificacoes.sucesso.mockClear()
  notificacoes.erro.mockClear()
  window.localStorage.clear()
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
  window.localStorage.clear()
  vi.restoreAllMocks()
})

async function abrir(caminho = `/eventos/${ID_EVENTO}`) {
  const montagem = await prepararAplicacao(caminho)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return { montagem, wrapper }
}

function bloco() {
  return wrapper!.find('[data-teste="bloco-proximos-passos"]')
}

describe('Próximos passos na visão do evento', () => {
  it('[COMPONENTE] evento recém-criado mostra os 4 passos pendentes com o primeiro como atual', async () => {
    rotasDona(quando('GET', ROTA_PASSOS, () => respostaJson(passos())))

    await abrir()

    expect(bloco().exists()).toBe(true)
    expect(bloco().get('h2').text()).toBe(TEXTOS_PROXIMOS_PASSOS.titulo)
    expect(bloco().attributes('aria-labelledby')).toBe(bloco().get('h2').attributes('id'))
    const itens = bloco().findAll('ol > li')
    expect(itens.map((item) => item.find('.proximos-passos__rotulo').text())).toEqual(PASSOS_ONBOARDING.map((passo) => passo.rotulo))
    expect(itens[0]!.attributes('aria-current')).toBe('step')
    expect(itens.slice(1).every((item) => item.attributes('aria-current') === undefined)).toBe(true)
    expect(bloco().get('[data-teste="progresso-proximos-passos"]').text()).toBe(TEXTOS_PROXIMOS_PASSOS.progresso(4, 4))
    expect(bloco().get('.proximos-passos__fio').attributes('aria-hidden')).toBe('true')
    expect(chamadas(fetchSimulado, 'GET', ROTA_PASSOS)).toHaveLength(1)
  })

  it('[COMPONENTE] três passos concluídos deixam "Enviar convites" como atual com ação para os convidados', async () => {
    rotasDona(
      quando('GET', ROTA_PASSOS, () => respostaJson(passos({ anfitriaoConvidado: true, checklistAplicado: true, convidadosCadastrados: true }))),
      quando('GET', ROTA_ACESSOS, () => respostaJson([acesso()])),
    )

    await abrir()

    const concluidos = bloco().findAll('.proximos-passos__passo--concluido')
    expect(concluidos).toHaveLength(3)
    expect(concluidos.every((item) => item.text().includes(TEXTOS_PROXIMOS_PASSOS.concluido))).toBe(true)
    const atual = bloco().get('[aria-current="step"]')
    expect(atual.attributes('data-teste')).toBe('passo-convitesEnviados')
    expect(atual.get('[data-teste="acao-convitesEnviados"]').attributes('href')).toBe(`/eventos/${ID_EVENTO}/convidados`)
    expect(bloco().get('[data-teste="progresso-proximos-passos"]').text()).toBe(TEXTOS_PROXIMOS_PASSOS.progresso(1, 4))
  })

  it('[COMPONENTE] passos pendentes posteriores oferecem link direto para a tela correspondente', async () => {
    rotasDona(quando('GET', ROTA_PASSOS, () => respostaJson(passos())))

    await abrir()

    expect(bloco().get('[data-teste="passo-checklistAplicado"] a').attributes('href')).toBe(`/eventos/${ID_EVENTO}/checklist`)
    expect(bloco().get('[data-teste="passo-convidadosCadastrados"] a').attributes('href')).toBe(`/eventos/${ID_EVENTO}/convidados`)
  })

  it('[COMPONENTE] passo concluído fora de ordem aparece concluído e o atual continua sendo o primeiro pendente', async () => {
    rotasDona(quando('GET', ROTA_PASSOS, () => respostaJson(passos({ convidadosCadastrados: true }))))

    await abrir()

    expect(bloco().get('[aria-current="step"]').attributes('data-teste')).toBe('passo-anfitriaoConvidado')
    expect(bloco().get('[data-teste="passo-convidadosCadastrados"]').classes()).toContain('proximos-passos__passo--concluido')
  })

  it('[COMPONENTE] todos os passos concluídos escondem o bloco', async () => {
    rotasDona(
      quando('GET', ROTA_PASSOS, () =>
        respostaJson(passos({ anfitriaoConvidado: true, checklistAplicado: true, convidadosCadastrados: true, convitesEnviados: true })),
      ),
      quando('GET', ROTA_ACESSOS, () => respostaJson([acesso({ situacao: 'Ativo', aceitoEm: '2026-09-30T12:00:00Z' })])),
    )

    await abrir()

    expect(bloco().exists()).toBe(false)
  })

  it('[INTEGRAÇÃO] convidar os anfitriões pelo bloco de acesso conclui o passo sem nova requisição', async () => {
    rotasDona(
      quando('GET', ROTA_PASSOS, () => respostaJson(passos())),
      quando('POST', ROTA_ACESSOS, () => respostaJson(acesso(), 201)),
    )
    await abrir()
    expect(bloco().get('[aria-current="step"]').attributes('data-teste')).toBe('passo-anfitriaoConvidado')

    await wrapper!.findAll('[data-teste="convidar-anfitriao"]')[0]!.trigger('click')
    await flushPromises()
    await wrapper!.get('#acesso-anfitriao-0-nome').setValue('Lívia Moraes')
    await wrapper!.get('#acesso-anfitriao-0-email').setValue('livia@exemplo.com')
    await wrapper!.get('[data-teste="formulario-convite-anfitriao"]').trigger('submit')
    await flushPromises()

    expect(bloco().get('[data-teste="passo-anfitriaoConvidado"]').classes()).toContain('proximos-passos__passo--concluido')
    expect(bloco().get('[aria-current="step"]').attributes('data-teste')).toBe('passo-checklistAplicado')
    expect(chamadas(fetchSimulado, 'GET', ROTA_PASSOS)).toHaveLength(1)
  })

  it('[COMPONENTE] convite dos anfitriões expirado mantém o passo pendente', async () => {
    rotasDona(
      quando('GET', ROTA_PASSOS, () => respostaJson(passos())),
      quando('GET', ROTA_ACESSOS, () => respostaJson([acesso({ situacao: 'Expirado' })])),
    )

    await abrir()

    expect(bloco().get('[aria-current="step"]').attributes('data-teste')).toBe('passo-anfitriaoConvidado')
  })

  it('[COMPONENTE] a ação "Convidar os anfitriões" leva o foco ao bloco de acesso dos anfitriões', async () => {
    rotasDona(quando('GET', ROTA_PASSOS, () => respostaJson(passos())))
    await abrir()

    await bloco().get('[data-teste="acao-anfitriaoConvidado"]').trigger('click')
    await flushPromises()

    expect(document.activeElement?.id).toBe(ID_TITULO_ACESSO_ANFITRIAO)
    expect(document.getElementById(ID_TITULO_ACESSO_ANFITRIAO)?.getAttribute('tabindex')).toBe('-1')
  })

  it('[INTEGRAÇÃO] dispensar esconde o bloco, confirma e persiste só para aquele evento', async () => {
    rotasDona(quando('GET', ROTA_PASSOS, () => respostaJson(passos())))
    await abrir()

    await bloco().get('[data-teste="dispensar-proximos-passos"]').trigger('click')
    await flushPromises()

    expect(bloco().exists()).toBe(false)
    expect(notificacoes.sucesso).toHaveBeenCalledWith(TEXTOS_PROXIMOS_PASSOS.dispensado)
    expect(JSON.parse(window.localStorage.getItem(CHAVE_DISPENSA_PROXIMOS_PASSOS)!)).toEqual([ID_EVENTO])

    wrapper!.unmount()
    document.body.innerHTML = ''
    fetchSimulado.mockClear()
    await abrir()
    expect(bloco().exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', ROTA_PASSOS)).toHaveLength(0)
  })

  it('[COMPONENTE] dispensa de outro evento não esconde este', async () => {
    window.localStorage.setItem(CHAVE_DISPENSA_PROXIMOS_PASSOS, JSON.stringify([ID_OUTRO]))
    rotasDona(quando('GET', ROTA_PASSOS, () => respostaJson(passos())))

    await abrir()

    expect(bloco().exists()).toBe(true)
  })

  it('[COMPONENTE] armazenamento local bloqueado não impede exibir nem dispensar', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })
    rotasDona(quando('GET', ROTA_PASSOS, () => respostaJson(passos())))
    await abrir()
    expect(bloco().exists()).toBe(true)

    await bloco().get('[data-teste="dispensar-proximos-passos"]').trigger('click')
    await flushPromises()

    expect(bloco().exists()).toBe(false)
  })

  it('[COMPONENTE] erro de serviço mostra a mensagem e tentar novamente refaz a consulta', async () => {
    let falhar = true
    rotasDona(quando('GET', ROTA_PASSOS, () => (falhar ? respostaProblema(500) : respostaJson(passos()))))
    await abrir()

    const erro = bloco().get('[data-teste="erro-proximos-passos"]')
    expect(erro.attributes('role')).toBe('alert')
    expect(erro.text()).toContain(TEXTOS_PROXIMOS_PASSOS.erro)

    falhar = false
    await erro.get('[data-teste="tentar-proximos-passos"]').trigger('click')
    await flushPromises()

    expect(bloco().find('[data-teste="erro-proximos-passos"]').exists()).toBe(false)
    expect(bloco().findAll('ol > li')).toHaveLength(4)
    expect(chamadas(fetchSimulado, 'GET', ROTA_PASSOS)).toHaveLength(2)
  })

  it('[SEGURANÇA] resposta 403 esconde o bloco sem mensagem', async () => {
    rotasDona(quando('GET', ROTA_PASSOS, () => respostaProblema(403)))

    await abrir()

    expect(bloco().exists()).toBe(false)
  })

  it('[COMPONENTE] evento arquivado não mostra o bloco nem consulta os passos', async () => {
    rotear(
      fetchSimulado,
      SESSAO_EXEMPLO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ arquivado: true, arquivadoEm: '2026-09-28T13:00:00Z' }))),
      quando('GET', ROTA_PASSOS, () => respostaJson(passos())),
    )

    await abrir()

    expect(bloco().exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', ROTA_PASSOS)).toHaveLength(0)
  })

  it('[SEGURANÇA] os anfitriões não veem o bloco e nenhuma requisição de próximos passos é feita', async () => {
    rotear(
      fetchSimulado,
      SESSAO_ANFITRIAO,
      quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ observacoes: null }))),
      quando('GET', ROTA_PASSOS, () => respostaJson(passos())),
    )

    await abrir()

    expect(wrapper!.find('h1').exists()).toBe(true)
    expect(bloco().exists()).toBe(false)
    expect(chamadas(fetchSimulado, 'GET', ROTA_PASSOS)).toHaveLength(0)
  })
})
