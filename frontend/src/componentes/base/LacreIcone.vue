<script setup lang="ts">
defineProps<{ icone: string }>()
</script>

<template>
  <span
    class="lacre-icone"
    aria-hidden="true"
  >
    <span :class="['ie', icone]" />
  </span>
</template>

<style scoped>
.lacre-icone {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--p-dimensao-alvo-presenca);
  height: var(--p-dimensao-alvo-presenca);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  color: var(--p-cor-acento-texto);
  background: var(--p-cor-acento-suave);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-total);
}
</style>
