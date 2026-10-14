import { describe, expect, it } from 'vitest'

import { TEXTOS_DADOS_SENSIVEIS, VERSAO_TERMO_PRIVACIDADE } from '@/textos/dadosSensiveis'
import type { RestricaoPessoaFormulario } from '@/tipos/dadosSensiveis'
import {
  alternarTipo,
  descreverTipos,
  informaConteudo,
  normalizarTextoLivre,
  restricaoParaEnvio,
  restricaoVazia,
  temConteudo,
  validarRestricao,
} from '@/utilitarios/dadosSensiveis'

function formulario(dados: Partial<RestricaoPessoaFormulario> = {}): RestricaoPessoaFormulario {
  return { ...restricaoVazia(), ...dados }
}

describe('dadosSensiveis', () => {
  it('[UNITÁRIO] versão do termo acompanha o backend', () => {
    expect(VERSAO_TERMO_PRIVACIDADE).toBe('2026-09-29')
  })

  it('[UNITÁRIO] restrição vazia começa mantendo o que existe', () => {
    expect(restricaoVazia()).toEqual({ situacao: 'manter', tipos: [], outraRestricao: '', necessidadeEspecial: '' })
  })

  it('[UNITÁRIO] normaliza espaços e caracteres de controle', () => {
    expect(normalizarTextoLivre('  sem\u0007  porco \n ')).toBe('sem porco')
  })

  it('[UNITÁRIO] detecta conteúdo só com texto útil ou tipos', () => {
    expect(temConteudo(formulario({ outraRestricao: '   ' }))).toBe(false)
    expect(temConteudo(formulario({ tipos: ['Vegana'] }))).toBe(true)
    expect(temConteudo(formulario({ necessidadeEspecial: 'rampa' }))).toBe(true)
    expect(informaConteudo(formulario({ tipos: ['Vegana'] }))).toBe(false)
    expect(informaConteudo(formulario({ situacao: 'informar', tipos: ['Vegana'] }))).toBe(true)
  })

  it('[UNITÁRIO] payload: manter omite, remover envia vazio, informar envia conteúdo normalizado', () => {
    expect(restricaoParaEnvio(formulario())).toBeUndefined()
    expect(restricaoParaEnvio(formulario({ situacao: 'informar' }))).toBeUndefined()
    expect(restricaoParaEnvio(formulario({ situacao: 'remover' }))).toEqual({ tipos: [], outraRestricao: null, necessidadeEspecial: null })
    expect(
      restricaoParaEnvio(formulario({ situacao: 'informar', tipos: ['SemGluten'], outraRestricao: '  sem  porco ', necessidadeEspecial: ' ' })),
    ).toEqual({ tipos: ['SemGluten'], outraRestricao: 'sem porco', necessidadeEspecial: null })
  })

  it('[UNITÁRIO] valida limites depois de normalizar', () => {
    expect(validarRestricao(formulario({ outraRestricao: 'a'.repeat(80) }))).toBeNull()
    expect(validarRestricao(formulario({ outraRestricao: `${'a'.repeat(80)}   ` }))).toBeNull()
    expect(validarRestricao(formulario({ outraRestricao: 'a'.repeat(81) }))).toBe(TEXTOS_DADOS_SENSIVEIS.erroOutraLonga)
    expect(validarRestricao(formulario({ necessidadeEspecial: 'b'.repeat(201) }))).toBe(TEXTOS_DADOS_SENSIVEIS.erroNecessidadeLonga)
  })

  it('[UNITÁRIO] alterna tipos sem repetir', () => {
    expect(alternarTipo([], 'Vegana')).toEqual(['Vegana'])
    expect(alternarTipo(['Vegana', 'SemGluten'], 'Vegana')).toEqual(['SemGluten'])
  })

  it('[UNITÁRIO] descreve tipos com rótulos e outra restrição', () => {
    expect(descreverTipos(['SemGluten', 'AlergiaAmendoimCastanhas'], 'sem porco')).toBe(
      'Sem glúten, Alergia a amendoim ou castanhas, sem porco',
    )
    expect(descreverTipos([], null)).toBe('—')
  })

  it('[UNITÁRIO] textos de privacidade trazem prazo e plural corretos', () => {
    expect(TEXTOS_DADOS_SENSIVEIS.avisoTexto(30)).toContain('Tudo é apagado 30 dias depois do casamento.')
    expect(TEXTOS_DADOS_SENSIVEIS.avisoTexto(1)).toContain('1 dia depois')
    expect(TEXTOS_DADOS_SENSIVEIS.totais(1, 1)).toBe('1 pessoa com restrição, 1 confirmada')
    expect(TEXTOS_DADOS_SENSIVEIS.ilegiveis(2)).toContain('restrições não puderam ser lidas')
  })
})
