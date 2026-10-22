import { expect, test } from './suporte/fixtures'
import { dialogo } from './suporte/interacoes'

const NOTA_INTERNA = 'Pagar saldo de R$ 4.000 em espécie'

test.describe('Cronograma para a equipe e fornecedores', () => {
  test('gera o link do fornecedor, a página pública mostra só os horários dele e o link antigo para de valer ao gerar outro', async ({
    paginaAssessoria: page,
    api,
    browser,
  }) => {
    const evento = await api.criarEvento({ horario: '16:30', localCerimonia: 'Capela Santa Luzia' })
    const nomeBuffet = `Buffet Sabor ${Date.now()}`
    const fornecedor = await api.criarFornecedor(nomeBuffet, 'Buffet')
    const vinculo = await api.vincularFornecedor(evento.id, fornecedor.id)
    await api.criarItemCronograma(evento.id, {
      inicio: '14:00',
      duracaoMinutos: 90,
      atividade: 'Montagem do buffet',
      local: 'Espaço Jardim',
      responsavel: 'Fernanda',
      fornecedorEventoId: vinculo.id,
      instrucoes: 'Entrada pela rua lateral.',
      notasInternas: NOTA_INTERNA,
    })
    await api.criarItemCronograma(evento.id, { inicio: '16:30', duracaoMinutos: 45, atividade: 'Cerimônia', responsavel: 'Celebrante', notasInternas: NOTA_INTERNA })
    await api.criarItemCronograma(evento.id, { inicio: '19:00', duracaoMinutos: 120, atividade: 'Jantar', fornecedorEventoId: vinculo.id })

    await page.goto(`/eventos/${evento.id}/cronograma`)
    await page.getByRole('button', { name: 'Links para a equipe' }).click()
    const painel = dialogo(page)
    await expect(painel.getByText('Os links valem até')).toBeVisible()
    const linhaBuffet = painel.locator('[data-destino^="fornecedor:"]').filter({ hasText: nomeBuffet })
    await expect(linhaBuffet).toContainText('Sem link')
    await expect(linhaBuffet).toContainText('2 itens')

    await linhaBuffet.getByRole('button', { name: 'Gerar link' }).click()
    await expect(linhaBuffet).toContainText('Link ativo')

    const destino = (await api.listarLinksCronograma(evento.id)).destinos.find((item) => item.fornecedorEventoId === vinculo.id)
    const token = destino?.link?.token
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)

    const contextoPublico = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const publica = await contextoPublico.newPage()
    await publica.goto(`/cronograma/${token}`)

    await expect(publica.getByRole('heading', { level: 1 })).toContainText(evento.nomePrimeiraPessoa)
    await expect(publica.getByTestId('cabecalho-operacao-filtro')).toHaveText(`Seus horários · ${nomeBuffet}`)
    await expect(publica.getByTestId('item-roteiro')).toHaveCount(2)
    await expect(publica.getByText('Montagem do buffet')).toBeVisible()
    await expect(publica.getByText('Entrada pela rua lateral.')).toBeVisible()
    await expect(publica.getByText('Jantar')).toBeVisible()
    await expect(publica.getByText('Cerimônia', { exact: true })).toHaveCount(1)
    await expect(publica.getByText(NOTA_INTERNA)).toHaveCount(0)
    expect(await publica.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex, nofollow')
    expect(await publica.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true)

    await linhaBuffet.getByRole('button', { name: /Mais ações/ }).click()
    await page.getByRole('menuitem', { name: 'Gerar novo link' }).click()
    await dialogo(page).getByRole('button', { name: 'Gerar novo link' }).click()
    await expect(page.getByText('Novo link gerado. O anterior parou de funcionar.')).toBeVisible()

    await publica.getByRole('button', { name: 'Atualizar' }).click()
    await expect(publica.getByText('Este link não está mais ativo')).toBeVisible()
    await contextoPublico.close()
  })

  test('link geral mostra a equipe completa e reflete a alteração ao atualizar', async ({ paginaAssessoria: page, api, browser }) => {
    const evento = await api.criarEvento()
    const item = await api.criarItemCronograma(evento.id, { inicio: '15:00', atividade: 'Making of', responsavel: 'Ana' })

    await page.goto(`/eventos/${evento.id}/cronograma`)
    await page.getByRole('button', { name: 'Links para a equipe' }).click()
    const linhaGeral = dialogo(page).locator('[data-destino="geral"]')
    await linhaGeral.getByRole('button', { name: 'Gerar link' }).click()
    await expect(linhaGeral).toContainText('Link ativo')
    const token = (await api.listarLinksCronograma(evento.id)).destinos.find((destino) => destino.tipo === 'Geral')?.link?.token

    const contextoPublico = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const publica = await contextoPublico.newPage()
    await publica.goto(`/cronograma/${token}`)
    await expect(publica.getByTestId('cabecalho-operacao-filtro')).toHaveText('Equipe completa')
    await expect(publica.locator('time').first()).toHaveText('15:00')

    await api.atualizarItemCronograma(evento.id, item.id, { inicio: '15:30', atividade: 'Making of', responsavel: 'Ana' })

    await publica.getByRole('button', { name: 'Atualizar' }).click()
    await expect(publica.locator('time').first()).toHaveText('15:30')
    await contextoPublico.close()
  })

  test('link inválido mostra que não está ativo', async ({ browser }) => {
    const contexto = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const publica = await contexto.newPage()

    await publica.goto('/cronograma/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde')

    await expect(publica.getByText('Este link não está mais ativo')).toBeVisible()
    await expect(publica.getByText('Peça um novo link para a assessoria do evento.')).toBeVisible()
    await contexto.close()
  })
})
