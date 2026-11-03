<script setup lang="ts">
import { computed } from 'vue'

import { TEXTOS_MESAS } from '@/textos/mesas'

const props = withDefaults(defineProps<{ ocupados: number; lugares: number; compacta?: boolean }>(), { compacta: false })

const completa = computed(() => props.lugares > 0 && props.ocupados >= props.lugares)
const LUGARES_POR_FILEIRA = 15

const porFileira = computed(() => {
  const total = Math.max(props.lugares, 1)
  return Math.ceil(total / Math.ceil(total / LUGARES_POR_FILEIRA))
})
const lugares = computed(() =>
  Array.from({ length: Math.max(props.lugares, 0) }, (_, indice) => ({ indice, ocupado: indice < props.ocupados })),
)
</script>

<template>
  <div
    class="ocupacao-mesa"
    :class="{ 'ocupacao-mesa--completa': completa, 'ocupacao-mesa--compacta': compacta }"
    data-teste="ocupacao-mesa"
  >
    <span
      class="ocupacao-mesa__fileira"
      :style="{ '--lugares-por-fileira': porFileira }"
      role="img"
      :aria-label="TEXTOS_MESAS.ocupacaoAcessivel(ocupados, props.lugares)"
    >
      <span
        v-for="lugar in lugares"
        :key="lugar.indice"
        class="ocupacao-mesa__lugar"
        :class="{ 'ocupacao-mesa__lugar--ocupado': lugar.ocupado }"
        aria-hidden="true"
        data-teste="lugar-mesa"
      />
    </span>
    <span
      class="ocupacao-mesa__texto numeros-tabulares"
      aria-hidden="true"
      data-teste="texto-ocupacao"
    >
      {{ TEXTOS_MESAS.ocupacao(ocupados, props.lugares) }}<span
        v-if="completa && !compacta"
        class="ocupacao-mesa__completa"
      > · {{ TEXTOS_MESAS.completaSufixo }}</span>
    </span>
  </div>
</template>

<style scoped>
.ocupacao-mesa {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo);
}

.ocupacao-mesa__fileira {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-1);
  max-inline-size: calc(var(--lugares-por-fileira) * var(--p-espaco-3) + (var(--lugares-por-fileira) - 1) * var(--p-espaco-1));
}

.ocupacao-mesa__lugar {
  inline-size: var(--p-espaco-3);
  block-size: var(--p-espaco-3);
  border: 1px dashed var(--p-cor-borda-campo);
  border-radius: var(--p-raio-total);
  background: var(--p-cor-superficie);
}

.ocupacao-mesa__lugar--ocupado {
  border: 1px solid var(--p-cor-primaria);
  background: var(--p-cor-primaria);
}

.ocupacao-mesa__texto {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-secundario);
  white-space: nowrap;
}

.ocupacao-mesa--completa .ocupacao-mesa__texto {
  color: var(--p-cor-fase-realizado-texto);
}

.ocupacao-mesa--completa .ocupacao-mesa__lugar--ocupado {
  border-color: var(--p-cor-fase-realizado-ponto);
  background: var(--p-cor-fase-realizado-ponto);
}

.ocupacao-mesa--compacta .ocupacao-mesa__lugar {
  inline-size: var(--p-espaco-2);
  block-size: var(--p-espaco-2);
}

.ocupacao-mesa--compacta .ocupacao-mesa__fileira {
  max-inline-size: calc(var(--lugares-por-fileira) * var(--p-espaco-2) + (var(--lugares-por-fileira) - 1) * var(--p-espaco-1));
}

@media print {
  .ocupacao-mesa__lugar {
    print-color-adjust: exact;
  }

  .ocupacao-mesa--completa .ocupacao-mesa__lugar--ocupado {
    border-color: var(--p-cor-primaria);
    background: var(--p-cor-primaria);
  }
}
</style>
