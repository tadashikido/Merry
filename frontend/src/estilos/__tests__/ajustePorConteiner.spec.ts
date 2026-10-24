import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = resolve(__dirname, '../..')
const CARACTERISTICAS_DE_LARGURA = /\b(?:min-|max-)?(?:width|height|aspect-ratio|device-width|device-height|resolution)\b|\borientation\b/

interface RegraMedia {
  arquivo: string
  linha: number
  condicao: string
}

function listarEstilos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) {
      return nome === '__tests__' ? [] : listarEstilos(caminho)
    }
    return /\.(vue|css)$/.test(nome) ? [caminho] : []
  })
}

function regrasMedia(caminho: string): RegraMedia[] {
  const arquivo = relative(RAIZ, caminho).split('\\').join('/')
  return readFileSync(caminho, 'utf-8')
    .split('\n')
    .flatMap((texto, indice) => {
      const achado = /@media\s+([^{]+)\{/.exec(texto)
      return achado ? [{ arquivo, linha: indice + 1, condicao: (achado[1] ?? '').trim() }] : []
    })
}

function ehDeLargura(condicao: string): boolean {
  return CARACTERISTICAS_DE_LARGURA.test(condicao)
}

const ESTILOS = listarEstilos(RAIZ)
const REGRAS = ESTILOS.flatMap(regrasMedia)

describe('ajuste de largura por contêiner', () => {
  it('[UNITÁRIO] encontra os arquivos de estilo do frontend', () => {
    expect(ESTILOS.length).toBeGreaterThan(100)
    expect(ESTILOS.some((caminho) => caminho.endsWith('base.css'))).toBe(true)
  })

  it('[UNITÁRIO] nenhum @media de largura de janela em frontend/src', () => {
    const violacoes = REGRAS.filter((regra) => ehDeLargura(regra.condicao)).map(
      (regra) => `${regra.arquivo}:${regra.linha} @media ${regra.condicao}`,
    )
    expect(violacoes).toEqual([])
  })

  it('[UNITÁRIO] @media restantes são de impressão, ponteiro ou preferência do dispositivo', () => {
    const outras = REGRAS.filter((regra) => !/^(print|\((pointer|hover|prefers-[a-z-]+):\s*[a-z-]+\))$/.test(regra.condicao))
    expect(outras.map((regra) => `${regra.arquivo}:${regra.linha} @media ${regra.condicao}`)).toEqual([])
  })

  it.each([
    ['(min-width: 640px)', true],
    ['(max-width: 1023px)', true],
    ['screen and (min-width: 40rem)', true],
    ['(orientation: landscape)', true],
    ['(min-height: 30rem)', true],
    ['print', false],
    ['(pointer: coarse)', false],
    ['(prefers-reduced-motion: reduce)', false],
    ['(hover: hover)', false],
  ])('[UNITÁRIO] classifica "%s" como de largura = %s', (condicao, esperado) => {
    expect(ehDeLargura(condicao)).toBe(esperado)
  })

  it('[UNITÁRIO] o body é o contêiner da aplicação usado por layouts, diálogos e estilos globais', () => {
    const base = readFileSync(join(RAIZ, 'estilos/base.css'), 'utf-8')
    expect(base).toMatch(/body \{\s*container: aplicacao \/ inline-size;/)
    expect(base).toMatch(/@container aplicacao \(max-width: 39\.99rem\) \{[^@]*min-height: var\(--p-dimensao-alvo-toque-movel\)/)
    expect(base).toMatch(/@media \(pointer: coarse\) \{[^@]*min-height: var\(--p-dimensao-alvo-toque-movel\)/)
  })
})
