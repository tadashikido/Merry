import { expect, test } from './suporte/fixtures'

test.describe('Isolamento de tokens públicos', () => {
  test('o link geral de cronograma de um evento não revela dados de outro evento', async ({ api, browser }) => {
    const marca = Date.now()
    const eventoA = await api.criarEvento({ nomePrimeiraPessoa: `Aurora A ${marca}`, nomeSegundaPessoa: `Bruno A ${marca}` })
    await api.criarItemCronograma(eventoA.id, { inicio: '15:00', atividade: `AberturaExclusivaDoEventoA${marca}`, responsavel: 'Ana' })
    const tokenA = await api.gerarLinkCronograma(eventoA.id, { tipo: 'Geral' })

    const eventoB = await api.criarEvento({ nomePrimeiraPessoa: `Clara B ${marca}`, nomeSegundaPessoa: `Diego B ${marca}` })
    await api.criarItemCronograma(eventoB.id, { inicio: '16:00', atividade: `AberturaExclusivaDoEventoB${marca}`, responsavel: 'Bia' })

    const contexto = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const publica = await contexto.newPage()
    await publica.goto(`/cronograma/${tokenA}`)

    await expect(publica.getByRole('heading', { level: 1 })).toContainText(eventoA.nomePrimeiraPessoa)
    await expect(publica.getByText(`AberturaExclusivaDoEventoA${marca}`)).toBeVisible()
    await expect(publica.getByText(`AberturaExclusivaDoEventoB${marca}`)).toHaveCount(0)
    await expect(publica.getByText(eventoB.nomePrimeiraPessoa)).toHaveCount(0)
    await contexto.close()
  })
})
