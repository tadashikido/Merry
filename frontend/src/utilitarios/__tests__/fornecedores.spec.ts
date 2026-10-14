import { describe, expect, it } from 'vitest'

import { resumoFornecedor } from '@/__tests__/auxiliaresFornecedores'
import { TEXTOS_FORNECEDORES } from '@/textos/fornecedores'
import {
  agruparPorCategoria,
  contarPorCategoria,
  exibirInstagram,
  exibirSite,
  filtrarFornecedores,
  normalizarInstagram,
  normalizarSite,
  opcoesCategorias,
  possuiContato,
  regraCategoria,
  regraInstagram,
  regraNomeEmpresa,
  regraSite,
  regraTelefone,
  urlEmail,
  urlInstagram,
  urlSite,
  urlTelefone,
  urlWhatsapp,
} from '@/utilitarios/fornecedores'

const LISTA = [
  resumoFornecedor({ id: 'a', nomeEmpresa: 'Buffet São João', categoria: 'Buffet' }),
  resumoFornecedor({ id: 'b', nomeEmpresa: 'Fotografia Ângela Lima', responsavel: 'Ângela', categoria: 'Fotografia' }),
  resumoFornecedor({ id: 'c', nomeEmpresa: 'Buffet Oliveira', responsavel: 'Carla Oliveira', categoria: 'Buffet' }),
  resumoFornecedor({ id: 'd', nomeEmpresa: 'Florista Jardim', responsavel: null, categoria: 'Decoracao', arquivado: true }),
]

describe('filtros de fornecedores', () => {
  it('[UNITÁRIO] busca sem acento em empresa e responsável, só na situação escolhida', () => {
    expect(filtrarFornecedores(LISTA, { busca: 'angela', categoria: null, situacao: 'ativos' }).map((item) => item.id)).toEqual(['b'])
    expect(filtrarFornecedores(LISTA, { busca: 'SAO JO', categoria: null, situacao: 'ativos' }).map((item) => item.id)).toEqual(['a'])
    expect(filtrarFornecedores(LISTA, { busca: 'carla', categoria: null, situacao: 'ativos' }).map((item) => item.id)).toEqual(['c'])
    expect(filtrarFornecedores(LISTA, { busca: 'florista', categoria: null, situacao: 'ativos' })).toEqual([])
    expect(filtrarFornecedores(LISTA, { busca: '', categoria: null, situacao: 'arquivados' }).map((item) => item.id)).toEqual(['d'])
  })

  it('[UNITÁRIO] categoria combina com a busca', () => {
    expect(filtrarFornecedores(LISTA, { busca: '', categoria: 'Buffet', situacao: 'ativos' }).map((item) => item.id)).toEqual(['a', 'c'])
    expect(filtrarFornecedores(LISTA, { busca: 'oliveira', categoria: 'Buffet', situacao: 'ativos' }).map((item) => item.id)).toEqual(['c'])
    expect(filtrarFornecedores(LISTA, { busca: 'oliveira', categoria: 'Fotografia', situacao: 'ativos' })).toEqual([])
  })

  it('[UNITÁRIO] agrupa por categoria em ordem alfabética do rótulo e ordena os nomes', () => {
    const grupos = agruparPorCategoria(LISTA.filter((item) => !item.arquivado))

    expect(grupos.map((grupo) => grupo.rotulo)).toEqual(['Buffet', 'Fotografia'])
    expect(grupos[0]!.fornecedores.map((item) => item.nomeEmpresa)).toEqual(['Buffet Oliveira', 'Buffet São João'])
    expect(contarPorCategoria(LISTA)).toEqual([
      { chave: 'Buffet', rotulo: 'Buffet', quantidade: 2 },
      { chave: 'Decoracao', rotulo: 'Decoração', quantidade: 1 },
      { chave: 'Fotografia', rotulo: 'Fotografia', quantidade: 1 },
    ])
  })

  it('[UNITÁRIO] oferece as 15 categorias com rótulos pt-BR ordenados', () => {
    const opcoes = opcoesCategorias()
    expect(opcoes).toHaveLength(15)
    expect(opcoes[0]).toEqual({ valor: 'Beleza', rotulo: 'Beleza' })
    expect(opcoes.map((opcao) => opcao.rotulo)).toContain('Música, DJ e banda')
  })
})

describe('contatos de fornecedores', () => {
  it('[SEGURANÇA] site aceita só http/https com domínio e completa o esquema', () => {
    expect(normalizarSite('saojoao.com.br')).toBe('https://saojoao.com.br')
    expect(normalizarSite('http://saojoao.com.br/menu')).toBe('http://saojoao.com.br/menu')
    expect(normalizarSite('saojoao.com.br:8080')).toBe('https://saojoao.com.br:8080')
    for (const perigoso of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,oi', 'ftp://saojoao.com.br', 'https://u:s@saojoao.com.br', 'https://localhost', 'https://10.0.0.1', 'sao joao.com']) {
      expect(normalizarSite(perigoso)).toBeNull()
      expect(urlSite(perigoso)).toBeNull()
    }
    expect(exibirSite('https://www.saojoao.com.br/')).toBe('saojoao.com.br')
  })

  it('[SEGURANÇA] Instagram grava só o usuário e monta link fixo', () => {
    expect(normalizarInstagram('@Buffet.SaoJoao')).toBe('buffet.saojoao')
    expect(normalizarInstagram('https://www.instagram.com/buffetsaojoao/?hl=pt')).toBe('buffetsaojoao')
    expect(normalizarInstagram('com espaco')).toBeNull()
    expect(normalizarInstagram('"><script>')).toBeNull()
    expect(urlInstagram('buffetsaojoao')).toBe('https://www.instagram.com/buffetsaojoao/')
    expect(exibirInstagram('buffetsaojoao')).toBe('@buffetsaojoao')
  })

  it('[SEGURANÇA] telefone, WhatsApp e e-mail só geram link quando válidos', () => {
    expect(urlTelefone('11987654321')).toBe('tel:11987654321')
    expect(urlWhatsapp('11987654321')).toBe('https://wa.me/5511987654321')
    expect(urlWhatsapp('+351912345678')).toBe('https://wa.me/351912345678')
    expect(urlTelefone('abc')).toBeNull()
    expect(urlWhatsapp(null)).toBeNull()
    expect(urlEmail('contato@saojoao.com.br')).toBe('mailto:contato@saojoao.com.br')
    expect(urlEmail('a@b.com?bcc=x@y.com')).toBeNull()
    expect(possuiContato({ telefone: null, email: null, site: null, instagram: null })).toBe(false)
    expect(possuiContato({ telefone: null, email: null, site: 'saojoao.com.br', instagram: null })).toBe(true)
  })

  it('[UNITÁRIO] regras do formulário devolvem as mensagens da UX', () => {
    expect(regraCategoria('')).toBe(TEXTOS_FORNECEDORES.erroCategoria)
    expect(regraCategoria('Buffet')).toBeNull()
    expect(regraNomeEmpresa('  ')).toBe(TEXTOS_FORNECEDORES.erroEmpresaObrigatoria)
    expect(regraNomeEmpresa('A')).toBe(TEXTOS_FORNECEDORES.erroEmpresaTamanho)
    expect(regraNomeEmpresa('Buffet')).toBeNull()
    expect(regraTelefone('11 abc')).toBe(TEXTOS_FORNECEDORES.erroTelefone)
    expect(regraTelefone('')).toBeNull()
    expect(regraSite('javascript:alert(1)')).toBe(TEXTOS_FORNECEDORES.erroSite)
    expect(regraSite('')).toBeNull()
    expect(regraInstagram('com espaco')).toBe(TEXTOS_FORNECEDORES.erroInstagram)
    expect(regraInstagram('@ok')).toBeNull()
  })
})
