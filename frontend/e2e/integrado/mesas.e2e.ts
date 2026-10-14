import { readFile } from 'node:fs/promises'

import { emailUnico, senhaValida } from './suporte/dados'
import { expect, test } from './suporte/fixtures'
import { dialogo } from './suporte/interacoes'
import { aguardarLinkNoEmail, caminhoRelativo } from './suporte/mailpit'

const DIRETORIO_CAPTURAS = process.env.E2E_CAPTURAS ?? ''

async function capturar(page: import('@playwright/test').Page, nome: string) {
  if (DIRETORIO_CAPTURAS) {
    await page.screenshot({ path: `${DIRETORIO_CAPTURAS}/${nome}.png`, fullPage: true })
  }
}

test.describe('Mesas em lista', () => {
  test('a cerimonialista cria mesas, senta o convite inteiro, respeita a capacidade, vê a saída por recusa e exporta', async ({ paginaAssessoria: page, api }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const casamento = await api.criarCasamento()
    const souza = await api.criarConvite(
      casamento.id,
      [
        { nome: 'Carla Souza', email: 'carla@e2e.teste', resposta: 'Confirmado' },
        { nome: 'Pedro Souza', faixaEtaria: 'Crianca', resposta: 'Confirmado' },
        { nome: 'Ana Souza', resposta: 'Confirmado' },
        { nome: 'Bia Souza', resposta: 'Confirmado' },
      ],
      { nome: 'Família Souza', grupo: 'Família da noiva' },
    )
    const rui = await api.criarConvite(casamento.id, [{ nome: 'Rui Fontes', resposta: 'Confirmado' }], { grupo: 'Amigos do trabalho' })
    await api.criarConvite(casamento.id, [{ nome: '@Primo Zeca', resposta: 'Confirmado' }])
    await api.criarConvite(casamento.id, [{ nome: 'Marcos Pendente' }])
    const padrinhos = await api.criarMesa(casamento.id, { numero: 2, nome: 'Padrinhos', capacidade: 8 })

    await page.goto(`/casamentos/${casamento.id}/mesas`)
    await expect(page.getByRole('heading', { name: 'Mesas', level: 1 })).toBeVisible()
    await expect(page.getByTestId('contagem-sem-mesa')).toContainText('6')
    await expect(page.getByTestId('coluna-sem-mesa')).not.toContainText('Marcos Pendente')

    await page.getByTestId('nova-mesa').click()
    const formulario = dialogo(page)
    await expect(formulario.getByLabel('Número')).toHaveValue('1')
    await formulario.getByLabel('Lugares').fill('4')
    await formulario.getByLabel('Nome (opcional)').fill('Família da noiva')
    await formulario.getByRole('button', { name: 'Criar mesa' }).click()
    await expect(page.getByText('Mesa 1 · Família da noiva criada.')).toBeVisible()

    const semMesa = page.getByTestId('coluna-sem-mesa')
    await semMesa.getByLabel('Carla Souza').check()
    await expect(page.getByTestId('dica-convite')).toHaveText('Mais 3 deste convite sem mesa')
    await expect(page.getByTestId('contagem-selecao')).toHaveText('1 pessoa selecionada')
    await semMesa.getByRole('button', { name: 'Selecionar as 4 pessoas do convite Família Souza' }).click()
    await expect(page.getByTestId('contagem-selecao')).toHaveText('4 pessoas selecionadas')
    await capturar(page, 'mesas-selecao-desktop')

    await page.getByTestId('sentar-em').click()
    const sentar = dialogo(page)
    await expect(sentar).toContainText('Sentar 4 pessoas em…')
    await sentar.getByLabel('Mesa 1 · Família da noiva').check()
    await capturar(page, 'mesas-dialogo-sentar')
    await sentar.getByRole('button', { name: 'Sentar aqui' }).click()
    await expect(page.getByText('4 pessoas sentadas na Mesa 1 · Família da noiva.')).toBeVisible()

    const mesaFamilia = page.getByRole('region', { name: 'Mesa 1 · Família da noiva' })
    await expect(mesaFamilia.getByTestId('texto-ocupacao')).toContainText('4 de 4')
    await expect(mesaFamilia.getByTestId('texto-ocupacao')).toContainText('completa')
    await expect(mesaFamilia).toContainText('Pedro Souza')
    await expect(semMesa).not.toContainText('Carla Souza')

    await semMesa.getByLabel('Rui Fontes').check()
    await page.getByTestId('sentar-em').click()
    await expect(sentar.getByLabel('Mesa 1 · Família da noiva')).toBeDisabled()
    await expect(sentar.getByTestId('opcao-mesa').first()).toContainText('Completa')
    await sentar.getByLabel('Mesa 2 · Padrinhos').check()
    await sentar.getByRole('button', { name: 'Sentar aqui' }).click()
    await expect(page.getByText('1 pessoa sentada na Mesa 2 · Padrinhos.')).toBeVisible()

    const token = await api.gerarLinkRsvp(casamento.id, rui.id)
    await api.responderRsvp(token, [{ id: rui.convidados[0]!.id, resposta: 'Recusado' }])
    await page.reload()
    const aviso = page.getByTestId('aviso-saida')
    await expect(aviso).toContainText('1 pessoa saiu da mesa porque deixou de confirmar presença.')
    await expect(aviso).toContainText('Rui Fontes')
    await expect(aviso).toContainText('recusou, saiu da Mesa 2 · Padrinhos')
    await expect(page.getByRole('region', { name: 'Mesa 2 · Padrinhos' }).getByTestId('texto-ocupacao')).toContainText('0 de 8')
    await capturar(page, 'mesas-aviso-saida')
    await aviso.getByRole('button', { name: 'Entendi' }).click()
    await expect(page.getByTestId('aviso-saida')).toHaveCount(0)
    expect((await api.mapaMesas(casamento.id)).avisosSaida).toHaveLength(0)

    await expect(page.locator('div.mesas').getByText(/restri/i)).toHaveCount(0)
    await expect(page.getByText('carla@e2e.teste')).toHaveCount(0)

    const download = page.waitForEvent('download')
    await page.getByTestId('baixar-planilha').click()
    const arquivo = await download
    expect(arquivo.suggestedFilename()).toMatch(/^mesas-.+-\d{4}-\d{2}-\d{2}\.csv$/)
    const csv = await readFile((await arquivo.path())!, 'utf-8')
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('Mesa;Lugares;Pessoa;Convite;Faixa etária;Acompanhante')
    expect(csv).toContain('Mesa 1 · Família da noiva;4;Pedro Souza;Família Souza;Criança;Não')
    expect(csv).toContain("Sem mesa;;'@Primo Zeca;'@Primo Zeca;Adulto;Não")
    expect(csv).not.toContain('carla@e2e.teste')

    const popup = page.waitForEvent('popup')
    await page.getByTestId('abrir-impressao').click()
    const impressao = await popup
    await expect(impressao.getByTestId('mapa-mesas-impressao')).toBeVisible()
    await expect(impressao.getByTestId('mesa-impressao').first()).toContainText('Mesa 1 · Família da noiva')
    await expect(impressao.getByTestId('mesa-impressao').first()).toContainText('Pedro Souza (criança)')
    await expect(impressao.getByTestId('sem-mesa-impressao')).toContainText('@Primo Zeca')
    await expect(impressao.getByText('carla@e2e.teste')).toHaveCount(0)
    await capturar(impressao, 'mesas-impressao')
    await impressao.close()

    await page.goto(`/casamentos/${casamento.id}/convidados`)
    await expect(page.getByRole('row', { name: /Família Souza/ }).getByTestId('mesa-pessoa').first()).toHaveText('Mesa 1 · Família da noiva')
    expect(souza.convidados).toHaveLength(4)
    expect((await api.mapaMesas(casamento.id)).mesas.find((mesa) => mesa.id === padrinhos.id)?.ocupacao).toBe(0)
  })

  test('no celular as pessoas e as mesas ficam em painéis, a barra de seleção fica ao alcance e não há rolagem horizontal', async ({ paginaAssessoria: page, api }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const casamento = await api.criarCasamento()
    await api.criarConvite(casamento.id, [{ nome: 'Tereza Andrade', resposta: 'Confirmado' }, { nome: 'Igor Andrade', resposta: 'Confirmado' }], {
      nome: 'Família Andrade',
      grupo: 'Família do noivo',
    })
    await api.criarConvite(casamento.id, [{ nome: 'Beatriz Sales', resposta: 'Confirmado' }], { grupo: 'Amigos da faculdade' })
    await api.criarMesa(casamento.id, { numero: 1, nome: 'Mesa dos noivos', capacidade: 10, especial: true })
    await api.criarMesa(casamento.id, { numero: 3, capacidade: 8 })

    await page.goto(`/casamentos/${casamento.id}/mesas`)
    await expect(page.getByTestId('abas-mesas')).toBeVisible()
    await page.getByLabel('Grupo').click()
    await page.getByRole('option', { name: 'Família do noivo' }).click()
    await expect(page.getByTestId('coluna-sem-mesa')).not.toContainText('Beatriz Sales')
    await page.getByTestId('limpar-filtros').click()

    await page.getByTestId('coluna-sem-mesa').getByLabel('Beatriz Sales').check()
    const sentarEm = page.getByTestId('sentar-em')
    await expect(sentarEm).toBeInViewport()
    expect((await sentarEm.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true)
    await capturar(page, 'mesas-celular-selecao')

    await sentarEm.click()
    await dialogo(page).getByLabel('Mesa 3', { exact: true }).check()
    await dialogo(page).getByRole('button', { name: 'Sentar aqui' }).click()
    await expect(page.getByText('1 pessoa sentada na Mesa 3.')).toBeVisible()

    await page.getByTestId('abas-mesas').getByText(/^Mesas/).click()
    const noivos = page.getByRole('region', { name: 'Mesa 1 · Mesa dos noivos' })
    await expect(noivos).toBeVisible()
    await expect(page.getByTestId('mesa').first()).toContainText('Mesa dos noivos')
    await expect(page.getByRole('region', { name: 'Mesa 3' })).toContainText('Beatriz Sales')
    expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true)
    await capturar(page, 'mesas-celular-mesas')
  })

  test('o casal organiza as mesas do próprio casamento sem ver dados de saúde', async ({ browser, baseURL, api }) => {
    const casamento = await api.criarCasamento()
    await api.criarConvite(casamento.id, [{ nome: 'Tia Lúcia', resposta: 'Confirmado' }])
    await api.criarMesa(casamento.id, { numero: 4, nome: 'Tios', capacidade: 6 })
    const emailCasal = emailUnico('casal')
    const senhaCasal = senhaValida()
    await api.convidarCasal(casamento.id, casamento.nomePrimeiraPessoa, emailCasal)
    const link = await aguardarLinkNoEmail(emailCasal, /http:\/\/localhost:\d+\/acesso-casal#token=[A-Za-z0-9_-]+/)

    const contextoCasal = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } })
    const casal = await contextoCasal.newPage()
    await casal.goto(caminhoRelativo(link))
    await casal.locator('#aceite-senha').fill(senhaCasal)
    await casal.locator('#aceite-confirmacao').fill(senhaCasal)
    await casal.getByRole('button', { name: 'Criar senha e entrar' }).click()
    await expect(casal).toHaveURL(new RegExp(`/casamentos/${casamento.id}$`))

    await casal.getByRole('link', { name: 'Mesas' }).first().click()
    await expect(casal).toHaveURL(new RegExp(`/casamentos/${casamento.id}/mesas$`))
    await casal.getByTestId('coluna-sem-mesa').getByLabel('Tia Lúcia').check()
    await casal.getByTestId('sentar-em').click()
    await dialogo(casal).getByLabel('Mesa 4 · Tios').check()
    await dialogo(casal).getByRole('button', { name: 'Sentar aqui' }).click()
    await expect(casal.getByText('1 pessoa sentada na Mesa 4 · Tios.')).toBeVisible()
    await expect(casal.locator('div.mesas').getByText(/restri/i)).toHaveCount(0)
    expect((await api.mapaMesas(casamento.id)).totais.acomodados).toBe(1)
    await contextoCasal.close()
  })
})
