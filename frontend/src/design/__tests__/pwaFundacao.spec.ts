import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const raiz = resolve(__dirname, '../../..')
const viteConfig = readFileSync(resolve(raiz, 'vite.config.ts'), 'utf-8')
const mainTs = readFileSync(resolve(raiz, 'src/main.ts'), 'utf-8')

describe('PWA — fundação', () => {
  it('[CONFIG] registra o VitePWA com manifest de marca e sem app-shell estático', () => {
    expect(viteConfig).toMatch(/VitePWA\(/)
    expect(viteConfig).toContain("short_name: 'Celebri'")
    expect(viteConfig).toContain("display: 'standalone'")
    expect(viteConfig).toContain('#14244A')
    expect(viteConfig).toContain('navigateFallback: null')
    expect(viteConfig).toContain('injectRegister: null')
  })

  it('[SEGURANÇA] registra o service worker a partir do main (sob nonce), não por script inline', () => {
    expect(mainTs).toContain("from 'virtual:pwa-register'")
    expect(mainTs).toMatch(/registerSW\(/)
  })

  it('[ASSET] possui os ícones de instalação 192, 512 e maskable', () => {
    for (const nome of ['icone-192.png', 'icone-512.png', 'icone-maskable.png']) {
      expect(existsSync(resolve(raiz, 'public', nome))).toBe(true)
    }
  })
})
