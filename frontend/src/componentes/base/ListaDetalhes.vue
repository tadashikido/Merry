<script setup lang="ts">
import type { ItemDetalhe } from './tipos'
import { VALOR_AUSENTE } from '@/textos/rotulos'

defineProps<{ itens: ItemDetalhe[]; embutida?: boolean }>()

function exibir(valor: ItemDetalhe['valor']): string {
  if (valor === null || valor === undefined || String(valor).trim() === '') {
    return VALOR_AUSENTE
  }
  return String(valor)
}
</script>

<template>
  <dl
    class="lista-detalhes"
    :class="{ 'lista-detalhes--embutida': embutida }"
    data-teste="lista-detalhes"
  >
    <div
      v-for="item in itens"
      :key="item.rotulo"
      class="lista-detalhes__item"
    >
      <dt class="lista-detalhes__rotulo">
        {{ item.rotulo }}
      </dt>
      <dd
        class="lista-detalhes__valor"
        :class="{
          'lista-detalhes__valor--multilinha': item.multilinha,
          'lista-detalhes__valor--ausente': exibir(item.valor) === VALOR_AUSENTE,
        }"
      >
        {{ exibir(item.valor) }}
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.lista-detalhes {
  display: flex;
  flex-direction: column;
  margin: 0;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.lista-detalhes__item {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  padding: var(--p-espaco-3) var(--p-espaco-4);
}

.lista-detalhes--embutida {
  background: none;
  border: 0;
  border-radius: 0;
}

.lista-detalhes--embutida .lista-detalhes__item {
  padding-inline: 0;
}

.lista-detalhes__item + .lista-detalhes__item {
  border-top: 1px solid var(--p-cor-borda);
}

.lista-detalhes__rotulo {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.lista-detalhes__valor {
  margin: 0;
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.lista-detalhes__valor--multilinha {
  white-space: pre-line;
  line-height: var(--p-fonte-entrelinha-leitura);
}

.lista-detalhes__valor--ausente {
  color: var(--p-cor-texto-apoio);
}

@media (min-width: 640px) {
  .lista-detalhes__item {
    display: grid;
    grid-template-columns: 12rem minmax(0, 1fr);
    gap: var(--p-espaco-4);
    align-items: baseline;
  }
}
</style>
