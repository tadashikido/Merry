<script setup lang="ts">
import type { ItemContagem } from './tipos'
import { formatarNumero } from '@/utilitarios/formatacao'

withDefaults(defineProps<{ itens: ItemContagem[]; rotulo: string; variante?: 'faixa' | 'indicadores' }>(), {
  variante: 'faixa',
})
</script>

<template>
  <section
    class="resumo-contagem"
    :class="`resumo-contagem--${variante}`"
    :aria-label="rotulo"
    data-teste="resumo-contagem"
  >
    <ul
      class="resumo-contagem__itens"
      :class="{ 'grade grade--indicadores': variante === 'indicadores' }"
    >
      <li
        v-for="item in itens"
        :key="item.chave"
        class="resumo-contagem__item"
        :class="{ 'resumo-contagem__item--destaque': item.destaque, 'cartao pilha pilha--campo': variante === 'indicadores' }"
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
      :class="{ 'texto-legenda': variante === 'indicadores' }"
    >
      <slot name="rodape" />
    </p>
  </section>
</template>

<style scoped>
.resumo-contagem {
  container: resumo-contagem / inline-size;
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

@container resumo-contagem (min-width: 36rem) {
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

@container resumo-contagem (min-width: 38rem) {
  .resumo-contagem__numero {
    font-size: var(--p-fonte-tamanho-pagina);
  }
}

.resumo-contagem--indicadores {
  gap: var(--p-ritmo-grupo);
  background: none;
  border: 0;
  border-radius: 0;
}

.resumo-contagem--indicadores .resumo-contagem__itens.grade {
  grid-template-columns: repeat(auto-fit, minmax(min(var(--grade-minimo), 100%), 1fr));
  grid-auto-flow: row;
}

.resumo-contagem--indicadores .resumo-contagem__item.cartao:nth-child(n) {
  gap: var(--p-ritmo-campo);
  padding: var(--p-ritmo-cartao);
  border: 1px solid var(--p-cor-borda);
}

.resumo-contagem--indicadores .resumo-contagem__numero.numeros-tabulares {
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-leve);
}

.resumo-contagem--indicadores .resumo-contagem__rodape.texto-legenda {
  padding: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  border-top: 0;
}
</style>
