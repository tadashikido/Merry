import { CABECALHO_CSV_MESAS, TEXTOS_MESAS } from '@/textos/mesas'
import type { MapaMesasDto } from '@/tipos/mesas'
import { gerarCsv } from '@/utilitarios/csv'
import { nomeArquivoBuffet } from '@/utilitarios/exportacaoBuffet'
import { mesasComPessoas, rotuloMesa } from '@/utilitarios/mesas'

type Celula = string | number

const PREFIXO_BUFFET = 'buffet-'

export interface EventoArquivo {
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string | null
  data: string
}

export function linhasCsvMesas(mapa: MapaMesasDto, rotuloEspecial?: string): Celula[][] {
  const linhas: Celula[][] = []
  for (const { mesa, pessoas } of mesasComPessoas(mapa.mesas, mapa.pessoas, mapa.pessoas)) {
    const rotulo = rotuloMesa(mesa, rotuloEspecial)
    if (pessoas.length === 0) {
      linhas.push([rotulo, mesa.capacidade, '', '', '', ''])
      continue
    }
    for (const pessoa of pessoas) {
      linhas.push([
        rotulo,
        mesa.capacidade,
        pessoa.nome,
        pessoa.convite,
        pessoa.faixaEtaria === 'Crianca' ? TEXTOS_MESAS.crianca : 'Adulto',
        pessoa.acompanhante ? 'Sim' : 'Não',
      ])
    }
  }
  for (const pessoa of mapa.pessoas.filter((item) => item.mesaId === null)) {
    linhas.push([
      TEXTOS_MESAS.semMesa,
      '',
      pessoa.nome,
      pessoa.convite,
      pessoa.faixaEtaria === 'Crianca' ? TEXTOS_MESAS.crianca : 'Adulto',
      pessoa.acompanhante ? 'Sim' : 'Não',
    ])
  }
  return linhas
}

export function gerarCsvMesas(mapa: MapaMesasDto, rotuloEspecial?: string): string {
  return gerarCsv(CABECALHO_CSV_MESAS, linhasCsvMesas(mapa, rotuloEspecial))
}

export function nomeArquivoMesas(evento: EventoArquivo): string {
  return `mesas-${nomeArquivoBuffet({ evento: { ...evento, horario: null, localRecepcao: null } }).slice(PREFIXO_BUFFET.length)}`
}
