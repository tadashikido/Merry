import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub, type VueWrapper } from '@vue/test-utils'

import { painelExemplo } from '@/__tests__/auxiliaresConfirmacoes'
import ProximosPassosConfirmacoes from '@/componentes/confirmacoes/ProximosPassosConfirmacoes.vue'
import { TEXTOS_PROXIMOS_PASSOS_CONFIRMACOES as TEXTOS } from '@/textos/confirmacoes'
import type { ConvitePendenteDto, PainelConfirmacoesDto } from '@/tipos/confirmacoes'
import type { TipoEvento } from '@/tipos/eventos'

const ESTILO = (() => {
  const fonte = readFileSync(resolve(__dirname, '../ProximosPassosConfirmacoes.vue'), 'utf-8')
  return fonte.slice(fonte.indexOf('<style'))
})()

const ID_EVENTO = '11111111-1111-4111-8111-111111111111'

function pendente(id: string, dados: Partial<ConvitePendenteDto> = {}): ConvitePendenteDto {
  return {
    conviteId: id,
    nome: `Família ${id}`,
    grupo: null,
    statusEnvio: 'Enviado',
    telefone: '11987654321',
    pessoasPendentes: [`Pessoa ${id}`],
    totalPessoas: 1,
    cobravel: true,
    ultimaCobrancaEm: null,
    quantidadeCobrancas: 0,
    ...dados,
  }
}

const PENDENTES = [
  pendente('Albuquerque', { statusEnvio: 'NaoEnviado', cobravel: false }),
  pendente('Lima', { statusEnvio: 'Visualizado' }),
  pendente('Rosa'),
  pendente('Souza', { ultimaCobrancaEm: '2020-01-01T12:00:00Z', quantidadeCobrancas: 2 }),
]

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

function montar(
  props: Partial<{ painel: PainelConfirmacoesDto; tipo: TipoEvento | null; dataEvento: string | null; arquivado: boolean }> = {},
) {
  wrapper = mount(ProximosPassosConfirmacoes, {
    props: {
      painel: painelExemplo({ pendentes: PENDENTES, prazo: { dataLimite: '2027-05-12', diasRestantes: 5, aceitaRespostas: true } }),
      tipo: 'Casamento' as TipoEvento | null,
      dataEvento: '2027-05-22' as string | null,
      arquivado: false,
      eventoId: ID_EVENTO,
      ...props,
    },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
  return wrapper
}

describe('ProximosPassosConfirmacoes', () => {
  it.each([
    ['Casamento', 'do casamento', 'mesa dos noivos'],
    ['QuinzeAnos', 'da festa de 15 anos', 'mesa da debutante'],
    ['Aniversario', 'do aniversário', 'mesa do aniversariante'],
    ['Comemoracao', 'da comemoração', 'mesa de honra'],
  ] as const)('[COMPONENTE] %s: prazo em relação ao evento e mesa especial vêm do vocabulário', (tipo, contracao, mesa) => {
    const w = montar({ tipo })

    expect(w.get('[data-teste="passos-prazo-evento"]').text()).toBe(`O prazo de respostas fecha 10 dias antes ${contracao}.`)
    expect(w.get('[data-teste="passos-mesas"]').text()).toContain(`começando pela ${mesa}.`)
  })

  it.each([[null], ['Corporativo' as TipoEvento]])('[COMPONENTE] tipo %s cai no neutro, nunca em casamento', (tipo) => {
    const w = montar({ tipo })

    expect(w.get('[data-teste="passos-prazo-evento"]').text()).toContain('da comemoração')
    expect(w.text()).toContain('mesa de honra')
    expect(w.text().toLowerCase()).not.toMatch(/casamento|noivos/)
  })

  it('[COMPONENTE] section rotulada pelo h2 e números com texto acessível', () => {
    const w = montar()

    const secao = w.get('section')
    const titulo = w.get('h2')
    expect(titulo.text()).toBe(TEXTOS.titulo)
    expect(secao.attributes('aria-labelledby')).toBe(titulo.attributes('id'))
    expect(w.get('[data-teste="passos-confirmadas"] .somente-leitor-tela').text()).toBe('4 pessoas confirmadas')
    expect(w.get('[data-teste="passos-maximo"] .somente-leitor-tela').text()).toBe(TEXTOS.maximoAcessivel(5))
    expect(w.get('ol').attributes('aria-label')).toBe(TEXTOS.passosRotulo)
  })

  it('[COMPONENTE] passos aparecem na ordem a enviar → sem lembrete → já lembrados com o apoio de visualizados', () => {
    const w = montar()

    const passos = w.findAll('ol li')
    expect(passos.map((passo) => passo.attributes('data-teste'))).toEqual(['passo-aEnviar', 'passo-semLembrete', 'passo-jaLembrados'])
    expect(passos[0]!.text()).toContain(TEXTOS.aEnviar(1))
    expect(passos[1]!.text()).toContain(TEXTOS.semLembrete(2))
    expect(passos[1]!.text()).toContain(TEXTOS.visualizaram(1))
    expect(passos[2]!.text()).toContain(TEXTOS.jaLembrados(1))
  })

  it('[COMPONENTE] link de mesas aponta para as mesas do mesmo evento', () => {
    const w = montar()

    const link = w.getComponent(RouterLinkStub)
    expect(link.props('to')).toEqual({ name: 'evento-mesas', params: { id: ID_EVENTO } })
    expect(link.text()).toBe(TEXTOS.organizarMesas)
  })

  it('[COMPONENTE] todos respondidos: número fechado, sem passos nem máximo', () => {
    const painel = painelExemplo({ pendentes: [] })
    const w = montar({
      painel: { ...painel, pessoas: { ...painel.pessoas, pendentes: { adultos: 0, criancas: 0, total: 0 } } },
    })

    expect(w.find('ol').exists()).toBe(false)
    expect(w.find('[data-teste="passos-maximo"]').exists()).toBe(false)
    expect(w.get('[data-teste="passos-numero-fechado"]').text()).toBe(TEXTOS.numeroFechado)
    expect(w.get('[data-teste="passos-todos-responderam"]').text()).toBe(TEXTOS.todosResponderam)
  })

  it('[COMPONENTE] prazo encerrado troca os passos pela orientação de fechar os números', () => {
    const w = montar({ painel: painelExemplo({ pendentes: PENDENTES, prazo: { dataLimite: '2027-05-12', diasRestantes: -1, aceitaRespostas: false } }) })

    expect(w.find('ol').exists()).toBe(false)
    expect(w.get('[data-teste="passos-prazo-encerrado"]').text()).toBe(TEXTOS.prazoEncerrado(1))
  })

  it('[COMPONENTE] evento arquivado não sugere envio nem cobrança', () => {
    const w = montar({ arquivado: true })

    expect(w.find('ol').exists()).toBe(false)
    expect(w.find('[data-teste="passos-prazo-encerrado"]').exists()).toBe(false)
    expect(w.find('[data-teste="passos-sem-passos"]').exists()).toBe(false)
    expect(w.find('[data-teste="passos-confirmadas"]').exists()).toBe(true)
  })

  it('[COMPONENTE] sem convites cobráveis nem a enviar orienta acompanhar pela lista', () => {
    const w = montar({ painel: painelExemplo({ pendentes: [pendente('Rosa', { cobravel: false })] }) })

    expect(w.find('ol').exists()).toBe(false)
    expect(w.get('[data-teste="passos-sem-passos"]').text()).toBe(TEXTOS.semPassos)
  })

  it('[COMPONENTE] sem data do evento a frase do prazo some e sem confirmados a orientação de mesas some', () => {
    const painel = painelExemplo({ pendentes: PENDENTES })
    const w = montar({
      dataEvento: null,
      painel: { ...painel, pessoas: { ...painel.pessoas, confirmados: { adultos: 0, criancas: 0, total: 0 } } },
    })

    expect(w.find('[data-teste="passos-prazo-evento"]').exists()).toBe(false)
    expect(w.find('[data-teste="passos-mesas"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] bloco mostra só contagens: sem nomes de convites, pessoas nem telefone', () => {
    const w = montar()

    const texto = w.text()
    for (const item of PENDENTES) {
      expect(texto).not.toContain(item.nome)
      expect(texto).not.toContain(item.pessoasPendentes[0]!)
    }
    expect(texto).not.toContain('11987654321')
    expect(texto.toLowerCase()).not.toContain('só a assessoria')
  })

  it('[UNITÁRIO] estilos usam contêiner próprio e ritmo, sem @media, sticky nem cor solta', () => {
    expect(ESTILO).toContain('container: proximos-passos / inline-size')
    expect(ESTILO).toContain('@container proximos-passos (min-width: 36rem)')
    expect(ESTILO).not.toMatch(/@media/)
    expect(ESTILO).not.toMatch(/sticky/)
    expect(ESTILO).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(ESTILO).not.toMatch(/(?:gap|margin|padding)[^;]*\d+px/)
  })
})
