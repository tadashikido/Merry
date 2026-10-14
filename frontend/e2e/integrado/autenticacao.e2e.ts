import { expect, test } from '@playwright/test'

import { cadastrarAssessoria } from './suporte/api'
import { novaAssessoria, senhaValida } from './suporte/dados'
import { aguardarLinkNoEmail, caminhoRelativo } from './suporte/mailpit'

test.describe('Autenticação', () => {
  test('cadastro cria a assessoria e abre o painel', async ({ page }) => {
    const dados = novaAssessoria()

    await page.goto('/cadastro')
    await expect(page.getByRole('heading', { name: 'Crie a conta da sua assessoria' })).toBeVisible()
    await page.locator('#cadastro-nomeAssessoria').fill(dados.nomeAssessoria)
    await page.locator('#cadastro-nome').fill(dados.nome)
    await page.locator('#cadastro-email').fill(dados.email)
    await page.locator('#cadastro-senha').fill(dados.senha)
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText(`Conta da ${dados.nomeAssessoria} criada.`)).toBeVisible()
    await expect(page.getByRole('heading', { name: /Olá, Ana/ })).toBeVisible()
  })

  test('cadastro valida senha fraca e e-mail já usado', async ({ page, request }) => {
    const existente = novaAssessoria()
    await cadastrarAssessoria(request, existente)

    await page.goto('/cadastro')
    await page.locator('#cadastro-nomeAssessoria').fill('Outra Assessoria')
    await page.locator('#cadastro-nome').fill('Bruno')
    await page.locator('#cadastro-email').fill(existente.email)
    await page.locator('#cadastro-senha').fill('curta')
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByText('Use 10 caracteres ou mais, com pelo menos uma letra e um número.').first()).toBeVisible()

    await page.locator('#cadastro-senha').fill(senhaValida())
    await page.locator('#cadastro-senha').press('Enter')
    await expect(page.getByText('Este e-mail já tem uma conta. Entre ou recupere a senha.').first()).toBeVisible()
  })

  test('entrar com credenciais válidas, sair e tentar senha errada', async ({ page, request }) => {
    const dados = novaAssessoria()
    await cadastrarAssessoria(request, dados)

    await page.goto('/entrar')
    await page.locator('#entrar-email').fill(dados.email)
    await page.locator('#entrar-senha').fill('SenhaErrada123')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByText('E-mail ou senha incorretos. Confira e tente de novo.')).toBeVisible()

    await page.locator('#entrar-senha').fill(dados.senha)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: /Olá, Ana/ })).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/entrar/)
    await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()

    await page.goto('/casamentos')
    await expect(page).toHaveURL(/\/entrar\?destino=/)
  })

  test('recupera a senha pelo link enviado por e-mail', async ({ page, request }) => {
    const dados = novaAssessoria()
    await cadastrarAssessoria(request, dados)
    const novaSenha = senhaValida()

    await page.goto('/esqueci-senha')
    await expect(page.getByRole('heading', { name: 'Recuperar acesso' })).toBeVisible()
    await page.locator('#esqueci-email').fill(dados.email)
    await page.getByRole('button', { name: 'Enviar link' }).click()
    await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible()

    const link = await aguardarLinkNoEmail(dados.email, /http:\/\/localhost:\d+\/redefinir-senha#token=[^\s"<]+/)
    await page.goto(caminhoRelativo(link))
    await expect(page.getByRole('heading', { name: 'Crie uma nova senha' })).toBeVisible()
    await page.locator('#redefinir-novaSenha').fill(novaSenha)
    await page.locator('#redefinir-confirmacao').fill(novaSenha)
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()

    await expect(page).toHaveURL(/\/entrar/)
    await expect(page.getByText('Senha redefinida. Entre com a nova senha.')).toBeVisible()
    await page.locator('#entrar-email').fill(dados.email)
    await page.locator('#entrar-senha').fill(novaSenha)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Olá, Ana/ })).toBeVisible()
  })

  test('link de redefinição inválido orienta pedir um novo', async ({ page }) => {
    await page.goto('/redefinir-senha#token=token-invalido-de-teste')
    await page.locator('#redefinir-novaSenha').fill('NovaSenha12345')
    await page.locator('#redefinir-confirmacao').fill('NovaSenha12345')
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Este link não vale mais' })).toBeVisible()
  })

  test.describe('Defeitos conhecidos', () => {
    test('clicar em "Esqueci minha senha" logo ao abrir a tela de entrada navega para a recuperação', async ({ page }) => {
      await page.goto('/entrar')
      await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
      await expect(page).toHaveURL(/\/esqueci-senha$/, { timeout: 5_000 })
    })

    test('corrigir a senha e clicar em "Criar conta" envia o cadastro', async ({ page, request }) => {
      const existente = novaAssessoria()
      await cadastrarAssessoria(request, existente)
      await page.goto('/cadastro')
      await page.locator('#cadastro-nomeAssessoria').fill('Outra Assessoria')
      await page.locator('#cadastro-nome').fill('Bruno')
      await page.locator('#cadastro-email').fill(existente.email)
      await page.locator('#cadastro-senha').fill('curta')
      await page.getByRole('button', { name: 'Criar conta' }).click()
      await page.locator('#cadastro-senha').fill(senhaValida())
      await page.getByRole('button', { name: 'Criar conta' }).click()
      await expect(page.getByText('Este e-mail já tem uma conta. Entre ou recupere a senha.').first()).toBeVisible({ timeout: 5_000 })
    })
  })
})
