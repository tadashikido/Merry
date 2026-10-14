import { afterEach, describe, expect, it, vi } from 'vitest'

import { requisitar } from '@/servicos/clienteHttp'
import { previaExemplo } from '@/__tests__/auxiliaresImportacao'
import { baixarTexto, formatarTamanhoArquivo, verificarArquivoPlanilha, TAMANHO_MAXIMO_PLANILHA } from '@/utilitarios/arquivo'
import { MARCA_BOM, gerarCsv, neutralizarCelula } from '@/utilitarios/csv'
import {
  csvLinhasComProblema,
  frasePrevia,
  itensResumoImportacao,
  linhasBloqueantes,
  modeloImportacaoConvidados,
  ultrapassaLimite,
} from '@/utilitarios/importacaoConvidados'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('csv', () => {
  it.each([
    ['=SOMA(A1)', "'=SOMA(A1)"],
    ['+5511', "'+5511"],
    ['-2', "'-2"],
    ['@cmd', "'@cmd"],
    ['\tTab', "'\tTab"],
    ['\rRetorno', "'\rRetorno"],
    ['Ana', 'Ana'],
    ['', ''],
  ])('[SEGURANÇA] neutraliza fórmula em "%s"', (valor, esperado) => {
    expect(neutralizarCelula(valor)).toBe(esperado)
  })

  it('[UNITÁRIO] trata nulos e números', () => {
    expect(neutralizarCelula(null)).toBe('')
    expect(neutralizarCelula(undefined)).toBe('')
    expect(neutralizarCelula(3)).toBe('3')
  })

  it('[UNITÁRIO] gera CSV com BOM, ponto e vírgula, CRLF e aspas quando preciso', () => {
    const csv = gerarCsv(['Nome', 'Grupo'], [['Ana "Nena"', 'Família; lado A'], ['Bruno', null]])

    expect(csv.startsWith(MARCA_BOM)).toBe(true)
    expect(csv.slice(1)).toBe('Nome;Grupo\r\n"Ana ""Nena""";"Família; lado A"\r\nBruno;\r\n')
  })
})

describe('importacaoConvidados', () => {
  it('[UNITÁRIO] modelo tem cabeçalho aceito pelo servidor e exemplos marcados', () => {
    const linhas = modeloImportacaoConvidados().slice(1).split('\r\n')

    expect(linhas[0]).toBe('Convite;Grupo;Nome;Telefone;E-mail;Faixa etária;Acompanhantes;Resposta')
    expect(linhas.slice(1, 4).every((linha) => linha.includes('(exemplo)'))).toBe(true)
    expect(linhas[1]).toContain('(11) 98765-4321')
  })

  it('[SEGURANÇA] CSV de correção neutraliza fórmulas dos valores enviados', () => {
    const csv = csvLinhasComProblema(previaExemplo())
    const linhas = csv.slice(1).split('\r\n')

    expect(linhas[0]).toBe('Linha;Convite;Grupo;Nome;Telefone;E-mail;Faixa etária;Acompanhantes;Resposta;Problema')
    expect(linhas[1]).toContain(`"'=HYPERLINK(""http://x"")"`)
    expect(linhas[1]).toContain("'@evil")
    expect(linhas[1]).toContain('Telefone: Informe o telefone com DDD')
    expect(linhas[1]).toContain(' | E-mail: Informe um e-mail válido')
  })

  it('[UNITÁRIO] frase-resumo cobre tudo pronto, com problemas e nenhum pronto', () => {
    expect(frasePrevia(previaExemplo({ linhasComProblema: [] }))).toBe('2 convites, 3 pessoas prontas para entrar na lista.')
    expect(frasePrevia(previaExemplo())).toBe('2 de 3 convites estão prontos. 1 linha precisa de atenção.')
    const nenhum = previaExemplo()
    nenhum.resumo.convitesValidos = 0
    expect(frasePrevia(nenhum)).toBe('Nenhum convite pronto para importar.')
  })

  it('[UNITÁRIO] avisos não contam como bloqueantes', () => {
    const previa = previaExemplo()
    previa.linhasComProblema = [{ ...previa.linhasComProblema[0]!, problemas: [{ tipo: 'Aviso', coluna: 'Nome', mensagem: 'Possível duplicado' }] }]

    expect(linhasBloqueantes(previa)).toBe(0)
  })

  it('[UNITÁRIO] resumo destaca pessoas e informa convites, adultos e crianças', () => {
    expect(itensResumoImportacao(previaExemplo()).map((item) => [item.chave, item.valor, item.rotulo, item.destaque ?? false])).toEqual([
      ['pessoas', 3, 'pessoas', true],
      ['adultos', 2, 'adultos', false],
      ['criancas', 1, 'criança', false],
      ['convites', 2, 'convites', false],
    ])
  })

  it('[UNITÁRIO] detecta quando a importação passa do limite do casamento', () => {
    const previa = previaExemplo()
    expect(ultrapassaLimite(previa)).toBe(false)
    previa.resumo.convidadosExistentes = 4998
    expect(ultrapassaLimite(previa)).toBe(true)
  })
})

describe('arquivo', () => {
  it.each([
    [{ name: 'lista.csv', size: 10 }, null],
    [{ name: 'LISTA.CSV', size: 10 }, null],
    [{ name: 'lista.txt', size: 10 }, null],
    [{ name: 'lista.xlsx', size: 10 }, 'formato'],
    [{ name: 'lista.csv', size: 0 }, 'vazio'],
    [{ name: 'lista.csv', size: TAMANHO_MAXIMO_PLANILHA + 1 }, 'tamanho'],
  ])('[UNITÁRIO] verifica %o', (arquivo, esperado) => {
    expect(verificarArquivoPlanilha(arquivo)).toBe(esperado)
  })

  it('[UNITÁRIO] formata tamanho em B, KB e MB', () => {
    expect(formatarTamanhoArquivo(512)).toBe('512 B')
    expect(formatarTamanhoArquivo(48_213)).toBe('48 KB')
    expect(formatarTamanhoArquivo(1_572_864)).toBe('1,5 MB')
  })

  it('[UNITÁRIO] baixa texto por link temporário e revoga a URL', () => {
    const criar = vi.fn(() => 'blob:teste')
    const revogar = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL: criar, revokeObjectURL: revogar })
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    baixarTexto('modelo.csv', 'a;b')

    expect(criar).toHaveBeenCalledOnce()
    expect(clique).toHaveBeenCalledOnce()
    expect(revogar).toHaveBeenCalledWith('blob:teste')
    expect(document.querySelector('a[download]')).toBeNull()
  })
})

describe('clienteHttp com FormData', () => {
  it('[UNITÁRIO] envia FormData sem Content-Type JSON e sem serializar', async () => {
    const fetchSimulado = vi.fn<typeof fetch>(async () => new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchSimulado)
    const formulario = new FormData()
    formulario.append('campo', 'valor')

    await requisitar('/api/teste', { metodo: 'POST', corpo: formulario })

    const init = fetchSimulado.mock.calls[0]![1]!
    expect(init.body).toBe(formulario)
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })
})
