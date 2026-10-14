import { describe, expect, it } from 'vitest'

import { fornecedorFinanceiro, parcelaExemplo } from '@/__tests__/auxiliaresFinanceiro'
import { florista, vinculoExemplo } from '@/__tests__/auxiliaresFornecedoresCasamento'
import { ACEITE_COMPROVANTE, verificarArquivoComprovante } from '@/utilitarios/arquivo'
import { deCentavos, paraCentavos, somarCentavos, temNoMaximoDuasCasas } from '@/utilitarios/centavos'
import {
  adicionarMeses,
  agruparLivro,
  dataValida,
  descreverSituacao,
  gerarParcelasLocal,
  regraDataPagamento,
  regraObservacao,
  regraQuantidade,
  regraValorParcela,
  regraVencimento,
  saldoAParcelarCentavos,
  valorParcelaValido,
} from '@/utilitarios/financeiro'
import { calcularResumoLocal, proporcoesPagamento } from '@/utilitarios/fornecedoresCasamento'

function arquivo(bytes: number[], nome = 'comprovante.bin'): File {
  return new File([new Uint8Array(bytes)], nome)
}

describe('centavos', () => {
  it('[UNITÁRIO] soma sem erro de ponto flutuante', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(deCentavos(somarCentavos([0.1, 0.2]))).toBe(0.3)
    expect(paraCentavos(99_999_999.99)).toBe(9_999_999_999)
    expect(Number.isSafeInteger(paraCentavos(99_999_999.99) * 60)).toBe(true)
    expect(paraCentavos(null)).toBe(0)
    expect(paraCentavos(Number.NaN)).toBe(0)
  })

  it('[UNITÁRIO] reconhece valores com mais de duas casas', () => {
    expect(temNoMaximoDuasCasas(10.25)).toBe(true)
    expect(temNoMaximoDuasCasas(10.255)).toBe(false)
  })
})

describe('gerador local de parcelas', () => {
  it('[UNITÁRIO] 100,00 em 3 ajusta os centavos na última', () => {
    expect(gerarParcelasLocal(10_000, 3, '2027-01-10').map((parcela) => parcela.valorCentavos)).toEqual([3333, 3333, 3334])
  })

  it('[UNITÁRIO] 18.500,00 em 3 a partir de 31/01 usa o último dia dos meses curtos', () => {
    const parcelas = gerarParcelasLocal(1_850_000, 3, '2027-01-31')

    expect(parcelas.map((parcela) => parcela.valorCentavos)).toEqual([616_666, 616_666, 616_668])
    expect(parcelas.map((parcela) => parcela.vencimento)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
    expect(parcelas.map((parcela) => parcela.numero)).toEqual([1, 2, 3])
  })

  it('[UNITÁRIO] 0,05 em 2 dá 0,02 e 0,03; 0,01 em 2 não gera', () => {
    expect(gerarParcelasLocal(5, 2, '2027-01-10').map((parcela) => parcela.valorCentavos)).toEqual([2, 3])
    expect(gerarParcelasLocal(1, 2, '2027-01-10')).toEqual([])
  })

  it('[UNITÁRIO] o valor máximo em 60 parcelas soma exatamente', () => {
    const parcelas = gerarParcelasLocal(9_999_999_999, 60, '2027-01-31')

    expect(parcelas).toHaveLength(60)
    expect(parcelas.reduce((total, parcela) => total + parcela.valorCentavos, 0)).toBe(9_999_999_999)
    expect(parcelas[59]!.vencimento).toBe('2031-12-31')
  })

  it('[UNITÁRIO] entradas inválidas não geram prévia', () => {
    expect(gerarParcelasLocal(0, 2, '2027-01-10')).toEqual([])
    expect(gerarParcelasLocal(100, 0, '2027-01-10')).toEqual([])
    expect(gerarParcelasLocal(100, 2, '10/01/2027')).toEqual([])
  })

  it('[UNITÁRIO] soma meses respeitando ano bissexto e virada de ano', () => {
    expect(adicionarMeses('2028-01-31', 1)).toBe('2028-02-29')
    expect(adicionarMeses('2026-11-15', 3)).toBe('2027-02-15')
    expect(adicionarMeses('data', 1)).toBeNull()
  })
})

describe('regras de parcela', () => {
  it('[UNITÁRIO] calcula o saldo a parcelar ignorando a própria parcela em edição', () => {
    const parcelas = [parcelaExemplo({ id: 'a', valor: 6000.1 }), parcelaExemplo({ id: 'b', valor: 0.2 })]

    expect(saldoAParcelarCentavos(18500, parcelas)).toBe(1_249_970)
    expect(saldoAParcelarCentavos(18500, parcelas, 'a')).toBe(1_849_980)
  })

  it('[UNITÁRIO] valida valor, vencimento, observação, quantidade e data do pagamento', () => {
    expect(valorParcelaValido(0.01)).toBe(true)
    expect(valorParcelaValido(0)).toBe(false)
    expect(valorParcelaValido(1.001)).toBe(false)
    expect(valorParcelaValido(100_000_000)).toBe(false)
    expect(regraValorParcela(null)).not.toBeNull()
    expect(regraVencimento('')).not.toBeNull()
    expect(regraVencimento('1999-12-31')).not.toBeNull()
    expect(regraVencimento('2027-01-31')).toBeNull()
    expect(dataValida('2027-13-01')).toBe(false)
    expect(regraObservacao('a'.repeat(121))).not.toBeNull()
    expect(regraObservacao('Pix')).toBeNull()
    expect(regraQuantidade(61)).not.toBeNull()
    expect(regraQuantidade(1.5)).not.toBeNull()
    expect(regraQuantidade(60)).toBeNull()
    const regraPagamento = regraDataPagamento(() => '2026-09-30')
    expect(regraPagamento('2026-10-01')).not.toBeNull()
    expect(regraPagamento('2026-09-30')).toBeNull()
    expect(regraPagamento('')).not.toBeNull()
  })

  it('[UNITÁRIO] descreve a situação com texto e variante', () => {
    const data = (valor: string) => valor
    expect(descreverSituacao({ situacao: 'Vencida', diasParaVencimento: -1, venceEmBreve: false, pagaEm: null }, data)).toEqual({ texto: 'Venceu ontem', variante: 'erro' })
    expect(descreverSituacao({ situacao: 'Vencida', diasParaVencimento: -3, venceEmBreve: false, pagaEm: null }, data).texto).toBe('Vencida há 3 dias')
    expect(descreverSituacao({ situacao: 'Pendente', diasParaVencimento: 0, venceEmBreve: true, pagaEm: null }, data)).toEqual({ texto: 'Vence hoje', variante: 'alerta' })
    expect(descreverSituacao({ situacao: 'Pendente', diasParaVencimento: 1, venceEmBreve: true, pagaEm: null }, data).texto).toBe('Vence em 1 dia')
    expect(descreverSituacao({ situacao: 'Pendente', diasParaVencimento: 30, venceEmBreve: false, pagaEm: null }, data)).toEqual({ texto: 'Pendente', variante: 'neutro' })
    expect(descreverSituacao({ situacao: 'Paga', diasParaVencimento: -3, venceEmBreve: false, pagaEm: '29 set' }, data)).toEqual({ texto: 'Paga em 29 set', variante: 'sucesso' })
  })

  it('[UNITÁRIO] organiza o livro por vencimento e deixa canceladas de fora', () => {
    const livro = agruparLivro([
      fornecedorFinanceiro({
        parcelas: [
          parcelaExemplo({ id: 'depois', vencimento: '2026-12-01', diasParaVencimento: 62 }),
          parcelaExemplo({ id: 'breve', vencimento: '2026-10-02', diasParaVencimento: 2, venceEmBreve: true }),
          parcelaExemplo({ id: 'vencida', vencimento: '2026-09-01', situacao: 'Vencida', diasParaVencimento: -29 }),
          parcelaExemplo({ id: 'paga-antiga', situacao: 'Paga', pagaEm: '2026-08-01' }),
          parcelaExemplo({ id: 'paga-recente', situacao: 'Paga', pagaEm: '2026-09-20' }),
        ],
      }),
      fornecedorFinanceiro({ status: 'Cancelado', fornecedorCasamentoId: 'x', parcelas: [parcelaExemplo({ id: 'historico', situacao: 'Vencida' })] }),
    ])

    expect(livro.vencidas.map((parcela) => parcela.id)).toEqual(['vencida'])
    expect(livro.proximas.map((parcela) => parcela.id)).toEqual(['breve'])
    expect(livro.depois.map((parcela) => parcela.id)).toEqual(['depois'])
    expect(livro.pagas.map((parcela) => parcela.id)).toEqual(['paga-recente', 'paga-antiga'])
    expect(livro.vencidas[0]!.nomeEmpresa).toBe('Buffet São João')
  })
})

describe('resumo com pagamentos', () => {
  it('[UNITÁRIO] proporções das três camadas usam o maior entre orçado e contratado', () => {
    expect(proporcoesPagamento(55_000, 51_000, 31_000)).toEqual({
      pago: 31_000 / 55_000,
      aPagar: 20_000 / 55_000,
      livre: 4_000 / 55_000,
    })
    expect(proporcoesPagamento(0, 0, 0)).toEqual({ pago: 0, aPagar: 0, livre: 0 })
    expect(proporcoesPagamento(100, 200, 50)).toEqual({ pago: 0.25, aPagar: 0.75, livre: 0 })
  })

  it('[UNITÁRIO] resumo local soma pago e pendente em centavos e preserva o vencido do servidor', () => {
    const parcelas = { quantidade: 2, pagas: 1, vencidas: 1, parcelado: 18_500, pago: 6_000.1, saldoAParcelar: 0, proximoVencimento: '2026-10-02', proximoValor: 3250 }
    const anterior = calcularResumoLocal([])
    anterior.categorias = [{ categoria: 'Buffet', quantidade: 1, contratados: 1, orcado: 18_000, contratado: 18_500, vencido: 3_250 }]

    const resumo = calcularResumoLocal(
      [vinculoExemplo({ status: 'Contratado', valorContratado: 18_500, parcelas }), florista({ status: 'Cancelado', parcelas })],
      anterior,
    )

    expect(resumo.totalPago).toBe(6_000.1)
    expect(resumo.totalPendente).toBe(12_499.9)
    expect(resumo.totalVencido).toBe(3_250)
    expect(resumo.totalParcelado).toBe(18_500)
    expect(resumo.categorias.find((categoria) => categoria.categoria === 'Decoracao')).toBeUndefined()
  })
})

describe('arquivo do comprovante', () => {
  it('[SEGURANÇA] aceita PDF, PNG e JPEG pela assinatura e recusa o resto', async () => {
    expect(await verificarArquivoComprovante(arquivo([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBeNull()
    expect(await verificarArquivoComprovante(arquivo([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBeNull()
    expect(await verificarArquivoComprovante(arquivo([0xff, 0xd8, 0xff, 0xe0]))).toBeNull()
    expect(await verificarArquivoComprovante(arquivo([0x4d, 0x5a, 0x90], 'recibo.pdf'))).toBe('formato')
    expect(await verificarArquivoComprovante(arquivo([...new TextEncoder().encode('<svg><script>')], 'recibo.png'))).toBe('formato')
    expect(await verificarArquivoComprovante(arquivo([]))).toBe('vazio')
    expect(ACEITE_COMPROVANTE).not.toContain('svg')
  })

  it('[SEGURANÇA] recusa arquivo acima de 10 MB antes de ler o conteúdo', async () => {
    const grande = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.pdf')

    expect(await verificarArquivoComprovante(grande)).toBe('tamanho')
  })
})
