import { describe, expect, it } from 'vitest'

import { TEXTOS_CSV_BUFFET } from '@/textos/confirmacoes'
import { exportacaoExemplo } from '@/__tests__/auxiliaresConfirmacoes'
import { MARCA_BOM } from '@/utilitarios/csv'
import { descreverRestricoes, gerarCsvBuffet, linhasCsvBuffet, nomeArquivoBuffet } from '@/utilitarios/exportacaoBuffet'

describe('exportacaoBuffet', () => {
  it('[UNITÁRIO] gera CSV com BOM, separador ponto e vírgula, CRLF e seções de contagem, restrições e lista', () => {
    const csv = gerarCsvBuffet(exportacaoExemplo())

    expect(csv.startsWith(MARCA_BOM)).toBe(true)
    expect(csv.endsWith('\r\n')).toBe(true)
    const linhas = csv.slice(1).split('\r\n')
    expect(linhas[0]).toBe('Casamento;Ana Beatriz & Bruno;;;;')
    expect(csv).toContain('Data;22/05/2027;;;;')
    expect(csv).toContain('Adultos confirmados;3;;;;')
    expect(csv).toContain('Crianças confirmadas;1;;;;')
    expect(csv).toContain('Total confirmado;4;;;;')
    expect(csv).toContain('Pessoas sem resposta;2;;;;')
    expect(csv).toContain('Sem glúten;1;;;;')
    expect(csv).toContain(TEXTOS_CSV_BUFFET.cabecalhoLista.join(';'))
    expect(csv).toContain('Família Souza;Lia Souza;Criança;Não;"Sem glúten, sem porco";cadeira alta')
    expect(csv).toContain('Família Souza;Pedro Lima;Adulto;Sim;;')
  })

  it('[SEGURANÇA] neutraliza fórmulas em todas as células', () => {
    const csv = gerarCsvBuffet(exportacaoExemplo())

    expect(csv).toContain(`"'=HYPERLINK(""x"")";'+Rafael;Adulto;Não;'@sem sal;'-nada`)
    expect(csv).not.toMatch(/(^|;)=HYPERLINK/m)
  })

  it('[SEGURANÇA] não inclui dados de contato', () => {
    const csv = gerarCsvBuffet(exportacaoExemplo())

    expect(csv).toContain(TEXTOS_CSV_BUFFET.aviso)
    const semAviso = csv.replace(TEXTOS_CSV_BUFFET.aviso, '').toLowerCase()
    expect(semAviso).not.toContain('telefone')
    expect(semAviso).not.toContain('e-mail')
    expect(semAviso).not.toContain('@exemplo')
  })

  it('[UNITÁRIO] todas as linhas têm a mesma largura da lista', () => {
    const linhas = linhasCsvBuffet(exportacaoExemplo())

    expect(new Set(linhas.map((linha) => linha.length))).toEqual(new Set([TEXTOS_CSV_BUFFET.cabecalhoLista.length]))
  })

  it('[UNITÁRIO] sem horário, local e confirmados gera células vazias e só o cabeçalho da lista', () => {
    const csv = gerarCsvBuffet(
      exportacaoExemplo({
        casamento: { nomePrimeiraPessoa: 'Ana', nomeSegundaPessoa: 'Bia', data: '2027-01-02', horario: null, localRecepcao: null },
        convites: [],
      }),
    )

    expect(csv).toContain('Horário;;;;;')
    expect(csv.trimEnd().endsWith(TEXTOS_CSV_BUFFET.cabecalhoLista.join(';'))).toBe(true)
  })

  it('[UNITÁRIO] descreve restrições com rótulos em português e outra restrição', () => {
    expect(descreverRestricoes({ tipos: ['SemGluten', 'Vegana'], outraRestricao: 'sem porco' })).toBe('Sem glúten, Vegana, sem porco')
    expect(descreverRestricoes({ tipos: [], outraRestricao: null })).toBe('')
  })

  it('[SEGURANÇA] nome do arquivo sem acentos nem caracteres perigosos', () => {
    expect(nomeArquivoBuffet(exportacaoExemplo())).toBe('buffet-ana-beatriz-e-bruno-2027-05-22.csv')
    expect(
      nomeArquivoBuffet({ casamento: { nomePrimeiraPessoa: '../Zé', nomeSegundaPessoa: 'Ção/\\:*?', data: '../x', horario: null, localRecepcao: null } }),
    ).toBe('buffet-ze-e-cao-sem-data.csv')
  })
})
