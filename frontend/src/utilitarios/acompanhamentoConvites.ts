import type { ConviteDto } from '@/tipos/convidados'
import { GRUPO_NENHUM, chaveGrupo, listarGrupos, type OpcaoGrupo } from '@/utilitarios/filtroConvidados'

export interface ResumoEnvioConvites {
  aEnviar: number
  aguardando: number
  respondidos: number
  total: number
}

function temPendente(convite: ConviteDto): boolean {
  return convite.convidados.some((convidado) => convidado.resposta === 'Pendente')
}

export function resumirEnvio(convites: readonly ConviteDto[]): ResumoEnvioConvites {
  const resumo: ResumoEnvioConvites = { aEnviar: 0, aguardando: 0, respondidos: 0, total: convites.length }
  for (const convite of convites) {
    if (!temPendente(convite)) {
      resumo.respondidos += 1
    } else if (convite.statusEnvio === 'NaoEnviado') {
      resumo.aEnviar += 1
    } else {
      resumo.aguardando += 1
    }
  }
  return resumo
}

export function contarConvitesPorGrupo(convites: readonly ConviteDto[]): Map<string, number> {
  const contagem = new Map<string, number>()
  for (const convite of convites) {
    const chave = chaveGrupo(convite.grupo)
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
  }
  return contagem
}

export function gruposSemEnvio(convites: readonly ConviteDto[]): OpcaoGrupo[] {
  const comEnvio = new Set<string>()
  for (const convite of convites) {
    if (convite.statusEnvio !== 'NaoEnviado') {
      comEnvio.add(chaveGrupo(convite.grupo))
    }
  }
  return listarGrupos([...convites]).grupos.filter((grupo) => grupo.chave !== GRUPO_NENHUM && !comEnvio.has(grupo.chave))
}

export function temConviteSemGrupo(convites: readonly ConviteDto[]): boolean {
  return convites.some((convite) => chaveGrupo(convite.grupo) === GRUPO_NENHUM)
}
