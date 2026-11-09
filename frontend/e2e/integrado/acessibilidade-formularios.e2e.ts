import { expect, test } from './suporte/fixtures'

test.describe('Acessibilidade dos formulários no celular', () => {
  test('os campos de telefone e e-mail do convite abrem o teclado certo', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    await page.goto(`/eventos/${evento.id}/convidados/novo`)

    const telefone = page.getByTestId('campo-telefone').first()
    await expect(telefone).toBeVisible()
    await expect(telefone).toHaveAttribute('type', 'tel')
    await expect(telefone).toHaveAttribute('inputmode', 'tel')

    const email = page.getByTestId('campo-email').first()
    await expect(email).toBeVisible()
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('inputmode', 'email')
  })
})
