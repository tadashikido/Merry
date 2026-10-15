import { useToast } from 'primevue/usetoast'

import { MENSAGENS_PADRAO } from '@/textos/mensagens'

export const DURACAO_TOAST_SUCESSO = 5000
export const DURACAO_TOAST_ERRO = 6000

export type AcaoDesfazer = () => void | Promise<void>

export type AcaoFechamento = () => void | Promise<void>

export interface OpcoesSucesso {
  titulo?: string
  desfazer?: AcaoDesfazer
  aoFechar?: AcaoFechamento
}

export interface DadosToast {
  desfazer?: AcaoDesfazer
  aoFechar?: AcaoFechamento
}

export function useNotificacao() {
  const toast = useToast()

  function sucesso(mensagem: string, opcoes?: string | OpcoesSucesso) {
    const { titulo, desfazer, aoFechar }: OpcoesSucesso = typeof opcoes === 'string' ? { titulo: opcoes } : (opcoes ?? {})
    const dados: DadosToast = { desfazer, aoFechar }
    toast.add({
      severity: 'success',
      summary: titulo ?? mensagem,
      detail: titulo ? mensagem : undefined,
      life: DURACAO_TOAST_SUCESSO,
      data: dados,
    } as Parameters<typeof toast.add>[0])
  }

  function erro(mensagem: string = MENSAGENS_PADRAO.erroGenericoMensagem, titulo: string = MENSAGENS_PADRAO.erroGenericoTitulo) {
    toast.add({ severity: 'error', summary: titulo, detail: mensagem, life: DURACAO_TOAST_ERRO })
  }

  return { sucesso, erro }
}
