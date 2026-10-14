import { expect, request, test } from '@playwright/test'

import { URL_MAILPIT } from './suporte/mailpit'

const URL_API = process.env.API_PROXY_ALVO ?? 'http://localhost:5080'
const INSTRUCAO = 'Rode `npm run e2e:ambiente:subir` com o Docker aberto.'

async function responde(baseURL: string, caminho: string): Promise<boolean> {
  const cliente = await request.newContext({ baseURL })
  try {
    return (await cliente.get(caminho, { timeout: 5_000 })).ok()
  } catch {
    return false
  } finally {
    await cliente.dispose()
  }
}

test('ambiente integrado disponível', async () => {
  test.setTimeout(120_000)

  await expect
    .poll(() => responde(URL_API, '/api/saude'), {
      message: `API indisponível em ${URL_API}. ${INSTRUCAO}`,
      timeout: 90_000,
    })
    .toBe(true)

  await expect
    .poll(() => responde(URL_MAILPIT, '/api/v1/info'), {
      message: `Mailpit indisponível em ${URL_MAILPIT}. ${INSTRUCAO}`,
      timeout: 30_000,
    })
    .toBe(true)
})
