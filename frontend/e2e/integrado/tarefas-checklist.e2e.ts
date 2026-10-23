import { dataFutura } from './suporte/dados'
import { expect, test } from './suporte/fixtures'
import { escolherOpcao } from './suporte/interacoes'

test.describe('Tarefas e checklist', () => {
  test('cria, conclui, reabre e exclui uma tarefa', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    const titulo = 'Confirmar horário do DJ'
    await page.goto(`/eventos/${evento.id}/tarefas`)
    await expect(page.getByRole('heading', { name: 'Nenhuma tarefa ainda' })).toBeVisible()

    await page.getByRole('button', { name: 'Nova tarefa' }).first().click()
    await page.getByLabel('Título').fill(titulo)
    await page.getByLabel('Prazo').fill(dataFutura(30))
    await escolherOpcao(page, page.getByRole('combobox', { name: 'Geral' }), 'Recepção')
    await page.getByLabel('Descrição').fill('Ligar para o DJ e alinhar a entrada dos anfitriões.')
    await page.getByRole('button', { name: 'Criar tarefa' }).click()

    await expect(page.getByText('Tarefa criada.')).toBeVisible()
    await expect(page.getByText(titulo)).toBeVisible()

    await page.getByRole('button', { name: `Concluir: ${titulo}` }).click()
    await expect(page.getByText('Tarefa concluída.')).toBeVisible()

    await page.getByRole('button', { name: 'Concluídas' }).click()
    await page.getByRole('button', { name: `Reabrir: ${titulo}` }).click()
    await page.getByRole('button', { name: 'Abertas' }).click()
    await expect(page.getByText(titulo)).toBeVisible()

    await page.getByRole('button', { name: `Mais ações: ${titulo}` }).click()
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByText(titulo)).toHaveCount(0)
  })

  test('título é obrigatório ao criar tarefa', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    await page.goto(`/eventos/${evento.id}/tarefas/nova`)
    await page.getByRole('button', { name: 'Criar tarefa' }).click()
    await expect(page.getByText('Preencha este campo.')).toBeVisible()
    await expect(page).toHaveURL(/\/tarefas\/nova$/)
  })

  test('aplica o checklist sugerido e conclui um item', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento({ data: dataFutura(400) })
    await page.goto(`/eventos/${evento.id}/checklist`)
    await expect(page.getByRole('heading', { name: 'Este evento ainda não tem checklist' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Checklist essencial' })).toBeVisible()
    await expect(page.getByText(/Vai criar \d+ tarefas\./)).toBeVisible()

    await page.getByRole('region', { name: 'Aplicar modelo' }).getByRole('button', { name: 'Aplicar modelo' }).click()

    await expect(page.getByRole('heading', { name: 'Este evento ainda não tem checklist' })).toHaveCount(0)
    const primeiroConcluir = page.getByRole('button', { name: /^Concluir: / }).first()
    await expect(primeiroConcluir).toBeVisible()
    const rotulo = (await primeiroConcluir.getAttribute('aria-label')) ?? ''
    await primeiroConcluir.click()
    await expect(page.getByRole('button', { name: rotulo.replace('Concluir:', 'Reabrir:') })).toBeVisible()
  })

  test('cria modelo de checklist com item próprio', async ({ paginaAssessoria: page }) => {
    await page.goto('/modelos-checklist')
    await expect(page.getByRole('link', { name: 'Checklist essencial', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Novo modelo' }).click()
    await page.getByLabel('Nome do modelo').fill('Evento no campo')
    await page.getByLabel('Descrição').fill('Roteiro para festas em fazenda.')
    await page.getByRole('button', { name: 'Criar modelo' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Evento no campo' })).toBeVisible()
    await page.getByRole('button', { name: 'Adicionar item' }).first().click()
    await page.getByLabel('Título').fill('Contratar gerador de energia')
    await page.getByRole('button', { name: 'Adicionar item' }).last().click()

    await expect(page.getByText('Contratar gerador de energia')).toBeVisible()
  })
})
