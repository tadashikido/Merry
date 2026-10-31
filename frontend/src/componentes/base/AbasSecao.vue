<script setup lang="ts">
import { RouterLink } from 'vue-router'

import type { AbaSecao } from './tipos'

defineProps<{
  rotulo: string
  abas: AbaSecao[]
  ativa: string
}>()
</script>

<template>
  <nav
    class="abas-secao"
    :aria-label="rotulo"
    data-teste="abas-secao"
  >
    <ul class="abas-secao__lista">
      <li
        v-for="aba in abas"
        :key="aba.chave"
        class="abas-secao__item"
      >
        <RouterLink
          :to="aba.rota"
          class="abas-secao__aba"
          :class="{ 'abas-secao__aba--ativa': aba.chave === ativa }"
          :aria-current="aba.chave === ativa ? 'page' : undefined"
          :data-teste="`aba-${aba.chave}`"
        >
          {{ aba.rotulo }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.abas-secao {
  display: flex;
  max-width: 100%;
  overflow-x: auto;
}

.abas-secao__lista {
  display: inline-flex;
  gap: var(--p-espaco-1);
  margin: 0;
  padding: var(--p-espaco-1);
  list-style: none;
  background: var(--p-cor-trilho);
  border-radius: var(--p-raio-trilho-abas);
}

.abas-secao__item {
  flex: none;
}

.abas-secao__aba {
  display: inline-flex;
  align-items: center;
  min-height: var(--p-dimensao-alvo-toque);
  padding: var(--p-espaco-1) var(--p-espaco-5);
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-secundario);
  text-decoration: none;
  white-space: nowrap;
  border-radius: var(--p-raio-aba);
}

.abas-secao__aba:hover {
  color: var(--p-cor-titulo);
}

.abas-secao__aba--ativa,
.abas-secao__aba--ativa:hover {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-titulo);
  background: var(--p-cor-superficie);
  box-shadow: var(--p-sombra-suave);
}

.abas-secao__aba:focus-visible {
  outline: var(--p-focus-ring-width) var(--p-focus-ring-style) var(--p-focus-ring-color);
  outline-offset: var(--p-focus-ring-offset);
}

@media (pointer: coarse) {
  .abas-secao__aba {
    min-height: var(--p-dimensao-alvo-toque-movel);
  }
}
</style>
