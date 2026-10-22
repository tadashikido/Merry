import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'

import { montarView, prepararAplicacao, respostaJson, respostaProblema, simularFetch } from '@/__tests__/auxiliaresAutenticacao'
import { previaExemplo } from '@/__tests__/auxiliaresImportacao'
import { simularMatchMedia } from '@/__tests__/auxiliaresTeste'
import { registrarProvedorAutenticacao } from '@/servicos/clienteHttp'
import { TEXTOS_IMPORTACAO } from '@/textos/importacaoConvidados'
import type { PreVisualizacaoImportacaoDto } from '@/tipos/importacaoConvidados'
import { ID_EVENTO, RaizRotas, eventoCompleto, chamadas, quando, rotearFetch } from '@/views/eventos/__tests__/auxiliaresEventos'

const ROTA_EVENTO = `/api/eventos/${ID_EVENTO}`
const ROTA_PREVIA = `${ROTA_EVENTO}/convites/importacao/pre-visualizacao`
const ROTA_IMPORTACAO = `${ROTA_EVENTO}/convites/importacao`
const CAMINHO = `/eventos/${ID_EVENTO}/convidados/importar`

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
  const previa = previaExemplo({ linhasComProblema: [] })
  previa.convites = previa.convites.filter((convite) => convite.valido)
  previa.resumo.convites = 2
  previa.resumo.linhasComErro = 0
  return previa
}

async function abrir(...rotas: Parameters<typeof rotearFetch>[1][]) {
  rotearFetch(fetchSimulado, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto())), ...rotas)
  const montagem = await prepararAplicacao(CAMINHO)
  wrapper = await montarView(RaizRotas, montagem)
  await flushPromises()
  return montagem
}

async function escolherArquivo(arquivo: File = new File(['Nome\nAna'], 'lista.csv', { type: 'text/csv' })) {
  const entrada = wrapper!.get('[data-teste="envio-arquivo-entrada"]')
  Object.defineProperty(entrada.element, 'files', { value: [arquivo], configurable: true })
  await entrada.trigger('change')
  await flushPromises()
}

describe('ImportarConvidadosView', { timeout: 20_000 }, () => {
  it('[COMPONENTE] etapa 1 mostra envio, instruções e baixa o modelo neutralizado', async () => {
    await abrir()
    const criar = vi.fn((blob: Blob) => (blob.size > 0 ? 'blob:modelo' : ''))
    vi.stubGlobal('URL', { ...URL, createObjectURL: criar, revokeObjectURL: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    expect(wrapper!.text()).toContain(TEXTOS_IMPORTACAO.titulo)
    expect(wrapper!.get('[data-teste="indicador-etapas"] [aria-current="step"]').text()).toContain('Escolha a planilha')
    expect(wrapper!.get('[data-teste="como-montar"]').text()).toContain('Faixa etária')
    await wrapper!.get('[data-teste="baixar-modelo"]').trigger('click')

    expect(criar).toHaveBeenCalledOnce()
    expect(document.title).toBe('Importar convidados de Ana Beatriz & Bruno')
  })

  it('[COMPONENTE] arquivo grande ou com extensão errada é recusado no navegador sem chamar a API', async () => {
    await abrir()

    await escolherArquivo(new File(['x'.repeat(10)], 'lista.xlsx'))

    expect(wrapper!.get('[data-teste="envio-arquivo-erro"]').text()).toBe(TEXTOS_IMPORTACAO.erroFormato)
    expect(chamadas(fetchSimulado, 'POST', ROTA_PREVIA)).toHaveLength(0)
  })

  it('[COMPONENTE] happy path: prévia sem problemas, importa tudo e conclui', async () => {
    const montagem = await abrir(
      quando('POST', ROTA_PREVIA, () => respostaJson(previaSemProblemas())),
      quando('POST', ROTA_IMPORTACAO, () => respostaJson({ convitesCriados: 2, pessoasCriadas: 3 })),
    )

    await escolherArquivo()

    expect(wrapper!.get('[data-teste="previa-frase"]').text()).toBe('2 convites, 3 pessoas prontas para entrar na lista.')
    expect(wrapper!.find('[data-teste="previa-problemas"]').exists()).toBe(false)
    expect(wrapper!.findAll('[data-teste="previa-convite"]')).toHaveLength(2)
    expect(wrapper!.text()).toContain('Hoje o evento tem 20 pessoas; depois da importação, 23.')
    expect(wrapper!.get('[data-teste="anuncio-importacao"]').text()).toContain('Etapa 2 de 3: Confira')
    const importar = wrapper!.get('[data-teste="importar"]')
    expect(importar.text()).toContain('Importar 2 convites')

    await importar.trigger('click')
    await flushPromises()

    const corpo = chamadas(fetchSimulado, 'POST', ROTA_IMPORTACAO)[0]![1]!.body as FormData
    expect(corpo.get('somenteValidos')).toBe('false')
    expect(wrapper!.get('[data-teste="importacao-concluida"]').text()).toContain('2 convites e 3 pessoas foram adicionados a Ana Beatriz & Bruno.')
    await wrapper!.get('[data-teste="ver-convidados"]').trigger('click')
    await vi.waitFor(() => expect(montagem.roteador.currentRoute.value.name).toBe('evento-convidados'), { timeout: 5000 })
  })

  it('[COMPONENTE] com problemas exige confirmação explícita e envia somenteValidos', async () => {
    await abrir(
      quando('POST', ROTA_PREVIA, () => respostaJson(previaExemplo())),
      quando('POST', ROTA_IMPORTACAO, () => respostaJson({ convitesCriados: 2, pessoasCriadas: 3 })),
    )
    await escolherArquivo()

    expect(wrapper!.get('[data-teste="previa-frase"]').text()).toBe('2 de 3 convites estão prontos. 1 linha precisa de atenção.')
    expect(wrapper!.get('[data-teste="previa-problemas"]').text()).toContain('Linha 5')
    expect(wrapper!.get('[data-teste="previa-problemas"]').text()).toContain('Telefone: Informe o telefone com DDD')
    expect(wrapper!.text()).toContain('Fica de fora')
    const importar = wrapper!.get('[data-teste="importar"]')
    expect(importar.text()).toContain('Importar só os 2 convites prontos')

    await importar.trigger('click')
    await flushPromises()
    expect(chamadas(fetchSimulado, 'POST', ROTA_IMPORTACAO)).toHaveLength(0)
    const dialogo = document.querySelector('[data-teste="dialogo-confirmacao"]')!
    expect(dialogo.textContent).toContain('1 convite (1 pessoa) fica de fora')

    ;(document.querySelector('[data-teste="dialogo-confirmacao-confirmar"]') as HTMLButtonElement).click()
    await flushPromises()

    const corpo = chamadas(fetchSimulado, 'POST', ROTA_IMPORTACAO)[0]![1]!.body as FormData
    expect(corpo.get('somenteValidos')).toBe('true')
    expect(corpo.get('convitesEsperados')).toBe('2')
    expect(wrapper!.find('[data-teste="importacao-concluida"]').exists()).toBe(true)
  })

  it('[COMPONENTE] voltar e corrigir no diálogo não importa', async () => {
    await abrir(quando('POST', ROTA_PREVIA, () => respostaJson(previaExemplo())))
    await escolherArquivo()

    await wrapper!.get('[data-teste="importar"]').trigger('click')
    await flushPromises()
    ;(document.querySelector('[data-teste="dialogo-confirmacao-cancelar"]') as HTMLButtonElement).click()
    await flushPromises()

    expect(chamadas(fetchSimulado, 'POST', ROTA_IMPORTACAO)).toHaveLength(0)
    expect(wrapper!.find('[data-teste="previa-importacao"]').exists()).toBe(true)
  })

  it('[COMPONENTE] nenhum convite pronto desabilita importar e orienta a corrigir', async () => {
    const previa = previaExemplo()
    previa.resumo.convitesValidos = 0
    previa.resumo.pessoasValidas = 0
    previa.convites = previa.convites.map((convite) => ({ ...convite, valido: false }))
    await abrir(quando('POST', ROTA_PREVIA, () => respostaJson(previa)))
    await escolherArquivo()

    expect(wrapper!.get('[data-teste="importar"]').attributes('disabled')).toBeDefined()
    expect(wrapper!.get('[data-teste="orientacao-nenhum"]').text()).toBe(TEXTOS_IMPORTACAO.orientacaoNenhumPronto)
  })

  it('[COMPONENTE] baixa linhas para corrigir e permite enviar planilha corrigida', async () => {
    await abrir(quando('POST', ROTA_PREVIA, () => respostaJson(previaExemplo())))
    await escolherArquivo()
    const blobs: Blob[] = []
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: (blob: Blob) => {
        blobs.push(blob)
        return 'blob:correcao'
      },
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    await wrapper!.get('[data-teste="baixar-correcao"]').trigger('click')
    const texto = await blobs[0]!.text()
    expect(texto).toContain(`"'=HYPERLINK(""http://x"")"`)

    await wrapper!.get('[data-teste="enviar-corrigida"]').trigger('click')
    await flushPromises()
    expect(wrapper!.find('[data-teste="envio-arquivo"]').exists()).toBe(true)
  })

  it('[COMPONENTE] 422 da prévia aparece na área de envio e mantém a etapa 1', async () => {
    await abrir(quando('POST', ROTA_PREVIA, () => respostaProblema(422, { detail: 'Não encontramos a coluna Nome na primeira linha.' })))

    await escolherArquivo()

    expect(wrapper!.get('[data-teste="envio-arquivo-erro"]').text()).toBe('Não encontramos a coluna Nome na primeira linha.')
    expect(wrapper!.find('[data-teste="previa-importacao"]').exists()).toBe(false)
  })

  it('[COMPONENTE] falha de rede na prévia orienta sem perder a tela', async () => {
    await abrir((url, init) => {
      if (url === ROTA_PREVIA && init?.method === 'POST') {
        throw new TypeError('offline')
      }
      return undefined
    })

    await escolherArquivo()

    expect(wrapper!.get('[data-teste="envio-arquivo-erro"]').text()).toContain('conectar')
  })

  it('[COMPONENTE] 422 na importação mostra a mensagem e permite conferir de novo', async () => {
    let previas = 0
    await abrir(
      quando('POST', ROTA_PREVIA, () => {
        previas += 1
        return respostaJson(previaSemProblemas())
      }),
      quando('POST', ROTA_IMPORTACAO, () => respostaProblema(422, { detail: 'A planilha mudou desde a pré-visualização. Confira de novo antes de importar.' })),
    )
    await escolherArquivo()

    await wrapper!.get('[data-teste="importar"]').trigger('click')
    await flushPromises()

    expect(wrapper!.get('[data-teste="falha-importacao"]').text()).toContain('A planilha mudou desde a pré-visualização.')
    await wrapper!.get('[data-teste="conferir-de-novo"]').trigger('click')
    await flushPromises()
    expect(previas).toBe(2)
  })

  it('[SEGURANÇA] 403 na prévia mostra que não há permissão', async () => {
    await abrir(quando('POST', ROTA_PREVIA, () => respostaProblema(403)))

    await escolherArquivo()

    expect(wrapper!.get('[data-teste="envio-arquivo-erro"]').text()).toBe(TEXTOS_IMPORTACAO.semPermissao)
  })

  it('[COMPONENTE] evento arquivado mostra só o aviso', async () => {
    rotearFetch(fetchSimulado, quando('GET', ROTA_EVENTO, () => respostaJson(eventoCompleto({ arquivado: true }))))
    const montagem = await prepararAplicacao(CAMINHO)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()

    expect(wrapper.get('[data-teste="aviso-arquivado"]').text()).toContain(TEXTOS_IMPORTACAO.arquivado)
    expect(wrapper.find('[data-teste="envio-arquivo"]').exists()).toBe(false)
  })

  it('[SEGURANÇA] evento de outra organização mostra não encontrado', async () => {
    rotearFetch(fetchSimulado)
    const montagem = await prepararAplicacao(CAMINHO)
    wrapper = await montarView(RaizRotas, montagem)
    await flushPromises()

    expect(wrapper.find('[data-teste="voltar-eventos"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="envio-arquivo"]').exists()).toBe(false)
  })
})
