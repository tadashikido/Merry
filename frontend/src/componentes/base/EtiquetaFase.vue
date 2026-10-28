<script setup lang="ts">
import type { FaseEvento } from '@/design/tokens'

defineProps<{ fase: FaseEvento; texto: string }>()

const CLASSES_FASE: Record<FaseEvento, string> = {
  planejamento: 'fase--planejamento',
  retaFinal: 'fase--reta-final',
  realizado: 'fase--realizado',
  atrasado: 'fase--atrasado',
}
</script>

<template>
  <span
    class="etiqueta-fase"
    :class="CLASSES_FASE[fase]"
    :data-fase="fase"
    data-teste="etiqueta-fase"
  >
    <span
      class="etiqueta-fase__ponto"
      aria-hidden="true"
    />
    {{ texto }}
  </span>
</template>

<style scoped>
.etiqueta-fase {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-2);
  padding: 0.375rem var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  line-height: 1.2;
  color: var(--fase-texto);
  white-space: nowrap;
  background: var(--fase-fundo);
  border-radius: var(--p-raio-total);
}

.etiqueta-fase__ponto {
  flex: none;
  width: var(--p-dimensao-ponto-fase);
  height: var(--p-dimensao-ponto-fase);
  background: var(--fase-ponto);
  border-radius: var(--p-raio-total);
}
</style>
