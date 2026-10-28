<script setup lang="ts">
import EtiquetaFase from '@/componentes/base/EtiquetaFase.vue'
import { FASE_VISUAL, ROTULOS_FASE } from '@/textos/eventos'
import type { FaseEvento } from '@/tipos/eventos'

defineProps<{ fase: FaseEvento }>()
</script>

<template>
  <EtiquetaFase
    :fase="FASE_VISUAL[fase]"
    :texto="ROTULOS_FASE[fase]"
  />
</template>
