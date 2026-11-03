export const PREFIXO_CACHE_EVENTO = 'celebri-dados-evento'

export async function limparCacheDadosEvento(): Promise<void> {
  if (typeof caches === 'undefined') {
    return
  }

  const chaves = await caches.keys().catch(() => [] as string[])
  await Promise.all(
    chaves
      .filter((chave) => chave.startsWith(PREFIXO_CACHE_EVENTO))
      .map((chave) => caches.delete(chave)),
  )
}
