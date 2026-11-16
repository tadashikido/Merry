/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

import { ROTA_CHECKLIST, ROTA_CRONOGRAMA, ROTA_FORNECEDOR, simularPainel } from './suporte/painelSimulado'

const LARGURAS_SUPORTADAS = [1920, 1366, 1133, 1024, 768, 390, 360]
const ALTURA_PADRAO = 900

async function abrir(page: Page, rota: string, seletorPronto: string): Promise<void> {
  await page.goto(rota)
  await page.waitForSelector(seletorPronto, { state: 'visible' })
  await page.waitForTimeout(150)
}

async function semRolagemHorizontal(page: Page): Promise<{ scrollWidth: number; innerWidth: number }> {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
}

test.describe('Tarefa #200 — regressão de layout', () => {
  test.beforeEach(async ({ page }) => {
    await simularPainel(page)
  })

  const telas: Array<{ nome: string; rota: string; pronto: string }> = [
    { nome: 'checklist', rota: ROTA_CHECKLIST, pronto: '[data-teste="lateral-checklist"]' },
    { nome: 'detalhe do fornecedor', rota: ROTA_FORNECEDOR, pronto: '[data-teste="ficha-fornecedor"]' },
    { nome: 'cronograma', rota: ROTA_CRONOGRAMA, pronto: '[data-teste="adicionar-item-cronograma"]' },
  ]

  for (const tela of telas) {
    test(`[E2E] ${tela.nome} não tem rolagem horizontal nas larguras suportadas`, async ({ page }) => {
      for (const largura of LARGURAS_SUPORTADAS) {
        await page.setViewportSize({ width: largura, height: ALTURA_PADRAO })
        await abrir(page, tela.rota, tela.pronto)
        const { scrollWidth, innerWidth } = await semRolagemHorizontal(page)
        expect(scrollWidth, `${tela.nome} em ${largura}px: rolagem horizontal (scrollWidth ${scrollWidth} > innerWidth ${innerWidth})`).toBeLessThanOrEqual(innerWidth)
      }
    })
  }

  test('[E2E][P03] marcos do checklist: rótulo e contagem legíveis, sem sobreposição', async ({ page }) => {
    for (const largura of LARGURAS_SUPORTADAS) {
      await page.setViewportSize({ width: largura, height: ALTURA_PADRAO })
      await abrir(page, ROTA_CHECKLIST, '[data-teste="lateral-checklist"]')

      const marcos = await page.evaluate(() => {
        const visiveis = Array.from(document.querySelectorAll('.checklist__marco')).filter(
          (el) => (el as HTMLElement).offsetParent !== null,
        )
        return visiveis.map((el) => {
          const dt = el.querySelector('dt') as HTMLElement
          const dd = el.querySelector('dd') as HTMLElement
          const rDt = dt.getBoundingClientRect()
          const rDd = dd.getBoundingClientRect()
          const mesmaLinha = Math.abs(rDt.top - rDd.top) < 4
          const sobrepoe = mesmaLinha && rDt.right > rDd.left + 1 && rDd.right > rDt.left + 1
          return { dtScroll: dt.scrollWidth, dtClient: dt.clientWidth, dtWidth: Math.round(rDt.width), sobrepoe }
        })
      })

      for (const marco of marcos) {
        expect(marco.dtScroll, `rótulo transborda a coluna em ${largura}px`).toBeLessThanOrEqual(marco.dtClient + 1)
        expect(marco.dtWidth, `coluna do rótulo com 0px em ${largura}px`).toBeGreaterThan(0)
        expect(marco.sobrepoe, `rótulo e contagem se sobrepõem em ${largura}px`).toBe(false)
      }
    }
  })

  test('[E2E][P04] ficha do fornecedor: colunas legíveis entre 1024px e 1300px', async ({ page }) => {
    for (const largura of [1133, 1024]) {
      await page.setViewportSize({ width: largura, height: ALTURA_PADRAO })
      await abrir(page, ROTA_FORNECEDOR, '[data-teste="ficha-fornecedor"]')

      const larguraContato = await page.evaluate(() => {
        const secao = document.querySelector('#fornecedor-contato')?.closest('section') as HTMLElement | null
        return secao ? Math.round(secao.getBoundingClientRect().width) : 0
      })
      expect(larguraContato, `coluna de contato estreita demais em ${largura}px`).toBeGreaterThanOrEqual(200)
    }
  })

  test('[E2E][P05] cronograma 768×1024: "Adicionar item" visível e sem rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await abrir(page, ROTA_CRONOGRAMA, '[data-teste="adicionar-item-cronograma"]')

    const { scrollWidth, innerWidth } = await semRolagemHorizontal(page)
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)

    const botao = page.getByTestId('adicionar-item-cronograma')
    await expect(botao).toBeVisible()
    const caixa = await botao.boundingBox()
    expect(caixa).not.toBeNull()
    expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(innerWidth + 1)
  })

  test('[E2E][P12] abrir modal com a página rolada não move a sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 700 })
    await abrir(page, ROTA_CRONOGRAMA, '[data-teste="menu-lateral"]')
    await page.waitForSelector('[data-teste="adicionar-item-cronograma"]', { state: 'visible' })

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(150)

    const sidebar = page.getByTestId('menu-lateral')
    const antes = await sidebar.boundingBox()
    expect(antes).not.toBeNull()

    await page.getByTestId('adicionar-item-cronograma').click()
    await page.waitForSelector('[data-teste="dialogo-item-cronograma"]', { state: 'visible' })
    await page.waitForTimeout(150)

    const depois = await sidebar.boundingBox()
    expect(depois).not.toBeNull()

    expect(Math.abs(depois!.x - antes!.x), 'sidebar deslocou na horizontal').toBeLessThanOrEqual(1)
    expect(Math.abs(depois!.y - antes!.y), 'sidebar deslocou na vertical').toBeLessThanOrEqual(1)
    expect(Math.abs(depois!.height - antes!.height), 'altura da sidebar mudou').toBeLessThanOrEqual(1)

    const { scrollWidth, innerWidth } = await semRolagemHorizontal(page)
    expect(scrollWidth, 'modal introduziu rolagem horizontal').toBeLessThanOrEqual(innerWidth)
  })
})
