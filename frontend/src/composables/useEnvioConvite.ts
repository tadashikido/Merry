import { ref, toValue, type MaybeRefOrGetter } from 'vue'

import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import { useNotificacao } from '@/composables/useNotificacao'
import { useConvidadosStore, type FalhaConvidados } from '@/stores/convidados'
import { TEXTOS_PREVIA_RSVP } from '@/textos/confirmacoes'
import { TEXTOS_ENVIO_CONVITE } from '@/textos/rsvp'
import type { CasamentoDto } from '@/tipos/casamentos'
import type { StatusEnvioConvite } from '@/tipos/convidados'
import { montarLinkWhatsApp, montarMensagemConvite, montarUrlPrevia, montarUrlRsvp } from '@/utilitarios/rsvp'

export interface ConviteParaEnvio {
  id: string
  nome: string
  statusEnvio: StatusEnvioConvite
  telefone: string | null
}

type AcaoLink = 'copiarLink' | 'copiarMensagem' | 'previsualizar' | 'marcarEnviado' | 'regenerar' | 'revogar'

interface ConfirmacaoLink {
  acao: 'regenerar' | 'revogar'
  convite: ConviteParaEnvio
}

export interface OpcoesEnvioConvite {
  casamentoId: MaybeRefOrGetter<string>
  casamento: MaybeRefOrGetter<CasamentoDto | null>
  arquivado: MaybeRefOrGetter<boolean>
  aoAlterar?: () => void | Promise<void>
}

export function useEnvioConvite(opcoes: OpcoesEnvioConvite) {
  const store = useConvidadosStore()
  const notificacao = useNotificacao()

  const conviteEmAndamento = ref<string | null>(null)
  const confirmacaoLink = ref<ConfirmacaoLink | null>(null)
  const executandoConfirmacao = ref(false)

  function itensMenuLink(): ItemMenuAcoes[] {
    const itens: ItemMenuAcoes[] = [
      { chave: 'copiarLink', rotulo: TEXTOS_ENVIO_CONVITE.copiarLink, icone: 'ie ie-link' },
      { chave: 'copiarMensagem', rotulo: TEXTOS_ENVIO_CONVITE.copiarMensagem, icone: 'ie ie-copiar' },
      { chave: 'previsualizar', rotulo: TEXTOS_PREVIA_RSVP.acao, icone: 'ie ie-olho' },
    ]
    if (toValue(opcoes.arquivado)) {
      return itens
    }
    return [
      ...itens,
      { chave: 'marcarEnviado', rotulo: TEXTOS_ENVIO_CONVITE.marcarEnviado, icone: 'ie ie-enviar' },
      { chave: 'regenerar', rotulo: TEXTOS_ENVIO_CONVITE.regenerarLink, icone: 'ie ie-recarregar' },
      { chave: 'revogar', rotulo: TEXTOS_ENVIO_CONVITE.revogarLink, icone: 'ie ie-bloquear', perigoso: true },
    ]
  }

  function notificarFalhaLink(falha: FalhaConvidados) {
    if (falha.tipo === 'semPermissao') {
      notificacao.erro(TEXTOS_ENVIO_CONVITE.semPermissao)
      return
    }
    if (falha.tipo === 'conflito') {
      notificacao.erro(TEXTOS_ENVIO_CONVITE.linkIrrecuperavel)
      return
    }
    notificacao.erro(falha.mensagem ?? TEXTOS_ENVIO_CONVITE.erroLink)
  }

  async function obterToken(convite: ConviteParaEnvio): Promise<string | null> {
    const casamentoId = toValue(opcoes.casamentoId)
    const resultado = toValue(opcoes.arquivado)
      ? await store.consultarLinkRsvp(casamentoId, convite.id)
      : await store.obterOuGerarLinkRsvp(casamentoId, convite.id)
    if (!resultado.ok) {
      notificarFalhaLink(resultado.falha)
      return null
    }
    return resultado.valor.token
  }

  function mensagemDoConvite(convite: ConviteParaEnvio, url: string): string | null {
    const casamento = toValue(opcoes.casamento)
    return casamento ? montarMensagemConvite(casamento, convite, url) : null
  }

  async function copiar(texto: string, sucesso: string, alternativa: string) {
    try {
      await navigator.clipboard.writeText(texto)
      notificacao.sucesso(sucesso)
    } catch {
      notificacao.erro(TEXTOS_ENVIO_CONVITE.copiaFalhou(alternativa))
    }
  }

  async function comConvite(convite: ConviteParaEnvio, acao: () => Promise<void>) {
    if (conviteEmAndamento.value) {
      return
    }
    conviteEmAndamento.value = convite.id
    try {
      await acao()
    } finally {
      conviteEmAndamento.value = null
    }
  }

  async function marcarEnviado(convite: ConviteParaEnvio): Promise<boolean> {
    const resultado = await store.marcarEnviado(toValue(opcoes.casamentoId), convite.id)
    if (!resultado.ok) {
      notificarFalhaLink(resultado.falha)
      return false
    }
    await opcoes.aoAlterar?.()
    return true
  }

  function abrirEmJanela(janela: Window | null, destino: string) {
    if (janela) {
      janela.opener = null
      janela.location.href = destino
    } else {
      window.location.href = destino
    }
  }

  function enviarWhatsApp(convite: ConviteParaEnvio) {
    const janela = window.open('about:blank', '_blank')
    void comConvite(convite, async () => {
      const token = await obterToken(convite)
      const url = token ? montarUrlRsvp(token) : null
      const mensagem = url ? mensagemDoConvite(convite, url) : null
      if (!url || !mensagem) {
        janela?.close()
        return
      }
      abrirEmJanela(janela, montarLinkWhatsApp(convite.telefone, mensagem))
      if (!convite.telefone) {
        notificacao.sucesso(TEXTOS_ENVIO_CONVITE.semTelefone)
      }
      if (convite.statusEnvio === 'NaoEnviado') {
        await marcarEnviado(convite)
      }
    })
  }

  function previsualizar(convite: ConviteParaEnvio) {
    const janela = window.open('about:blank', '_blank')
    void comConvite(convite, async () => {
      const token = await obterToken(convite)
      if (!token) {
        janela?.close()
        return
      }
      abrirEmJanela(janela, montarUrlPrevia(token))
    })
  }

  function executarAcaoLink(convite: ConviteParaEnvio, chave: string) {
    const acao = chave as AcaoLink
    if (acao === 'regenerar' || acao === 'revogar') {
      confirmacaoLink.value = { acao, convite }
      return
    }
    if (acao === 'previsualizar') {
      previsualizar(convite)
      return
    }
    void comConvite(convite, async () => {
      if (acao === 'marcarEnviado') {
        if (await marcarEnviado(convite)) {
          notificacao.sucesso(TEXTOS_ENVIO_CONVITE.marcadoEnviado)
        }
        return
      }
      const token = await obterToken(convite)
      if (!token) {
        return
      }
      const url = montarUrlRsvp(token)
      if (acao === 'copiarLink') {
        await copiar(url, TEXTOS_ENVIO_CONVITE.linkCopiado, url)
        return
      }
      const mensagem = mensagemDoConvite(convite, url)
      if (mensagem) {
        await copiar(mensagem, TEXTOS_ENVIO_CONVITE.mensagemCopiada, url)
      }
    })
  }

  async function confirmarAcaoLink() {
    const confirmacao = confirmacaoLink.value
    if (!confirmacao) {
      return
    }
    const casamentoId = toValue(opcoes.casamentoId)
    executandoConfirmacao.value = true
    try {
      const resultado =
        confirmacao.acao === 'regenerar'
          ? await store.regenerarLinkRsvp(casamentoId, confirmacao.convite.id)
          : await store.revogarLinkRsvp(casamentoId, confirmacao.convite.id)
      if (resultado.ok) {
        notificacao.sucesso(confirmacao.acao === 'regenerar' ? TEXTOS_ENVIO_CONVITE.linkRegenerado : TEXTOS_ENVIO_CONVITE.linkRevogado)
      } else {
        notificarFalhaLink(resultado.falha)
      }
    } finally {
      executandoConfirmacao.value = false
      confirmacaoLink.value = null
    }
  }

  function cancelarConfirmacao() {
    confirmacaoLink.value = null
  }

  return {
    conviteEmAndamento,
    confirmacaoLink,
    executandoConfirmacao,
    itensMenuLink,
    enviarWhatsApp,
    executarAcaoLink,
    confirmarAcaoLink,
    cancelarConfirmacao,
  }
}
