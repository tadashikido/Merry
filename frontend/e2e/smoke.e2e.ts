import { expect, test } from '@playwright/test'

import { simularApiIndisponivel, simularVisitanteSemSessao } from './suporte/api'

test.describe('Smoke', () => {
  test('[E2E] visitante sem sessão é levado à tela de entrada', async ({ page }) => {
    await simularVisitanteSemSessao(page)

    await page.goto('/')

    await expect(page).toHaveURL(/\/entrar$/)
    await expect(page).toHaveTitle(/^Entrar/)
  })

  test('[E2E] tela de entrada exibe título e ação principal acessíveis', async ({ page }) => {
    await simularVisitanteSemSessao(page)

    await page.goto('/entrar')

    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })

  test('[E2E] API indisponível não impede o carregamento da tela de entrada', async ({ page }) => {
    await simularApiIndisponivel(page)

    await page.goto('/')

    await expect(page).toHaveURL(/\/entrar$/)
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })

  test('[SEGURANÇA] rota protegida sem sessão redireciona preservando o destino', async ({ page }) => {
    await simularVisitanteSemSessao(page)

    await page.goto('/casamentos')

    await expect(page).toHaveURL(/\/entrar\?destino=(\/|%2F)casamentos$/)
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })
})
