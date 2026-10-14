import { cadastrarAssessoria } from './suporte/api'
import { emailUnico, novaAssessoria, senhaValida } from './suporte/dados'
import { entrarNaPagina, expect, test } from './suporte/fixtures'
import { dialogo } from './suporte/interacoes'
import { aguardarLinkNoEmail, caminhoRelativo } from './suporte/mailpit'

test.describe('Acesso do casal e isolamento', () => {
  test('assessoria convida o casal, que cria a senha e vê só os módulos permitidos', async ({ browser, baseURL, paginaAssessoria, api }) => {
    const casamento = await api.criarCasamento()
    await api.criarConvite(casamento.id, [{ nome: 'Tia Lúcia' }])
    const emailCasal = emailUnico('casal')
    const senhaCasal = senhaValida()

    await paginaAssessoria.goto(`/casamentos/${casamento.id}`)
    const blocoAcesso = paginaAssessoria.getByRole('region', { name: 'Acesso do casal' })
    await blocoAcesso.getByRole('button', { name: 'Convidar' }).first().click()
    await blocoAcesso.getByLabel('Nome').fill(casamento.nomePrimeiraPessoa)
    await blocoAcesso.getByLabel('E-mail').fill(emailCasal)
    await blocoAcesso.getByRole('button', { name: 'Enviar convite' }).click()
    await expect(paginaAssessoria.getByText(`Convite enviado para ${emailCasal}.`)).toBeVisible()

    const link = await aguardarLinkNoEmail(emailCasal, /http:\/\/localhost:\d+\/acesso-casal#token=[A-Za-z0-9_-]+/)
    const contextoCasal = await browser.newContext({ baseURL })
    const casal = await contextoCasal.newPage()
    await casal.goto(caminhoRelativo(link))
    await expect(casal.getByRole('heading', { name: /Acessem o casamento de/ })).toBeVisible()
    await casal.locator('#aceite-senha').fill(senhaCasal)
    await casal.locator('#aceite-confirmacao').fill(senhaCasal)
    await casal.getByRole('button', { name: 'Criar senha e entrar' }).click()

    await expect(casal).toHaveURL(new RegExp(`/casamentos/${casamento.id}$`))
    await expect(casal.getByText(/Boas-vindas, /)).toBeVisible()
    await expect(casal.getByRole('region', { name: 'Acesso do casal' })).toHaveCount(0)

    await casal.goto(`/casamentos/${casamento.id}/convidados`)
    await expect(casal.getByRole('row', { name: /Tia Lúcia/ })).toBeVisible()
    await expect(casal.getByRole('button', { name: 'Restrições alimentares' })).toHaveCount(0)

    for (const rotaDaAssessoria of ['/casamentos', '/fornecedores', `/casamentos/${casamento.id}/checklist`, '/']) {
      await casal.goto(rotaDaAssessoria)
      await expect(casal).toHaveURL(new RegExp(`/casamentos/${casamento.id}$`))
    }
    await contextoCasal.close()
  })

  test('assessoria revoga o acesso e o casal perde a sessão', async ({ browser, baseURL, paginaAssessoria, api }) => {
    const casamento = await api.criarCasamento()
    const emailCasal = emailUnico('casal')
    const senhaCasal = senhaValida()
    await api.convidarCasal(casamento.id, casamento.nomeSegundaPessoa, emailCasal)
    const link = await aguardarLinkNoEmail(emailCasal, /http:\/\/localhost:\d+\/acesso-casal#token=[A-Za-z0-9_-]+/)

    const contextoCasal = await browser.newContext({ baseURL })
    const casal = await contextoCasal.newPage()
    await casal.goto(caminhoRelativo(link))
    await casal.locator('#aceite-senha').fill(senhaCasal)
    await casal.locator('#aceite-confirmacao').fill(senhaCasal)
    await casal.getByRole('button', { name: 'Criar senha e entrar' }).click()
    await expect(casal).toHaveURL(new RegExp(`/casamentos/${casamento.id}$`))

    await paginaAssessoria.goto(`/casamentos/${casamento.id}`)
    await paginaAssessoria
      .getByRole('region', { name: 'Acesso do casal' })
      .getByRole('button', { name: `Mais ações para ${casamento.nomeSegundaPessoa}` })
      .click()
    await paginaAssessoria.getByRole('menuitem', { name: /Revogar/ }).click()
    await dialogo(paginaAssessoria).getByRole('button', { name: /Revogar/ }).click()
    await expect(paginaAssessoria.getByRole('region', { name: 'Acesso do casal' }).getByText(casamento.nomeSegundaPessoa)).toHaveCount(0)

    await casal.goto(`/casamentos/${casamento.id}/convidados`)
    await expect(casal).toHaveURL(/\/entrar/)
    await contextoCasal.close()
  })

  test('uma assessoria não vê o casamento de outra', async ({ page, api, playwright, baseURL }) => {
    const casamentoAlheio = await api.criarCasamento()
    const intrusa = novaAssessoria()
    const contexto = await playwright.request.newContext({ baseURL })
    await cadastrarAssessoria(contexto, intrusa)
    await contexto.dispose()

    await entrarNaPagina(page, intrusa.email, intrusa.senha)
    await page.goto(`/casamentos/${casamentoAlheio.id}`)

    await expect(page.getByText(casamentoAlheio.nomePrimeiraPessoa)).toHaveCount(0)
    await page.goto('/casamentos')
    await expect(page.getByText(casamentoAlheio.nomePrimeiraPessoa)).toHaveCount(0)
  })
})
