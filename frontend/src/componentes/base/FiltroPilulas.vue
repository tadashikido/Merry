<script setup lang="ts" generic="Valor extends string">
import type { OpcaoFiltroPilula } from './tipos'
import { classeTom } from '@/textos/tiposEvento'

defineProps<{ opcoes: OpcaoFiltroPilula<Valor>[]; rotulo: string }>()

const selecionado = defineModel<Valor>({ required: true })
</script>

<template>
  <div
    class="filtro-pilulas"
    role="group"
    :aria-label="rotulo"
    data-teste="filtro-pilulas"
  >
    <button
      v-for="opcao in opcoes"
      :key="opcao.valor"
      type="button"
      class="filtro-pilulas__opcao"
      :class="[opcao.tom ? classeTom(opcao.tom) : null, { 'filtro-pilulas__opcao--ativa': selecionado === opcao.valor }]"
      :aria-pressed="selecionado === opcao.valor"
      data-teste="filtro-pilula"
      @click="selecionado = opcao.valor"
    >
      <span
        v-if="opcao.tom"
        class="filtro-pilulas__ponto"
        aria-hidden="true"
      />
      {{ opcao.rotulo }}
      <span
        v-if="opcao.contagem !== undefined"
        class="filtro-pilulas__contagem numeros-tabulares"
      >{{ opcao.contagem }}</span>
    </button>
  </div>
</template>

<style scoped>
.filtro-pilulas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
}

.filtro-pilulas__opcao {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-2);
  min-height: var(--p-dimensao-altura-pilula);
  padding: 0 var(--p-espaco-4);
  font: inherit;
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-titulo);
  cursor: pointer;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda-controle);
  border-radius: var(--p-raio-total);
  transition:
    background-color var(--p-duracao-rapida),
    color var(--p-duracao-rapida);
}

.filtro-pilulas__opcao:hover {
  background: var(--p-cor-acento-suave);
}

.filtro-pilulas__opcao--ativa,
.filtro-pilulas__opcao--ativa:hover {
  color: var(--p-primary-contrast-color);
  background: var(--p-cor-primaria);
  border-color: var(--p-cor-primaria);
}

.filtro-pilulas__ponto {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--tom-viva);
  border-radius: var(--p-raio-total);
}

.filtro-pilulas__contagem {
  font-weight: var(--p-fonte-peso-medio);
}
</style>
