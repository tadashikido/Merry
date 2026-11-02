import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ_FRONTEND = resolve(__dirname, '../..')
const RAIZ_REPOSITORIO = resolve(RAIZ_FRONTEND, '..')
const DIRETORIOS_IGNORADOS = new Set(['node_modules', 'bin', 'obj', 'dist'])
const CARACTERE_PROIBIDO = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/

type Alvo = { raiz: string; incluir: (caminho: string) => boolean }

const ehArquivoDeTesteFrontend = (caminho: string) =>
  /\.(spec|test)\.ts$/.test(caminho) || (/[\\/]__tests__[\\/]/.test(caminho) && /\.(ts|vue)$/.test(caminho))

const ALVOS: Alvo[] = [
  { raiz: join(RAIZ_FRONTEND, 'src'), incluir: ehArquivoDeTesteFrontend },
  { raiz: join(RAIZ_FRONTEND, 'e2e'), incluir: (caminho) => caminho.endsWith('.ts') },
  { raiz: join(RAIZ_REPOSITORIO, 'backend', 'tests'), incluir: (caminho) => caminho.endsWith('.cs') },
]

function listarArquivos(diretorio: string): string[] {
  return readdirSync(diretorio).flatMap((nome) => {
    if (DIRETORIOS_IGNORADOS.has(nome)) return []
    const caminho = join(diretorio, nome)
    return statSync(caminho).isDirectory() ? listarArquivos(caminho) : [caminho]
  })
}

function arquivosDeTeste(): string[] {
  return ALVOS.filter((alvo) => existsSync(alvo.raiz)).flatMap((alvo) => listarArquivos(alvo.raiz).filter(alvo.incluir))
}

function localizarCaracteresProibidos(conteudo: string): { linha: number; codigo: string }[] {
  return conteudo.split('\n').flatMap((texto, indice) => {
    const encontrado = CARACTERE_PROIBIDO.exec(texto)
    if (!encontrado) return []
    const codigo = `U+${encontrado[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`
    return [{ linha: indice + 1, codigo }]
  })
}

describe('Arquivos de teste sem caracteres de controle', () => {
  it('[UNITÁRIO] a detecção acusa backspace e outros controles e aceita tab, LF e CR', () => {
    expect(localizarCaracteresProibidos(`/#[0-9a-f]{3,8}${String.fromCharCode(8)}/`)).toEqual([{ linha: 1, codigo: 'U+0008' }])
    expect(localizarCaracteresProibidos(`a\nb${String.fromCharCode(0)}`)).toEqual([{ linha: 2, codigo: 'U+0000' }])
    expect(localizarCaracteresProibidos(`x${String.fromCharCode(0x1b)}`)).toEqual([{ linha: 1, codigo: 'U+001B' }])
    expect(localizarCaracteresProibidos(`x${String.fromCharCode(0x7f)}`)).toEqual([{ linha: 1, codigo: 'U+007F' }])
    expect(localizarCaracteresProibidos('coluna\tvalor\r\nproxima linha\n')).toEqual([])
  })

  it('[UNITÁRIO] a varredura alcança os arquivos de teste do projeto', () => {
    const relativos = arquivosDeTeste().map((caminho) => relative(RAIZ_FRONTEND, caminho).split(sep).join('/'))

    expect(relativos).toEqual(
      expect.arrayContaining([
        'src/__tests__/caracteresControleTestes.spec.ts',
        'src/layouts/__tests__/layouts.spec.ts',
        'src/views/grandeDia/__tests__/GrandeDiaView.spec.ts',
        'src/__tests__/auxiliaresTeste.ts',
      ]),
    )
    expect(relativos.some((caminho) => caminho.startsWith('e2e/'))).toBe(true)
    expect(relativos.some((caminho) => caminho.includes('node_modules'))).toBe(false)
  })

  it('[UNITÁRIO] nenhum arquivo de teste contém caractere de controle além de tab e quebra de linha', () => {
    const ocorrencias = arquivosDeTeste().flatMap((caminho) =>
      localizarCaracteresProibidos(readFileSync(caminho, 'utf-8')).map(
        ({ linha, codigo }) => `${relative(RAIZ_REPOSITORIO, caminho).split(sep).join('/')}:${linha} ${codigo}`,
      ),
    )

    expect(ocorrencias).toEqual([])
  })
})
