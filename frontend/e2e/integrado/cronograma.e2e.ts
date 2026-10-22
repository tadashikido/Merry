import { expect, test } from './suporte/fixtures'
import { dialogo } from './suporte/interacoes'

test.describe('Cronograma do dia', () => {
  test('adiciona e edita um item do cronograma', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    await page.goto(`/eventos/${evento.id}/cronograma`)
    await expect(page.getByRole('heading', { name: 'Monte o roteiro do dia' })).toBeVisible()

    await page.getByRole('button', { name: 'Adicionar item' }).click()
    const janela = dialogo(page)
    await expect(janela.getByText('Novo item')).toBeVisible()
    await janela.getByLabel('Início').fill('15:00')
    await janela.getByLabel('Término').fill('15:45')
    await janela.getByLabel('Atividade').fill('Making of da noiva')
    await janela.getByRole('button', { name: 'Salvar item' }).click()

    const linha = page.getByRole('button', { name: /Editar Making of da noiva, das 15:00 às 15:45/ })
    await expect(linha).toBeVisible()

    await linha.click()
    await dialogo(page).getByLabel('Atividade').fill('Making of da noiva e madrinhas')
    await dialogo(page).getByRole('button', { name: 'Salvar item' }).click()
    await expect(page.getByRole('button', { name: /Editar Making of da noiva e madrinhas/ })).toBeVisible()
  })

  test('aplica o roteiro sugerido ao cronograma', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    await page.goto(`/eventos/${evento.id}/cronograma`)

    await page.getByRole('button', { name: 'Aplicar modelo' }).first().click()
    await page.getByRole('button', { name: 'Aplicar modelo' }).last().click()

    await expect(page.getByRole('heading', { name: 'Monte o roteiro do dia' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Editar .*, das \d{2}:\d{2}/ }).first()).toBeVisible()
  })

  test('cria modelo de cronograma com item', async ({ paginaAssessoria: page }) => {
    await page.goto('/modelos-cronograma')
    await expect(page.getByRole('link', { name: 'Roteiro clássico' })).toBeVisible()

    await page.getByRole('button', { name: 'Novo modelo' }).click()
    await page.getByLabel('Nome', { exact: false }).first().fill('Roteiro praia')
    await page.getByRole('button', { name: 'Criar modelo' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Roteiro praia' })).toBeVisible()
    await page.getByRole('button', { name: 'Adicionar item' }).first().click()
    await page.getByLabel('Início').fill('16:00')
    await page.getByLabel('Atividade').fill('Cerimônia na areia')
    await page.getByRole('button', { name: 'Salvar item' }).click()

    await expect(page.getByText('Cerimônia na areia')).toBeVisible()
  })
})
