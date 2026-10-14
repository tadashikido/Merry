import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { MENSAGENS_PADRAO } from '@/textos/mensagens'

describe('useConfirmacaoExclusaoStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('[UNITÁRIO] abre com mensagens padrão derivadas do nome do item', () => {
    const store = useConfirmacaoExclusaoStore()

    store.solicitar({ nomeItem: 'Ana', aoConfirmar: vi.fn() })

    expect(store.visivel).toBe(true)
    expect(store.nomeItem).toBe('Ana')
    expect(store.mensagem).toBe(MENSAGENS_PADRAO.exclusaoMensagem)
    expect(store.mensagemSucesso).toBe('“Ana” foi excluído.')
  })

  it('[UNITÁRIO] aceita mensagens personalizadas', () => {
    const store = useConfirmacaoExclusaoStore()

    store.solicitar({ nomeItem: 'Lista', mensagem: 'Os presentes também serão removidos.', mensagemSucesso: 'Lista removida.', aoConfirmar: vi.fn() })

    expect(store.mensagem).toBe('Os presentes também serão removidos.')
    expect(store.mensagemSucesso).toBe('Lista removida.')
  })

  it('[UNITÁRIO] confirma, marca execução e fecha ao terminar', async () => {
    const store = useConfirmacaoExclusaoStore()
    const aoConfirmar = vi.fn(async () => {
      expect(store.executando).toBe(true)
    })
    store.solicitar({ nomeItem: 'Ana', aoConfirmar })

    await expect(store.confirmar()).resolves.toBe('excluido')

    expect(aoConfirmar).toHaveBeenCalledTimes(1)
    expect(store.executando).toBe(false)
    expect(store.visivel).toBe(false)
  })

  it('[UNITÁRIO] devolve falhou quando a operação rejeita e fecha o diálogo', async () => {
    const store = useConfirmacaoExclusaoStore()
    store.solicitar({ nomeItem: 'Ana', aoConfirmar: () => Promise.reject(new Error('rede')) })

    await expect(store.confirmar()).resolves.toBe('falhou')
    expect(store.visivel).toBe(false)
    expect(store.executando).toBe(false)
  })

  it('[UNITÁRIO] ignora confirmação duplicada durante a execução', async () => {
    const store = useConfirmacaoExclusaoStore()
    let liberar: () => void = () => undefined
    const aoConfirmar = vi.fn(() => new Promise<void>((resolver) => { liberar = resolver }))
    store.solicitar({ nomeItem: 'Ana', aoConfirmar })

    const primeira = store.confirmar()
    await expect(store.confirmar()).resolves.toBe('ignorado')
    store.cancelar()
    store.solicitar({ nomeItem: 'Outro', aoConfirmar: vi.fn() })
    expect(store.nomeItem).toBe('Ana')

    liberar()
    await expect(primeira).resolves.toBe('excluido')
    expect(aoConfirmar).toHaveBeenCalledTimes(1)
  })

  it('[UNITÁRIO] ignora confirmação sem solicitação aberta', async () => {
    const store = useConfirmacaoExclusaoStore()

    await expect(store.confirmar()).resolves.toBe('ignorado')
  })

  it('[UNITÁRIO] cancelar fecha e avisa quem pediu', () => {
    const store = useConfirmacaoExclusaoStore()
    const aoCancelar = vi.fn()
    store.solicitar({ nomeItem: 'Ana', aoConfirmar: vi.fn(), aoCancelar })

    store.cancelar()
    store.cancelar()

    expect(store.visivel).toBe(false)
    expect(aoCancelar).toHaveBeenCalledTimes(1)
  })
})
