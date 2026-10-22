<script setup lang="ts">
import { TEXTOS_EVENTOS } from '@/textos/eventos'

withDefaults(
  defineProps<{ primeiro: string; segundo: string; tamanho?: 'linha' | 'cartao' | 'titulo' | 'navegacao' | 'display' }>(),
  { tamanho: 'linha' },
)
</script>

<template>
  <span
    class="nomes-anfitrioes"
    :class="`nomes-anfitrioes--${tamanho}`"
    data-teste="nomes-anfitrioes"
  >
    <span class="nomes-anfitrioes__nome">{{ primeiro }}</span>
    <span
      class="nomes-anfitrioes__e"
      aria-hidden="true"
    >&amp;</span>
    <span class="somente-leitor-tela">{{ ` ${TEXTOS_EVENTOS.conectorNomes} ` }}</span>
    <span class="nomes-anfitrioes__nome">{{ segundo }}</span>
  </span>
</template>

<style scoped>
.nomes-anfitrioes {
  overflow-wrap: anywhere;
}

.nomes-anfitrioes__e {
  margin: 0 0.25em;
  font-family: var(--p-fonte-serif);
  font-variant-numeric: lining-nums;
  font-weight: var(--p-fonte-peso-regular);
  font-style: italic;
  color: var(--p-cor-acento-texto);
}

.nomes-anfitrioes--linha {
  font-weight: var(--p-fonte-peso-medio);
}

.nomes-anfitrioes--linha .nomes-anfitrioes__e {
  font-size: 1.15em;
  line-height: 1;
}

.nomes-anfitrioes--cartao,
.nomes-anfitrioes--titulo,
.nomes-anfitrioes--navegacao,
.nomes-anfitrioes--display {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.nomes-anfitrioes--cartao,
.nomes-anfitrioes--navegacao {
  font-weight: var(--p-fonte-peso-regular);
}

.nomes-anfitrioes--cartao {
  font-size: var(--p-fonte-tamanho-secao);
}

.nomes-anfitrioes--titulo,
.nomes-anfitrioes--display {
  font-size: inherit;
  font-weight: var(--p-fonte-peso-leve);
}

.nomes-anfitrioes--display {
  line-height: var(--p-fonte-entrelinha-display);
}
</style>
