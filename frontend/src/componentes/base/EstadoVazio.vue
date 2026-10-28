<script setup lang="ts">
import type { NomeIcone } from '@/design/icones'

withDefaults(defineProps<{ titulo: string; descricao?: string; icone?: NomeIcone; variante?: 'cartao' | 'simples' }>(), {
  descricao: undefined,
  icone: 'arquivar',
  variante: 'cartao',
})
</script>

<template>
  <section
    class="estado-vazio"
    :class="`estado-vazio--${variante}`"
    data-teste="estado-vazio"
  >
    <span
      class="estado-vazio__circulo"
      aria-hidden="true"
    >
      <span :class="['ie', `ie-${icone}`]" />
    </span>
    <h2 class="estado-vazio__titulo">
      {{ titulo }}
    </h2>
    <p
      v-if="descricao"
      class="estado-vazio__descricao"
    >
      {{ descricao }}
    </p>
    <div
      v-if="$slots.acao"
      class="estado-vazio__acao"
    >
      <slot name="acao" />
    </div>
  </section>
</template>

<style scoped>
.estado-vazio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.875rem;
  padding: var(--p-espaco-12) var(--p-espaco-8);
  text-align: center;
}

.estado-vazio--cartao {
  background: var(--p-cor-superficie);
  border: 1px dashed var(--p-cor-borda-suave);
  border-radius: var(--p-raio-cartao-amplo);
}

.estado-vazio--simples {
  padding: var(--p-espaco-10) var(--p-espaco-6);
}

.estado-vazio__circulo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--p-dimensao-tile-vazio);
  height: var(--p-dimensao-tile-vazio);
  font-size: 1.75rem;
  color: var(--p-cor-destaque-texto);
  background: var(--p-cor-destaque);
  border-radius: var(--p-raio-painel);
}

.estado-vazio .estado-vazio__titulo {
  font-size: var(--p-fonte-tamanho-secao);
  line-height: var(--p-fonte-entrelinha-titulo);
}

.estado-vazio__descricao {
  max-width: 21.25rem;
  font-size: var(--p-fonte-tamanho-corpo);
  line-height: var(--p-fonte-entrelinha-corpo);
  color: var(--p-cor-texto-apoio);
}

.estado-vazio__acao {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--p-espaco-3);
  padding-top: 0.375rem;
}
</style>
