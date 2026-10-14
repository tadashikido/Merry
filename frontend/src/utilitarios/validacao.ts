export type RegraValidacao<V = unknown> = (valor: V) => string | null

const PADRAO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PADRAO_LETRA = /\p{L}/u
const PADRAO_NUMERO = /\p{Nd}/u

export const LIMITES_SENHA = {
  minimo: 10,
  maximo: 128,
} as const

function textoDe(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return ''
  }
  return typeof valor === 'string' ? valor : String(valor)
}

export const MENSAGENS_VALIDACAO = {
  obrigatorio: 'Preencha este campo.',
  email: 'Informe um e-mail válido, como nome@exemplo.com.',
  tamanhoMaximo: (limite: number) => `Use no máximo ${limite} caracteres.`,
  tamanhoMinimo: (limite: number) => `Use pelo menos ${limite} caracteres.`,
  senhaFraca: 'Use 10 caracteres ou mais, com pelo menos uma letra e um número.',
  senhaIgualEmail: 'A senha não pode ser igual ao e-mail.',
  senhasDiferentes: 'As senhas não são iguais. Digite a mesma senha nos dois campos.',
} as const

export const obrigatorio: RegraValidacao = (valor) =>
  textoDe(valor).trim() === '' ? MENSAGENS_VALIDACAO.obrigatorio : null

export const email: RegraValidacao = (valor) => {
  const texto = textoDe(valor).trim()
  return texto === '' || PADRAO_EMAIL.test(texto) ? null : MENSAGENS_VALIDACAO.email
}

export function tamanhoMaximo(limite: number): RegraValidacao {
  return (valor) => (textoDe(valor).length > limite ? MENSAGENS_VALIDACAO.tamanhoMaximo(limite) : null)
}

export function tamanhoMinimo(limite: number): RegraValidacao {
  return (valor) => {
    const texto = textoDe(valor)
    return texto !== '' && texto.length < limite ? MENSAGENS_VALIDACAO.tamanhoMinimo(limite) : null
  }
}

export interface RequisitosSenha {
  tamanho: boolean
  letra: boolean
  numero: boolean
}

export function avaliarRequisitosSenha(senha: string): RequisitosSenha {
  return {
    tamanho: senha.length >= LIMITES_SENHA.minimo,
    letra: PADRAO_LETRA.test(senha),
    numero: PADRAO_NUMERO.test(senha),
  }
}

export function senhaForte(obterEmail?: () => string): RegraValidacao {
  return (valor) => {
    const senha = textoDe(valor)
    if (senha === '') {
      return null
    }
    if (senha.length > LIMITES_SENHA.maximo) {
      return MENSAGENS_VALIDACAO.tamanhoMaximo(LIMITES_SENHA.maximo)
    }
    const requisitos = avaliarRequisitosSenha(senha)
    if (!requisitos.tamanho || !requisitos.letra || !requisitos.numero) {
      return MENSAGENS_VALIDACAO.senhaFraca
    }
    const emailInformado = obterEmail?.().trim().toLowerCase() ?? ''
    if (emailInformado !== '' && senha.trim().toLowerCase() === emailInformado) {
      return MENSAGENS_VALIDACAO.senhaIgualEmail
    }
    return null
  }
}

export function igualA(obterValor: () => unknown, mensagem: string = MENSAGENS_VALIDACAO.senhasDiferentes): RegraValidacao {
  return (valor) => {
    const texto = textoDe(valor)
    return texto === '' || texto === textoDe(obterValor()) ? null : mensagem
  }
}
