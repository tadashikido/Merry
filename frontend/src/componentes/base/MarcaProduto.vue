<script setup lang="ts">
import { computed } from 'vue'

import { NOME_PRODUTO } from '@/textos/rotulos'

const props = withDefaults(defineProps<{ nome?: string; somenteSimbolo?: boolean; tom?: 'escuro' | 'claro'; destaque?: boolean }>(), {
  nome: NOME_PRODUTO,
  somenteSimbolo: false,
  tom: 'escuro',
  destaque: false,
})

const inicial = computed(() => props.nome.trim().charAt(0).toUpperCase())
</script>

<template>
  <span
    class="marca"
    :class="[`marca--${tom}`, { 'marca--destaque': destaque }]"
    data-teste="marca-produto"
  >
    <template v-if="somenteSimbolo">
      <span
        class="marca__simbolo"
        aria-hidden="true"
      >{{ inicial }}</span>
      <span class="somente-leitor-tela">{{ nome }}</span>
    </template>
    <span
      v-else
      class="marca__nome"
    >{{ nome }}</span>
  </span>
</template>

<style scoped>
.marca {
  display: inline-flex;
  align-items: center;
  font-family: var(--p-fonte-display);
  font-weight: var(--p-fonte-peso-leve);
  line-height: 1;
  color: var(--p-cor-texto);
}

.marca__nome {
  font-size: var(--marca-tamanho, var(--marca-tamanho-tom, 1.75rem));
  letter-spacing: 0.08em;
  margin-inline-end: -0.08em;
}

.marca__simbolo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--marca-tamanho-simbolo, 2.25rem);
  height: var(--marca-tamanho-simbolo, 2.25rem);
  font-size: calc(var(--marca-tamanho-simbolo, 2.25rem) * 0.8);
}

.marca--claro {
  --marca-tamanho-tom: 1.5rem;
}

.marca--destaque {
  --marca-tamanho-tom: var(--p-fonte-tamanho-display);
}

.marca--destaque .marca__nome {
  letter-spacing: 0.1em;
  margin-inline-end: -0.1em;
}
</style>
