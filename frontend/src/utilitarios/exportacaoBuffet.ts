import { TEXTOS_CSV_BUFFET } from '@/textos/confirmacoes'
import { ROTULOS_TIPO_RESTRICAO } from '@/textos/dadosSensiveis'
import type { ExportacaoBuffetDto, PessoaBuffetDto } from '@/tipos/confirmacoes'
import { gerarCsv } from '@/utilitarios/csv'
import { formatarDataCalendario, formatarDataHora, formatarNomesCasal } from '@/utilitarios/formatacao'

type Celula = string | number

const TAMANHO_MAXIMO_SEGMENTO = 60

export function descreverRestricoes(pessoa: Pick<PessoaBuffetDto, 'tipos' | 'outraRestricao'>): string {
  const partes: string[] = pessoa.tipos.map((tipo) => ROTULOS_TIPO_RESTRICAO[tipo] ?? tipo)
  if (pessoa.outraRestricao) {
    partes.push(pessoa.outraRestricao)
  }
  return partes.join(', ')
}

export function linhasCsvBuffet(exportacao: ExportacaoBuffetDto): Celula[][] {
  const { casamento, confirmados, restricoes } = exportacao
  const largura = TEXTOS_CSV_BUFFET.cabecalhoLista.length
  const linhas: Celula[][] = [
    [TEXTOS_CSV_BUFFET.casamento, formatarNomesCasal(casamento.nomePrimeiraPessoa, casamento.nomeSegundaPessoa)],
    [TEXTOS_CSV_BUFFET.data, formatarDataCalendario(casamento.data)],
    [TEXTOS_CSV_BUFFET.horario, casamento.horario ?? ''],
    [TEXTOS_CSV_BUFFET.local, casamento.localRecepcao ?? ''],
    [TEXTOS_CSV_BUFFET.geradoEm, formatarDataHora(exportacao.geradoEm)],
    [TEXTOS_CSV_BUFFET.aviso],
    [],
    [TEXTOS_CSV_BUFFET.contagem, TEXTOS_CSV_BUFFET.quantidade],
    [TEXTOS_CSV_BUFFET.adultos, confirmados.adultos],
    [TEXTOS_CSV_BUFFET.criancas, confirmados.criancas],
    [TEXTOS_CSV_BUFFET.total, confirmados.total],
    [TEXTOS_CSV_BUFFET.pendentes, exportacao.pendentes],
    [],
    [TEXTOS_CSV_BUFFET.restricao, TEXTOS_CSV_BUFFET.quantidade],
    ...restricoes.porTipo.map((contagem): Celula[] => [ROTULOS_TIPO_RESTRICAO[contagem.tipo] ?? contagem.tipo, contagem.quantidade]),
    [TEXTOS_CSV_BUFFET.outrasRestricoes, restricoes.outrasRestricoes],
    [TEXTOS_CSV_BUFFET.necessidadesEspeciais, restricoes.necessidadesEspeciais],
    [],
    [...TEXTOS_CSV_BUFFET.cabecalhoLista],
    ...exportacao.convites.flatMap((convite) =>
      convite.pessoas.map((pessoa): Celula[] => [
        convite.nome,
        pessoa.nome,
        pessoa.faixaEtaria === 'Crianca' ? TEXTOS_CSV_BUFFET.crianca : TEXTOS_CSV_BUFFET.adulto,
        pessoa.acompanhante ? TEXTOS_CSV_BUFFET.sim : TEXTOS_CSV_BUFFET.nao,
        descreverRestricoes(pessoa),
        pessoa.necessidadeEspecial ?? '',
      ]),
    ),
  ]
  return linhas.map((linha) => [...linha, ...Array.from({ length: Math.max(0, largura - linha.length) }, () => '')])
}

export function gerarCsvBuffet(exportacao: ExportacaoBuffetDto): string {
  const [primeira, ...demais] = linhasCsvBuffet(exportacao)
  return gerarCsv((primeira ?? []).map(String), demais)
}

function segmento(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, TAMANHO_MAXIMO_SEGMENTO)
}

export function nomeArquivoBuffet(exportacao: Pick<ExportacaoBuffetDto, 'casamento'>): string {
  const { nomePrimeiraPessoa, nomeSegundaPessoa, data } = exportacao.casamento
  const casal = [segmento(nomePrimeiraPessoa), segmento(nomeSegundaPessoa)].filter(Boolean).join('-e-')
  const dataSegura = /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : 'sem-data'
  return `buffet-${casal || 'casamento'}-${dataSegura}.csv`
}
