import type { Page } from '@playwright/test'

const ROTAS_API = '**/api/**'

export async function simularVisitanteSemSessao(page: Page): Promise<void> {
  await page.route(ROTAS_API, (rota) =>
    rota.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ titulo: 'Não autenticado', status: 401 }),
    }),
  )
}

export async function simularApiIndisponivel(page: Page): Promise<void> {
  await page.route(ROTAS_API, (rota) => rota.abort('connectionrefused'))
}
