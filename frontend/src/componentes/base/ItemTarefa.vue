<script setup lang="ts">
import { computed } from 'vue'

import BadgeStatus from './BadgeStatus.vue'
import type { VarianteStatus } from './tipos'

const props = withDefaults(
  defineProps<{
    titulo: string
    metadados?: string[]
    descricao?: string | null
    badge?: { texto: string; variante: VarianteStatus } | null
    concluida?: boolean
    cancelada?: boolean
    podeAlternar?: boolean
    alternando?: boolean
    rotuloAlternar: string
  }>(),
  {
    metadados: () => [],
    descricao: null,
    badge: null,
    concluida: false,
    cancelada: false,
    podeAlternar: true,
    alternando: false,
  },
)

const emit = defineEmits<{ alternar: [] }>()

const bloqueado = computed(() => !props.podeAlternar || props.cancelada || props.alternando)

function alternar() {
  if (!bloqueado.value) {
    emit('alternar')
  }
}
</script>

<template>
  <li
    class="item-tarefa"
    :class="{
      'item-tarefa--concluida': concluida,
      'item-tarefa--cancelada': cancelada,
    }"
    data-teste="item-tarefa"
  >
    <button
      type="button"
      class="item-tarefa__anel"
      :aria-pressed="concluida"
      :aria-label="rotuloAlternar"
      :aria-disabled="bloqueado"
      :aria-busy="alternando"
      data-teste="alternar-tarefa"
      @click="alternar"
    >
      <span
        class="item-tarefa__circulo"
        aria-hidden="true"
      >
        <span class="ie ie-concluir item-tarefa__marca" />
      </span>
    </button>

    <div class="item-tarefa__conteudo">
      <div class="item-tarefa__linha">
        <span
          class="item-tarefa__titulo"
          data-teste="titulo-tarefa"
        >{{ titulo }}</span>
        <BadgeStatus
          v-if="badge"
          :texto="badge.texto"
          :variante="badge.variante"
          ponto
          class="item-tarefa__badge"
        />
      </div>
      <p
        v-if="metadados.length > 0"
        class="item-tarefa__metadados"
        data-teste="metadados-tarefa"
      >
        <template
          v-for="(item, indice) in metadados"
          :key="item"
        >
          <span
            v-if="indice > 0"
            aria-hidden="true"
          > · </span>{{ item }}
        </template>
      </p>
      <p
        v-if="descricao"
        class="item-tarefa__descricao"
        :title="descricao"
      >
        {{ descricao }}
      </p>
    </div>

    <div
      v-if="$slots.acoes"
      class="item-tarefa__acoes"
    >
      <slot name="acoes" />
    </div>
  </li>
</template>

<style scoped>
.item-tarefa {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--p-espaco-2);
  padding: var(--p-espaco-3) var(--p-espaco-3) var(--p-espaco-3) var(--p-espaco-1);
  list-style: none;
}

.item-tarefa + .item-tarefa {
  border-top: 1px solid var(--p-cor-divisoria);
}

.item-tarefa__anel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--p-dimensao-alvo-toque);
  height: var(--p-dimensao-alvo-toque);
  margin: calc(var(--p-espaco-2) * -1) 0;
  padding: 0;
  border: 0;
  border-radius: var(--p-raio-total);
  background: transparent;
  color: var(--p-cor-borda-campo);
  cursor: pointer;
}

.item-tarefa__anel[aria-disabled='true'] {
  cursor: default;
}

.item-tarefa__anel:focus-visible {
  outline: var(--p-focus-ring-width) var(--p-focus-ring-style) var(--p-focus-ring-color);
  outline-offset: calc(var(--p-focus-ring-offset) * -1);
}

.item-tarefa__circulo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--p-espaco-6);
  height: var(--p-espaco-6);
  border: 1.5px solid currentColor;
  border-radius: var(--p-raio-total);
  background: var(--p-cor-superficie);
  transition:
    background-color var(--p-duracao-rapida) ease-out,
    border-color var(--p-duracao-rapida) ease-out,
    color var(--p-duracao-rapida) ease-out;
}

.item-tarefa__marca {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-superficie);
  opacity: 0;
  transition: opacity var(--p-duracao-rapida) ease-out;
}

.item-tarefa__anel:not([aria-disabled='true']):hover {
  color: var(--p-cor-sucesso);
}

.item-tarefa__anel:not([aria-disabled='true']):hover .item-tarefa__marca {
  color: var(--p-cor-sucesso);
  opacity: 1;
}

.item-tarefa--concluida .item-tarefa__anel {
  color: var(--p-cor-sucesso);
}

.item-tarefa--concluida .item-tarefa__circulo {
  background: var(--p-cor-sucesso);
}

.item-tarefa--concluida .item-tarefa__marca,
.item-tarefa--concluida .item-tarefa__anel:not([aria-disabled='true']):hover .item-tarefa__marca {
  color: var(--p-cor-superficie);
  opacity: 1;
}

.item-tarefa--cancelada .item-tarefa__circulo {
  border-style: dashed;
  background: var(--p-cor-superficie-sutil);
}

.item-tarefa__conteudo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
  padding-top: var(--p-espaco-1);
}

.item-tarefa__linha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
}

.item-tarefa__titulo {
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-seminegrito);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.item-tarefa--concluida .item-tarefa__titulo {
  color: var(--p-cor-texto-apoio);
  text-decoration: line-through;
}

.item-tarefa--cancelada .item-tarefa__titulo {
  color: var(--p-cor-texto-apoio);
}

.item-tarefa__metadados,
.item-tarefa__descricao {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.item-tarefa__metadados {
  font-variant-numeric: tabular-nums;
}

.item-tarefa__descricao {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-tarefa__acoes {
  display: flex;
  align-items: center;
}

@media (pointer: coarse) {
  .item-tarefa__anel {
    width: var(--p-dimensao-alvo-toque-movel);
    height: var(--p-dimensao-alvo-toque-movel);
  }
}

@media (prefers-reduced-motion: reduce) {
  .item-tarefa__circulo,
  .item-tarefa__marca {
    transition: none;
  }
}
</style>
