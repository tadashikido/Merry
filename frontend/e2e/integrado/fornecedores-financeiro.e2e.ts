import { dataFutura, nomeUnico } from './suporte/dados'
import { expect, test } from './suporte/fixtures'
import { dialogo, escolherOpcao } from './suporte/interacoes'

test.describe('Fornecedores e financeiro', () => {
  test('cadastra, busca, arquiva, restaura e exclui fornecedor da base', async ({ paginaAssessoria: page }) => {
    const empresa = nomeUnico('Doces da Vó')
    await page.goto('/fornecedores')

    await page.getByRole('button', { name: 'Adicionar fornecedor' }).click()
    await expect(page.getByRole('heading', { name: 'Novo fornecedor' })).toBeVisible()
    await page.getByRole('button', { name: 'Adicionar fornecedor' }).click()
    await expect(page.getByText('Escolha a categoria.')).toBeVisible()
    await expect(page.getByText('Informe o nome da empresa.')).toBeVisible()

    await escolherOpcao(page, page.getByRole('combobox', { name: 'Selecione a categoria' }), 'Bolo e doces')
    await page.getByLabel('Nome da empresa').fill(empresa)
    await page.getByLabel('Responsável').fill('Dona Cida')
    await page.getByLabel('Telefone').fill('(11) 98765-4321')
    await page.getByRole('button', { name: 'Adicionar fornecedor' }).click()

    await page.goto('/fornecedores')
    await page.getByRole('searchbox', { name: 'Buscar fornecedor' }).fill(empresa)
    await expect(page.getByRole('link', { name: empresa, exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Mais ações para ${empresa}` }).click()
    await page.getByRole('menuitem', { name: 'Arquivar' }).click()
    await page.getByRole('button', { name: /^Arquivados/ }).click()
    await expect(page.getByRole('link', { name: empresa, exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Mais ações para ${empresa}` }).click()
    await page.getByRole('menuitem', { name: 'Restaurar' }).click()
    await page.getByRole('button', { name: /^Ativos/ }).click()
    await expect(page.getByRole('link', { name: empresa, exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Mais ações para ${empresa}` }).click()
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    await dialogo(page).getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByRole('link', { name: empresa, exact: true })).toHaveCount(0)
  })

  test('vincula fornecedor contratado ao evento e remove', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    const empresa = nomeUnico('Som e Luz')
    await api.criarFornecedor(empresa, 'Musica')
    await page.goto(`/eventos/${evento.id}/fornecedores`)

    await page.getByRole('button', { name: 'Adicionar fornecedor' }).click()
    await escolherOpcao(page, page.getByRole('combobox').first(), empresa)
    await page.getByLabel('Serviço').fill('DJ e iluminação de pista')
    await page.getByRole('button', { name: 'Contratado' }).click()
    await page.getByRole('spinbutton', { name: 'Valor contratado' }).pressSequentially('8500')
    await page.getByRole('button', { name: 'Adicionar ao evento' }).click()

    await page.goto(`/eventos/${evento.id}/fornecedores`)
    await expect(page.getByRole('link', { name: empresa, exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Orçamento' })).toContainText('R$ 8.500,00')

    await page.getByRole('button', { name: `Mais ações para ${empresa}` }).click()
    await page.getByRole('menuitem', { name: 'Remover do evento' }).click()
    await dialogo(page).getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByRole('link', { name: empresa, exact: true })).toHaveCount(0)
  })

  test('gera parcelas e registra o pagamento de uma delas', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    const empresa = nomeUnico('Foto Arte')
    const fornecedor = await api.criarFornecedor(empresa)
    await api.vincularFornecedor(evento.id, fornecedor.id, 'Contratado', 6000)
    await page.goto(`/eventos/${evento.id}/financeiro`)

    const regiaoFornecedor = page.getByRole('region', { name: empresa })
    await regiaoFornecedor.getByRole('button', { name: 'Gerar parcelas' }).click()
    const janela = dialogo(page)
    const numeroParcelas = janela.getByRole('spinbutton', { name: /Número de parcelas/ })
    await numeroParcelas.click()
    await numeroParcelas.press('Control+a')
    await numeroParcelas.pressSequentially('3')
    await janela.getByLabel(/Primeiro vencimento/).fill(dataFutura(20))
    await expect(janela.getByRole('region', { name: 'Prévia' })).toContainText('3 parcelas')
    await janela.getByRole('button', { name: 'Gerar 3 parcelas' }).click()

    await expect(regiaoFornecedor.getByText('R$ 2.000,00').first()).toBeVisible()

    await regiaoFornecedor.getByRole('button', { name: `Ações da parcela 1/3 de ${empresa}` }).click()
    await page.getByRole('menuitem', { name: 'Marcar como paga' }).click()
    await dialogo(page).getByRole('button', { name: /Registrar pagamento|Marcar como paga|Confirmar/ }).click()

    await expect(page.getByRole('region', { name: 'Orçamento' })).toContainText('R$ 2.000,00 pagos de R$ 6.000,00')
  })
})
