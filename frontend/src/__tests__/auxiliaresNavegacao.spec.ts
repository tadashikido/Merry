import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'

import { aguardarAte, aguardarRota, precarregarRotas, rastrearNavegacoes } from '@/__tests__/auxiliaresNavegacao'

await precarregarRotas('evento', 'entrar', 'evento-convidados')

const Pagina = defineComponent({ render: () => h('main') })

function criarRoteador(rotasTeste: RouteRecordRaw[]) {
  return rastrearNavegacoes(createRouter({ history: createMemoryHistory(), routes: rotasTeste }))
}

function promessaControlada<T>() {
  let resolver!: (valor: T) => void
  const promessa = new Promise<T>((resolucao) => {
    resolver = resolucao
  })
  return { promessa, resolver }
}

describe('auxiliaresNavegacao', () => {
  it('[UNITÁRIO] aguardarRota espera a navegação para rota lazy terminar, sem depender de tempo', async () => {
    const carregamento = promessaControlada<typeof Pagina>()
    const roteador = criarRoteador([
      { path: '/', name: 'origem', component: Pagina },
      { path: '/destino', name: 'destino', component: () => carregamento.promessa },
    ])
    await roteador.push('/')

    void roteador.push('/destino')
    const espera = aguardarRota(roteador, 'destino')
    let concluiu = false
    void espera.then(() => {
      concluiu = true
    })
    await new Promise<void>((resolver) => setTimeout(resolver, 20))
    expect(concluiu).toBe(false)
    expect(roteador.currentRoute.value.name).toBe('origem')

    carregamento.resolver(Pagina)
    await espera

    expect(roteador.currentRoute.value.name).toBe('destino')
  })

  it('[UNITÁRIO] aguardarRota acompanha redirecionamento feito por guarda', async () => {
    const roteador = criarRoteador([
      { path: '/', name: 'inicio', component: Pagina },
      { path: '/restrita', name: 'restrita', component: Pagina },
      { path: '/entrar', name: 'entrar', component: () => Promise.resolve(Pagina) },
    ])
    roteador.beforeEach((destino) => (destino.name === 'restrita' ? { name: 'entrar' } : true))
    await roteador.push('/')

    void roteador.push('/restrita')

    await aguardarRota(roteador, 'entrar')
  })

  it('[UNITÁRIO] aguardarRota falha mostrando a rota atual quando a navegação não acontece', async () => {
    const roteador = criarRoteador([
      { path: '/', name: 'inicio', component: Pagina },
      { path: '/outra', name: 'outra', component: Pagina },
    ])
    await roteador.push('/')

    await expect(aguardarRota(roteador, 'outra')).rejects.toThrow("expected 'inicio' to be 'outra'")
  })

  it('[UNITÁRIO] aguardarAte repete a verificação a cada ciclo até a condição valer', async () => {
    const estado = { pronto: false }
    void Promise.resolve()
      .then(() => new Promise<void>((resolver) => setTimeout(resolver, 0)))
      .then(() => {
        estado.pronto = true
      })

    await aguardarAte(() => expect(estado.pronto).toBe(true))
  })

  it('[UNITÁRIO] aguardarAte desiste depois do limite de ciclos com o último erro da asserção', async () => {
    const verificacao = vi.fn(() => expect(1).toBe(2))

    await expect(aguardarAte(verificacao, 3)).rejects.toThrow('expected 1 to be 2')
    expect(verificacao).toHaveBeenCalledTimes(4)
  })

  it('[UNITÁRIO] aguardarAte continua funcionando com fake timers ligados', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const estado = { pronto: false }
      void Promise.resolve().then(() => {
        estado.pronto = true
      })

      await aguardarAte(() => expect(estado.pronto).toBe(true))
    } finally {
      vi.useRealTimers()
    }
  })

  it('[UNITÁRIO] rastrearNavegacoes devolve a mesma promessa do push original', async () => {
    const roteador = criarRoteador([{ path: '/', name: 'inicio', component: Pagina }])

    const falha = await roteador.push('/')
    const repetida = await roteador.push('/')

    expect(falha).toBeUndefined()
    expect(repetida).toBeDefined()
    expect(roteador.currentRoute.value.name).toBe('inicio')
  })

  it('[UNITÁRIO] precarregarRotas aceita rotas aninhadas e rotas sem carregamento lazy do roteador real', async () => {
    await expect(precarregarRotas('evento-convidados', 'inicio')).resolves.toBeUndefined()
  })

  it('[SEGURANÇA] precarregarRotas recusa nome de rota que não existe, para a lista não apodrecer', async () => {
    await expect(precarregarRotas('rota-que-nao-existe')).rejects.toThrow('Rota "rota-que-nao-existe" não existe no roteador.')
  })
})
