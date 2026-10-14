<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

import { useNotificacao } from '@/composables/useNotificacao'
import { breakpoints } from '@/design/tokens'
import { useConfirmacaoExclusaoStore } from '@/stores/confirmacaoExclusao'
import { tituloExclusao } from '@/textos/mensagens'
import { ROTULOS_ACOES } from '@/textos/rotulos'

const ID_MENSAGEM = 'dialogo-exclusao-mensagem'

const confirmacaoStore = useConfirmacaoExclusaoStore()
const notificacao = useNotificacao()

const visivel = computed({
  get: () => confirmacaoStore.visivel,
  set: (valor: boolean) => {
    if (!valor) {
      confirmacaoStore.cancelar()
    }
  },
})

const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: 'calc(100vw - 2rem)' }

async function excluir() {
  const sucesso = confirmacaoStore.mensagemSucesso
  const resultado = await confirmacaoStore.confirmar()
  if (resultado === 'excluido') {
    notificacao.sucesso(sucesso)
  } else if (resultado === 'falhou') {
    notificacao.erro()
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visivel"
    class="dialogo-exclusao"
    modal
    :header="tituloExclusao(confirmacaoStore.nomeItem)"
    :closable="!confirmacaoStore.executando"
    :close-on-escape="!confirmacaoStore.executando"
    :draggable="false"
    :style="{ width: '28rem' }"
    :breakpoints="pontosQuebra"
    :pt="{ root: { role: 'alertdialog', 'aria-describedby': ID_MENSAGEM } }"
    data-teste="dialogo-exclusao"
  >
    <p :id="ID_MENSAGEM">
      {{ confirmacaoStore.mensagem }}
    </p>
    <template #footer>
      <Button
        :label="ROTULOS_ACOES.cancelar"
        severity="secondary"
        outlined
        autofocus
        :disabled="confirmacaoStore.executando"
        data-teste="cancelar-exclusao"
        @click="confirmacaoStore.cancelar()"
      />
      <Button
        :label="ROTULOS_ACOES.excluir"
        severity="danger"
        :loading="confirmacaoStore.executando"
        data-teste="confirmar-exclusao"
        @click="excluir"
      />
    </template>
  </Dialog>
</template>
