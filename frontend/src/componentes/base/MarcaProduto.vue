<script setup lang="ts">
import { NOME_PRODUTO } from '@/textos/rotulos'

withDefaults(
  defineProps<{ nome?: string; somenteSimbolo?: boolean; tom?: 'escuro' | 'claro'; destaque?: boolean; fundo?: 'claro' | 'escuro' }>(),
  {
    nome: NOME_PRODUTO,
    somenteSimbolo: false,
    tom: 'escuro',
    destaque: false,
    fundo: 'claro',
  },
)
</script>

<template>
  <span
    class="marca"
    :class="[`marca--${tom}`, `marca--fundo-${fundo}`, { 'marca--destaque': destaque }]"
    data-teste="marca-produto"
  >
    <svg
      class="marca__simbolo"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        class="marca__arco"
        d="M37 13.1A17 17 0 1 0 37 34.9"
        stroke-width="4.5"
        stroke-linecap="round"
      />
      <path
        class="marca__centelha"
        d="M41 17.5Q41 24 47.5 24Q41 24 41 30.5Q41 24 34.5 24Q41 24 41 17.5Z"
      />
    </svg>
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
  --marca-brilho: var(--p-cor-centelha-clara);

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
  --marca-brilho: var(--p-cor-centelha);
}

.marca__simbolo {
  flex: none;
  width: var(--marca-tamanho-simbolo, 1.15em);
  height: var(--marca-tamanho-simbolo, 1.15em);
}

.marca__arco {
  stroke: currentcolor;
}

.marca__centelha {
  fill: var(--marca-brilho);
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
