import { test as base, type Page } from '@playwright/test'

import { cadastrarAssessoria, ClienteApi, entrar, type Sessao } from './api'
import { novaAssessoria, type DadosAssessoria } from './dados'

export async function entrarNaPagina(page: Page, email: string, senha: string): Promise<Sessao> {
  const sessao = await entrar(page.request, email, senha)
  const renovacaoInicial = page.waitForResponse((resposta) => new URL(resposta.url()).pathname === '/api/autenticacao/renovar')
  await page.goto('/')
  await renovacaoInicial
  return sessao
}

interface FixturesIntegradas {
  assessoria: DadosAssessoria
  api: ClienteApi
  paginaAssessoria: Page
}

export const test = base.extend<FixturesIntegradas>({
  assessoria: async ({ playwright, baseURL }, usar) => {
    const dados = novaAssessoria()
    const contexto = await playwright.request.newContext({ baseURL })
    await cadastrarAssessoria(contexto, dados)
    await contexto.dispose()
    await usar(dados)
  },
  api: async ({ playwright, baseURL, assessoria }, usar) => {
    const contexto = await playwright.request.newContext({ baseURL })
    const sessao = await entrar(contexto, assessoria.email, assessoria.senha)
    await usar(new ClienteApi(contexto, sessao.tokenAcesso))
    await contexto.dispose()
  },
  paginaAssessoria: async ({ page, assessoria }, usar) => {
    await entrarNaPagina(page, assessoria.email, assessoria.senha)
    await usar(page)
  },
})

export { expect } from '@playwright/test'
