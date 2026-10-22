import { cadastrarAssessoria } from './suporte/api'
import { emailUnico, novaAssessoria, senhaValida } from './suporte/dados'
import { entrarNaPagina, expect, test } from './suporte/fixtures'
import { dialogo } from './suporte/interacoes'
import { aguardarLinkNoEmail, caminhoRelativo } from './suporte/mailpit'

test.describe('Acesso dos anfitriões e isolamento', () => {
  test('assessoria convida os anfitriões, que criam a senha e veem só os módulos permitidos', async ({ browser, baseURL, paginaAssessoria, api }) => {
    const evento = await api.criarEvento()
    await api.criarConvite(evento.id, [{ nome: 'Tia Lúcia' }])
    const emailAnfitriao = emailUnico('anfitriao')
    const senhaAnfitriao = senhaValida()

    await paginaAssessoria.goto(`/eventos/${evento.id}`)
    const blocoAcesso = paginaAssessoria.getByRole('region', { name: 'Acesso dos anfitriões' })
    await blocoAcesso.getByRole('button', { name: 'Convidar' }).first().click()
    await blocoAcesso.getByLabel('Nome').fill(evento.nomePrimeiraPessoa)
    await blocoAcesso.getByLabel('E-mail').fill(emailAnfitriao)
    await blocoAcesso.getByRole('button', { name: 'Enviar convite' }).click()
    await expect(paginaAssessoria.getByText(`Convite enviado para ${emailAnfitriao}.`)).toBeVisible()

    const link = await aguardarLinkNoEmail(emailAnfitriao, /http:\/\/localhost:\d+\/acesso-anfitriao#token=[A-Za-z0-9_-]+/)
    const contextoAnfitriao = await browser.newContext({ baseURL })
    const anfitriao = await contextoAnfitriao.newPage()
    await anfitriao.goto(caminhoRelativo(link))
    await expect(anfitriao.getByRole('heading', { name: /Acessem o evento de/ })).toBeVisible()
    await anfitriao.locator('#aceite-senha').fill(senhaAnfitriao)
    await anfitriao.locator('#aceite-confirmacao').fill(senhaAnfitriao)
    await anfitriao.getByRole('button', { name: 'Criar senha e entrar' }).click()

    await expect(anfitriao).toHaveURL(new RegExp(`/eventos/${evento.id}$`))
    await expect(anfitriao.getByText(/Boas-vindas, /)).toBeVisible()
    await expect(anfitriao.getByRole('region', { name: 'Acesso dos anfitriões' })).toHaveCount(0)

    await anfitriao.goto(`/eventos/${evento.id}/convidados`)
    await expect(anfitriao.getByRole('row', { name: /Tia Lúcia/ })).toBeVisible()
    await expect(anfitriao.getByRole('button', { name: 'Restrições alimentares' })).toHaveCount(0)

    for (const rotaDaAssessoria of ['/eventos', '/fornecedores', `/eventos/${evento.id}/checklist`, '/']) {
      await anfitriao.goto(rotaDaAssessoria)
      await expect(anfitriao).toHaveURL(new RegExp(`/eventos/${evento.id}$`))
    }
    await contextoAnfitriao.close()
  })

  test('assessoria revoga o acesso e os anfitriões perdem a sessão', async ({ browser, baseURL, paginaAssessoria, api }) => {
    const evento = await api.criarEvento()
    const emailAnfitriao = emailUnico('anfitriao')
    const senhaAnfitriao = senhaValida()
    await api.convidarAnfitriao(evento.id, evento.nomeSegundaPessoa, emailAnfitriao)
    const link = await aguardarLinkNoEmail(emailAnfitriao, /http:\/\/localhost:\d+\/acesso-anfitriao#token=[A-Za-z0-9_-]+/)

    const contextoAnfitriao = await browser.newContext({ baseURL })
    const anfitriao = await contextoAnfitriao.newPage()
    await anfitriao.goto(caminhoRelativo(link))
    await anfitriao.locator('#aceite-senha').fill(senhaAnfitriao)
    await anfitriao.locator('#aceite-confirmacao').fill(senhaAnfitriao)
    await anfitriao.getByRole('button', { name: 'Criar senha e entrar' }).click()
    await expect(anfitriao).toHaveURL(new RegExp(`/eventos/${evento.id}$`))

    await paginaAssessoria.goto(`/eventos/${evento.id}`)
    await paginaAssessoria
      .getByRole('region', { name: 'Acesso dos anfitriões' })
      .getByRole('button', { name: `Mais ações para ${evento.nomeSegundaPessoa}` })
      .click()
    await paginaAssessoria.getByRole('menuitem', { name: /Revogar/ }).click()
    await dialogo(paginaAssessoria).getByRole('button', { name: /Revogar/ }).click()
    await expect(paginaAssessoria.getByRole('region', { name: 'Acesso dos anfitriões' }).getByText(evento.nomeSegundaPessoa)).toHaveCount(0)

    await anfitriao.goto(`/eventos/${evento.id}/convidados`)
    await expect(anfitriao).toHaveURL(/\/entrar/)
    await contextoAnfitriao.close()
  })

  test('uma assessoria não vê o evento de outra', async ({ page, api, playwright, baseURL }) => {
    const eventoAlheio = await api.criarEvento()
    const intrusa = novaAssessoria()
    const contexto = await playwright.request.newContext({ baseURL })
    await cadastrarAssessoria(contexto, intrusa)
    await contexto.dispose()

    await entrarNaPagina(page, intrusa.email, intrusa.senha)
    await page.goto(`/eventos/${eventoAlheio.id}`)

    await expect(page.getByText(eventoAlheio.nomePrimeiraPessoa)).toHaveCount(0)
    await page.goto('/eventos')
    await expect(page.getByText(eventoAlheio.nomePrimeiraPessoa)).toHaveCount(0)
  })
})
