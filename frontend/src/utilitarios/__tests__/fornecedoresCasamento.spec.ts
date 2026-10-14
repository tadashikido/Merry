import { afterEach, describe, expect, it, vi } from 'vitest'

import { arquivoPdf, florista, vinculoExemplo } from '@/__tests__/auxiliaresFornecedoresCasamento'
import { resumoFornecedor } from '@/__tests__/auxiliaresFornecedores'
import { TEXTOS_FORNECEDORES_CASAMENTO } from '@/textos/fornecedoresCasamento'
import { TAMANHO_MAXIMO_CONTRATO, baixarBlob, verificarArquivoPdf } from '@/utilitarios/arquivo'
import {
  LIMITES_VINCULO,
  VARIANTES_STATUS_FORNECEDOR_CASAMENTO,
  agruparVinculosPorCategoria,
  calcularResumoLocal,
  excedenteOrcamento,
  fornecedoresDisponiveis,
  proporcaoContratada,
  regraFornecedor,
  regraValor,
  regraValorContratado,
  valorValido,
} from '@/utilitarios/fornecedoresCasamento'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('utilitários de fornecedores do casamento', () => {
  it('[UNITÁRIO] agrupa por categoria na ordem da lista fechada e ordena por nome', () => {
    const grupos = agruparVinculosPorCategoria([
      florista(),
      vinculoExemplo({ id: 'b', fornecedor: { ...vinculoExemplo().fornecedor, id: 'fb', nomeEmpresa: 'Ágape Buffet' } }),
      vinculoExemplo(),
    ])

    expect(grupos.map((grupo) => grupo.categoria)).toEqual(['Buffet', 'Decoracao'])
    expect(grupos[0]!.vinculos.map((vinculo) => vinculo.fornecedor.nomeEmpresa)).toEqual(['Ágape Buffet', 'Buffet São João'])
  })

  it('[UNITÁRIO] oferece só fornecedores ativos ainda não vinculados, na ordem das categorias', () => {
    const base = [
      resumoFornecedor({ id: '44444444-4444-4444-8444-444444444444', categoria: 'Decoracao', nomeEmpresa: 'Florista Jardim' }),
      resumoFornecedor(),
      resumoFornecedor({ id: 'foto', categoria: 'Fotografia', nomeEmpresa: 'Luz & Afeto' }),
      resumoFornecedor({ id: 'arq', categoria: 'Buffet', nomeEmpresa: 'Antigo Buffet', arquivado: true }),
    ]

    const disponiveis = fornecedoresDisponiveis(base, [vinculoExemplo()])

    expect(disponiveis.map((item) => item.nomeEmpresa)).toEqual(['Florista Jardim', 'Luz & Afeto'])
  })

  it('[UNITÁRIO] régua e excedente: contratado sobre orçado, limitado a 100%', () => {
    expect(proporcaoContratada({ orcado: 18000, contratado: 9000 })).toBe(0.5)
    expect(proporcaoContratada({ orcado: 18000, contratado: 18500 })).toBe(1)
    expect(proporcaoContratada({ orcado: 0, contratado: 500 })).toBe(1)
    expect(proporcaoContratada({ orcado: 1500, contratado: 0 })).toBe(0)
    expect(excedenteOrcamento({ orcado: 18000, contratado: 18500 })).toBe(500)
    expect(excedenteOrcamento({ orcado: 0, contratado: 500 })).toBe(0)
    expect(excedenteOrcamento({ orcado: 18000, contratado: 17000 })).toBe(0)
  })

  it('[UNITÁRIO] valida valores: vazio, negativo, acima do teto e mais de 2 casas', () => {
    expect(valorValido(null)).toBe(true)
    expect(valorValido(0)).toBe(true)
    expect(valorValido(18000.5)).toBe(true)
    expect(valorValido(LIMITES_VINCULO.valorMaximo)).toBe(true)
    expect(valorValido(-1)).toBe(false)
    expect(valorValido(LIMITES_VINCULO.valorMaximo + 1)).toBe(false)
    expect(valorValido(10.123)).toBe(false)
    expect(regraValor(-5)).toBe(TEXTOS_FORNECEDORES_CASAMENTO.erroValor)
    expect(regraValor(null)).toBeNull()
  })

  it('[UNITÁRIO] valor contratado é obrigatório só quando a situação é Contratado', () => {
    let status: 'Cotacao' | 'Contratado' = 'Cotacao'
    const regra = regraValorContratado(() => status)

    expect(regra(null)).toBeNull()
    status = 'Contratado'
    expect(regra(null)).toBe(TEXTOS_FORNECEDORES_CASAMENTO.erroContratadoSemValor)
    expect(regra(18500)).toBeNull()
    expect(regra(-1)).toBe(TEXTOS_FORNECEDORES_CASAMENTO.erroValor)
    expect(regraFornecedor('')).toBe(TEXTOS_FORNECEDORES_CASAMENTO.erroFornecedorObrigatorio)
    expect(regraFornecedor('id')).toBeNull()
  })

  it('[UNITÁRIO] resumo local ignora cancelados e soma contratado só de Contratado, sem erro de ponto flutuante', () => {
    const resumo = calcularResumoLocal([
      vinculoExemplo({ status: 'Contratado', valorOrcado: 0.1, valorContratado: 0.2 }),
      vinculoExemplo({ id: 'x', status: 'Contratado', valorOrcado: 0.2, valorContratado: 0.1 }),
      florista({ status: 'EmNegociacao', valorContratado: 15000 }),
      florista({ id: 'c', status: 'Cancelado', valorOrcado: 9999 }),
    ])

    expect(resumo.categorias.map((categoria) => categoria.categoria)).toEqual(['Buffet', 'Decoracao'])
    expect(resumo.categorias[0]).toEqual({ categoria: 'Buffet', quantidade: 2, contratados: 2, orcado: 0.3, contratado: 0.3, pago: 0, pendente: 0.3, vencido: 0, parcelado: 0 })
    expect(resumo.categorias[1]).toEqual({ categoria: 'Decoracao', quantidade: 1, contratados: 0, orcado: 15800, contratado: 0, pago: 0, pendente: 0, vencido: 0, parcelado: 0 })
    expect(resumo.totalOrcado).toBe(15800.3)
    expect(resumo.totalContratado).toBe(0.3)
    expect(resumo.quantidadeFornecedores).toBe(3)
    expect(resumo.quantidadeContratados).toBe(2)
  })

  it('[UNITÁRIO] status tem variante de cor própria (cor + ícone + texto)', () => {
    expect(VARIANTES_STATUS_FORNECEDOR_CASAMENTO).toEqual({
      Cotacao: 'informacao',
      EmNegociacao: 'alerta',
      Contratado: 'sucesso',
      Cancelado: 'neutro',
    })
  })
})

describe('arquivo do contrato', () => {
  it('[SEGURANÇA] aceita só PDF pela assinatura, não pela extensão', async () => {
    expect(await verificarArquivoPdf(arquivoPdf())).toBeNull()
    expect(await verificarArquivoPdf(arquivoPdf('imagem.pdf', '\u0089PNG\r\n'))).toBe('formato')
    expect(await verificarArquivoPdf(new File(['texto qualquer'], 'contrato.pdf'))).toBe('formato')
    expect(await verificarArquivoPdf(new File([], 'vazio.pdf'))).toBe('vazio')
  })

  it('[SEGURANÇA] recusa arquivo acima de 10 MB sem ler o conteúdo', async () => {
    const grande = arquivoPdf()
    Object.defineProperty(grande, 'size', { value: TAMANHO_MAXIMO_CONTRATO + 1 })

    expect(await verificarArquivoPdf(grande)).toBe('tamanho')
  })

  it('[UNITÁRIO] baixa o blob por link temporário com o nome informado e libera a URL', () => {
    const criar = vi.fn(() => 'blob:contrato')
    const revogar = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL: criar, revokeObjectURL: revogar })
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    baixarBlob('contrato-buffet.pdf', new Blob(['%PDF-']))

    expect(criar).toHaveBeenCalledTimes(1)
    expect(clique).toHaveBeenCalledTimes(1)
    const link = clique.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('contrato-buffet.pdf')
    expect(link.rel).toBe('noopener')
    expect(revogar).toHaveBeenCalledWith('blob:contrato')
    expect(document.querySelector('a[download]')).toBeNull()
    clique.mockRestore()
  })
})
