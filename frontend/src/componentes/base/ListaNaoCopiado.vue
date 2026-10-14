<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ titulo: string; itens: readonly string[]; idTitulo: string }>()

const temItens = computed(() => props.itens.length > 0)
</script>

<template>
  <section
    class="lista-nao-copiado"
    :aria-labelledby="idTitulo"
    data-teste="lista-nao-copiado"
  >
    <h2
      :id="idTitulo"
      class="lista-nao-copiado__titulo texto-rotulo"
    >
      {{ titulo }}
    </h2>
    <ul
      v-if="temItens"
      class="lista-nao-copiado__itens"
    >
      <li
        v-for="item in itens"
        :key="item"
        class="lista-nao-copiado__item"
      >
        <span
          class="ie ie-permissao lista-nao-copiado__icone"
          aria-hidden="true"
        />
        <span>{{ item }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.lista-nao-copiado {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  min-width: 0;
}

.lista-nao-copiado .lista-nao-copiado__titulo {
  margin: 0;
}

.lista-nao-copiado__itens {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.lista-nao-copiado__item {
  display: flex;
  align-items: flex-start;
  gap: var(--p-ritmo-campo);
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-corpo);
  color: var(--p-cor-texto-apoio);
}

.lista-nao-copiado__icone {
  flex-shrink: 0;
  margin-top: var(--p-espaco-1);
}
</style>
