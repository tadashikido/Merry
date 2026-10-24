<script setup lang="ts">
defineProps<{ rotulo: string }>()
</script>

<template>
  <div
    class="par-lugares"
    role="list"
    :aria-label="rotulo"
    data-teste="par-lugares"
  >
    <slot name="primeiro" />
    <span
      class="par-lugares__e"
      aria-hidden="true"
    >&amp;</span>
    <slot name="segundo" />
  </div>
</template>

<style scoped>
.par-lugares {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: stretch;
  gap: var(--p-espaco-2);
}

.par-lugares__e {
  justify-self: center;
  font-family: var(--p-fonte-serif);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-secao);
  font-style: italic;
  font-weight: var(--p-fonte-peso-regular);
  line-height: 1;
  color: var(--p-cor-acento-texto);
}

@container (min-width: 36rem) {
  .par-lugares {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: stretch;
    gap: var(--p-espaco-3);
  }

  .par-lugares__e {
    align-self: center;
    font-size: var(--p-fonte-tamanho-pagina);
  }
}
</style>
