import {
  ROTULOS_TIPO_RESTRICAO,
  TAMANHO_MAXIMO_NECESSIDADE_ESPECIAL,
  TAMANHO_MAXIMO_OUTRA_RESTRICAO,
  TEXTOS_DADOS_SENSIVEIS,
} from '@/textos/dadosSensiveis'
import type {
  RestricaoAlimentarRequest,
  RestricaoPessoaFormulario,
  TipoRestricaoAlimentar,
} from '@/tipos/dadosSensiveis'

export function restricaoVazia(): RestricaoPessoaFormulario {
  return { situacao: 'manter', tipos: [], outraRestricao: '', necessidadeEspecial: '' }
}

export function normalizarTextoLivre(valor: string): string {
  return valor.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim()
}

export function temConteudo(restricao: RestricaoPessoaFormulario): boolean {
  return (
    restricao.tipos.length > 0 ||
    normalizarTextoLivre(restricao.outraRestricao).length > 0 ||
    normalizarTextoLivre(restricao.necessidadeEspecial).length > 0
  )
}

export function informaConteudo(restricao: RestricaoPessoaFormulario): boolean {
  return restricao.situacao === 'informar' && temConteudo(restricao)
}

export function validarRestricao(restricao: RestricaoPessoaFormulario): string | null {
  if (normalizarTextoLivre(restricao.outraRestricao).length > TAMANHO_MAXIMO_OUTRA_RESTRICAO) {
    return TEXTOS_DADOS_SENSIVEIS.erroOutraLonga
  }
  if (normalizarTextoLivre(restricao.necessidadeEspecial).length > TAMANHO_MAXIMO_NECESSIDADE_ESPECIAL) {
    return TEXTOS_DADOS_SENSIVEIS.erroNecessidadeLonga
  }
  return null
}

export function conteudoRestricao(restricao: RestricaoPessoaFormulario): RestricaoAlimentarRequest {
  const outra = normalizarTextoLivre(restricao.outraRestricao)
  const necessidade = normalizarTextoLivre(restricao.necessidadeEspecial)
  return {
    tipos: [...restricao.tipos],
    outraRestricao: outra.length > 0 ? outra : null,
    necessidadeEspecial: necessidade.length > 0 ? necessidade : null,
  }
}

export function restricaoParaEnvio(restricao: RestricaoPessoaFormulario): RestricaoAlimentarRequest | undefined {
  if (restricao.situacao === 'remover') {
    return { tipos: [], outraRestricao: null, necessidadeEspecial: null }
  }
  if (informaConteudo(restricao)) {
    return conteudoRestricao(restricao)
  }
  return undefined
}

export function alternarTipo(
  tipos: readonly TipoRestricaoAlimentar[],
  tipo: TipoRestricaoAlimentar,
): TipoRestricaoAlimentar[] {
  return tipos.includes(tipo) ? tipos.filter((atual) => atual !== tipo) : [...tipos, tipo]
}

export function descreverTipos(tipos: readonly TipoRestricaoAlimentar[], outra: string | null): string {
  const partes = tipos.map((tipo) => ROTULOS_TIPO_RESTRICAO[tipo])
  if (outra) {
    partes.push(outra)
  }
  return partes.length > 0 ? partes.join(', ') : TEXTOS_DADOS_SENSIVEIS.nenhuma
}
