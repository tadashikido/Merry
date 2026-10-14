import type { ConvidadoDto, ConviteDto, RespostaRsvp } from '@/tipos/convidados'
import { contemTexto, normalizarParaBusca } from '@/utilitarios/busca'
import { formatarTelefone } from '@/utilitarios/telefone'

export const GRUPO_TODOS = '__todos__'
export const GRUPO_NENHUM = '__sem_grupo__'

export interface FiltrosConvidados {
  busca: string
  grupo: string
  resposta: RespostaRsvp | null
}

export interface ConviteFiltrado {
  convite: ConviteDto
  convidadosVisiveis: ConvidadoDto[]
  convidadosOcultos: number
}

export interface OpcaoGrupo {
  chave: string
  rotulo: string
}

export function chaveGrupo(grupo: string | null | undefined): string {
  const normalizado = normalizarParaBusca(grupo).replace(/\s+/g, ' ')
  return normalizado === '' ? GRUPO_NENHUM : normalizado
}

export function listarGrupos(convites: ConviteDto[]): { grupos: OpcaoGrupo[]; temSemGrupo: boolean } {
  const grupos = new Map<string, string>()
  let temSemGrupo = false

  for (const convite of convites) {
    const chave = chaveGrupo(convite.grupo)
    if (chave === GRUPO_NENHUM) {
      temSemGrupo = true
    } else if (!grupos.has(chave) && convite.grupo) {
      grupos.set(chave, convite.grupo)
    }
  }

  const ordenados = [...grupos.entries()]
    .map(([chave, rotulo]) => ({ chave, rotulo }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR', { sensitivity: 'base' }))

  return { grupos: ordenados, temSemGrupo }
}

function convidadoCorrespondeBusca(convidado: ConvidadoDto, busca: string): boolean {
  return contemTexto(busca, convidado.nome, convidado.email, convidado.telefone, formatarTelefone(convidado.telefone))
}

export function filtrosAtivos(filtros: FiltrosConvidados): boolean {
  return filtros.busca.trim() !== '' || filtros.grupo !== GRUPO_TODOS || filtros.resposta !== null
}

export function filtrarConvites(convites: ConviteDto[], filtros: FiltrosConvidados): ConviteFiltrado[] {
  const resultado: ConviteFiltrado[] = []

  for (const convite of convites) {
    if (filtros.grupo !== GRUPO_TODOS && chaveGrupo(convite.grupo) !== filtros.grupo) {
      continue
    }

    const porResposta = filtros.resposta === null
      ? convite.convidados
      : convite.convidados.filter((convidado) => convidado.resposta === filtros.resposta)

    if (porResposta.length === 0) {
      continue
    }

    const buscaNoConvite = filtros.busca.trim() !== '' && contemTexto(filtros.busca, convite.nome)
    const visiveis = buscaNoConvite
      ? porResposta
      : porResposta.filter((convidado) => convidadoCorrespondeBusca(convidado, filtros.busca))

    if (visiveis.length === 0) {
      continue
    }

    const convidadosVisiveis = filtros.resposta === null ? convite.convidados : visiveis

    resultado.push({
      convite,
      convidadosVisiveis,
      convidadosOcultos: convite.convidados.length - convidadosVisiveis.length,
    })
  }

  return resultado
}
