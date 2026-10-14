import { useConfirmacaoExclusaoStore, type OpcoesConfirmarExclusao } from '@/stores/confirmacaoExclusao'

export type { OpcoesConfirmarExclusao }

export function useConfirmarExclusao() {
  const confirmacaoStore = useConfirmacaoExclusaoStore()

  function confirmarExclusao(opcoes: OpcoesConfirmarExclusao) {
    confirmacaoStore.solicitar(opcoes)
  }

  return { confirmarExclusao }
}
