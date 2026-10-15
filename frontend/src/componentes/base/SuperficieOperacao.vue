<script setup lang="ts">
withDefaults(defineProps<{ ampla?: boolean }>(), { ampla: false })
</script>

<template>
  <section
    class="superficie-operacao tema-operacao"
    :class="{ 'superficie-operacao--ampla': ampla }"
    data-teste="superficie-operacao"
  >
    <slot />
  </section>
</template>

<style scoped>
.superficie-operacao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-5);
  width: 100%;
  max-width: var(--p-dimensao-largura-publica);
  margin: 0 auto;
  padding: var(--p-espaco-5) var(--p-espaco-5) var(--p-espaco-8);
  font-size: var(--p-fonte-tamanho-corpo);
  background: var(--p-cor-operacao-fundo);
  border-radius: var(--p-raio-folha);
}

.superficie-operacao--ampla {
  max-width: none;
}

@media (min-width: 1024px) {
  .superficie-operacao--ampla {
    padding: var(--p-ritmo-bloco);
  }
}
</style>
