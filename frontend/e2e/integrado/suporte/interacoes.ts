import type { Locator, Page } from '@playwright/test'

export async function escolherOpcao(page: Page, campo: Locator, opcao: string | RegExp): Promise<void> {
  await campo.click()
  await page.getByRole('option', { name: opcao }).first().click()
}

export function dialogo(page: Page): Locator {
  return page.locator('[role="dialog"], [role="alertdialog"]').last()
}
