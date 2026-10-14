<script setup lang="ts">
import { computed } from 'vue'
import Tag from 'primevue/tag'

import { ICONES_STATUS, type VarianteStatus } from './tipos'
import type { NomeIcone } from '@/design/icones'

const props = withDefaults(defineProps<{ texto: string; variante?: VarianteStatus; icone?: NomeIcone }>(), {
  variante: 'neutro',
  icone: undefined,
})

const SEVERIDADES = {
  neutro: 'secondary',
  sucesso: 'success',
  alerta: 'warn',
  erro: 'danger',
  informacao: 'info',
} as const

const severidade = computed(() => SEVERIDADES[props.variante])
const classeIcone = computed(() => `ie ie-${props.icone ?? ICONES_STATUS[props.variante]} badge-status__icone`)
</script>

<template>
  <Tag
    class="badge-status"
    :severity="severidade"
    :value="texto"
    :icon="classeIcone"
    :data-variante="variante"
    data-teste="badge-status"
  />
</template>

<style scoped>
.badge-status {
  white-space: nowrap;
}

.badge-status :deep(.badge-status__icone) {
  font-size: 0.8125rem;
}

.badge-status[data-variante='neutro'] :deep(.badge-status__icone) {
  font-size: 0.625rem;
}
</style>
