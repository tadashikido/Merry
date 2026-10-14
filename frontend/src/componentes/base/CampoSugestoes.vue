<script setup lang="ts">
import { ref } from 'vue'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'

import { ROTULOS_ACOES } from '@/textos/rotulos'
import { contemTexto } from '@/utilitarios/busca'

const props = withDefaults(
  defineProps<{
    id: string
    sugestoes: string[]
    invalido?: boolean
    descritoPor?: string
    maximo?: number
    desabilitado?: boolean
    rotuloBotaoSugestoes?: string
  }>(),
  {
    invalido: false,
    descritoPor: undefined,
    maximo: undefined,
    desabilitado: false,
    rotuloBotaoSugestoes: ROTULOS_ACOES.mostrarSugestoes,
  },
)

const valor = defineModel<string>({ default: '' })
const emit = defineEmits<{ blur: [] }>()

const filtradas = ref<string[]>([])

function completar(evento: AutoCompleteCompleteEvent) {
  const termo = evento.query ?? ''
  filtradas.value = props.sugestoes.filter((sugestao) => contemTexto(termo, sugestao))
}
</script>

<template>
  <AutoComplete
    v-model="valor"
    class="campo-sugestoes"
    :input-id="id"
    :suggestions="filtradas"
    dropdown
    dropdown-mode="blank"
    :invalid="invalido"
    :disabled="desabilitado"
    :show-empty-message="false"
    fluid
    :pt="{
      pcInputText: {
        root: {
          'aria-describedby': descritoPor,
          'aria-invalid': invalido,
          maxlength: maximo,
          autocomplete: 'off',
        },
      },
      dropdown: {
        'aria-label': rotuloBotaoSugestoes,
        title: rotuloBotaoSugestoes,
      },
    }"
    data-teste="campo-sugestoes"
    @complete="completar"
    @blur="emit('blur')"
  />
</template>

<style scoped>
.campo-sugestoes {
  width: 100%;
  min-height: var(--p-dimensao-alvo-toque);
}
</style>
