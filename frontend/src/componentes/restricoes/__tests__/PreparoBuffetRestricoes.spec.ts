import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub, type VueWrapper } from '@vue/test-utils'

import PreparoBuffetRestricoes from '@/componentes/restricoes/PreparoBuffetRestricoes.vue'
import { TEXTOS_PREPARO_BUFFET } from '@/textos/dadosSensiveis'
import type { RelatorioRestricoesAlimentaresDto, PessoaRestricaoAlimentarDto } from '@/tipos/dadosSensiveis'
import type { TipoEvento } from '@/tipos/eventos'

const ESTILO = (() => {
  const fonte = readFileSync(resolve(__dirname, '../PreparoBuffetRestricoes.vue'), 'utf-8')
  return fonte.slice(fonte.indexOf('<style'))
})()

function pessoa(dados: Partial<PessoaRestricaoAlimentarDto> = {}): PessoaRestricaoAlimentarDto {
  return {
    convidadoId: 'p1',
    conviteId: 'c1',
    nome: 'Lia Souza',
    acompanhante: false,
    resposta: 'Confirmado',
    tipos: ['SemGluten'],
    outraRestricao: null,
    necessidadeEspecial: null,
    origemConsentimento: 'Convidado',
    consentidoEm: '2026-10-01T12:00:00Z',
    ...dados,
  }
}

function relatorio(dados: Partial<RelatorioRestricoesAlimentaresDto> = {}): RelatorioRestricoesAlimentaresDto {
  return {
    totalPessoas: 5,
    totalConfirmados: 4,
    porTipo: [
      { tipo: 'SemGluten', quantidade: 2 },
      { tipo: 'AlergiaFrutosDoMar', quantidade: 1 },
      { tipo: 'Vegana', quantidade: 1 },
    ],
    outrasRestricoes: 1,
    necessidadesEspeciais: 2,
    pessoas: [
      pessoa({ tipos: ['SemGluten', 'Vegana'], outraRestricao: 'sem carne de porco', necessidadeEspecial: 'Cadeira de rodas' }),
      pessoa({ convidadoId: 'p2', nome: 'Pedro' }),
      pessoa({ convidadoId: 'p3', nome: 'Marta Ramos', resposta: 'Pendente', tipos: ['SemLactose'] }),
      pessoa({ convidadoId: 'p4', nome: 'Beatriz', tipos: ['AlergiaFrutosDoMar'], necessidadeEspecial: 'Lugar perto da saída' }),
    ],
    diasRetencao: 30,
    dataExclusaoPrevista: '2027-06-14',
    dadosExcluidosEm: null,
    registrosIlegiveis: 0,
    podeRegistrar: true,
    ...dados,
  }
}

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

function montar(tipo: TipoEvento | null, dados: Partial<RelatorioRestricoesAlimentaresDto> = {}) {
  wrapper = mount(PreparoBuffetRestricoes, {
    props: { relatorio: relatorio(dados), tipo, eventoId: 'ev-1' },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
  return wrapper
}

describe('PreparoBuffetRestricoes', () => {
  it('[COMPONENTE] section rotulada pelo h2 mostra confirmadas e sem resposta com texto acessível', () => {
    const w = montar('Casamento')

    const secao = w.get('[data-teste="preparo-buffet"]')
    expect(secao.element.tagName).toBe('SECTION')
    const titulo = w.get('h2')
    expect(titulo.text()).toBe(TEXTOS_PREPARO_BUFFET.titulo)
    expect(secao.attributes('aria-labelledby')).toBe(titulo.attributes('id'))

    expect(w.get('[data-teste="preparo-confirmadas"] .somente-leitor-tela').text()).toBe('4 pessoas com restrição confirmaram')
    expect(w.get('[data-teste="preparo-sem-resposta"] .somente-leitor-tela').text()).toBe('1 pessoa com restrição ainda sem resposta')
    expect(w.get('[data-teste="preparo-respostas"]').text()).toBe('Se confirmarem, entram: Sem lactose (1).')
  })

  it('[COMPONENTE] alergia confirmada gera alerta textual e orientação de preparo separado', () => {
    const w = montar('Casamento')

    expect(w.get('[data-teste="preparo-alergia"]').text()).toContain(TEXTOS_PREPARO_BUFFET.alergiaTitulo)
    expect(w.get('[data-teste="preparo-orientacao-AlergiaFrutosDoMar"] dt').text()).toBe('Alergia a frutos do mar (1)')
    expect(w.get('[data-teste="preparo-orientacao-AlergiaFrutosDoMar"] dd').text()).toContain('utensílios separados')
  })

  it('[COMPONENTE] sem alergia confirmada não há alerta', () => {
    const w = montar('Casamento', { porTipo: [{ tipo: 'Vegana', quantidade: 1 }] })

    expect(w.find('[data-teste="preparo-alergia"]').exists()).toBe(false)
  })

  it.each<[TipoEvento | null, string]>([
    ['Casamento', 'o bolo e os bem-casados'],
    ['QuinzeAnos', 'o bolo e a mesa de doces'],
    ['Aniversario', 'o bolo e os docinhos'],
    ['Comemoracao', 'a sobremesa'],
    [null, 'a sobremesa'],
    ['Corporativo' as TipoEvento, 'a sobremesa'],
  ])('[COMPONENTE] orientação vegana do tipo %s cita %s', (tipo, doces) => {
    const w = montar(tipo)

    const vegana = w.get('[data-teste="preparo-orientacao-Vegana"] dd').text()
    expect(vegana).toContain(doces)
    expect(/bem-casados/.test(w.text())).toBe(tipo === 'Casamento')
    expect(w.text()).not.toMatch(/casamento|noiv/i)
  })

  it('[COMPONENTE] orientações seguem a ordem do relatório e só para tipos confirmados', () => {
    const w = montar('QuinzeAnos')

    const tipos = w.findAll('.preparo__orientacao').map((item) => item.attributes('data-teste'))
    expect(tipos).toEqual(['preparo-orientacao-SemGluten', 'preparo-orientacao-AlergiaFrutosDoMar', 'preparo-orientacao-Vegana'])
    expect(w.find('[data-teste="preparo-orientacao-SemLactose"]').exists()).toBe(false)
  })

  it('[COMPONENTE] outras restrições e necessidades especiais ganham notas no plural e no singular', () => {
    const w = montar('Aniversario')
    expect(w.get('[data-teste="preparo-outras"]').text()).toBe('1 restrição descrita em texto: leia na lista e repasse ao buffet como foi escrita.')
    expect(w.get('[data-teste="preparo-necessidades"]').text()).toContain('2 necessidades especiais')

    const sem = montar('Aniversario', { outrasRestricoes: 0, necessidadesEspeciais: 0 })
    expect(sem.find('[data-teste="preparo-outras"]').exists()).toBe(false)
    expect(sem.find('[data-teste="preparo-necessidades"]').exists()).toBe(false)
  })

  it('[COMPONENTE] todos responderam troca o "se confirmarem" por mensagem de fechamento', () => {
    const w = montar('Casamento', { pessoas: [pessoa()] })

    expect(w.get('[data-teste="preparo-respostas"]').text()).toBe(TEXTOS_PREPARO_BUFFET.todosResponderam)
    expect(w.find('[data-teste="preparo-ninguem-confirmou"]').exists()).toBe(false)
  })

  it('[COMPONENTE] ninguém confirmou explica que a conta começa depois e não orienta tipos', () => {
    const w = montar('Comemoracao', {
      totalConfirmados: 0,
      porTipo: [],
      outrasRestricoes: 0,
      necessidadesEspeciais: 0,
      pessoas: [pessoa({ resposta: 'Pendente', tipos: ['Vegana'] })],
    })

    expect(w.get('[data-teste="preparo-confirmadas"] .somente-leitor-tela').text()).toBe('0 pessoas com restrição confirmaram')
    expect(w.get('[data-teste="preparo-ninguem-confirmou"]').text()).toBe(TEXTOS_PREPARO_BUFFET.ninguemConfirmou)
    expect(w.get('[data-teste="preparo-respostas"]').text()).toBe('Se confirmarem, entram: Vegana (1).')
    expect(w.find('[data-teste="preparo-conferir"]').exists()).toBe(false)
    expect(w.find('[data-teste="preparo-alergia"]').exists()).toBe(false)
  })

  it('[COMPONENTE] link leva à ficha para o buffet do mesmo evento com aviso de informação de saúde', () => {
    const w = montar('Casamento')

    const link = w.getComponent(RouterLinkStub)
    expect(link.props('to')).toEqual({ name: 'impressao-buffet', params: { id: 'ev-1' } })
    expect(link.text()).toBe(TEXTOS_PREPARO_BUFFET.ficha)
    expect(w.text()).toContain('Contém informação de saúde: compartilhe só com a equipe do buffet.')
  })

  it('[SEGURANÇA] bloco não exibe nomes, textos livres, telefone nem e-mail', () => {
    const w = montar('Casamento')

    const texto = w.text()
    expect(texto).not.toContain('Lia Souza')
    expect(texto).not.toContain('Marta Ramos')
    expect(texto).not.toContain('sem carne de porco')
    expect(texto).not.toContain('Cadeira de rodas')
    expect(texto).not.toMatch(/@|\(\d{2}\)/)
    expect(w.html()).not.toContain('v-html')
  })

  it('[UNITÁRIO] estilos usam contêiner próprio, sem @media nem sticky', () => {
    expect(ESTILO).toContain('container: preparo-buffet / inline-size')
    expect(ESTILO).toContain('@container preparo-buffet (min-width: 36rem)')
    expect(ESTILO).not.toMatch(/@media/)
    expect(ESTILO).not.toMatch(/sticky/)
    expect(ESTILO).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
