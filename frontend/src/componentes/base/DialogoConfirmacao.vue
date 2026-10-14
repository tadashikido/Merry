<script setup lang="ts">
import { computed, useId } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

import { breakpoints } from '@/design/tokens'

const props = withDefaults(
  defineProps<{
    visivel: boolean
    titulo: string
    mensagem: string
    rotuloConfirmar: string
    rotuloCancelar: string
    executando?: boolean
    perigoso?: boolean
  }>(),
  { executando: false, perigoso: false },
)

const emit = defineEmits<{ 'update:visivel': [valor: boolean]; confirmar: []; cancelar: [] }>()

const idMensagem = `dialogo-confirmacao-${useId()}`
const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: 'calc(100vw - 2rem)' }

const aberto = computed({
  get: () => props.visivel,
  set: (valor: boolean) => {
    if (!valor && !props.executando) {
      emit('update:visivel', false)
      emit('cancelar')
    }
  },
})

function cancelar() {
  aberto.value = false
}
</script>

<template>
  <Dialog
    v-model:visible="aberto"
    class="dialogo-confirmacao"
    modal
    :header="titulo"
    :closable="!executando"
    :close-on-escape="!executando"
    :draggable="false"
    :style="{ width: '30rem' }"
    :breakpoints="pontosQuebra"
    :pt="{ root: { role: 'alertdialog', 'aria-describedby': idMensagem } }"
    data-teste="dialogo-confirmacao"
  >
    <p :id="idMensagem">
      {{ mensagem }}
    </p>
    <template #footer>
      <Button
        :label="rotuloCancelar"
        severity="secondary"
        outlined
        autofocus
        :disabled="executando"
        data-teste="dialogo-confirmacao-cancelar"
        @click="cancelar"
      />
      <Button
        :label="rotuloConfirmar"
        :severity="perigoso ? 'danger' : undefined"
        :loading="executando"
        data-teste="dialogo-confirmacao-confirmar"
        @click="emit('confirmar')"
      />
    </template>
  </Dialog>
</template>
