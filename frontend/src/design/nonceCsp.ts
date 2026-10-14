const FORMATO_NONCE = /^[a-f0-9]{32}$/

export function lerNonceCsp(documento: Document = document): string | undefined {
  const conteudo = documento.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') ?? ''
  return FORMATO_NONCE.test(conteudo) ? conteudo : undefined
}
