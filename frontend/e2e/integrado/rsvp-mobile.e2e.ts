import { expect, test } from './suporte/fixtures'
import type { ClienteApi } from './suporte/api'
import type { Browser, Page } from '@playwright/test'

const CAMINHO_RSVP = '/api/rsvp/resposta'

async function prepararConvite(api: ClienteApi): Promise<string> {
  const evento = await api.criarEvento()
  const convite = await api.criarConvite(evento.id, [{ nome: 'Joana Prado' }, { nome: 'Pedro Prado' }], { nome: 'Família Prado' })
  return api.gerarLinkRsvp(evento.id, convite.id)
}

async function abrirRsvpMobile(
  browser: Browser,
  baseURL: string | undefined,
  token: string,
  orientacao: 'retrato' | 'paisagem' = 'retrato',
): Promise<Page> {
  const viewport = orientacao === 'retrato' ? { width: 390, height: 844 } : { width: 844, height: 390 }
  const contexto = await browser.newContext({ baseURL, viewport, hasTouch: true, isMobile: true })
  const pagina = await contexto.newPage()
  await pagina.goto(`/rsvp/${token}`)
  await expect(pagina.getByTestId('rsvp-formulario')).toBeVisible()
  return pagina
}

function semRolagemHorizontal(pagina: Page): Promise<boolean> {
  return pagina.evaluate('document.documentElement.scrollWidth <= window.innerWidth') as Promise<boolean>
}

test.describe('RSVP no celular', () => {
  test('a 390px em retrato não gera rolagem horizontal', async ({ api, browser, baseURL }) => {
    const token = await prepararConvite(api)
    const pagina = await abrirRsvpMobile(browser, baseURL, token)

    expect(await semRolagemHorizontal(pagina)).toBe(true)
    await pagina.context().close()
  })

  test('com o celular deitado em paisagem não gera rolagem horizontal', async ({ api, browser, baseURL }) => {
    const token = await prepararConvite(api)
    const pagina = await abrirRsvpMobile(browser, baseURL, token, 'paisagem')

    expect(await semRolagemHorizontal(pagina)).toBe(true)
    await pagina.context().close()
  })

  test('os alvos de toque Vou, Não vou e Enviar têm pelo menos 44px de altura', async ({ api, browser, baseURL }) => {
    const token = await prepararConvite(api)
    const pagina = await abrirRsvpMobile(browser, baseURL, token)

    for (const alvo of [
      pagina.getByTestId('opcao-Confirmado').first(),
      pagina.getByTestId('opcao-Recusado').first(),
      pagina.getByTestId('rsvp-enviar'),
    ]) {
      await expect(alvo).toBeVisible()
      const caixa = await alvo.boundingBox()
      expect(caixa).not.toBeNull()
      expect(caixa!.height).toBeGreaterThanOrEqual(44)
    }
    await pagina.context().close()
  })

  test('enviar sem escolher presença não dispara gravação e aponta o que falta', async ({ api, browser, baseURL }) => {
    const token = await prepararConvite(api)
    const pagina = await abrirRsvpMobile(browser, baseURL, token)

    let gravacoes = 0
    pagina.on('request', (requisicao) => {
      if (requisicao.method() === 'PUT' && new URL(requisicao.url()).pathname === CAMINHO_RSVP) {
        gravacoes += 1
      }
    })

    await pagina.getByTestId('rsvp-enviar').click()
    await expect(pagina.getByTestId('erro-escolha').first()).toBeVisible()
    expect(gravacoes).toBe(0)
    await pagina.context().close()
  })

  test('tocar Enviar duas vezes grava uma única resposta', async ({ api, browser, baseURL }) => {
    const token = await prepararConvite(api)
    const pagina = await abrirRsvpMobile(browser, baseURL, token)

    let gravacoes = 0
    pagina.on('request', (requisicao) => {
      if (requisicao.method() === 'PUT' && new URL(requisicao.url()).pathname === CAMINHO_RSVP) {
        gravacoes += 1
      }
    })
    await pagina.route(`**${CAMINHO_RSVP}`, async (rota) => {
      await new Promise((resolver) => setTimeout(resolver, 1200))
      await rota.continue()
    })

    await pagina.getByTestId('rsvp-todos-vao').click()
    const enviar = pagina.getByTestId('rsvp-enviar')
    await enviar.click()
    await enviar.click({ force: true, timeout: 2000 }).catch(() => undefined)

    await pagina.waitForResponse((resposta) => new URL(resposta.url()).pathname === CAMINHO_RSVP)
    await expect(pagina.getByTestId('rsvp-resumo')).toBeVisible()
    expect(gravacoes).toBe(1)
    await pagina.context().close()
  })

  test('perder conexão ao enviar mostra erro e preserva o que foi preenchido', async ({ api, browser, baseURL }) => {
    const token = await prepararConvite(api)
    const pagina = await abrirRsvpMobile(browser, baseURL, token)

    await pagina.getByTestId('rsvp-todos-vao').click()
    await pagina.route(`**${CAMINHO_RSVP}`, (rota) => rota.abort())
    await pagina.getByTestId('rsvp-enviar').click()

    await expect(pagina.getByTestId('rsvp-erro')).toBeVisible()
    await expect(pagina.getByTestId('rsvp-formulario')).toBeVisible()
    await expect(pagina.getByTestId('rsvp-resumo')).toHaveCount(0)
    await expect(pagina.locator('input[type="radio"][value="Confirmado"]').first()).toBeChecked()
    await pagina.context().close()
  })
})
