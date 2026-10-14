<script setup lang="ts">
import { useId } from 'vue'

import type { LinhaCardapio } from './tipos'
import { formatarNumero } from '@/utilitarios/formatacao'

defineProps<{ titulo: string; linhas: LinhaCardapio[]; vazio?: string }>()

const idTitulo = `${useId()}-resumo-cardapio`
</script>

<template>
  <section
    class="resumo-cardapio"
    :aria-labelledby="idTitulo"
    data-teste="resumo-cardapio"
  >
    <h2
      :id="idTitulo"
      class="resumo-cardapio__titulo"
    >
      {{ titulo }}
    </h2>
    <dl
      v-if="linhas.length > 0"
      class="resumo-cardapio__linhas"
    >
      <div
        v-for="linha in linhas"
        :key="linha.chave"
        class="resumo-cardapio__linha"
        :data-teste="`cardapio-${linha.chave}`"
      >
        <dt class="resumo-cardapio__rotulo">
          {{ linha.rotulo }}
        </dt>
        <dd class="resumo-cardapio__valor numeros-tabulares">
          {{ formatarNumero(linha.valor) }}
        </dd>
      </div>
    </dl>
    <p
      v-else-if="vazio"
      class="resumo-cardapio__rodape"
    >
      {{ vazio }}
    </p>
    <p
      v-if="$slots.rodape"
      class="resumo-cardapio__rodape"
    >
      <slot name="rodape" />
    </p>
  </section>
</template>

<style scoped>
.resumo-cardapio {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  max-width: var(--p-dimensao-largura-leitura);
  padding: var(--p-espaco-5);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.resumo-cardapio__titulo {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-secao);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.resumo-cardapio__linhas {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  margin: 0;
}

.resumo-cardapio__linha {
  display: flex;
  align-items: baseline;
  gap: var(--p-espaco-2);
}

.resumo-cardapio__linha::after {
  order: 1;
  flex: 1;
  min-width: var(--p-espaco-4);
  content: '';
  border-bottom: 1px dotted var(--p-cor-borda-campo);
}

.resumo-cardapio__rotulo {
  order: 0;
  color: var(--p-cor-texto);
}

.resumo-cardapio__valor {
  order: 2;
  margin: 0;
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-primaria);
}

.resumo-cardapio__rodape {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}
</style>
