<script setup lang="ts">
import type { ItemContagem } from './tipos'
import { formatarNumero } from '@/utilitarios/formatacao'

defineProps<{ itens: ItemContagem[]; rotulo: string }>()
</script>

<template>
  <section
    class="resumo-contagem"
    :aria-label="rotulo"
    data-teste="resumo-contagem"
  >
    <ul class="resumo-contagem__itens">
      <li
        v-for="item in itens"
        :key="item.chave"
        class="resumo-contagem__item"
        :class="{ 'resumo-contagem__item--destaque': item.destaque }"
        :data-teste="`contagem-${item.chave}`"
      >
        <span class="resumo-contagem__numero numeros-tabulares">{{ formatarNumero(item.valor) }}</span>
        <span class="resumo-contagem__rotulo">{{ item.rotulo }}<span
          v-if="item.detalhe"
          class="somente-leitor-tela"
        >:</span></span>
        <span
          v-if="item.detalhe"
          class="resumo-contagem__detalhe"
        >{{ item.detalhe }}</span>
      </li>
    </ul>
    <p
      v-if="$slots.rodape"
      class="resumo-contagem__rodape"
    >
      <slot name="rodape" />
    </p>
  </section>
</template>

<style scoped>
.resumo-contagem {
  display: flex;
  flex-direction: column;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.resumo-contagem__itens {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

.resumo-contagem__item {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
  padding: var(--p-espaco-4);
}

.resumo-contagem__item:nth-child(even) {
  border-left: 1px solid var(--p-cor-borda);
}

.resumo-contagem__item:nth-child(n + 3) {
  border-top: 1px solid var(--p-cor-borda);
}

.resumo-contagem__numero {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.resumo-contagem__item--destaque .resumo-contagem__numero {
  color: var(--p-cor-primaria);
}

.resumo-contagem__rotulo {
  color: var(--p-cor-texto);
}

.resumo-contagem__detalhe {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.resumo-contagem__rodape {
  margin: 0;
  padding: var(--p-espaco-3) var(--p-espaco-4);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
  border-top: 1px solid var(--p-cor-borda);
}

@media (min-width: 640px) {
  .resumo-contagem__itens {
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    grid-auto-flow: column;
  }

  .resumo-contagem__item:nth-child(n) {
    border-top: 0;
    border-left: 1px solid var(--p-cor-borda);
  }

  .resumo-contagem__item:first-child {
    border-left: 0;
  }

  .resumo-contagem__item {
    padding: var(--p-espaco-5) var(--p-espaco-6);
  }
}

@media (min-width: 1024px) {
  .resumo-contagem__numero {
    font-size: var(--p-fonte-tamanho-pagina);
  }
}
</style>
