import { dataFutura, nomesDoCasal, novoCasal } from './suporte/dados'
import { expect, test } from './suporte/fixtures'

test.describe('Painel e casamentos', () => {
  test('primeiro acesso leva ao cadastro do primeiro casamento', async ({ paginaAssessoria: page }) => {
    await expect(page.getByRole('heading', { name: /Olá, Ana/ })).toBeVisible()
    await expect(page.getByText('Boas-vindas ao Nossia.')).toBeVisible()

    await page.getByRole('button', { name: 'Novo casamento' }).first().click()
    await expect(page).toHaveURL(/\/casamentos\/novo$/)
    await expect(page.getByRole('heading', { name: 'Novo casamento' })).toBeVisible()
  })

  test('cria um casamento validando os campos obrigatórios', async ({ paginaAssessoria: page }) => {
    const casal = novoCasal()
    await page.goto('/casamentos/novo')

    await page.getByRole('button', { name: 'Salvar casamento' }).click()
    await expect(page.getByText('Preencha este campo.').first()).toBeVisible()

    await page.getByLabel('Nome de uma das pessoas').fill(casal.nomePrimeiraPessoa)
    await page.getByLabel('Nome da outra pessoa').fill(casal.nomeSegundaPessoa)
    await page.getByLabel('Data do casamento').fill(dataFutura(200))
    await page.getByLabel('Horário da cerimônia').fill('17:00')
    await page.getByLabel('Local da cerimônia').fill('Igreja Matriz')
    await page.getByLabel('Local da recepção').fill('Salão Aurora')
    await page.getByLabel('Convidados estimados').fill('150')
    await page.getByRole('button', { name: 'Salvar casamento' }).click()

    await expect(page.getByText('Casamento cadastrado.')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: nomesDoCasal(casal) })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Detalhes' })).toContainText('Igreja Matriz')
    await expect(page.getByRole('region', { name: 'Detalhes' })).toContainText('Salão Aurora')
  })

  test('edita o casamento e mostra os novos dados', async ({ paginaAssessoria: page, api }) => {
    const casamento = await api.criarCasamento()
    await page.goto(`/casamentos/${casamento.id}`)

    await page.getByRole('button', { name: 'Editar casamento' }).click()
    await expect(page.getByRole('heading', { name: 'Editar casamento' })).toBeVisible()
    await page.getByLabel('Local da cerimônia').fill('Paróquia São José')
    await page.getByLabel('Observações').fill('Noiva prefere flores brancas.')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page).toHaveURL(new RegExp(`/casamentos/${casamento.id}$`))
    const detalhes = page.getByRole('region', { name: 'Detalhes' })
    await expect(detalhes).toContainText('Paróquia São José')
    await expect(detalhes).toContainText('Noiva prefere flores brancas.')
  })

  test('arquiva e restaura um casamento pela lista', async ({ paginaAssessoria: page, api }) => {
    const casamento = await api.criarCasamento()
    const nomeAcao = `${casamento.nomePrimeiraPessoa} & ${casamento.nomeSegundaPessoa}`
    await page.goto('/casamentos')

    await page.getByRole('button', { name: `Arquivar ${nomeAcao}` }).click()
    await expect(page.getByText(/foi arquivado/)).toBeVisible()
    await expect(page.getByRole('button', { name: `Arquivar ${nomeAcao}` })).toHaveCount(0)

    await page.getByRole('button', { name: 'Arquivados' }).click()
    await expect(page).toHaveURL(/situacao=arquivados/)
    await page.getByRole('button', { name: `Restaurar ${nomeAcao}` }).click()
    await expect(page.getByRole('button', { name: `Restaurar ${nomeAcao}` })).toHaveCount(0)

    await page.getByRole('button', { name: 'Ativos' }).click()
    await expect(page.getByRole('link', { name: `${casamento.nomePrimeiraPessoa} e ${casamento.nomeSegundaPessoa}` })).toBeVisible()
  })

  test('duplica um casamento levando os fornecedores', async ({ paginaAssessoria: page, api }) => {
    const origem = await api.criarCasamento()
    const fornecedor = await api.criarFornecedor('Buffet Duplicado E2E', 'Buffet')
    await api.vincularFornecedor(origem.id, fornecedor.id)
    const novo = novoCasal()

    await page.goto(`/casamentos/${origem.id}`)
    await page.getByRole('button', { name: /^Duplicar/ }).click()
    await expect(page.getByRole('heading', { name: 'Duplicar casamento' })).toBeVisible()
    await page.getByLabel('Nome de uma das pessoas').fill(novo.nomePrimeiraPessoa)
    await page.getByLabel('Nome da outra pessoa').fill(novo.nomeSegundaPessoa)
    await page.getByLabel('Data do casamento').fill(dataFutura(300))
    await expect(page.getByText('1 fornecedor vai para o casamento novo.')).toBeVisible()
    await page.getByRole('button', { name: 'Criar casamento' }).click()

    await expect(page.getByRole('heading', { level: 1, name: nomesDoCasal(novo) })).toBeVisible()
    await page.goto(page.url().replace(/\/?$/, '/fornecedores'))
    await expect(page.getByRole('link', { name: 'Buffet Duplicado E2E' })).toBeVisible()
  })
})
