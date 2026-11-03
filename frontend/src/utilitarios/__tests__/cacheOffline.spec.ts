import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, vi, afterEach } from 'vitest'

import { limparCacheDadosEvento, PREFIXO_CACHE_EVENTO } from '../cacheOffline'

const viteConfig = readFileSync(resolve(__dirname, '../../../vite.config.ts'), 'utf-8')

describe('cacheOffline', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('[ROBUSTEZ] sem Cache Storage não lança', async () => {
    vi.stubGlobal('caches', undefined)
    await expect(limparCacheDadosEvento()).resolves.toBeUndefined()
  })

  it('[SEGURANÇA] apaga apenas os caches com o prefixo de dados de evento', async () => {
    const apagados: string[] = []
    const cacheFalso = {
      keys: vi.fn().mockResolvedValue([`${PREFIXO_CACHE_EVENTO}-v2`, 'workbox-precache-v1', 'outro']),
      delete: vi.fn((chave: string) => {
        apagados.push(chave)
        return Promise.resolve(true)
      }),
    }
    vi.stubGlobal('caches', cacheFalso)

    await limparCacheDadosEvento()

    expect(apagados).toEqual([`${PREFIXO_CACHE_EVENTO}-v2`])
    expect(cacheFalso.delete).toHaveBeenCalledTimes(1)
  })

  it('[ROBUSTEZ] keys() rejeitando não lança', async () => {
    vi.stubGlobal('caches', {
      keys: vi.fn().mockRejectedValue(new Error('indisponível')),
      delete: vi.fn(),
    })
    await expect(limparCacheDadosEvento()).resolves.toBeUndefined()
  })
})

describe('configuração de cache offline', () => {
  it('[CONFIG] cacheia só GET de leitura do evento, com cache dedicado e sem mutações', () => {
    expect(viteConfig).toContain("handler: 'NetworkFirst'")
    expect(viteConfig).toContain("cacheName: 'celebri-dados-evento'")
    expect(viteConfig).toContain("request.method === 'GET'")
    expect(viteConfig).toContain("url.pathname.startsWith('/api/eventos/')")
  })
})
