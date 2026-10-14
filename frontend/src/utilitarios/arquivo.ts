import { formatarNumero } from '@/utilitarios/formatacao'

export const TAMANHO_MAXIMO_PLANILHA = 2 * 1024 * 1024
export const EXTENSOES_PLANILHA = ['.csv', '.txt'] as const
export const ACEITE_PLANILHA = '.csv,text/csv,text/plain,application/vnd.ms-excel'

export type ProblemaArquivo = 'vazio' | 'tamanho' | 'formato'

export function formatarTamanhoArquivo(bytes: number): string {
  if (bytes < 1024) {
    return `${formatarNumero(bytes)} B`
  }
  if (bytes < 1024 * 1024) {
    return `${formatarNumero(Math.ceil(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}

export function verificarArquivoPlanilha(arquivo: Pick<File, 'name' | 'size'>): ProblemaArquivo | null {
  if (arquivo.size === 0) {
    return 'vazio'
  }
  if (arquivo.size > TAMANHO_MAXIMO_PLANILHA) {
    return 'tamanho'
  }
  const nome = arquivo.name.toLowerCase()
  return EXTENSOES_PLANILHA.some((extensao) => nome.endsWith(extensao)) ? null : 'formato'
}

export function baixarTexto(nomeArquivo: string, conteudo: string, tipo = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const TAMANHO_MAXIMO_CONTRATO = 10 * 1024 * 1024
export const ACEITE_CONTRATO = '.pdf,application/pdf'
const ASSINATURA_PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]

async function lerInicio(arquivo: Blob, tamanho: number): Promise<Uint8Array> {
  const pedaco = arquivo.slice(0, tamanho)
  if (typeof pedaco.arrayBuffer === 'function') {
    return new Uint8Array(await pedaco.arrayBuffer())
  }
  return new Uint8Array(
    await new Promise<ArrayBuffer>((resolver, rejeitar) => {
      const leitor = new FileReader()
      leitor.onload = () => resolver(leitor.result as ArrayBuffer)
      leitor.onerror = () => rejeitar(leitor.error)
      leitor.readAsArrayBuffer(pedaco)
    }),
  )
}

export async function verificarArquivoPdf(arquivo: File): Promise<ProblemaArquivo | null> {
  if (arquivo.size === 0) {
    return 'vazio'
  }
  if (arquivo.size > TAMANHO_MAXIMO_CONTRATO) {
    return 'tamanho'
  }
  const inicio = await lerInicio(arquivo, ASSINATURA_PDF.length)
  return ASSINATURA_PDF.every((byte, indice) => inicio[indice] === byte) ? null : 'formato'
}

export const TAMANHO_MAXIMO_COMPROVANTE = 10 * 1024 * 1024
export const ACEITE_COMPROVANTE = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
const ASSINATURA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const ASSINATURA_JPEG = [0xff, 0xd8, 0xff]

function comecaCom(inicio: Uint8Array, assinatura: number[]): boolean {
  return assinatura.every((byte, indice) => inicio[indice] === byte)
}

export async function verificarArquivoComprovante(arquivo: File): Promise<ProblemaArquivo | null> {
  if (arquivo.size === 0) {
    return 'vazio'
  }
  if (arquivo.size > TAMANHO_MAXIMO_COMPROVANTE) {
    return 'tamanho'
  }
  const inicio = await lerInicio(arquivo, ASSINATURA_PNG.length)
  return comecaCom(inicio, ASSINATURA_PDF) || comecaCom(inicio, ASSINATURA_PNG) || comecaCom(inicio, ASSINATURA_JPEG)
    ? null
    : 'formato'
}

export function baixarBlob(nomeArquivo: string, conteudo: Blob): void {
  const url = URL.createObjectURL(conteudo)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
