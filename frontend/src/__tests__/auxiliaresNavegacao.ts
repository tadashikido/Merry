import { expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { Router, RouteRecordRaw } from 'vue-router'

const CICLOS_PADRAO = 100
const agendarMacrotarefa = globalThis.setTimeout.bind(globalThis)
const navegacoesPendentes = new Set<Promise<unknown>>()

function localizarRota(lista: readonly RouteRecordRaw[], nome: string): RouteRecordRaw | undefined {
  for (const registro of lista) {
    if (registro.name === nome) {
      return registro
    }
    const filho = registro.children ? localizarRota(registro.children, nome) : undefined
    if (filho) {
      return filho
    }
  }
  return undefined
}

export async function precarregarRotas(...nomes: string[]): Promise<void> {
  const { rotas } = await import('@/router')
  await Promise.all(
    nomes.map(async (nome) => {
      const registro = localizarRota(rotas, nome)
      if (!registro) {
        throw new Error(`Rota "${nome}" não existe no roteador.`)
      }
      const componente: unknown = 'component' in registro ? registro.component : undefined
      if (typeof componente === 'function') {
        await (componente as () => Promise<unknown>)()
      }
    }),
  )
}

function registrarNavegacao<T>(navegacao: Promise<T>): Promise<T> {
  navegacoesPendentes.add(navegacao)
  const remover = () => {
    navegacoesPendentes.delete(navegacao)
  }
  navegacao.then(remover, remover)
  return navegacao
}

export function rastrearNavegacoes(roteador: Router): Router {
  const push = roteador.push.bind(roteador)
  const replace = roteador.replace.bind(roteador)
  roteador.push = (destino) => registrarNavegacao(push(destino))
  roteador.replace = (destino) => registrarNavegacao(replace(destino))
  return roteador
}

async function avancarCiclo(): Promise<void> {
  while (navegacoesPendentes.size > 0) {
    await Promise.allSettled([...navegacoesPendentes])
  }
  await new Promise<void>((resolver) => agendarMacrotarefa(resolver, 0))
  await flushPromises()
}

export async function aguardarAte(verificacao: () => void, ciclos = CICLOS_PADRAO): Promise<void> {
  for (let ciclo = 0; ; ciclo++) {
    try {
      verificacao()
      return
    } catch (erro) {
      if (ciclo >= ciclos) {
        throw erro
      }
    }
    await avancarCiclo()
  }
}

export async function aguardarRota(roteador: Router, nome: string): Promise<void> {
  await aguardarAte(() => expect(roteador.currentRoute.value.name).toBe(nome))
}
