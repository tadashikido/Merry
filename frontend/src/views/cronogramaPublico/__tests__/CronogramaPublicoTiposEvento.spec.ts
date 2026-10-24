import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { TOKEN_CRONOGRAMA, cronogramaPublico, itemPublico } from '@/__tests__/auxiliaresCronogramaPublico'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { razaoContraste } from '@/design/contraste'
import { cores } from '@/design/tokens'
import { TEXTOS_CRONOGRAMA_PUBLICO } from '@/textos/cronogramaPublico'
import type { CronogramaPublicoDto } from '@/tipos/cronogramaPublico'
import type { TipoEvento } from '@/tipos/eventos'
import { RaizRotas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

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

async function abrir(dados: CronogramaPublicoDto | null, token = TOKEN_CRONOGRAMA) {
  rotearFetch(
    fetchSimulado,
    quando('POST', ROTA_CONSULTA, () => (dados ? respostaJson(dados) : respostaProblema(404, { title: 'Recurso não encontrado.' }))),
  )
  const montagem = await prepararAplicacao(`/cronograma/${token}`)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return wrapper
}

function comTipo(tipo: string, extra: Partial<CronogramaPublicoDto> = {}): CronogramaPublicoDto {
  const base = cronogramaPublico()
  return cronogramaPublico({ ...extra, evento: { ...base.evento, tipo: tipo as TipoEvento, ...extra.evento } })
}

const bloco = () => wrapper!.get('[data-teste="cronograma-publico-para-o-dia"]')

describe('CronogramaPublicoView — tipos de evento', () => {
  it.each([
    ['Casamento', 'O casamento ainda não chegou', 'Para o dia do casamento', 'A cerimônia começa às 16:30', 'Hora da cerimônia', ['Cerimônia', 'Recepção']],
    ['QuinzeAnos', 'A festa de 15 anos ainda não chegou', 'Para o dia da festa de 15 anos', 'A festa começa às 16:30', 'Hora da festa', ['Festa', 'Outro local']],
    ['Aniversario', 'O aniversário ainda não chegou', 'Para o dia do aniversário', 'A festa começa às 16:30', 'Hora da festa', ['Festa', 'Outro local']],
    ['Comemoracao', 'A comemoração ainda não chegou', 'Para o dia da comemoração', 'O evento começa às 16:30', 'Hora do evento', ['Local', 'Outro local']],
    ['Formatura', 'O evento ainda não chegou', 'Para o dia do evento', 'O evento começa às 16:30', 'Hora do evento', ['Local', 'Outro local']],
  ])('[COMPONENTE] %s varia a faixa, o bloco Para o dia e o selo do momento', async (tipo, faixa, titulo, frase, selo, rotulos) => {
    await abrir(comTipo(tipo))

    expect(wrapper!.get('[data-teste="faixa-fase-dia-titulo"]').text()).toBe(faixa)
    expect(wrapper!.text()).toContain(TEXTOS_CRONOGRAMA_PUBLICO.faseAntesTexto)
    expect(bloco().get('h2').text()).toBe(titulo)
    expect(bloco().attributes('aria-labelledby')).toBe(bloco().get('h2').attributes('id'))
    expect(wrapper!.get('[data-teste="cronograma-publico-momento"]').text()).toBe(frase)
    expect(wrapper!.get('[data-teste="item-roteiro-momento"]').text()).toBe(selo)
    expect(wrapper!.findAll('.para-o-dia-cronograma__rotulo').map((rotulo) => rotulo.text())).toEqual(rotulos)
    const roteiro = wrapper!.get('[data-teste="cronograma-publico-roteiro"]').text()
    const foraDoRoteiro = wrapper!.text().replace(roteiro, '')
    expect(tipo === 'Casamento' || !/casamento|cerimônia|grande dia/i.test(foraDoRoteiro)).toBe(true)
    expect(foraDoRoteiro).not.toMatch(/grande dia/i)
  })

  it('[COMPONENTE] depois do dia usa a referência do tipo e o momento começou', async () => {
    await abrir(comTipo('Aniversario', { momento: { agora: '2027-05-20T10:00:00', fase: 'DepoisDoDia', diasParaOEvento: -5 } }))

    expect(wrapper!.get('[data-teste="faixa-fase-dia-titulo"]').text()).toBe('O aniversário já passou')
    expect(wrapper!.get('[data-teste="cronograma-publico-momento"]').text()).toBe('A festa começou às 16:30')
  })

  it('[E2E] ao vivo a frase conta o tempo até o momento principal e o cartão Agora tem o selo', async () => {
    await abrir(
      comTipo('QuinzeAnos', {
        evento: { ...cronogramaPublico().evento, tipo: 'QuinzeAnos', horarioCerimonia: '20:00' },
        momento: { agora: '2027-05-15T19:20:00', fase: 'NoDia', diasParaOEvento: 0 },
        itens: [
          itemPublico({ inicio: '19:00', termino: '19:40', situacao: 'Agora' }),
          itemPublico({ inicio: '20:00', termino: '21:00', atividade: 'Entrada da debutante', situacao: 'Proximo' }),
        ],
      }),
    )

    expect(wrapper!.get('[data-teste="cronograma-publico-momento"]').text()).toBe('A festa começa em 40 min, às 20:00')
    expect(wrapper!.find('[data-teste="faixa-fase-dia"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="cronograma-publico-roteiro"]').get('[data-teste="item-roteiro-momento"]').text()).toBe('Hora da festa')
  })
})

describe('CronogramaPublicoView — Para o dia', () => {
  it('[COMPONENTE] link filtrado resume Seus horários por dia', async () => {
    await abrir(cronogramaPublico())

    expect(wrapper!.get('[data-teste="cronograma-publico-horarios-titulo"]').text()).toBe(TEXTOS_CRONOGRAMA_PUBLICO.seusHorarios)
    expect(wrapper!.get('[data-teste="cronograma-publico-horarios-Vespera"]').text()).toBe('Véspera1 horário, das 19:00 às 20:00')
    expect(wrapper!.get('[data-teste="cronograma-publico-horarios-DiaDoEvento"]').text()).toBe(
      'Dia do evento3 horários, das 14:00 às 02:00 do dia seguinte',
    )
  })

  it('[COMPONENTE] link geral chama o resumo de Horários da equipe', async () => {
    await abrir(cronogramaPublico({ filtro: { tipo: 'Geral', rotulo: null, categoria: null } }))

    expect(wrapper!.get('[data-teste="cronograma-publico-horarios-titulo"]').text()).toBe(TEXTOS_CRONOGRAMA_PUBLICO.horariosEquipe)
  })

  it('[SEGURANÇA] Abrir no mapa abre em nova aba sem opener e com o nome acessível começando pelo texto visível', async () => {
    await abrir(comTipo('Casamento', { evento: { ...cronogramaPublico().evento, localCerimonia: 'Capela São José & Cia' } }))

    const links = wrapper!.findAll('[data-teste="cronograma-publico-abrir-mapa"]')
    expect(links).toHaveLength(2)
    expect(links[0]!.attributes('href')).toBe('https://www.google.com/maps/search/?api=1&query=Capela%20S%C3%A3o%20Jos%C3%A9%20%26%20Cia')
    expect(links[0]!.attributes('target')).toBe('_blank')
    expect(links[0]!.attributes('rel')).toBe('noopener noreferrer')
    expect(links[0]!.text()).toBe('Abrir no mapa')
    expect(links[0]!.attributes('aria-label')).toBe('Abrir no mapa: Capela São José & Cia, em nova aba')
  })

  it('[SEGURANÇA] o bloco não mostra telefone, e-mail nem ações', async () => {
    await abrir(cronogramaPublico())

    expect(bloco().find('button').exists()).toBe(false)
    expect(bloco().findAll('a').every((link) => link.attributes('href')!.startsWith('https://www.google.com/maps/'))).toBe(true)
    expect(bloco().text()).not.toMatch(/@|\(\d{2}\)|tel:/)
  })

  it('[COMPONENTE] secundário igual ao principal e sem horário mostra só um local e nenhuma frase', async () => {
    await abrir(
      comTipo('Aniversario', {
        evento: { ...cronogramaPublico().evento, tipo: 'Aniversario', horarioCerimonia: null, localCerimonia: 'Casa Jardim', localRecepcao: 'casa jardim' },
      }),
    )

    expect(wrapper!.find('[data-teste="cronograma-publico-momento"]').exists()).toBe(false)
    expect(wrapper!.findAll('[data-teste="cronograma-publico-local"]')).toHaveLength(1)
    expect(wrapper!.find('[data-teste="item-roteiro-momento"]').exists()).toBe(false)
  })

  it('[COMPONENTE] cronograma vazio no link filtrado orienta e mantém momento e locais', async () => {
    await abrir(comTipo('QuinzeAnos', { itens: [] }))

    const vazio = wrapper!.get('[data-teste="cronograma-publico-vazio"]')
    expect(vazio.text()).toContain(TEXTOS_CRONOGRAMA_PUBLICO.vazioTitulo)
    expect(wrapper!.find('[data-teste="faixa-fase-dia"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="cronograma-publico-momento"]').text()).toBe('A festa começa às 16:30')
    expect(wrapper!.find('[data-teste="cronograma-publico-horarios-titulo"]').exists()).toBe(false)
    expect(wrapper!.findAll('[data-teste="cronograma-publico-local"]')).toHaveLength(2)
    expect(wrapper!.get('[data-teste="cronograma-publico"]').classes()).toContain('cronograma-publico__conteudo--sem-contexto')
  })

  it('[COMPONENTE] sem itens, horário e locais não há bloco nem coluna lateral', async () => {
    await abrir(
      cronogramaPublico({
        evento: { ...cronogramaPublico().evento, horarioCerimonia: null, localCerimonia: null, localRecepcao: null },
        itens: [],
      }),
    )

    expect(wrapper!.find('[data-teste="cronograma-publico-para-o-dia"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="cronograma-publico"]').classes()).not.toContain('cronograma-publico__conteudo--com-lateral')
  })

  it('[SEGURANÇA] token inválido mostra erro neutro sem o bloco', async () => {
    await abrir(null)

    expect(wrapper!.get('[data-teste="cronograma-publico-erro"]').text()).toContain(TEXTOS_CRONOGRAMA_PUBLICO.inativoTitulo)
    expect(wrapper!.find('[data-teste="cronograma-publico-para-o-dia"]').exists()).toBe(false)
  })
})

describe('CronogramaPublicoView — espaço', () => {
  const estiloView = readFileSync(resolve(__dirname, '../CronogramaPublicoView.vue'), 'utf-8').split('<style scoped>')[1] ?? ''
  const estiloBloco = readFileSync(resolve(__dirname, '../../../componentes/cronogramaPublico/ParaODiaCronograma.vue'), 'utf-8').split('<style scoped>')[1] ?? ''

  it('[COMPONENTE] o bloco vem depois do roteiro no DOM e a grade larga vale fora do dia', async () => {
    await abrir(cronogramaPublico())

    const conteudo = wrapper!.get('[data-teste="cronograma-publico"]')
    expect(conteudo.classes()).toContain('cronograma-publico__conteudo--com-lateral')
    expect(conteudo.classes()).not.toContain('cronograma-publico__conteudo--sem-contexto')
    const ordem = conteudo.element.querySelectorAll('[data-teste="faixa-fase-dia"], [data-teste="cronograma-publico-roteiro"], [data-teste="cronograma-publico-para-o-dia"]')
    expect([...ordem].map((no) => no.getAttribute('data-teste'))).toEqual([
      'faixa-fase-dia',
      'cronograma-publico-roteiro',
      'cronograma-publico-para-o-dia',
    ])
  })

  it('[UNITÁRIO] a lateral é por contêiner, sem sticky, e o bloco só usa ritmo e contêiner', () => {
    expect(estiloView).toMatch(/\.cronograma-publico__conteudo--com-lateral \{\s*display: grid;\s*grid-template-areas:\s*'topo topo'\s*'contexto principal'\s*'lateral principal'\s*'rodape rodape';/)
    expect(estiloBloco).toContain('container: para-o-dia-cronograma / inline-size')
    expect(estiloBloco).not.toMatch(/@media|position:\s*sticky|box-shadow|gradient|--p-espaco-/)
    expect(estiloBloco).toMatch(/@container para-o-dia-cronograma \(min-width: 30rem\)/)
  })

  it('[UNITÁRIO] textos do bloco no tema operação têm contraste AA', () => {
    expect(razaoContraste(cores.operacaoTexto, cores.operacaoFundo)).toBeGreaterThanOrEqual(4.5)
    expect(razaoContraste(cores.operacaoApoio, cores.operacaoFundo)).toBeGreaterThanOrEqual(4.5)
    expect(razaoContraste(cores.operacaoDestaque, cores.operacaoFundo)).toBeGreaterThanOrEqual(4.5)
  })
})
