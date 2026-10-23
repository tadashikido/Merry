import { gruposSugeridos } from '@/textos/convidados'
import type { ConviteDto } from '@/tipos/convidados'
import type { TipoEvento } from '@/tipos/eventos'
import { contarConvitesPorGrupo } from '@/utilitarios/acompanhamentoConvites'
import { GRUPO_NENHUM, chaveGrupo, listarGrupos } from '@/utilitarios/filtroConvidados'

export function sugestoesDeGrupo(convites: readonly ConviteDto[], tipo: TipoEvento | null | undefined): string[] {
  const usados = listarGrupos([...convites]).grupos
  const chaves = new Set(usados.map((grupo) => grupo.chave))
  const sugestoes = usados.map((grupo) => grupo.rotulo)
  for (const sugerido of gruposSugeridos(tipo)) {
    const chave = chaveGrupo(sugerido)
    if (!chaves.has(chave)) {
      chaves.add(chave)
      sugestoes.push(sugerido)
    }
  }
  return sugestoes
}

export interface GrupoExistente {
  rotulo: string
  quantidade: number
}

export function outrosConvitesNoGrupo(
  convites: readonly ConviteDto[],
  grupo: string,
  conviteIdAtual: string | null = null,
): GrupoExistente | null {
  const chave = chaveGrupo(grupo)
  if (chave === GRUPO_NENHUM) {
    return null
  }
  const outros = convites.filter((convite) => convite.id !== conviteIdAtual)
  const quantidade = contarConvitesPorGrupo(outros).get(chave) ?? 0
  if (quantidade === 0) {
    return null
  }
  const rotulo = listarGrupos(outros).grupos.find((opcao) => opcao.chave === chave)?.rotulo ?? grupo.trim()
  return { rotulo, quantidade }
}
