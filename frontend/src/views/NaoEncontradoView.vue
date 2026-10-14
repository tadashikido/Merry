<script setup lang="ts">
import { RouterLink } from 'vue-router'

import LayoutPublico from '@/layouts/LayoutPublico.vue'
</script>

<template>
  <LayoutPublico>
    <section
      class="nao-encontrado"
      aria-labelledby="nao-encontrado-titulo"
    >
      <h1 id="nao-encontrado-titulo">
        Página não encontrada
      </h1>
      <p>O endereço acessado não existe.</p>
      <RouterLink
        :to="{ name: 'inicio' }"
        data-teste="voltar-inicio"
      >
        Voltar para o início
      </RouterLink>
    </section>
  </LayoutPublico>
</template>

<style scoped>
.nao-encontrado {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-4);
  text-align: center;
}
</style>
