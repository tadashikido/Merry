import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAlteracoesNaoSalvasStore } from '@/stores/alteracoesNaoSalvas'

describe('useAlteracoesNaoSalvasStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('[UNITÁRIO] solicitar abre o diálogo e descartar resolve verdadeiro', async () => {
    const store = useAlteracoesNaoSalvasStore()

    const resposta = store.solicitarConfirmacao()
    expect(store.visivel).toBe(true)
    store.descartar()

    await expect(resposta).resolves.toBe(true)
    expect(store.visivel).toBe(false)
  })

  it('[UNITÁRIO] continuar editando resolve falso e fecha o diálogo', async () => {
    const store = useAlteracoesNaoSalvasStore()

    const resposta = store.solicitarConfirmacao()
    store.continuarEditando()

    await expect(resposta).resolves.toBe(false)
    expect(store.visivel).toBe(false)
  })

  it('[UNITÁRIO] nova solicitação com outra aberta cancela a anterior', async () => {
    const store = useAlteracoesNaoSalvasStore()

    const primeira = store.solicitarConfirmacao()
    const segunda = store.solicitarConfirmacao()

    await expect(primeira).resolves.toBe(false)
    expect(store.visivel).toBe(true)
    store.descartar()
    await expect(segunda).resolves.toBe(true)
  })

  it('[UNITÁRIO] responder sem solicitação pendente não tem efeito', () => {
    const store = useAlteracoesNaoSalvasStore()

    store.descartar()
    store.continuarEditando()

    expect(store.visivel).toBe(false)
  })
})
