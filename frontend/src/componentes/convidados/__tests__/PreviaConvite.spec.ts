import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import PreviaConvite, { type PessoaPreviaConvite } from '@/componentes/convidados/PreviaConvite.vue'
import { TEXTOS_PREVIA_CONVITE } from '@/textos/convidados'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'

const CELEBRACOES: Record<TipoEvento, string> = {
  Casamento: 'vão se casar',
  QuinzeAnos: 'vai comemorar os 15 anos',
  Aniversario: 'vai comemorar o aniversário',
  Comemoracao: 'vão celebrar',
}

const SEGUNDO_NOME: Record<TipoEvento, string | null> = {
  Casamento: 'Rui',
  QuinzeAnos: null,
  Aniversario: null,
  Comemoracao: 'Rui',
}

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

function montar(props: {
  tipo?: TipoEvento | null
  segundo?: string | null
  nomeConvite?: string
  pessoas?: PessoaPreviaConvite[]
  limiteAcompanhantes?: number
} = {}) {
  wrapper = mount(PreviaConvite, {
    props: {
      tipo: props.tipo === undefined ? 'Casamento' : props.tipo,
      nomePrimeiraPessoa: 'Ana',
      nomeSegundaPessoa: props.segundo === undefined ? 'Rui' : props.segundo,
      data: '2027-05-22',
      dataLimite: '2027-05-05',
      nomeConvite: props.nomeConvite ?? '',
      pessoas: props.pessoas ?? [{ chave: 'a', nome: '', crianca: false }],
      limiteAcompanhantes: props.limiteAcompanhantes ?? 0,
    },
  })
  return wrapper
}

describe('PreviaConvite', () => {
  it.each(TIPOS_EVENTO)('[COMPONENTE] frase de celebração varia pelo tipo %s', (tipo) => {
    const previa = montar({ tipo, segundo: SEGUNDO_NOME[tipo] })

    expect(previa.get('[data-teste="previa-celebracao"]').text()).toBe(CELEBRACOES[tipo])
    expect(previa.get('[data-teste="previa-nomes"]').text()).toBe(SEGUNDO_NOME[tipo] ? 'Ana e Rui' : 'Ana')
  })

  it('[COMPONENTE] tipo desconhecido usa a frase neutra no singular', () => {
    const previa = montar({ tipo: 'Corporativo' as TipoEvento, segundo: null })

    expect(previa.get('[data-teste="previa-celebracao"]').text()).toBe('vai celebrar')
    expect(previa.text()).not.toMatch(/casar|casamento/i)
  })

  it('[COMPONENTE] sem nome mostra marcadores e usa o nome da primeira pessoa quando houver', async () => {
    const previa = montar()

    expect(previa.get('[data-teste="previa-nome-convite"]').text()).toBe(TEXTOS_PREVIA_CONVITE.nomeProvisorio)
    expect(previa.get('[data-teste="previa-pessoa"]').text()).toBe('Pessoa 1')

    await previa.setProps({ pessoas: [{ chave: 'a', nome: '  Carla   Souza ', crianca: false }] })
    expect(previa.get('[data-teste="previa-nome-convite"]').text()).toBe('Carla Souza')

    await previa.setProps({ nomeConvite: 'Família Souza' })
    expect(previa.get('[data-teste="previa-nome-convite"]').text()).toBe('Família Souza')
  })

  it('[COMPONENTE] lista pessoas com marca de criança, acompanhantes e prazo', () => {
    const previa = montar({
      pessoas: [
        { chave: 'a', nome: 'Carla', crianca: false },
        { chave: 'b', nome: 'Davi', crianca: true },
      ],
      limiteAcompanhantes: 2,
    })

    const pessoas = previa.findAll('[data-teste="previa-pessoa"]')
    expect(pessoas.map((pessoa) => pessoa.text())).toEqual(['Carla', 'Davi criança'])
    expect(previa.findAll('[data-teste="previa-crianca"]')).toHaveLength(1)
    expect(previa.get('[data-teste="previa-acompanhantes"]').text()).toBe('Você pode levar até 2 pessoas.')
    expect(previa.get('[data-teste="previa-prazo"]').text()).toContain('5 de maio')
  })

  it('[COMPONENTE] sem acompanhantes não mostra a linha', () => {
    expect(montar().find('[data-teste="previa-acompanhantes"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] região rotulada por h2, notas de privacidade e restrições, sem h1', () => {
    const previa = montar()
    const regiao = previa.get('section')

    expect(previa.get(`#${regiao.attributes('aria-labelledby')}`).element.tagName).toBe('H2')
    expect(previa.find('h1').exists()).toBe(false)
    expect(previa.get('[data-teste="previa-privacidade"]').text()).toBe(TEXTOS_PREVIA_CONVITE.privacidade)
    expect(previa.get('[data-teste="previa-restricoes"]').text()).toBe(TEXTOS_PREVIA_CONVITE.restricoes)
    expect(TEXTOS_PREVIA_CONVITE.privacidade).not.toMatch(/só com a assessoria/)
    expect(TEXTOS_PREVIA_CONVITE.restricoes).toContain('painel de Restrições alimentares')
  })

  it('[UNITÁRIO] estilos usam @container e ritmo, sem @media', () => {
    const fonte = readFileSync(resolve(__dirname, '../PreviaConvite.vue'), 'utf-8')
    const estilo = fonte.slice(fonte.indexOf('<style scoped>'))

    expect(estilo).not.toMatch(/@media/)
    expect(estilo).toContain('container: previa-convite / inline-size')
    expect(estilo).not.toMatch(/sticky/)
    expect(fonte).not.toMatch(/v-html/)
  })
})
