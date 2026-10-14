import type { ItemContagem } from '@/componentes/base/tipos'
import { ROTULOS_COLUNA_IMPORTACAO, TEXTOS_IMPORTACAO } from '@/textos/importacaoConvidados'
import type { ColunaImportacao, PreVisualizacaoImportacaoDto, ValoresLinhaImportacaoDto } from '@/tipos/importacaoConvidados'
import { gerarCsv } from '@/utilitarios/csv'

export const COLUNAS_MODELO: readonly ColunaImportacao[] = [
  'Convite',
  'Grupo',
  'Nome',
  'Telefone',
  'Email',
  'FaixaEtaria',
  'Acompanhantes',
  'Resposta',
]

const CAMPOS_VALORES: Record<ColunaImportacao, keyof ValoresLinhaImportacaoDto> = {
  Convite: 'convite',
  Grupo: 'grupo',
  Nome: 'nome',
  Telefone: 'telefone',
  Email: 'email',
  FaixaEtaria: 'faixaEtaria',
  Acompanhantes: 'acompanhantes',
  Resposta: 'resposta',
}

const LINHAS_EXEMPLO: readonly (readonly string[])[] = [
  ['Família Exemplo', 'Família da noiva', 'Carla Exemplo (exemplo)', '(11) 98765-4321', 'carla@exemplo.com', 'Adulto', '1', ''],
  ['Família Exemplo', 'Família da noiva', 'Pedro Exemplo (exemplo)', '', '', 'Criança', '1', ''],
  ['', 'Amigos do noivo', 'Marcos Exemplo (exemplo)', '(21) 99876-5432', '', 'Adulto', '0', 'Confirmado'],
]

export function cabecalhoModelo(): string[] {
  return COLUNAS_MODELO.map((coluna) => ROTULOS_COLUNA_IMPORTACAO[coluna])
}

export function modeloImportacaoConvidados(): string {
  return gerarCsv(cabecalhoModelo(), LINHAS_EXEMPLO)
}

export function csvLinhasComProblema(previa: PreVisualizacaoImportacaoDto): string {
  const cabecalho = ['Linha', ...cabecalhoModelo(), 'Problema']
  const linhas = previa.linhasComProblema.map((linha) => [
    String(linha.linha),
    ...COLUNAS_MODELO.map((coluna) => linha.valores[CAMPOS_VALORES[coluna]]),
    linha.problemas
      .map((problema) => (problema.coluna ? `${ROTULOS_COLUNA_IMPORTACAO[problema.coluna]}: ${problema.mensagem}` : problema.mensagem))
      .join(' | '),
  ])
  return gerarCsv(cabecalho, linhas)
}

export function linhasBloqueantes(previa: PreVisualizacaoImportacaoDto): number {
  return previa.linhasComProblema.filter((linha) => linha.problemas.some((problema) => problema.tipo !== 'Aviso')).length
}

export function itensResumoImportacao(previa: PreVisualizacaoImportacaoDto): ItemContagem[] {
  const { resumo } = previa
  return [
    { chave: 'pessoas', valor: resumo.pessoasValidas, rotulo: TEXTOS_IMPORTACAO.rotuloPessoas(resumo.pessoasValidas), destaque: true },
    { chave: 'adultos', valor: resumo.adultosValidos, rotulo: TEXTOS_IMPORTACAO.rotuloAdultos(resumo.adultosValidos) },
    { chave: 'criancas', valor: resumo.criancasValidas, rotulo: TEXTOS_IMPORTACAO.rotuloCriancas(resumo.criancasValidas) },
    { chave: 'convites', valor: resumo.convitesValidos, rotulo: TEXTOS_IMPORTACAO.rotuloConvites(resumo.convitesValidos) },
  ]
}

export function frasePrevia(previa: PreVisualizacaoImportacaoDto): string {
  const { resumo } = previa
  if (resumo.convitesValidos === 0) {
    return TEXTOS_IMPORTACAO.resumoNenhumPronto
  }
  const bloqueantes = linhasBloqueantes(previa)
  return bloqueantes === 0
    ? TEXTOS_IMPORTACAO.resumoTudoPronto(resumo.convitesValidos, resumo.pessoasValidas)
    : TEXTOS_IMPORTACAO.resumoComProblemas(resumo.convitesValidos, resumo.convites, bloqueantes)
}

export function ultrapassaLimite(previa: PreVisualizacaoImportacaoDto): boolean {
  const { resumo } = previa
  return resumo.convidadosExistentes + resumo.pessoasValidas > resumo.limitePorCasamento
}
