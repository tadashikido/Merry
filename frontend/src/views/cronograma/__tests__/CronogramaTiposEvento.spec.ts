import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import type { Mock } from 'vitest'

import { SESSAO_EXEMPLO, montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { cronogramaExemplo, itemCronograma } from '@/__tests__/auxiliaresCronograma'
import { linksExemplo } from '@/__tests__/auxiliaresCronogramaPublico'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_CRONOGRAMA } from '@/textos/cronograma'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import type { SessaoDto } from '@/tipos/api'
import type { CronogramaDto, ItemCronogramaDto } from '@/tipos/cronograma'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'
import { ID_EVENTO, RaizRotas, eventoCompleto, quando, type Rota } from '../../eventos/__tests__/auxiliaresEventos'

await precarregarRotas('evento-cronograma')

vi.mock('@/composables/useNotificacao', () => ({
  useNotificacao: () => ({ sucesso: vi.fn(), erro: vi.fn() }),
  DURACAO_TOAST_SUCESSO: 5000,
  DURACAO_TOAST_ERRO: 6000,
}))

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_CRONOGRAMA = `${ROTA_EVENTO}/cronograma`
const CAMINHO = `/eventos/${ID_EVENTO}/cronograma`

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

const BUFFET = { fornecedorEventoId: 'v-buffet', nomeEmpresa: 'Buffet Sabor', categoria: 'Buffet' }
const DJ = { fornecedorEventoId: 'v-dj', nomeEmpresa: 'DJ Pulso', categoria: 'Musica' }

const ANTES = itemCronograma({ id: 'a', inicio: '16:00', termino: '16:30', duracaoMinutos: 30, atividade: 'Chegada dos convidados', minutosDesdeCerimonia: -30, responsavel: 'Cerimonialista', fornecedor: BUFFET })
const ANCORA = itemCronograma({ id: 'b', atividade: 'Momento principal', responsavel: null, fornecedor: null })
const DEPOIS = itemCronograma({
  id: 'c',
  inicio: '22:00',
  termino: '01:00',
  duracaoMinutos: 180,
  terminaEmOutroDia: true,
  atividade: 'Pista',
  minutosDesdeCerimonia: 330,
  responsavel: 'dj',
  fornecedor: DJ,
})
const OUTRO_BUFFET = itemCronograma({ id: 'd', inicio: '18:00', termino: '18:30', duracaoMinutos: 30, atividade: 'Jantar', minutosDesdeCerimonia: 90, responsavel: 'DJ', fornecedor: BUFFET })

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

let fetchSimulado: ReturnType<typeof simularFetch>
let wrapper: VueWrapper | undefined

beforeEach(() => {
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
})

async function abrir(tipo: TipoEvento, itens: ItemCronogramaDto[], dados: Partial<CronogramaDto> = {}, sessao: SessaoDto = SESSAO_EXEMPLO) {
  rotear(
    fetchSimulado,
    sessao,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo }))),
    quando('GET', ROTA_CRONOGRAMA, () => respostaJson(cronogramaExemplo(itens, dados))),
    quando('GET', `${ROTA_CRONOGRAMA}/links`, () => respostaJson(linksExemplo())),
  )
  const montagem = await prepararAplicacao(CAMINHO)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
}

const lerFonte = (caminho: string) => readFileSync(resolve(__dirname, '../../..', caminho), 'utf-8')
const estiloDe = (fonte: string) => fonte.slice(fonte.indexOf('<style'))

const ESPERADO: Record<TipoEvento, { subtitulo: string; hora: string; antes: string; horario: string; principal: string; secundario: string }> = {
  Casamento: { subtitulo: 'cerimônia às 16:30', hora: 'Hora da cerimônia', antes: '30 min antes da cerimônia', horario: 'Horário da cerimônia', principal: 'Local da cerimônia', secundario: 'Local da recepção' },
  QuinzeAnos: { subtitulo: 'festa às 16:30', hora: 'Hora da festa', antes: '30 min antes da festa', horario: 'Horário da festa', principal: 'Local da festa', secundario: 'Outro local' },
  Aniversario: { subtitulo: 'festa às 16:30', hora: 'Hora da festa', antes: '30 min antes da festa', horario: 'Horário da festa', principal: 'Local da festa', secundario: 'Outro local' },
  Comemoracao: { subtitulo: 'evento às 16:30', hora: 'Hora do evento', antes: '30 min antes do evento', horario: 'Horário do evento', principal: 'Local do evento', secundario: 'Outro local' },
}

describe('CronogramaView — tipos de evento', () => {
  it.each(TIPOS_EVENTO)('[COMPONENTE] %s: subtítulo, horários relativos e resumo pelo vocabulário', async (tipo) => {
    await abrir(tipo, [ANTES, ANCORA])
    const esperado = ESPERADO[tipo]

    expect(wrapper!.text()).toContain(esperado.subtitulo)
    const linhas = wrapper!.findAll('[data-teste="linha-cronograma"]')
    expect(linhas[0]!.text()).toContain(esperado.antes)
    expect(linhas[1]!.text()).toContain(esperado.hora)
    const resumo = wrapper!.get('[data-teste="resumo-cerimonia"]')
    expect(resumo.text()).toContain(esperado.horario)
    const lateral = wrapper!.get('[data-teste="lateral-cronograma"]').text()
    expect(lateral).toContain(esperado.principal)
    expect(lateral).toContain(esperado.secundario)
  })

  it.each(TIPOS_EVENTO.filter((tipo) => tipo !== 'Casamento'))('[COMPONENTE] %s: nenhum texto fala de cerimônia ou recepção', async (tipo) => {
    await abrir(tipo, [ANTES, ANCORA], { horariosDesatualizados: 1 })

    expect(wrapper!.text().toLocaleLowerCase('pt-BR')).not.toMatch(/cerimônia|recepção/)
  })

  it.each(TIPOS_EVENTO)('[COMPONENTE] %s: sem horário principal avisa pelo tipo', async (tipo) => {
    await abrir(tipo, [ANTES], { horarioCerimonia: null })

    expect(wrapper!.get('[data-teste="aviso-sem-horario"]').text()).toContain(VOCABULARIO_TIPO_EVENTO[tipo].faltaHorario)
    expect(wrapper!.text()).toContain(`sem horário ${VOCABULARIO_TIPO_EVENTO[tipo].momento.contracaoDe}`)
  })

  it('[COMPONENTE] estado vazio ensina a começar pelo horário principal do tipo', async () => {
    await abrir('Aniversario', [])

    expect(wrapper!.text()).toContain('Comece pelo horário da festa e acrescente o que vem antes e depois.')
    expect(wrapper!.find('[data-teste="abrir-aplicar-modelo"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="adicionar-item-cronograma"]').exists()).toBe(true)
  })

  it('[COMPONENTE] atalhos de local do diálogo usam os locais do tipo', async () => {
    await abrir('QuinzeAnos', [ANTES], { localCerimonia: 'Espaço Jardins', localRecepcao: 'Paróquia Santa Rita' })

    document.body.querySelector<HTMLElement>('[data-teste="adicionar-item-cronograma"]')!.click()
    await flushPromises()

    expect(document.body.textContent).toContain('Festa: Espaço Jardins')
    expect(document.body.textContent).toContain('Outro local: Paróquia Santa Rita')
    expect(document.body.textContent).not.toContain('Cerimônia: Espaço Jardins')
  })

  it('[COMPONENTE] faixa de recálculo fala do momento do tipo', async () => {
    await abrir('Comemoracao', [ANTES], { horariosDesatualizados: 2 })

    expect(wrapper!.get('[data-teste="aviso-horarios-desatualizados"]').text()).toContain('antes da mudança do evento')
  })
})

describe('CronogramaView — resumo do dia e quem está no roteiro', () => {
  it('[COMPONENTE] mostra duração por dia, sem responsável, fornecedores e responsáveis', async () => {
    await abrir('QuinzeAnos', [ANTES, ANCORA, OUTRO_BUFFET, DEPOIS])

    expect(wrapper!.get('[data-teste="resumo-dia-DiaDoEvento"]').text()).toContain('4 itens, das 16:00 às 01:00 do dia seguinte')
    expect(wrapper!.get('[data-teste="resumo-duracao"]').text()).toBe('9 h de roteiro')
    expect(wrapper!.get('[data-teste="resumo-sem-responsavel"]').text()).toBe('1')

    const equipe = wrapper!.get('[data-teste="equipe-roteiro"]')
    expect(equipe.element.tagName).toBe('SECTION')
    expect(equipe.attributes('aria-labelledby')).toBe('titulo-equipe-roteiro')
    expect(equipe.get('#titulo-equipe-roteiro').text()).toBe(TEXTOS_CRONOGRAMA.equipeTitulo)
    const fornecedores = equipe.findAll('[data-teste="equipe-fornecedor"]').map((linha) => linha.text())
    expect(fornecedores).toHaveLength(2)
    expect(fornecedores[0]).toContain('Buffet Sabor')
    expect(fornecedores[0]).toContain('Buffet, 2 itens')
    expect(fornecedores[1]).toContain('DJ Pulso')
    expect(equipe.findAll('[data-teste="equipe-responsavel"]').map((linha) => linha.text())).toEqual(['Cerimonialista', 'DJ'])
    expect(equipe.text()).not.toMatch(/@|\(\d{2}\)/)
  })

  it('[COMPONENTE] atalho da lateral abre o painel de links e devolve o foco ao fechar', async () => {
    await abrir('Casamento', [ANTES])

    const botao = document.body.querySelector<HTMLElement>('[data-teste="abrir-links-lateral"]')!
    expect(botao.textContent).toContain(TEXTOS_CRONOGRAMA.acaoLinksEquipe)
    expect(botao.getAttribute('aria-haspopup')).toBe('dialog')
    botao.click()
    await flushPromises()
    expect(document.body.querySelector('[data-teste="painel-links-cronograma"]')).not.toBeNull()

    document.body.querySelector<HTMLElement>('[data-teste="fechar-painel-links"]')!.click()
    await flushPromises()
    await flushPromises()
    expect(document.activeElement?.getAttribute('data-teste')).toBe('abrir-links-lateral')
  })

  it('[COMPONENTE] sem ninguém atribuído a assessoria vê a orientação, sem atalho', async () => {
    await abrir('Casamento', [ANCORA])

    expect(wrapper!.get('[data-teste="equipe-roteiro-vazia"]').text()).toBe(TEXTOS_CRONOGRAMA.equipeVazia)
    expect(wrapper!.find('[data-teste="abrir-links-lateral"]').exists()).toBe(false)
  })

  it('[COMPONENTE] anfitrião vê quem está no roteiro, sem atalho de links nem contagem sem responsável', async () => {
    await abrir('QuinzeAnos', [ANTES, ANCORA], { somenteLeitura: true }, SESSAO_ANFITRIAO)

    expect(wrapper!.find('[data-teste="equipe-roteiro"]').exists()).toBe(true)
    expect(wrapper!.find('[data-teste="abrir-links-lateral"]').exists()).toBe(false)
    expect(wrapper!.find('[data-teste="resumo-sem-responsavel"]').exists()).toBe(false)
  })

  it('[UNITÁRIO] estilos só ajustam largura por @container', () => {
    const view = estiloDe(lerFonte('views/cronograma/CronogramaView.vue'))
    expect(view).not.toContain('@media')
    expect(view).toContain('@container cronograma (min-width: 64rem)')
    const equipe = estiloDe(lerFonte('componentes/cronograma/EquipeRoteiroCronograma.vue'))
    expect(equipe).toContain('container: equipe-roteiro / inline-size')
    expect(equipe).toContain('@container equipe-roteiro (min-width: 36rem)')
    expect(equipe).not.toMatch(/@media \((min|max)-width/)
  })
})
