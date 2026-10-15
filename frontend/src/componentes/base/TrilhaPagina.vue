<script setup lang="ts">
import { RouterLink } from 'vue-router'

import type { ItemTrilha } from './tipos'

defineProps<{ itens: ItemTrilha[] }>()
</script>

<template>
  <ol
    class="trilha-pagina"
    data-teste="trilha"
  >
    <li
      v-for="(item, indice) in itens"
      :key="item.chave"
      class="trilha-pagina__item"
      :class="{ 'trilha-pagina__item--atual': !item.rota }"
    >
      <span
        v-if="indice > 0"
        class="trilha-pagina__separador"
        aria-hidden="true"
      >/</span>
      <RouterLink
        v-if="item.rota"
        :to="item.rota"
        class="trilha-pagina__link"
        data-teste="trilha-link"
      >
        {{ item.rotulo }}
      </RouterLink>
      <span
        v-else
        class="trilha-pagina__atual"
        aria-current="page"
        data-teste="trilha-atual"
      >{{ item.rotulo }}</span>
    </li>
  </ol>
</template>

<style scoped>
.trilha-pagina {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-espaco-1) 0;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.trilha-pagina__item {
  display: inline-flex;
  align-items: baseline;
  min-width: 0;
}

.trilha-pagina__item--atual {
  flex: 0 1 auto;
  overflow: hidden;
}

.trilha-pagina__separador {
  padding: 0 var(--p-espaco-2);
  color: var(--p-cor-texto-apoio);
}

.trilha-pagina__atual {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
