<script setup lang="ts">
withDefaults(defineProps<{ recolhivel?: boolean }>(), { recolhivel: true })
</script>

<template>
  <details
    v-if="recolhivel"
    class="recolhivel"
    data-teste="secao-recolhivel"
  >
    <summary class="recolhivel__resumo">
      <slot name="titulo" />
    </summary>
    <div class="recolhivel__corpo">
      <slot />
    </div>
  </details>
  <template v-else>
    <slot name="titulo" />
    <slot />
  </template>
</template>
