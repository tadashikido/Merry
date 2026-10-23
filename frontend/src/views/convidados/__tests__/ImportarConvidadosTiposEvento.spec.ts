import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { precarregarRotas } from '@/__tests__/auxiliaresNavegacao'
import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { previaExemplo } from '@/__tests__/auxiliaresImportacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { ERROS_COMUNS_IMPORTACAO, TEXTOS_IMPORTACAO } from '@/textos/importacaoConvidados'
import type { ConviteDto, ListaConvitesDto } from '@/tipos/convidados'
import type { TipoEvento } from '@/tipos/eventos'
import type { PreVisualizacaoImportacaoDto } from '@/tipos/importacaoConvidados'
import { ID_EVENTO, RaizRotas, chamadas, eventoCompleto, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

await precarregarRotas('convidados-importar', 'evento-convidados')

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_CONVITES = `${ROTA_EVENTO}/convites`
const ROTA_PREVIA = `${ROTA_CONVITES}/importacao/pre-visualizacao`
const ROTA_IMPORTACAO = `${ROTA_CONVITES}/importacao`
const CAMINHO = `/eventos/${ID_EVENTO}/convidados/importar`

const PASTA = dirname(fileURLToPath(import.meta.url))
const ESTILO_PREVIA = readFileSync(resolve(PASTA, '../../../componentes/convidados/PreviaImportacao.vue'), 'utf-8').split('<style')[1] ?? ''
const ESTILO_VIEW = readFileSync(resolve(PASTA, '../ImportarConvidadosView.vue'), 'utf-8').split('<style')[1] ?? ''

function conviteEvento(id: string, grupo: string | null): ConviteDto {
  return {
    id,
    nome: `Convite ${id}`,
    grupo,
    limiteAcompanhantes: 0,
    statusEnvio: 'NaoEnviado',
    convidados: [],
    criadoEm: '2026-09-28T12:00:00Z',
    atualizadoEm: '2026-09-28T12:00:00Z',
    respondidoEm: null,
  }
}

function lista(convites: ConviteDto[]): ListaConvitesDto {
  return {
    convites,
    totais: {
      convites: convites.length,
      pessoas: 0,
      adultos: 0,
      criancas: 0,
      acompanhantesPermitidos: 0,
      confirmados: { adultos: 0, criancas: 0, total: 0 },
      pendentes: { adultos: 0, criancas: 0, total: 0 },
      recusados: { adultos: 0, criancas: 0, total: 0 },
    },
    convidadosEstimados: 150,
    eventoArquivado: false,
  }
}

function previaComGrupos(): PreVisualizacaoImportacaoDto {
  const previa = previaExemplo()
  previa.convites = [
    { ...previa.convites[0]!, grupo: 'familia' },
    { ...previa.convites[1]!, grupo: 'Corte' },
    previa.convites[2]!,
  ]
  return previa
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
  vi.unstubAllGlobals()
})

function previaSemProblemas(): PreVisualizacaoImportacaoDto {
  const previa = previaComGrupos()
  previa.convites = previa.convites.filter((convite) => convite.valido)
  previa.linhasComProblema = []
  previa.resumo.convites = 2
  previa.resumo.linhasComErro = 0
  return previa
}

async function abrir(
  tipo: TipoEvento,
  rotaConvites = quando('GET', ROTA_CONVITES, () => respostaJson(lista([conviteEvento('a', 'Família'), conviteEvento('b', 'Família')]))),
  previa: PreVisualizacaoImportacaoDto = previaComGrupos(),
) {
  rotearFetch(
    fetchSimulado,
    quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ tipo, nomePrimeiraPessoa: 'Valentina', nomeSegundaPessoa: null }))),
    rotaConvites,
    quando('POST', ROTA_PREVIA, () => respostaJson(previa)),
    quando('POST', ROTA_IMPORTACAO, () => respostaJson({ convitesCriados: 2, pessoasCriadas: 3 })),
  )
  const montagem = await prepararAplicacao(CAMINHO)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return montagem
}

async function escolherArquivo() {
  const entrada = wrapper!.get('[data-teste="envio-arquivo-entrada"]')
  Object.defineProperty(entrada.element, 'files', { value: [new File(['Nome\nAna'], 'lista.csv', { type: 'text/csv' })], configurable: true })
  await entrada.trigger('change')
  await flushPromises()
}

async function baixarModelo(): Promise<string> {
  const blobs: Blob[] = []
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: (blob: Blob) => {
      blobs.push(blob)
      return 'blob:modelo'
    },
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  await wrapper!.get('[data-teste="baixar-modelo"]').trigger('click')
  expect(blobs).toHaveLength(1)
  return blobs[0]!.text()
}

describe('ImportarConvidadosView — tipos de evento', { timeout: 20_000 }, () => {
  it.each([
    ['QuinzeAnos', 'como Família, Corte ou Amigos da escola.', 'Corte'],
    ['Aniversario', 'como Família, Amigos ou Trabalho.', 'Amigos'],
    ['Casamento', 'como Família, Padrinhos ou Amigos.', 'Padrinhos'],
  ] as [TipoEvento, string, string][])(
    '[COMPONENTE] %s: explicação do Grupo e modelo baixado usam os grupos do tipo',
    async (tipo, explicacao, segundoGrupo) => {
      await abrir(tipo)

      expect(wrapper!.get('[data-teste="como-montar"]').text()).toContain(explicacao)
      const modelo = await baixarModelo()
      expect(modelo).toContain(`;${segundoGrupo};Marcos Exemplo (exemplo);`)
      expect(modelo).toContain(';Família;Carla Exemplo (exemplo);')
    },
  )

  it('[COMPONENTE] tipo desconhecido usa o vocabulário neutro e nunca o de casamento', async () => {
    await abrir('Corporativo' as TipoEvento)

    const comoMontar = wrapper!.get('[data-teste="como-montar"]').text()
    expect(comoMontar).toContain('como Família, Amigos ou Convidados de honra.')
    expect(comoMontar).not.toMatch(/Padrinhos|noiv/)
    const modelo = await baixarModelo()
    expect(modelo).not.toContain('Padrinhos')
    expect(modelo).toContain(';Amigos;Marcos Exemplo (exemplo);')
  })

  it('[COMPONENTE] etapa 1 mostra erros mais comuns e nota de privacidade sem novo passo', async () => {
    await abrir('Aniversario')

    const erros = wrapper!.get('[data-teste="erros-comuns"]')
    expect(erros.element.tagName).toBe('SECTION')
    expect(erros.attributes('aria-labelledby')).toBe(erros.get('h3').attributes('id'))
    expect(erros.findAll('dt')).toHaveLength(ERROS_COMUNS_IMPORTACAO.length)
    expect(erros.text()).toContain('Sim e Não também valem.')

    const privacidade = wrapper!.get('[data-teste="privacidade-importacao"]')
    expect(privacidade.get('h3').text()).toBe(TEXTOS_IMPORTACAO.privacidadeTitulo)
    expect(privacidade.text()).toContain('O arquivo não fica guardado')
    expect(privacidade.text()).toContain('são dado de saúde')
    expect(privacidade.text()).not.toMatch(/assessoria/i)

    expect(wrapper!.get('header, .cabecalho-pagina').text()).toContain('Traga os convidados de uma planilha.')
    expect(wrapper!.text()).not.toMatch(/dos anfitriões|noiva/)
    expect(wrapper!.findAll('[data-teste="indicador-etapas"] li')).toHaveLength(3)
  })

  it('[COMPONENTE] prévia compara os grupos com os do evento usando a lista já existente', async () => {
    await abrir('QuinzeAnos')
    expect(chamadas(fetchSimulado, 'GET', ROTA_CONVITES)).toHaveLength(1)

    await escolherArquivo()

    const bloco = wrapper!.get('[data-teste="grupos-importacao"]')
    expect(bloco.get('[data-teste="grupos-importacao-frase"]').text()).toBe('1 grupo novo e 1 que já existe no evento.')
    const grupos = bloco.findAll('[data-teste="grupo-importacao"]')
    expect(grupos.map((grupo) => grupo.find('.grupos-importacao__nome').text())).toEqual(['Corte', 'Família'])
    expect(grupos[0]!.find('[data-teste="grupo-importacao-novo"]').exists()).toBe(true)
    expect(grupos[1]!.get('[data-teste="grupo-importacao-existente"]').text()).toBe('já tem 2 convites')
    expect(bloco.text()).not.toContain('=HYPERLINK')
  })

  it('[COMPONENTE] falha ao carregar a lista do evento mantém a prévia e só omite a comparação', async () => {
    await abrir('Aniversario', quando('GET', ROTA_CONVITES, () => respostaProblema(500, { title: 'Erro.' })))

    await escolherArquivo()

    expect(wrapper!.find('[data-teste="previa-importacao"]').exists()).toBe(true)
    expect(wrapper!.get('[data-teste="grupos-importacao-frase"]').text()).toBe(TEXTOS_IMPORTACAO.gruposSemComparacao)
    expect(wrapper!.find('[data-teste="grupo-importacao-novo"]').exists()).toBe(false)
    expect(wrapper!.get('[data-teste="importar"]').attributes('disabled')).toBeUndefined()
  })

  it('[COMPONENTE] importar outra planilha recarrega a lista do evento para a próxima comparação', async () => {
    await abrir('QuinzeAnos', quando('GET', ROTA_CONVITES, () => respostaJson(lista([conviteEvento('a', 'Família')]))), previaSemProblemas())
    await escolherArquivo()
    await wrapper!.get('[data-teste="importar"]').trigger('click')
    await flushPromises()
    const antes = chamadas(fetchSimulado, 'GET', ROTA_CONVITES).length

    await wrapper!.get('[data-teste="importar-outra"]').trigger('click')
    await flushPromises()

    expect(chamadas(fetchSimulado, 'GET', ROTA_CONVITES)).toHaveLength(antes + 1)
    expect(wrapper!.find('[data-teste="erros-comuns"]').exists()).toBe(true)
  })

  it('[UNITÁRIO] lateral da prévia não é sticky e os ajustes continuam só por contêiner', () => {
    expect(ESTILO_PREVIA).not.toMatch(/sticky/)
    expect(ESTILO_PREVIA).not.toMatch(/@media/)
    expect(ESTILO_VIEW).not.toMatch(/@media/)
    expect(ESTILO_VIEW).toContain('@container importacao (min-width: 52rem)')
    expect(ESTILO_VIEW).toMatch(/grid-template-areas:\s*'envio instrucoes'\s*'erros instrucoes'\s*'privacidade instrucoes'\s*'acoes acoes'/)
  })
})
