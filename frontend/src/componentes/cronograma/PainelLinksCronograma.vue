<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import LinhaDestinoLink from '@/componentes/base/LinhaDestinoLink.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import { useNotificacao } from '@/composables/useNotificacao'
import { breakpoints, dimensoes } from '@/design/tokens'
import type { FalhaEvento } from '@/stores/eventos'
import { useLinksCronogramaStore } from '@/stores/linksCronograma'
import { TEXTOS_LINKS_CRONOGRAMA } from '@/textos/cronogramaPublico'
import type { DestinoLinkCronogramaDto, TipoLinkCronograma } from '@/tipos/cronogramaPublico'
import {
  chaveDestino,
  montarMensagemCronograma,
  montarUrlCronogramaPublico,
  montarWhatsAppCronograma,
  requestDoDestino,
  rotuloCategoria,
  rotuloDestino,
  situacaoDestino,
  type DadosMensagemCronograma,
} from '@/utilitarios/cronogramaPublico'
import { formatarDataCalendarioExtenso } from '@/utilitarios/formatacao'

const props = defineProps<{
  visivel: boolean
  eventoId: string
  evento: DadosMensagemCronograma | null
}>()

const emit = defineEmits<{ 'update:visivel': [valor: boolean] }>()

type AcaoConfirmada = 'regenerar' | 'desativar'

const store = useLinksCronogramaStore()
const notificacao = useNotificacao()
const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: 'calc(100vw - 2rem)' }
const emAndamento = ref<string | null>(null)
const confirmacao = ref<{ acao: AcaoConfirmada; destino: DestinoLinkCronogramaDto } | null>(null)
const executandoConfirmacao = ref(false)

const aberto = computed({
  get: () => props.visivel,
  set: (valor: boolean) => emit('update:visivel', valor),
})

const links = computed(() => (store.eventoId === props.eventoId ? store.links : null))
const falha = computed(() => (store.eventoId === props.eventoId ? store.falha : null))
const bloqueado = computed(() => Boolean(links.value && (links.value.arquivado || links.value.expirado)))
const validade = computed(() => (links.value ? formatarDataCalendarioExtenso(links.value.validoAte) : ''))
const semItens = computed(() => links.value?.destinos.find((destino) => destino.tipo === 'Geral')?.quantidadeItens === 0)

const GRUPOS: { tipo: TipoLinkCronograma; titulo: string }[] = [
  { tipo: 'Geral', titulo: TEXTOS_LINKS_CRONOGRAMA.grupoEquipe },
  { tipo: 'Fornecedor', titulo: TEXTOS_LINKS_CRONOGRAMA.grupoFornecedores },
  { tipo: 'Responsavel', titulo: TEXTOS_LINKS_CRONOGRAMA.grupoResponsaveis },
]

const grupos = computed(() =>
  GRUPOS.map((grupo) => ({
    ...grupo,
    destinos: (links.value?.destinos ?? []).filter((destino) => destino.tipo === grupo.tipo),
  })).filter((grupo) => grupo.destinos.length > 0),
)

watch(
  () => [props.visivel, props.eventoId] as const,
  ([visivel, id]) => {
    if (visivel) {
      void store.carregar(id)
    }
  },
  { immediate: true },
)

function detalhe(destino: DestinoLinkCronogramaDto): string {
  const partes = [rotuloCategoria(destino.categoria), TEXTOS_LINKS_CRONOGRAMA.itens(destino.quantidadeItens)]
  if (destino.cancelado) {
    partes.push(TEXTOS_LINKS_CRONOGRAMA.cancelado)
  } else if (destino.tipo === 'Fornecedor' && !destino.telefone) {
    partes.push(TEXTOS_LINKS_CRONOGRAMA.semTelefone)
  }
  return partes.filter((parte): parte is string => Boolean(parte)).join(' · ')
}

function acoesMenu(destino: DestinoLinkCronogramaDto): ItemMenuAcoes[] {
  const itens: ItemMenuAcoes[] = []
  if (situacaoDestino(destino) === 'ativo') {
    itens.push({ chave: 'copiarMensagem', rotulo: TEXTOS_LINKS_CRONOGRAMA.copiarMensagem, icone: 'ie ie-mensagem' })
  }
  if (!bloqueado.value) {
    itens.push({ chave: 'regenerar', rotulo: TEXTOS_LINKS_CRONOGRAMA.regenerar, icone: 'ie ie-recarregar' })
  }
  itens.push({ chave: 'desativar', rotulo: TEXTOS_LINKS_CRONOGRAMA.desativar, icone: 'ie ie-excluir', perigoso: true })
  return itens
}

function notificarFalha(falhaAcao: FalhaEvento) {
  if (falhaAcao.tipo === 'semPermissao') {
    notificacao.erro(TEXTOS_LINKS_CRONOGRAMA.toastSemPermissao)
    return
  }
  if (falhaAcao.tipo === 'conflito') {
    notificacao.erro(TEXTOS_LINKS_CRONOGRAMA.toastIndisponivel)
    return
  }
  notificacao.erro(falhaAcao.tipo === 'regra' && falhaAcao.mensagem ? falhaAcao.mensagem : TEXTOS_LINKS_CRONOGRAMA.toastErro)
}

async function comDestino(destino: DestinoLinkCronogramaDto, acao: () => Promise<void>) {
  if (emAndamento.value) {
    return
  }
  emAndamento.value = chaveDestino(destino)
  try {
    await acao()
  } finally {
    emAndamento.value = null
  }
}

async function obterToken(destino: DestinoLinkCronogramaDto): Promise<string | null> {
  if (destino.link?.token) {
    return destino.link.token
  }
  const resultado = await store.gerar(props.eventoId, requestDoDestino(destino))
  if (!resultado.ok) {
    notificarFalha(resultado.falha)
    return null
  }
  return resultado.valor.token
}

async function copiar(texto: string, sucesso: string) {
  try {
    await navigator.clipboard.writeText(texto)
    notificacao.sucesso(sucesso)
  } catch {
    notificacao.erro(TEXTOS_LINKS_CRONOGRAMA.toastCopiaFalhou)
  }
}

function gerar(destino: DestinoLinkCronogramaDto) {
  void comDestino(destino, async () => {
    if (await obterToken(destino)) {
      notificacao.sucesso(TEXTOS_LINKS_CRONOGRAMA.toastGerado)
    }
  })
}

function copiarLink(destino: DestinoLinkCronogramaDto) {
  void comDestino(destino, async () => {
    const token = await obterToken(destino)
    if (token) {
      await copiar(montarUrlCronogramaPublico(token), TEXTOS_LINKS_CRONOGRAMA.toastCopiado)
    }
  })
}

function copiarMensagem(destino: DestinoLinkCronogramaDto) {
  void comDestino(destino, async () => {
    const token = await obterToken(destino)
    if (token && props.evento) {
      await copiar(
        montarMensagemCronograma(props.evento, destino, montarUrlCronogramaPublico(token)),
        TEXTOS_LINKS_CRONOGRAMA.toastMensagemCopiada,
      )
    }
  })
}

function enviarWhatsApp(destino: DestinoLinkCronogramaDto) {
  const janela = window.open('about:blank', '_blank')
  void comDestino(destino, async () => {
    const token = await obterToken(destino)
    if (!token || !props.evento) {
      janela?.close()
      return
    }
    const destinoWhatsApp = montarWhatsAppCronograma(props.evento, destino, montarUrlCronogramaPublico(token))
    if (janela) {
      janela.opener = null
      janela.location.href = destinoWhatsApp
    } else {
      window.location.href = destinoWhatsApp
    }
  })
}

function executarAcao(destino: DestinoLinkCronogramaDto, chave: string) {
  if (chave === 'copiarMensagem') {
    copiarMensagem(destino)
    return
  }
  if (chave === 'regenerar' || chave === 'desativar') {
    confirmacao.value = { acao: chave, destino }
  }
}

const tituloConfirmacao = computed(() => {
  if (!confirmacao.value) {
    return ''
  }
  const rotulo = rotuloDestino(confirmacao.value.destino)
  return confirmacao.value.acao === 'regenerar'
    ? TEXTOS_LINKS_CRONOGRAMA.confirmarRegenerarTitulo(rotulo)
    : TEXTOS_LINKS_CRONOGRAMA.confirmarDesativarTitulo(rotulo)
})

async function confirmar() {
  const atual = confirmacao.value
  const linkId = atual?.destino.link?.id
  if (!atual || !linkId) {
    confirmacao.value = null
    return
  }
  executandoConfirmacao.value = true
  const resultado =
    atual.acao === 'regenerar'
      ? await store.regenerar(props.eventoId, linkId)
      : await store.revogar(props.eventoId, linkId)
  executandoConfirmacao.value = false
  confirmacao.value = null
  if (!resultado.ok) {
    notificarFalha(resultado.falha)
    return
  }
  notificacao.sucesso(atual.acao === 'regenerar' ? TEXTOS_LINKS_CRONOGRAMA.toastRegenerado : TEXTOS_LINKS_CRONOGRAMA.toastDesativado)
}
</script>

<template>
  <Dialog
    v-model:visible="aberto"
    modal
    :header="TEXTOS_LINKS_CRONOGRAMA.titulo"
    :draggable="false"
    :style="{ width: dimensoes.larguraLeitura }"
    :breakpoints="pontosQuebra"
    data-teste="painel-links-cronograma"
  >
    <div class="painel-links">
      <p class="painel-links__subtitulo">
        {{ TEXTOS_LINKS_CRONOGRAMA.subtitulo }}
      </p>

      <EstadoCarregando
        v-if="store.carregando && !links"
        variante="lista"
        :linhas="4"
      />

      <EstadoErro
        v-else-if="falha"
        :titulo="TEXTOS_LINKS_CRONOGRAMA.erroTitulo"
        :mensagem="TEXTOS_LINKS_CRONOGRAMA.erroTexto"
        :pode-tentar-novamente="falha.tipo !== 'semPermissao'"
        :variante="falha.tipo === 'semPermissao' ? 'semPermissao' : 'erro'"
        @tentar-novamente="store.carregar(eventoId)"
      />

      <template v-else-if="links">
        <MensagemFormulario
          v-if="links.arquivado"
          variante="alerta"
          :mensagem="TEXTOS_LINKS_CRONOGRAMA.arquivado"
          data-teste="links-arquivado"
        />
        <MensagemFormulario
          v-else-if="links.expirado"
          variante="alerta"
          :mensagem="TEXTOS_LINKS_CRONOGRAMA.expirado(validade)"
          data-teste="links-expirados"
        />
        <MensagemFormulario
          v-else
          variante="informacao"
          :mensagem="TEXTOS_LINKS_CRONOGRAMA.validade(validade)"
          data-teste="links-validade"
        />
        <p
          v-if="semItens && !bloqueado"
          class="painel-links__dica"
          data-teste="links-dica-vazio"
        >
          {{ TEXTOS_LINKS_CRONOGRAMA.dicaVazio }}
        </p>

        <section
          v-for="grupo in grupos"
          :key="grupo.tipo"
          class="painel-links__grupo"
          :aria-labelledby="`grupo-links-${grupo.tipo}`"
          :data-teste="`grupo-links-${grupo.tipo}`"
        >
          <h3
            :id="`grupo-links-${grupo.tipo}`"
            class="painel-links__titulo-grupo"
          >
            {{ grupo.titulo }}
          </h3>
          <ul class="painel-links__lista">
            <LinhaDestinoLink
              v-for="destino in grupo.destinos"
              :key="chaveDestino(destino)"
              :rotulo="rotuloDestino(destino)"
              :detalhe="detalhe(destino)"
              :situacao="situacaoDestino(destino)"
              :data-destino="chaveDestino(destino)"
            >
              <template #acoes>
                <template v-if="!bloqueado && situacaoDestino(destino) !== 'indisponivel'">
                  <Button
                    :label="TEXTOS_LINKS_CRONOGRAMA.whatsapp"
                    icon="ie ie-whatsapp"
                    size="small"
                    severity="secondary"
                    outlined
                    :loading="emAndamento === chaveDestino(destino)"
                    :disabled="emAndamento !== null"
                    data-teste="link-whatsapp"
                    @click="enviarWhatsApp(destino)"
                  />
                  <Button
                    v-if="!destino.link"
                    :label="TEXTOS_LINKS_CRONOGRAMA.gerar"
                    icon="ie ie-link"
                    size="small"
                    severity="secondary"
                    text
                    :disabled="emAndamento !== null"
                    data-teste="link-gerar"
                    @click="gerar(destino)"
                  />
                  <Button
                    v-else
                    :label="TEXTOS_LINKS_CRONOGRAMA.copiar"
                    icon="ie ie-copiar"
                    size="small"
                    severity="secondary"
                    text
                    :disabled="emAndamento !== null"
                    data-teste="link-copiar"
                    @click="copiarLink(destino)"
                  />
                </template>
                <Button
                  v-else-if="!bloqueado"
                  :label="TEXTOS_LINKS_CRONOGRAMA.regenerar"
                  icon="ie ie-recarregar"
                  size="small"
                  :disabled="emAndamento !== null"
                  data-teste="link-regenerar-indisponivel"
                  @click="confirmacao = { acao: 'regenerar', destino }"
                />
                <MenuAcoes
                  v-if="destino.link"
                  :itens="acoesMenu(destino)"
                  :rotulo="TEXTOS_LINKS_CRONOGRAMA.rotuloMaisAcoes"
                  :rotulo-acessivel="TEXTOS_LINKS_CRONOGRAMA.maisAcoes(rotuloDestino(destino))"
                  somente-icone
                  :desabilitado="emAndamento !== null"
                  data-teste="link-mais-acoes"
                  @selecionar="(chave: string) => executarAcao(destino, chave)"
                />
              </template>
            </LinhaDestinoLink>
          </ul>
        </section>
      </template>
    </div>

    <template #footer>
      <Button
        :label="TEXTOS_LINKS_CRONOGRAMA.fechar"
        severity="secondary"
        outlined
        data-teste="fechar-painel-links"
        @click="aberto = false"
      />
    </template>
  </Dialog>

  <DialogoConfirmacao
    :visivel="confirmacao !== null"
    :titulo="tituloConfirmacao"
    :mensagem="
      confirmacao?.acao === 'regenerar'
        ? TEXTOS_LINKS_CRONOGRAMA.confirmarRegenerarTexto
        : TEXTOS_LINKS_CRONOGRAMA.confirmarDesativarTexto
    "
    :rotulo-confirmar="confirmacao?.acao === 'regenerar' ? TEXTOS_LINKS_CRONOGRAMA.regenerar : TEXTOS_LINKS_CRONOGRAMA.desativar"
    :rotulo-cancelar="TEXTOS_LINKS_CRONOGRAMA.cancelar"
    :perigoso="confirmacao?.acao === 'desativar'"
    :executando="executandoConfirmacao"
    data-teste="confirmacao-link-cronograma"
    @update:visivel="(valor: boolean) => !valor && (confirmacao = null)"
    @confirmar="confirmar"
    @cancelar="confirmacao = null"
  />
</template>

<style scoped>
.painel-links {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.painel-links__subtitulo,
.painel-links__dica {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.painel-links__grupo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.painel-links__titulo-grupo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto-apoio);
}

.painel-links__lista {
  margin: 0;
  padding: 0;
}
</style>
