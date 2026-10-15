import { useNotificacao } from '@/composables/useNotificacao'
import { MENSAGENS_PADRAO } from '@/textos/mensagens'

export function useDesfazerExclusao() {
  const notificacao = useNotificacao()

  async function desfazerExclusao(desfazer: () => Promise<boolean>, mensagemRestaurado: string): Promise<void> {
    if (await desfazer()) {
      notificacao.sucesso(mensagemRestaurado)
      return
    }
    notificacao.erro(MENSAGENS_PADRAO.exclusaoJaConcluida)
  }

  return { desfazerExclusao }
}
