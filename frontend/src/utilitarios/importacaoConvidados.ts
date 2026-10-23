import type { ItemContagem } from '@/componentes/base/tipos'
import { gruposSugeridos } from '@/textos/convidados'
import { ROTULOS_COLUNA_IMPORTACAO, TEXTOS_IMPORTACAO } from '@/textos/importacaoConvidados'
import type { TipoEvento } from '@/tipos/eventos'
import type {
  ColunaImportacao,
  ConvitePreVisualizadoDto,
  GrupoImportacao,
  PreVisualizacaoImportacaoDto,
  ResumoGruposImportacao,
  ValoresLinhaImportacaoDto,
} from '@/tipos/importacaoConvidados'
import type { ConviteDto } from '@/tipos/convidados'
import { contarConvitesPorGrupo } from '@/utilitarios/acompanhamentoConvites'
import { gerarCsv } from '@/utilitarios/csv'
import { GRUPO_NENHUM, chaveGrupo, listarGrupos } from '@/utilitarios/filtroConvidados'
import type { GrupoExistente } from '@/utilitarios/gruposConvite'

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

export const MARCADOR_EXEMPLO = '(exemplo)'

function linhasExemplo(tipo: TipoEvento | null | undefined): string[][] {
  const grupos = gruposSugeridos(tipo)
  const primeiro = grupos[0] ?? ''
  const segundo = grupos[1] ?? primeiro
  return [
    ['Família Exemplo', primeiro, `Carla Exemplo ${MARCADOR_EXEMPLO}`, '(11) 98765-4321', 'carla@exemplo.com', 'Adulto', '1', ''],
    ['Família Exemplo', primeiro, `Pedro Exemplo ${MARCADOR_EXEMPLO}`, '', '', 'Criança', '1', ''],
    ['', segundo, `Marcos Exemplo ${MARCADOR_EXEMPLO}`, '(21) 99876-5432', '', 'Adulto', '0', 'Confirmado'],
  ]
}

export function cabecalhoModelo(): string[] {
  return COLUNAS_MODELO.map((coluna) => ROTULOS_COLUNA_IMPORTACAO[coluna])
}

export function modeloImportacaoConvidados(tipo: TipoEvento | null = null): string {
  return gerarCsv(cabecalhoModelo(), linhasExemplo(tipo))
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
  return resumo.convidadosExistentes + resumo.pessoasValidas > resumo.limitePorEvento
}

export function gruposDoEvento(convites: readonly ConviteDto[]): Map<string, GrupoExistente> {
  const contagem = contarConvitesPorGrupo(convites)
  const grupos = new Map<string, GrupoExistente>()
  for (const grupo of listarGrupos([...convites]).grupos) {
    grupos.set(grupo.chave, { rotulo: grupo.rotulo, quantidade: contagem.get(grupo.chave) ?? 0 })
  }
  return grupos
}

export function resumirGruposImportacao(
  convites: readonly ConvitePreVisualizadoDto[],
  existentes: ReadonlyMap<string, GrupoExistente> | null,
): ResumoGruposImportacao {
  const grupos = new Map<string, GrupoImportacao>()
  const semGrupo = { convites: 0, pessoas: 0 }
  for (const convite of convites) {
    if (!convite.valido) {
      continue
    }
    const chave = chaveGrupo(convite.grupo)
    if (chave === GRUPO_NENHUM) {
      semGrupo.convites += 1
      semGrupo.pessoas += convite.pessoas.length
      continue
    }
    const atual = grupos.get(chave)
    if (atual) {
      atual.convites += 1
      atual.pessoas += convite.pessoas.length
      continue
    }
    const doEvento = existentes?.get(chave)
    grupos.set(chave, {
      chave,
      rotulo: doEvento?.rotulo ?? (convite.grupo ?? '').trim(),
      convites: 1,
      pessoas: convite.pessoas.length,
      existentes: existentes ? (doEvento?.quantidade ?? 0) : null,
    })
  }
  const lista = [...grupos.values()].sort(
    (a, b) => b.convites - a.convites || a.rotulo.localeCompare(b.rotulo, 'pt-BR'),
  )
  const jaExistentes = lista.filter((grupo) => (grupo.existentes ?? 0) > 0).length
  return {
    grupos: lista,
    semGrupo,
    comparado: existentes !== null,
    novos: existentes ? lista.length - jaExistentes : 0,
    jaExistentes,
  }
}
