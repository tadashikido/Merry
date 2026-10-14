<script setup lang="ts">
import { computed } from 'vue'

import { TEXTOS_FINANCEIRO } from '@/textos/financeiro'
import { formatarDataCalendarioCurta } from '@/utilitarios/formatacao'

const props = defineProps<{ hoje: string }>()

const rotulo = computed(() =>
  TEXTOS_FINANCEIRO.linhaHoje(formatarDataCalendarioCurta(props.hoje).split(' ').slice(0, 2).join(' ')),
)
</script>

<template>
  <div
    class="linha-hoje"
    role="separator"
    :aria-label="rotulo"
    data-teste="linha-hoje"
  >
    <span
      class="linha-hoje__rotulo"
      aria-hidden="true"
    >{{ rotulo }}</span>
    <span
      class="linha-hoje__traco"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.linha-hoje {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-2) var(--p-espaco-4);
}

.linha-hoje__rotulo {
  flex-shrink: 0;
  font-size: var(--p-fonte-tamanho-rotulo);
  font-weight: var(--p-fonte-peso-negrito);
  color: var(--p-cor-erro-texto);
}

.linha-hoje__traco {
  flex: 1;
  height: 1px;
  background: var(--p-cor-erro);
}
</style>
