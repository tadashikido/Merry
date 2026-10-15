import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface OpcoesExclusaoAdiada {
  escopo: string
  chave: string
  efetivar: () => Promise<boolean>
  aoFalhar?: () => void | Promise<void>
}

function identificador(escopo: string, chave: string): string {
  return `${escopo}|${chave}`
}

export const useExclusoesAdiadasStore = defineStore('exclusoesAdiadas', () => {
  const pendentes = ref(new Map<string, OpcoesExclusaoAdiada>())

  function agendar(opcoes: OpcoesExclusaoAdiada) {
    pendentes.value.set(identificador(opcoes.escopo, opcoes.chave), opcoes)
  }

  function pendente(escopo: string, chave: string): boolean {
    return pendentes.value.has(identificador(escopo, chave))
  }

  function chavesPendentes(escopo: string): Set<string> {
    const chaves = new Set<string>()
    for (const exclusao of pendentes.value.values()) {
      if (exclusao.escopo === escopo) {
        chaves.add(exclusao.chave)
      }
    }
    return chaves
  }

  function desfazer(escopo: string, chave: string): boolean {
    return pendentes.value.delete(identificador(escopo, chave))
  }

  async function executar(exclusao: OpcoesExclusaoAdiada): Promise<void> {
    pendentes.value.delete(identificador(exclusao.escopo, exclusao.chave))
    let sucesso = false
    try {
      sucesso = await exclusao.efetivar()
    } catch {
      sucesso = false
    }
    if (!sucesso) {
      await exclusao.aoFalhar?.()
    }
  }

  async function efetivar(escopo: string, chave: string): Promise<void> {
    const exclusao = pendentes.value.get(identificador(escopo, chave))
    if (!exclusao) {
      return
    }
    await executar(exclusao)
  }

  async function efetivarEscopo(escopo: string): Promise<void> {
    const doEscopo = [...pendentes.value.values()].filter((exclusao) => exclusao.escopo === escopo)
    await Promise.all(doEscopo.map(executar))
  }

  async function efetivarTodas(): Promise<void> {
    await Promise.all([...pendentes.value.values()].map(executar))
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
      void efetivarTodas()
    })
  }

  return { pendentes, agendar, pendente, chavesPendentes, desfazer, efetivar, efetivarEscopo, efetivarTodas }
})
