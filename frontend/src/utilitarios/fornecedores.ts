import { ROTULOS_CATEGORIA_FORNECEDOR, TEXTOS_FORNECEDORES } from '@/textos/fornecedores'
import type {
  CategoriaFornecedor,
  ContatoFornecedor,
  FornecedorResumoDto,
  SituacaoListagemFornecedores,
} from '@/tipos/fornecedores'
import { contemTexto } from '@/utilitarios/busca'
import { URL_WHATSAPP, telefoneWhatsApp } from '@/utilitarios/rsvp'
import { normalizarTelefone, telefoneValido } from '@/utilitarios/telefone'
import type { RegraValidacao } from '@/utilitarios/validacao'

export const LIMITES_FORNECEDOR = {
  nomeEmpresaMinimo: 2,
  nomeEmpresaMaximo: 120,
  responsavelMaximo: 120,
  emailMaximo: 254,
  siteMaximo: 300,
  instagramMaximo: 30,
  instagramEntradaMaxima: 100,
  observacoesMaximo: 2000,
} as const

const URL_INSTAGRAM = 'https://www.instagram.com/'
const PREFIXO_SEGURO = 'https://'
const PADRAO_ESQUEMA = /^[A-Za-z][A-Za-z0-9+.-]*:(?!\d)/
const PADRAO_IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/
const PADRAO_USUARIO_INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/
const PADRAO_ENDERECO_INSTAGRAM = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)\/?(?:[?#].*)?$/i
const PADRAO_EMAIL_LINK = /^[^\s@?#&/\\]+@[^\s@?#&/\\]+\.[^\s@?#&/\\]+$/

export interface FiltroFornecedores {
  busca: string
  categoria: CategoriaFornecedor | null
  situacao: SituacaoListagemFornecedores
}

export interface GrupoFornecedores<T extends FornecedorResumoDto = FornecedorResumoDto> {
  categoria: CategoriaFornecedor
  rotulo: string
  fornecedores: T[]
}

export interface ContagemCategoria {
  chave: CategoriaFornecedor
  rotulo: string
  quantidade: number
}

function textoOuVazio(valor: string | null | undefined): string {
  return (valor ?? '').trim()
}

export function daSituacao<T extends FornecedorResumoDto>(lista: T[], situacao: SituacaoListagemFornecedores): T[] {
  return lista.filter((fornecedor) => fornecedor.arquivado === (situacao === 'arquivados'))
}

export function filtrarFornecedores<T extends FornecedorResumoDto>(lista: T[], filtro: FiltroFornecedores): T[] {
  return daSituacao(lista, filtro.situacao).filter(
    (fornecedor) =>
      (filtro.categoria === null || fornecedor.categoria === filtro.categoria) &&
      contemTexto(filtro.busca, fornecedor.nomeEmpresa, fornecedor.responsavel),
  )
}

function compararRotulos(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
}

export function agruparPorCategoria<T extends FornecedorResumoDto>(lista: T[]): GrupoFornecedores<T>[] {
  const grupos = new Map<CategoriaFornecedor, T[]>()
  for (const fornecedor of lista) {
    const grupo = grupos.get(fornecedor.categoria) ?? []
    grupo.push(fornecedor)
    grupos.set(fornecedor.categoria, grupo)
  }
  return [...grupos.entries()]
    .map(([categoria, fornecedores]) => ({
      categoria,
      rotulo: ROTULOS_CATEGORIA_FORNECEDOR[categoria],
      fornecedores: [...fornecedores].sort((a, b) => compararRotulos(a.nomeEmpresa, b.nomeEmpresa)),
    }))
    .sort((a, b) => compararRotulos(a.rotulo, b.rotulo))
}

export function contarPorCategoria(lista: FornecedorResumoDto[]): ContagemCategoria[] {
  return agruparPorCategoria(lista).map((grupo) => ({
    chave: grupo.categoria,
    rotulo: grupo.rotulo,
    quantidade: grupo.fornecedores.length,
  }))
}

export function opcoesCategorias(): { valor: CategoriaFornecedor; rotulo: string }[] {
  return (Object.keys(ROTULOS_CATEGORIA_FORNECEDOR) as CategoriaFornecedor[])
    .map((valor) => ({ valor, rotulo: ROTULOS_CATEGORIA_FORNECEDOR[valor] }))
    .sort((a, b) => compararRotulos(a.rotulo, b.rotulo))
}

export function normalizarSite(valor: string | null | undefined): string | null {
  const texto = textoOuVazio(valor)
  if (texto === '' || texto.length > LIMITES_FORNECEDOR.siteMaximo || /\s/.test(texto)) {
    return null
  }
  let completo = texto
  if (!texto.includes('://')) {
    if (PADRAO_ESQUEMA.test(texto)) {
      return null
    }
    completo = `${PREFIXO_SEGURO}${texto}`
  }
  let endereco: URL
  try {
    endereco = new URL(completo)
  } catch {
    return null
  }
  const host = endereco.hostname
  if (
    (endereco.protocol !== 'http:' && endereco.protocol !== 'https:') ||
    endereco.username !== '' ||
    endereco.password !== '' ||
    !host.includes('.') ||
    host.startsWith('.') ||
    host.endsWith('.') ||
    host.startsWith('[') ||
    PADRAO_IPV4.test(host) ||
    completo.length > LIMITES_FORNECEDOR.siteMaximo
  ) {
    return null
  }
  return completo
}

export function siteValido(valor: string | null | undefined): boolean {
  return textoOuVazio(valor) === '' || normalizarSite(valor) !== null
}

export function normalizarInstagram(valor: string | null | undefined): string | null {
  const texto = textoOuVazio(valor)
  if (texto === '' || texto.length > LIMITES_FORNECEDOR.instagramEntradaMaxima) {
    return null
  }
  const endereco = PADRAO_ENDERECO_INSTAGRAM.exec(texto)
  const usuario = endereco ? (endereco[1] ?? '') : texto.replace(/^@+/, '')
  return PADRAO_USUARIO_INSTAGRAM.test(usuario) ? usuario.toLowerCase() : null
}

export function instagramValido(valor: string | null | undefined): boolean {
  return textoOuVazio(valor) === '' || normalizarInstagram(valor) !== null
}

export function urlSite(site: string | null | undefined): string | null {
  return normalizarSite(site)
}

export function exibirSite(site: string | null | undefined): string {
  const url = normalizarSite(site)
  if (!url) {
    return ''
  }
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
}

export function urlInstagram(instagram: string | null | undefined): string | null {
  const usuario = normalizarInstagram(instagram)
  return usuario ? `${URL_INSTAGRAM}${encodeURIComponent(usuario)}/` : null
}

export function exibirInstagram(instagram: string | null | undefined): string {
  const usuario = normalizarInstagram(instagram)
  return usuario ? `@${usuario}` : ''
}

export function urlTelefone(telefone: string | null | undefined): string | null {
  if (textoOuVazio(telefone) === '' || !telefoneValido(telefone)) {
    return null
  }
  const normalizado = normalizarTelefone(telefone)
  return normalizado ? `tel:${normalizado}` : null
}

export function urlWhatsapp(telefone: string | null | undefined): string | null {
  if (textoOuVazio(telefone) === '' || !telefoneValido(telefone)) {
    return null
  }
  const numero = telefoneWhatsApp(telefone)
  return numero ? `${URL_WHATSAPP}${numero}` : null
}

export function urlEmail(email: string | null | undefined): string | null {
  const texto = textoOuVazio(email)
  return PADRAO_EMAIL_LINK.test(texto) ? `mailto:${texto}` : null
}

export function possuiContato(contato: ContatoFornecedor): boolean {
  return Boolean(
    urlTelefone(contato.telefone) || urlEmail(contato.email) || urlSite(contato.site) || urlInstagram(contato.instagram),
  )
}

export const regraSite: RegraValidacao = (valor) =>
  siteValido(typeof valor === 'string' ? valor : null) ? null : TEXTOS_FORNECEDORES.erroSite

export const regraInstagram: RegraValidacao = (valor) =>
  instagramValido(typeof valor === 'string' ? valor : null) ? null : TEXTOS_FORNECEDORES.erroInstagram

export const regraTelefone: RegraValidacao = (valor) =>
  telefoneValido(typeof valor === 'string' ? valor : null) ? null : TEXTOS_FORNECEDORES.erroTelefone

export const regraNomeEmpresa: RegraValidacao = (valor) => {
  const texto = (typeof valor === 'string' ? valor : '').trim().replace(/\s+/g, ' ')
  if (texto === '') {
    return TEXTOS_FORNECEDORES.erroEmpresaObrigatoria
  }
  return texto.length < LIMITES_FORNECEDOR.nomeEmpresaMinimo || texto.length > LIMITES_FORNECEDOR.nomeEmpresaMaximo
    ? TEXTOS_FORNECEDORES.erroEmpresaTamanho
    : null
}

export const regraCategoria: RegraValidacao = (valor) =>
  typeof valor === 'string' && valor in ROTULOS_CATEGORIA_FORNECEDOR ? null : TEXTOS_FORNECEDORES.erroCategoria

export function regraTamanho(limite: number, mensagem: string): RegraValidacao {
  return (valor) => ((typeof valor === 'string' ? valor : '').trim().length > limite ? mensagem : null)
}
