import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { aguardarAte } from '@/__tests__/auxiliaresNavegacao'
import { useExclusoesAdiadasStore } from '@/stores/exclusoesAdiadas'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useExclusoesAdiadasStore', () => {
  it('[UNITÁRIO] agenda a exclusão e lista as chaves pendentes só do escopo pedido', () => {
    const store = useExclusoesAdiadasStore()
    store.agendar({ escopo: 'mesas:a', chave: 'm1', efetivar: vi.fn(async () => true) })
    store.agendar({ escopo: 'mesas:b', chave: 'm2', efetivar: vi.fn(async () => true) })

    expect(store.pendente('mesas:a', 'm1')).toBe(true)
    expect([...store.chavesPendentes('mesas:a')]).toEqual(['m1'])
    expect([...store.chavesPendentes('convites:a')]).toEqual([])
  })

  it('[UNITÁRIO] desfazer cancela sem efetivar e um segundo desfazer não tem efeito', async () => {
    const store = useExclusoesAdiadasStore()
    const efetivar = vi.fn(async () => true)
    store.agendar({ escopo: 'convites:a', chave: 'c1', efetivar })

    expect(store.desfazer('convites:a', 'c1')).toBe(true)
    expect(store.desfazer('convites:a', 'c1')).toBe(false)
    await store.efetivar('convites:a', 'c1')

    expect(efetivar).not.toHaveBeenCalled()
    expect(store.pendente('convites:a', 'c1')).toBe(false)
  })

  it('[UNITÁRIO] efetivar é idempotente mesmo com gatilhos simultâneos', async () => {
    const store = useExclusoesAdiadasStore()
    const efetivar = vi.fn(async () => true)
    store.agendar({ escopo: 'cronograma:a', chave: 'i1', efetivar })

    await Promise.all([store.efetivar('cronograma:a', 'i1'), store.efetivar('cronograma:a', 'i1'), store.efetivarTodas()])

    expect(efetivar).toHaveBeenCalledTimes(1)
    expect(store.desfazer('cronograma:a', 'i1')).toBe(false)
  })

  it('[UNITÁRIO] efetivarEscopo conclui só as pendências do escopo', async () => {
    const store = useExclusoesAdiadasStore()
    const doEscopo = vi.fn(async () => true)
    const outro = vi.fn(async () => true)
    store.agendar({ escopo: 'mesas:a', chave: 'm1', efetivar: doEscopo })
    store.agendar({ escopo: 'mesas:b', chave: 'm2', efetivar: outro })

    await store.efetivarEscopo('mesas:a')

    expect(doEscopo).toHaveBeenCalledTimes(1)
    expect(outro).not.toHaveBeenCalled()
    expect(store.pendente('mesas:b', 'm2')).toBe(true)
  })

  it('[UNITÁRIO] simula falha de rede: chama aoFalhar quando a efetivação falha ou lança erro', async () => {
    const store = useExclusoesAdiadasStore()
    const aoFalharRetorno = vi.fn()
    const aoFalharErro = vi.fn()
    const aoFalharSucesso = vi.fn()
    store.agendar({ escopo: 'x', chave: '1', efetivar: async () => false, aoFalhar: aoFalharRetorno })
    store.agendar({ escopo: 'x', chave: '2', efetivar: async () => Promise.reject(new Error('rede')), aoFalhar: aoFalharErro })
    store.agendar({ escopo: 'x', chave: '3', efetivar: async () => true, aoFalhar: aoFalharSucesso })

    await store.efetivarEscopo('x')

    expect(aoFalharRetorno).toHaveBeenCalledTimes(1)
    expect(aoFalharErro).toHaveBeenCalledTimes(1)
    expect(aoFalharSucesso).not.toHaveBeenCalled()
  })

  it('[UNITÁRIO] ao sair da página efetiva todas as pendências', async () => {
    const store = useExclusoesAdiadasStore()
    const efetivar = vi.fn(async () => true)
    store.agendar({ escopo: 'convites:a', chave: 'c1', efetivar })

    window.dispatchEvent(new Event('pagehide'))
    await aguardarAte(() => expect(efetivar).toHaveBeenCalledTimes(1))
    expect(store.pendente('convites:a', 'c1')).toBe(false)
  })
})
