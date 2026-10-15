import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { NOMES_ICONES, classeIcone } from '@/design/icones'

const css = readFileSync(resolve(process.cwd(), 'src/estilos/icones.css'), 'utf-8')

describe('iconografia', () => {
  it('[UNITÁRIO] todo ícone do catálogo tem classe com SVG de traço 1,6 em grade 24', () => {
    for (const nome of NOMES_ICONES) {
      const bloco = new RegExp(`\\.ie-${nome} \\{\\r?\\n  --ie-forma: url\\("data:image/svg\\+xml,([^"]+)"\\);`).exec(css)
      expect(bloco?.[0] ?? nome).toContain(`.ie-${nome} {`)
      const svg = decodeURIComponent(bloco![1]!)
      expect(svg).toContain("viewBox='0 0 24 24'")
      expect(svg).toContain("stroke-width='1.6'")
    }
  })

  it('[UNITÁRIO] a classe base pinta com a cor do texto por máscara, sem fonte de ícones', () => {
    expect(css).toContain('background-color: currentcolor;')
    expect(css).toContain('mask: var(--ie-forma) center / contain no-repeat;')
    expect(classeIcone('casamento')).toBe('ie ie-casamento')
  })

  it('[SEGURANÇA] os SVGs são data URIs locais, sem script nem referência externa', () => {
    const usados = [...css.matchAll(/url\("([^"]+)"\)/g)].map((resultado) => decodeURIComponent(resultado[1]!))
    expect(usados.length).toBe(NOMES_ICONES.length)
    for (const svg of usados) {
      expect(svg.startsWith('data:image/svg+xml,')).toBe(true)
      expect(svg).not.toMatch(/<script|href=|javascript:/i)
    }
  })
})
