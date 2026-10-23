import { expect, request, type APIRequestContext } from '@playwright/test'

export const URL_MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8125'

interface ResumoMensagem {
  ID: string
  Subject: string
}

interface ResultadoBusca {
  messages: ResumoMensagem[]
}

interface Mensagem {
  Text: string
  HTML: string
}

async function buscarMensagens(cliente: APIRequestContext, destinatario: string): Promise<ResumoMensagem[]> {
  const resposta = await cliente.get('/api/v1/search', { params: { query: `to:"${destinatario}"` } })
  if (!resposta.ok()) {
    return []
  }
  return ((await resposta.json()) as ResultadoBusca).messages
}

export async function aguardarLinkNoEmail(destinatario: string, padraoLink: RegExp, segundos = 20): Promise<string> {
  const cliente = await request.newContext({ baseURL: URL_MAILPIT })
  try {
    let link: string | null = null
    await expect
      .poll(
        async () => {
          for (const resumo of await buscarMensagens(cliente, destinatario)) {
            const resposta = await cliente.get(`/api/v1/message/${resumo.ID}`)
            const mensagem = (await resposta.json()) as Mensagem
            const encontrado = `${mensagem.Text}\n${mensagem.HTML}`.match(padraoLink)
            if (encontrado) {
              link = encontrado[0].replace(/&amp;/g, '&')
              return true
            }
          }
          return false
        },
        { message: `Nenhum e-mail para ${destinatario} chegou em ${segundos}s.`, timeout: segundos * 1000 },
      )
      .toBe(true)
    return link ?? ''
  } finally {
    await cliente.dispose()
  }
}

export function caminhoRelativo(link: string): string {
  const url = new URL(link)
  return `${url.pathname}${url.search}${url.hash}`
}
