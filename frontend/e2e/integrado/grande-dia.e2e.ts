import type { ClienteApi } from './suporte/api'
import { emailUnico, hojeEmSaoPaulo, minutoAgoraEmSaoPaulo, posicaoNoRoteiro, senhaValida } from './suporte/dados'
import { expect, test } from './suporte/fixtures'
import { aguardarLinkNoEmail, caminhoRelativo } from './suporte/mailpit'

const NOTA_INTERNA = 'Pagar saldo de R$ 4.000 em espécie'
const TELEFONE_BUFFET = '(11) 98765-4321'

async function montarDiaDeHoje(api: ClienteApi) {
  const evento = await api.criarEvento({ data: hojeEmSaoPaulo(), horario: '16:30' })
  const nomeBuffet = `Buffet Sabor ${Date.now()}`
  const fornecedor = await api.criarFornecedor(nomeBuffet, 'Buffet', TELEFONE_BUFFET)
  const vinculo = await api.vincularFornecedor(evento.id, fornecedor.id)
  const minuto = minutoAgoraEmSaoPaulo()

  await api.criarItemCronograma(evento.id, { ...posicaoNoRoteiro(minuto - 300), duracaoMinutos: 60, atividade: 'Montagem do salão' })
  await api.criarItemCronograma(evento.id, {
    ...posicaoNoRoteiro(minuto - 30),
    duracaoMinutos: 120,
    atividade: 'Serviço do buffet',
    responsavel: 'Fernanda',
    fornecedorEventoId: vinculo.id,
    instrucoes: 'Entrada pela rua lateral.',
    notasInternas: NOTA_INTERNA,
  })
  await api.criarItemCronograma(evento.id, { ...posicaoNoRoteiro(minuto + 150), duracaoMinutos: 60, atividade: 'Corte do bolo', responsavel: 'Ana' })
  await api.criarItemCronograma(evento.id, { ...posicaoNoRoteiro(minuto + 240), duracaoMinutos: 60, atividade: 'Pista de dança' })

  return { evento, vinculo, nomeBuffet }
}

test.describe('Grande Dia — agora / próximo', () => {
  test('a cerimonialista no celular vê o agora e o próximo, liga com um toque, marca como feito e desfaz', async ({ paginaAssessoria: page, api }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const { evento } = await montarDiaDeHoje(api)

    await page.goto(`/eventos/${evento.id}/grande-dia`)

    const agora = page.getByRole('region', { name: 'Agora', exact: true })
    await expect(agora).toContainText('Serviço do buffet')
    await expect(agora).toContainText('Entrada pela rua lateral.')
    await expect(page.getByTestId('relogio-operacao-selo')).toHaveText('Ao vivo')
    await expect(page.getByTestId('relogio-operacao-hora')).toHaveText(/^\d{2}:\d{2}$/)
    await expect(page.getByTestId('linha-proximo')).toContainText('Corte do bolo')
    await expect(page.getByTestId('linha-proximo-quando')).toContainText(/em (2 h 2\d|2 h 30|2 h|1 h 5\d)/)
    await expect(page.getByTestId('painel-depois')).toContainText('Pista de dança')
    await expect(page.getByTestId('grande-dia-sem-marcar')).toContainText('Montagem do salão')
    await expect(agora.getByRole('link', { name: /Ligar para Buffet Sabor/ })).toHaveAttribute('href', 'tel:11987654321')
    await expect(agora.getByRole('link', { name: /WhatsApp de Buffet Sabor/ })).toHaveAttribute('href', 'https://wa.me/5511987654321')
    expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true)

    const marcar = page.getByRole('button', { name: 'Marcar “Serviço do buffet” como feito' })
    await expect(marcar).toBeInViewport()
    const caixa = await marcar.boundingBox()
    expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(48)
    await marcar.click()

    await expect(page.getByText('Serviço do buffet marcada como feita.')).toBeVisible()
    await expect(page.getByTestId('painel-nada-agora')).toBeVisible()
    await expect(page.getByTestId('grande-dia-feitos')).toContainText('Feitos (1)')
    expect((await api.situacoesGrandeDia(evento.id))['Serviço do buffet']).toBe('Feito')

    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.getByText('Serviço do buffet voltou para o roteiro.')).toBeVisible()
    await expect(agora).toContainText('Serviço do buffet')
    expect((await api.situacoesGrandeDia(evento.id))['Serviço do buffet']).toBe('Agora')

    await page.getByRole('button', { name: 'Marcar “Montagem do salão” como feito' }).click()
    await expect(page.getByText('Montagem do salão marcada como feita.')).toBeVisible()
    await expect(page.getByTestId('grande-dia-sem-marcar')).toHaveCount(0)
  })

  test('o link público do fornecedor mostra o mesmo agora / próximo, só com os itens dele e sem ações', async ({ api, browser }) => {
    const { evento, vinculo, nomeBuffet } = await montarDiaDeHoje(api)
    const token = await api.gerarLinkCronograma(evento.id, { tipo: 'Fornecedor', fornecedorEventoId: vinculo.id })
    const geral = await api.gerarLinkCronograma(evento.id, { tipo: 'Geral' })

    const contexto = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const publica = await contexto.newPage()
    await publica.goto(`/cronograma/${token}`)

    await expect(publica.getByTestId('cabecalho-operacao-filtro')).toHaveText(`Seus horários · ${nomeBuffet}`)
    const agora = publica.getByRole('region', { name: 'Agora', exact: true })
    await expect(agora).toContainText('Serviço do buffet')
    await expect(publica.getByTestId('relogio-operacao-selo')).toHaveText('Ao vivo')
    await expect(publica.getByText(NOTA_INTERNA)).toHaveCount(0)
    await expect(publica.getByText('Corte do bolo')).toHaveCount(0)
    await expect(publica.locator('a[href^="tel:"], a[href*="wa.me"]')).toHaveCount(0)
    await expect(publica.getByRole('button')).toHaveText(['Atualizar'])
    expect(await publica.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(true)

    await publica.goto(`/cronograma/${geral}`)
    await expect(publica.getByTestId('linha-proximo')).toContainText('Corte do bolo')
    await contexto.close()
  })

  test('os anfitriões acompanham o grande dia em leitura, com contatos e sem marcar', async ({ api, browser, baseURL }) => {
    const { evento } = await montarDiaDeHoje(api)
    const emailAnfitriao = emailUnico('anfitriao')
    const senhaAnfitriao = senhaValida()
    await api.convidarAnfitriao(evento.id, evento.nomePrimeiraPessoa, emailAnfitriao)
    const link = await aguardarLinkNoEmail(emailAnfitriao, /http:\/\/localhost:\d+\/acesso-anfitriao#token=[A-Za-z0-9_-]+/)

    const contexto = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } })
    const anfitriao = await contexto.newPage()
    await anfitriao.goto(caminhoRelativo(link))
    await anfitriao.locator('#aceite-senha').fill(senhaAnfitriao)
    await anfitriao.locator('#aceite-confirmacao').fill(senhaAnfitriao)
    await anfitriao.getByRole('button', { name: 'Criar senha e entrar' }).click()
    await expect(anfitriao).toHaveURL(new RegExp(`/eventos/${evento.id}$`))

    await anfitriao.goto(`/eventos/${evento.id}/grande-dia`)
    const agora = anfitriao.getByRole('region', { name: 'Agora', exact: true })
    await expect(agora).toContainText('Serviço do buffet')
    await expect(agora.getByRole('link', { name: /Ligar para Buffet Sabor/ })).toBeVisible()
    await expect(anfitriao.getByText(NOTA_INTERNA)).toHaveCount(0)
    await expect(anfitriao.getByRole('button', { name: /como feito/ })).toHaveCount(0)
    await expect(anfitriao.getByRole('button', { name: 'Reabrir' })).toHaveCount(0)
    await contexto.close()
  })
})
