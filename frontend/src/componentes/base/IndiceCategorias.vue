<script setup lang="ts" generic="C extends string">
import { TEXTOS_INDICE_CATEGORIAS } from '@/textos/fornecedores'

import type { ItemIndiceCategorias } from './tipos'

defineProps<{ itens: ItemIndiceCategorias<C>[]; rotulo: string; rotuloTodas: string; total: number }>()

const selecionada = defineModel<C | null>({ required: true })

function selecionar(chave: C | null) {
  selecionada.value = chave
}
</script>

<template>
  <nav
    class="indice-categorias"
    :aria-label="rotulo"
    data-teste="indice-categorias"
  >
    <ul class="indice-categorias__lista">
      <li>
        <button
          type="button"
          class="indice-categorias__item"
          :aria-pressed="selecionada === null"
          :aria-label="`${rotuloTodas}, ${TEXTOS_INDICE_CATEGORIAS.quantidade(total)}`"
          data-teste="indice-todas"
          @click="selecionar(null)"
        >
          <span class="indice-categorias__rotulo">{{ rotuloTodas }}</span>
          <span
            class="indice-categorias__quantidade"
            aria-hidden="true"
          >{{ total }}</span>
        </button>
      </li>
      <li
        v-for="item in itens"
        :key="item.chave"
      >
        <button
          type="button"
          class="indice-categorias__item"
          :aria-pressed="selecionada === item.chave"
          :aria-label="`${item.rotulo}, ${TEXTOS_INDICE_CATEGORIAS.quantidade(item.quantidade)}`"
          :data-chave="item.chave"
          data-teste="indice-categoria"
          @click="selecionar(item.chave)"
        >
          <span class="indice-categorias__rotulo">{{ item.rotulo }}</span>
          <span
            class="indice-categorias__quantidade"
            aria-hidden="true"
          >{{ item.quantidade }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.indice-categorias {
  container: indice-categorias / inline-size;
}

.indice-categorias__lista {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.indice-categorias__item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--p-espaco-3);
  width: 100%;
  min-height: var(--p-dimensao-alvo-toque);
  padding: var(--p-espaco-2) var(--p-espaco-3);
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--p-raio-controle);
}

.indice-categorias__item:hover {
  color: var(--p-cor-texto);
  background: var(--p-cor-superficie-sutil);
}

.indice-categorias__item[aria-pressed='true'] {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-primaria);
  background: var(--p-cor-primaria-suave);
}

.indice-categorias__rotulo {
  min-width: 0;
  overflow-wrap: anywhere;
}

.indice-categorias__quantidade {
  flex: none;
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-medio);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1;
  color: var(--p-cor-primaria);
}

@container indice-categorias (min-width: 30rem) {
  .indice-categorias__lista {
    flex-flow: row wrap;
    gap: var(--p-ritmo-campo);
  }

  .indice-categorias__item {
    align-items: center;
    width: auto;
    padding-inline: var(--p-ritmo-grupo);
    border: 1px solid var(--p-cor-borda);
  }

  .indice-categorias__item[aria-pressed='true'] {
    border-color: var(--p-cor-primaria-suave);
  }

  .indice-categorias__quantidade {
    font-size: var(--p-fonte-tamanho-titulo);
  }
}
</style>
