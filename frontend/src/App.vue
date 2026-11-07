<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'

import BannerImpersonacao from '@/componentes/base/BannerImpersonacao.vue'
import IndicadorAbertura from '@/componentes/base/IndicadorAbertura.vue'
import ProvedorFeedback from '@/componentes/base/ProvedorFeedback.vue'

const roteador = useRouter()
const pronto = ref(false)

onMounted(async () => {
  await roteador.isReady()
  pronto.value = true
})
</script>

<template>
  <div class="aplicacao">
    <BannerImpersonacao />
    <RouterView v-if="pronto" />
    <IndicadorAbertura v-else />
    <ProvedorFeedback />
  </div>
</template>
