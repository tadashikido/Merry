<script setup lang="ts">
import { NOME_PRODUTO } from '@/textos/rotulos'

withDefaults(defineProps<{ nome?: string; somenteSimbolo?: boolean; tom?: 'escuro' | 'claro' }>(), {
  nome: NOME_PRODUTO,
  somenteSimbolo: false,
  tom: 'escuro',
})
</script>

<template>
  <span
    class="marca"
    :class="`marca--${tom}`"
    data-teste="marca-produto"
  >
    <svg
      class="marca__simbolo"
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        class="marca__anel marca__anel--primeiro"
        cx="11"
        cy="15"
        r="7"
      />
      <circle
        class="marca__anel marca__anel--segundo"
        cx="17"
        cy="13"
        r="7"
      />
    </svg>
    <span
      v-if="!somenteSimbolo"
      class="marca__nome"
    >{{ nome }}</span>
    <span
      v-else
      class="somente-leitor-tela"
    >{{ nome }}</span>
  </span>
</template>

<style scoped>
.marca {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-2);
  color: var(--p-cor-texto);
}

.marca--claro {
  color: var(--p-cor-navegacao-ativo);
}

.marca__simbolo {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
}

.marca__anel {
  fill: none;
  stroke-width: 1.6;
}

.marca__anel--primeiro {
  stroke: var(--p-cor-primaria);
}

.marca__anel--segundo {
  stroke: var(--p-cor-champagne);
}

.marca--claro .marca__anel--primeiro {
  stroke: var(--p-cor-navegacao-simbolo);
}

.marca--claro .marca__anel--segundo {
  stroke: var(--p-cor-champagne-claro);
}

.marca__nome {
  font-family: var(--p-fonte-editorial);
  font-variant-numeric: lining-nums;
  font-size: 1.625rem;
  font-weight: var(--p-fonte-peso-seminegrito);
  line-height: 1;
  letter-spacing: 0.01em;
}
</style>
