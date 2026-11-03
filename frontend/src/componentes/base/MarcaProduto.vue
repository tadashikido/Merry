<script setup lang="ts">
import { computed } from 'vue'
import { NOME_PRODUTO } from '@/textos/rotulos'
import simboloAzul from '@/assets/marca/simbolo-celebri.png'
import simboloMarfim from '@/assets/marca/simbolo-celebri-branca.png'

const props = withDefaults(
  defineProps<{ nome?: string; somenteSimbolo?: boolean; tom?: 'escuro' | 'claro'; destaque?: boolean; fundo?: 'claro' | 'escuro' }>(),
  {
    nome: NOME_PRODUTO,
    somenteSimbolo: false,
    tom: 'escuro',
    destaque: false,
    fundo: 'claro',
  },
)

const origemSimbolo = computed(() => (props.fundo === 'escuro' ? simboloMarfim : simboloAzul))
</script>

<template>
  <span
    class="marca"
    :class="[`marca--${tom}`, `marca--fundo-${fundo}`, { 'marca--destaque': destaque }]"
    data-teste="marca-produto"
  >
    <img
      class="marca__simbolo"
      :src="origemSimbolo"
      alt=""
      aria-hidden="true"
      decoding="async"
    >
    <span
      v-if="somenteSimbolo"
      class="somente-leitor-tela"
    >{{ nome }}</span>
    <span
      v-else
      class="marca__nome"
    >{{ nome }}</span>
  </span>
</template>

<style scoped>
.marca {
  --marca-tinta: var(--p-cor-titulo);

  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  font-family: var(--p-fonte-display);
  font-weight: var(--p-fonte-peso-regular);
  font-size: var(--marca-tamanho, var(--marca-tamanho-tom, 1.75rem));
  line-height: 1;
  color: var(--marca-tinta);
}

.marca--fundo-escuro {
  --marca-tinta: var(--p-cor-lateral-escura-texto);
}

.marca__simbolo {
  flex: none;
  width: auto;
  height: var(--marca-tamanho-simbolo, 1.25em);
}

.marca__nome {
  text-transform: lowercase;
  letter-spacing: -0.01em;
}

.marca--claro {
  --marca-tamanho-tom: 1.5rem;
}

.marca--destaque {
  --marca-tamanho-tom: var(--p-fonte-tamanho-display);
}
</style>
