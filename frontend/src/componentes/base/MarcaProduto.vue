<script setup lang="ts">
import iconeMarca from '@/assets/marca/nossia-icone-claro.png'
import logoHorizontal from '@/assets/marca/nossia-logo-horizontal.png'
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
    <template v-if="somenteSimbolo">
      <img
        class="marca__simbolo"
        :src="iconeMarca"
        alt=""
        width="166"
        height="178"
      >
      <span class="somente-leitor-tela">{{ nome }}</span>
    </template>
    <img
      v-else
      class="marca__logo"
      :src="logoHorizontal"
      :alt="nome"
      width="397"
      height="134"
    >
  </span>
</template>

<style scoped>
.marca {
  display: inline-flex;
  align-items: center;
  line-height: 0;
}

.marca__simbolo,
.marca__logo {
  mix-blend-mode: multiply;
}

.marca__simbolo {
  width: auto;
  height: var(--marca-altura-simbolo, 2.25rem);
}

.marca__logo {
  width: auto;
  height: var(--marca-altura-logo, 2.25rem);
}

.marca--claro .marca__logo {
  --marca-altura-logo: 2rem;
}
</style>
