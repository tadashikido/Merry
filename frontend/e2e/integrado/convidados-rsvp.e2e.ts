import { expect, test } from './suporte/fixtures'
import { dialogo } from './suporte/interacoes'

const CSV_VALIDO = [
  'Convite;Grupo;Nome;Telefone;E-mail;Faixa etária;Acompanhantes;Resposta',
  'Família Souza;Família da noiva;Carla Souza;(11) 98765-4321;;Adulto;1;',
  'Família Souza;Família da noiva;Lucas Souza;;;Criança;;',
  'Amigos;Amigos do noivo;Tiago Ramos;;tiago@e2e.teste;Adulto;0;Confirmado',
].join('\n')

const CSV_COM_ERRO = [
  'Convite;Grupo;Nome;Telefone;E-mail;Faixa etária;Acompanhantes;Resposta',
  'Família Lima;Família do noivo;Rosa Lima;;;Adulto;0;',
  'Família Costa;Família do noivo;;;;Adulto;0;',
].join('\n')

test.describe('Convidados, importação, RSVP e confirmações', () => {
  test('cria convite com duas pessoas, edita, busca e exclui', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    await page.goto(`/eventos/${evento.id}/convidados`)

    await page.getByRole('button', { name: 'Adicionar convite' }).first().click()
    await page.getByLabel('Nome do convite').fill('Família Andrade')
    await page.getByRole('combobox', { name: 'Grupo' }).fill('Família do noivo')
    await page.getByLabel('Nome', { exact: false }).nth(1).fill('Helena Andrade')
    await page.getByRole('button', { name: 'Adicionar pessoa' }).click()
    await page.getByRole('group', { name: 'Pessoa 2' }).getByLabel('Nome').fill('Caio Andrade')
    await page.getByRole('group', { name: 'Pessoa 2' }).getByRole('button', { name: 'Criança' }).click()
    await page.getByRole('button', { name: 'Salvar convite' }).click()

    await expect(page.getByText('Convite “Família Andrade” salvo.')).toBeVisible()
    await page.goto(`/eventos/${evento.id}/convidados`)
    await expect(page.getByRole('region', { name: 'Totais de convidados' })).toContainText(/2\s*pessoas/)

    await page.getByRole('button', { name: 'Editar Família Andrade' }).click()
    await page.getByRole('group', { name: 'Pessoa 1' }).getByRole('button', { name: 'Confirmado' }).click()
    await page.getByRole('button', { name: 'Salvar convite' }).click()
    await expect(page.getByText('Convite “Família Andrade” salvo.')).toBeVisible()
    await page.goto(`/eventos/${evento.id}/convidados`)
    await expect(page.getByRole('region', { name: 'Totais de convidados' })).toContainText(/1\s*confirmadas?/)

    await page.getByRole('searchbox', { name: 'Buscar' }).fill('Inexistente')
    await expect(page.getByText('Família Andrade')).toHaveCount(0)
    await page.getByRole('searchbox', { name: 'Buscar' }).fill('Caio')
    await expect(page.getByRole('row', { name: /Família Andrade/ })).toBeVisible()

    await page.getByRole('button', { name: 'Excluir Família Andrade' }).click()
    await dialogo(page).getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByRole('row', { name: /Família Andrade/ })).toHaveCount(0)
  })

  test('importa convidados de uma planilha CSV', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    await page.goto(`/eventos/${evento.id}/convidados/importar`)

    await page.getByTestId('envio-arquivo-entrada').setInputFiles({
      name: 'convidados.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(`﻿${CSV_VALIDO}`, 'utf-8'),
    })
    await expect(page.getByRole('heading', { name: /^Convites que serão criados/ })).toBeVisible()
    await page.getByRole('button', { name: /^Importar \d+ convites?$/ }).click()

    await expect(page.getByText('Lista importada')).toBeVisible()
    await page.getByRole('button', { name: 'Ver convidados' }).click()
    await expect(page.getByRole('region', { name: 'Totais de convidados' })).toContainText(/3\s*pessoas/)
    await expect(page.getByRole('row', { name: /Família Souza/ })).toBeVisible()
  })

  test('planilha com linha inválida aponta o que corrigir e importa só o que está pronto', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    await page.goto(`/eventos/${evento.id}/convidados/importar`)

    await page.getByTestId('envio-arquivo-entrada').setInputFiles({
      name: 'convidados.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(CSV_COM_ERRO, 'utf-8'),
    })
    await expect(page.getByRole('heading', { name: 'Linhas para corrigir' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Linhas para corrigir' })).toContainText('Nome: Preencha este campo.')
    await page.getByRole('button', { name: /^Importar só (o|os \d+) convites? prontos?$/ }).click()
    const confirmacao = page.getByRole('alertdialog')
    await expect(confirmacao).toBeVisible()
    await confirmacao.getByRole('button', { name: /Importar/ }).click()

    await expect(page.getByText('Lista importada')).toBeVisible()
  })

  test('convidado confirma presença pelo link e a resposta aparece em Confirmações', async ({ browser, baseURL, paginaAssessoria, api }) => {
    const evento = await api.criarEvento()
    const convite = await api.criarConvite(evento.id, [{ nome: 'Joana Prado' }, { nome: 'Pedro Prado' }], { nome: 'Família Prado' })
    const token = await api.gerarLinkRsvp(evento.id, convite.id)

    const contextoConvidado = await browser.newContext({ baseURL })
    const convidado = await contextoConvidado.newPage()
    await convidado.goto(`/rsvp/${token}`)
    await expect(convidado.getByRole('heading', { name: 'Família Prado' })).toBeVisible()
    await convidado.getByRole('radiogroup', { name: 'Presença de Joana Prado' }).getByRole('radio', { name: 'Vou', exact: true }).check()
    await convidado.getByRole('radiogroup', { name: 'Presença de Pedro Prado' }).getByRole('radio', { name: 'Não vou' }).check()
    await convidado.getByRole('button', { name: 'Enviar resposta' }).click()
    await expect(convidado.getByText('Obrigado, Família Prado.')).toBeVisible()
    await contextoConvidado.close()

    await paginaAssessoria.goto(`/eventos/${evento.id}/confirmacoes`)
    const pessoas = paginaAssessoria.getByRole('region', { name: 'Pessoas por resposta' })
    await expect(pessoas).toContainText(/1\s*confirmadas?/)
    await expect(pessoas).toContainText(/1\s*recusadas?/)

    await paginaAssessoria.goto(`/eventos/${evento.id}/confirmacoes/buffet`)
    await expect(paginaAssessoria.getByRole('region', { name: 'Contagem' })).toContainText('Total confirmado')
    await expect(paginaAssessoria.getByRole('region', { name: 'Confirmados por convite (1)' })).toContainText('Joana Prado')
  })

  test('link de RSVP inválido informa que não está ativo', async ({ page }) => {
    await page.goto('/rsvp/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    await expect(page.getByText('Este link não está ativo')).toBeVisible()
  })

  test('registra restrição alimentar exigindo o consentimento', async ({ paginaAssessoria: page, api }) => {
    const evento = await api.criarEvento()
    await api.criarConvite(evento.id, [{ nome: 'Bianca Torres' }])
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto(`/eventos/${evento.id}/restricoes-alimentares`)

    await page.getByRole('button', { name: 'Registrar restrição' }).first().click()
    const janela = dialogo(page)
    await janela.getByRole('combobox', { name: 'Busque pelo nome' }).pressSequentially('Bianca')
    await page.getByRole('option', { name: /Bianca Torres/ }).first().click()
    await janela.getByRole('button', { name: 'Vegana' }).click()
    await janela.getByRole('button', { name: 'Salvar restrição' }).click()
    await expect(janela.getByRole('checkbox', { name: /Confirmo que a pessoa autorizou/ })).toBeVisible()
    await expect(janela).toBeVisible()

    await janela.getByRole('checkbox', { name: /Confirmo que a pessoa autorizou/ }).check()
    await janela.getByRole('button', { name: 'Salvar restrição' }).click()

    await expect(page.getByText('Restrição salva.')).toBeVisible()
    const linha = page.getByRole('row', { name: /Bianca Torres/ })
    await expect(linha.getByRole('cell', { name: 'Vegana' })).toBeVisible()
    await expect(linha.getByRole('cell', { name: 'Registrada pela assessoria' })).toBeVisible()
  })
})
