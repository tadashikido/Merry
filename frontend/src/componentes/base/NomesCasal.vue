<script setup lang="ts">
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'

withDefaults(
  defineProps<{ primeiro: string; segundo: string; tamanho?: 'linha' | 'cartao' | 'titulo' | 'navegacao' | 'display' }>(),
  { tamanho: 'linha' },
)
</script>

<template>
  <span
    class="nomes-casal"
    :class="`nomes-casal--${tamanho}`"
    data-teste="nomes-casal"
  >
    <span class="nomes-casal__nome">{{ primeiro }}</span>
    <span
      class="nomes-casal__e"
      aria-hidden="true"
    >&amp;</span>
    <span class="somente-leitor-tela">{{ ` ${TEXTOS_CASAMENTOS.conectorNomes} ` }}</span>
    <span class="nomes-casal__nome">{{ segundo }}</span>
  </span>
</template>

<style scoped>
.nomes-casal {
  overflow-wrap: anywhere;
}

.nomes-casal__e {
  margin: 0 0.25em;
  font-family: var(--p-fonte-serif);
  font-variant-numeric: lining-nums;
  font-weight: var(--p-fonte-peso-regular);
  font-style: italic;
  color: var(--p-cor-acento-texto);
}

.nomes-casal--linha {
  font-weight: var(--p-fonte-peso-medio);
}

.nomes-casal--linha .nomes-casal__e {
  font-size: 1.15em;
  line-height: 1;
}

.nomes-casal--cartao,
.nomes-casal--titulo,
.nomes-casal--navegacao,
.nomes-casal--display {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.nomes-casal--cartao,
.nomes-casal--navegacao {
  font-weight: var(--p-fonte-peso-regular);
}

.nomes-casal--cartao {
  font-size: var(--p-fonte-tamanho-secao);
}

.nomes-casal--titulo,
.nomes-casal--display {
  font-size: inherit;
  font-weight: var(--p-fonte-peso-leve);
}

.nomes-casal--display {
  line-height: var(--p-fonte-entrelinha-display);
}
</style>
