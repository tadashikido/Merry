import { dataFutura, nomesDosAnfitrioes, novoAnfitriao } from './suporte/dados'
import { expect, test } from './suporte/fixtures'

test.describe('Painel e eventos', () => {
  test('primeiro acesso leva ao cadastro do primeiro evento', async ({ paginaAssessoria: page }) => {
    await expect(page.getByRole('heading', { name: /Olá, Ana/ })).toBeVisible()
    await expect(page.getByText('Boas-vindas ao Celebri.')).toBeVisible()

    await page.getByRole('button', { name: 'Novo evento' }).first().click()
    await expect(page).toHaveURL(/\/eventos\/novo$/)
    await expect(page.getByRole('heading', { name: 'Novo evento' })).toBeVisible()
  })

  test('cria um evento validando os campos obrigatórios', async ({ paginaAssessoria: page }) => {
    const anfitriao = novoAnfitriao()
    await page.goto('/eventos/novo')

    await page.getByRole('button', { name: 'Salvar evento' }).click()
    await expect(page.getByText('Preencha este campo.').first()).toBeVisible()

    await page.getByLabel('Nome de uma das pessoas').fill(anfitriao.nomePrimeiraPessoa)
    await page.getByLabel('Nome da outra pessoa').fill(anfitriao.nomeSegundaPessoa)
    await page.getByLabel('Data do evento').fill(dataFutura(200))
    await page.getByLabel('Horário da cerimônia').fill('17:00')
    await page.getByLabel('Local da cerimônia').fill('Igreja Matriz')
    await page.getByLabel('Local da recepção').fill('Salão Aurora')
    await page.getByLabel('Convidados estimados').fill('150')
    await page.getByRole('button', { name: 'Salvar evento' }).click()

    await expect(page.getByText('Evento cadastrado.')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: nomesDosAnfitrioes(anfitriao) })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Detalhes' })).toContainText('Igreja Matriz')
    await expect(page.getByRole('region', { name: 'Detalhes' })).toContainText('Salão Aurora')
  })

  test('edita o evento e mostra os novos dados', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    await page.goto(`/eventos/${evento.id}`)

    await page.getByRole('button', { name: 'Editar evento' }).click()
    await expect(page.getByRole('heading', { name: 'Editar evento' })).toBeVisible()
    await page.getByLabel('Local da cerimônia').fill('Paróquia São José')
    await page.getByLabel('Observações').fill('Noiva prefere flores brancas.')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page).toHaveURL(new RegExp(`/eventos/${evento.id}$`))
    const detalhes = page.getByRole('region', { name: 'Detalhes' })
    await expect(detalhes).toContainText('Paróquia São José')
    await expect(detalhes).toContainText('Noiva prefere flores brancas.')
  })

  test('arquiva e restaura um evento pela lista', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    const nomeAcao = `${evento.nomePrimeiraPessoa} & ${evento.nomeSegundaPessoa}`
    await page.goto('/eventos')

    await page.getByRole('button', { name: `Arquivar ${nomeAcao}` }).click()
    await expect(page.getByText(/foi arquivado/)).toBeVisible()
    await expect(page.getByRole('button', { name: `Arquivar ${nomeAcao}` })).toHaveCount(0)

    await page.getByRole('button', { name: 'Arquivados' }).click()
    await expect(page).toHaveURL(/situacao=arquivados/)
    await page.getByRole('button', { name: `Restaurar ${nomeAcao}` }).click()
    await expect(page.getByRole('button', { name: `Restaurar ${nomeAcao}` })).toHaveCount(0)

    await page.getByRole('button', { name: 'Ativos' }).click()
    await expect(page.getByRole('link', { name: `${evento.nomePrimeiraPessoa} e ${evento.nomeSegundaPessoa}` })).toBeVisible()
  })

  test('duplica um evento levando os fornecedores', async ({ paginaAssessoria: page, api }) => {
    const origem = await api.criarEvento()
    const fornecedor = await api.criarFornecedor('Buffet Duplicado E2E', 'Buffet')
    await api.vincularFornecedor(origem.id, fornecedor.id)
    const novo = novoAnfitriao()

    await page.goto(`/eventos/${origem.id}`)
    await page.getByRole('button', { name: /^Duplicar/ }).click()
    await expect(page.getByRole('heading', { name: 'Duplicar evento' })).toBeVisible()
    await page.getByLabel('Nome de uma das pessoas').fill(novo.nomePrimeiraPessoa)
    await page.getByLabel('Nome da outra pessoa').fill(novo.nomeSegundaPessoa)
    await page.getByLabel('Data do evento').fill(dataFutura(300))
    await expect(page.getByText('1 fornecedor vai para o evento novo.')).toBeVisible()
    await page.getByRole('button', { name: 'Criar evento' }).click()

    await expect(page.getByRole('heading', { level: 1, name: nomesDosAnfitrioes(novo) })).toBeVisible()
    await page.goto(page.url().replace(/\/?$/, '/fornecedores'))
    await expect(page.getByRole('link', { name: 'Buffet Duplicado E2E' })).toBeVisible()
  })
})
