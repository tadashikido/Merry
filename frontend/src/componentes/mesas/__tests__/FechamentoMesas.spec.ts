import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import { mapaExemplo, mesaExemplo, pessoaMesa } from '@/__tests__/auxiliaresMesas'
import FechamentoMesas from '@/componentes/mesas/FechamentoMesas.vue'
import GruposSemMesa from '@/componentes/mesas/GruposSemMesa.vue'
import { TEXTOS_FECHAMENTO_MESAS, TEXTOS_GRUPOS_SEM_MESA } from '@/textos/mesas'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import type { MapaMesasDto } from '@/tipos/mesas'

function montarFechamento(props: { mapa?: MapaMesasDto; tipo?: TipoEvento | null; pendentes?: number | null; arquivado?: boolean } = {}) {
  return mount(FechamentoMesas, {
    props: { mapa: props.mapa ?? mapaExemplo(), tipo: props.tipo ?? null, pendentes: props.pendentes ?? null, arquivado: props.arquivado ?? false },
  })
}

function texto(wrapper: ReturnType<typeof montarFechamento>, teste: string): string {
  return wrapper.get(`[data-teste="${teste}"]`).text()
}

function estilo(arquivo: string): string {
  const fonte = readFileSync(resolve(__dirname, arquivo), 'utf-8')
  return fonte.slice(fonte.indexOf('<style'))
}

describe('FechamentoMesas', () => {
  it('[COMPONENTE] responde se os lugares bastam, com números acessíveis e região rotulada', () => {
    const wrapper = montarFechamento({ tipo: 'Casamento', pendentes: 4 })

    const regiao = wrapper.get('section')
    expect(wrapper.get(`#${regiao.attributes('aria-labelledby')}`).text()).toBe(TEXTOS_FECHAMENTO_MESAS.titulo)
    expect(texto(wrapper, 'fechamento-frase')).toBe(TEXTOS_FECHAMENTO_MESAS.bastam(3))
    expect(texto(wrapper, 'fechamento-lugares')).toContain('7 lugares nas mesas')
    expect(texto(wrapper, 'fechamento-confirmados')).toContain('5 pessoas confirmadas')
    expect(texto(wrapper, 'fechamento-maximo')).toContain('9 pessoas se todos que faltam vierem')
    expect(texto(wrapper, 'fechamento-projecao')).toBe('Se todos que faltam vierem, faltariam 2 lugares.')
    expect(texto(wrapper, 'fechamento-criancas')).toBe('1 criança ainda sem mesa')
    expect(texto(wrapper, 'fechamento-vazias')).toBe('1 mesa ainda vazia')
    expect(texto(wrapper, 'fechamento-divididos')).toBe('1 convite dividido entre mesas')
    expect(wrapper.find('[data-teste="fechamento-completas"]').exists()).toBe(false)
  })

  it('[COMPONENTE] avisa quantos lugares faltam e quando todos já têm mesa', () => {
    const base = mapaExemplo()
    const faltando = montarFechamento({ mapa: { ...base, totais: { ...base.totais, lugaresLivres: 1, semMesa: 3 } } })
    expect(texto(faltando, 'fechamento-frase')).toBe('Faltam 2 lugares para sentar todos os confirmados.')

    const sentados = montarFechamento({ mapa: { ...base, totais: { ...base.totais, lugaresLivres: 1, semMesa: 0 } } })
    expect(texto(sentados, 'fechamento-frase')).toBe('Todos os confirmados têm mesa. Sobra 1 lugar.')
  })

  it('[COMPONENTE] sem mesas ou sem confirmados orienta sem números enganosos', () => {
    const semMesas = montarFechamento({ mapa: mapaExemplo({ mesas: [] }), pendentes: 3 })
    expect(texto(semMesas, 'fechamento-frase')).toBe('Ainda não há mesas para os 5 confirmados.')
    expect(semMesas.find('[data-teste="fechamento-projecao"]').exists()).toBe(false)
    expect(semMesas.find('[data-teste="fechamento-especial-ausente"]').exists()).toBe(false)

    const semConfirmados = montarFechamento({ mapa: mapaExemplo({ pessoas: [] }) })
    expect(texto(semConfirmados, 'fechamento-frase')).toBe(TEXTOS_FECHAMENTO_MESAS.semConfirmados(7))
  })

  it('[COMPONENTE] sem pendentes ou com falha nos totais omite "se todos que faltam vierem"', () => {
    const wrapper = montarFechamento({ pendentes: null })

    expect(wrapper.find('[data-teste="fechamento-maximo"]').exists()).toBe(false)
    expect(wrapper.find('[data-teste="fechamento-projecao"]').exists()).toBe(false)
    expect(wrapper.find('.fechamento-mesas__numeros--tres').exists()).toBe(false)
  })

  it.each(TIPOS_EVENTO)('[COMPONENTE] mesa especial definida e ausente usam o termo do tipo %s', (tipo) => {
    const termo = VOCABULARIO_TIPO_EVENTO[tipo].mesaEspecial
    const definida = montarFechamento({ tipo })
    expect(texto(definida, 'fechamento-especial')).toBe(`${termo}: 1 de 2 lugares ocupados.`)

    const semEspecial = mapaExemplo({ mesas: [mesaExemplo()] })
    const ausente = montarFechamento({ tipo, mapa: semEspecial })
    expect(texto(ausente, 'fechamento-especial-ausente')).toBe(TEXTOS_FECHAMENTO_MESAS.especialAusente(termo))
    expect(texto(ausente, 'fechamento-especial-ausente')).toContain(`marque “${termo}”`)
  })

  it('[COMPONENTE] tipo desconhecido usa o termo neutro e nunca o de casamento', () => {
    const wrapper = montarFechamento({ tipo: 'Corporativo' as TipoEvento, mapa: mapaExemplo({ mesas: [mesaExemplo()] }) })

    expect(texto(wrapper, 'fechamento-especial-ausente')).toContain('Mesa de honra')
    expect(wrapper.text()).not.toMatch(/noiv|casamento|recepção|anfitri/i)
  })

  it('[COMPONENTE] mesa especial com nome mostra o termo e o rótulo; arquivado não orienta a criar', () => {
    const comNome = montarFechamento({ tipo: 'Aniversario', mapa: mapaExemplo({ mesas: [mesaExemplo({ especial: true, nome: 'Família', numero: 1, capacidade: 8, ocupacao: 8 })] }) })
    expect(texto(comNome, 'fechamento-especial')).toBe('Mesa do aniversariante (Mesa 1 · Família): 8 de 8 lugares ocupados.')
    expect(texto(comNome, 'fechamento-completas')).toBe('1 mesa completa')

    const arquivado = montarFechamento({ arquivado: true, mapa: mapaExemplo({ mesas: [mesaExemplo()] }) })
    expect(arquivado.find('[data-teste="fechamento-especial-ausente"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] não mostra dados de saúde nem de contato', () => {
    const wrapper = montarFechamento({ tipo: 'QuinzeAnos', pendentes: 2 })

    expect(wrapper.text().toLowerCase()).not.toMatch(/restri|alerg|telefone|e-mail|@/)
  })

  it('[COMPONENTE] ajustes só por contêiner, sem @media nem sticky', () => {
    for (const arquivo of ['../FechamentoMesas.vue', '../GruposSemMesa.vue']) {
      const css = estilo(arquivo)
      expect(css).not.toContain('@media')
      expect(css).not.toContain('sticky')
    }
    expect(estilo('../FechamentoMesas.vue')).toContain('@container fechamento-mesas (min-width: 36rem)')
  })
})

describe('GruposSemMesa', () => {
  const pessoas = [
    pessoaMesa({ id: '1', nome: 'A', grupo: 'Família' }),
    pessoaMesa({ id: '2', nome: 'B', grupo: 'Família' }),
    pessoaMesa({ id: '3', nome: 'C', grupo: 'Corte' }),
    pessoaMesa({ id: '4', nome: 'D', grupo: null }),
  ]

  it('[COMPONENTE] lista grupos de quem está sem mesa com contagem, estado pressionado e emite o filtro', async () => {
    const wrapper = mount(GruposSemMesa, { props: { pessoas, grupoAtivo: 'corte' } })

    const botoes = wrapper.findAll('[data-teste="grupo-sem-mesa"]')
    expect(botoes.map((botao) => botao.text().replace(/\s+/g, ' '))).toEqual(['Família 2', 'Corte 1', 'Sem grupo 1'])
    expect(botoes[0]!.attributes('aria-label')).toBe(TEXTOS_GRUPOS_SEM_MESA.grupoAcessivel('Família', 2))
    expect(botoes[0]!.attributes('aria-pressed')).toBe('false')
    expect(botoes[1]!.attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain(TEXTOS_GRUPOS_SEM_MESA.nota)

    await botoes[0]!.trigger('click')
    expect(wrapper.emitted('filtrar')).toEqual([['familia']])
  })

  it('[COMPONENTE] com um só grupo não aparece; com muitos mostra até 5 e "e mais N"', () => {
    expect(mount(GruposSemMesa, { props: { pessoas: pessoas.slice(0, 2), grupoAtivo: '__todos__' } }).find('section').exists()).toBe(false)

    const muitos = Array.from({ length: 8 }, (_, indice) => pessoaMesa({ id: `p${indice}`, nome: `P${indice}`, grupo: `Grupo ${indice}` }))
    const wrapper = mount(GruposSemMesa, { props: { pessoas: muitos, grupoAtivo: 'grupo 7' } })
    expect(wrapper.findAll('[data-teste="grupo-sem-mesa"]')).toHaveLength(6)
    expect(wrapper.get('[data-teste="grupos-sem-mesa-mais"]').text()).toBe('e mais 2')
    expect(wrapper.find('[aria-pressed="true"]').text()).toContain('Grupo 7')
  })
})
