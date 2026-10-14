<script setup lang="ts">
import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'

withDefaults(defineProps<{ hora: string; selo: string; aoVivo?: boolean }>(), { aoVivo: false })
</script>

<template>
  <div
    class="relogio-operacao"
    data-teste="relogio-operacao"
  >
    <time
      class="relogio-operacao__hora"
      :datetime="hora"
      :aria-label="TEXTOS_GRANDE_DIA.relogio(hora)"
      data-teste="relogio-operacao-hora"
    >{{ hora }}</time>
    <span
      class="relogio-operacao__selo"
      :class="{ 'relogio-operacao__selo--ao-vivo': aoVivo }"
      data-teste="relogio-operacao-selo"
    >
      <span
        v-if="aoVivo"
        class="relogio-operacao__ponto"
        aria-hidden="true"
      />
      {{ selo }}
    </span>
  </div>
</template>

<style scoped>
.relogio-operacao {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-3);
  align-items: center;
  justify-content: space-between;
}

.relogio-operacao__hora {
  font-size: var(--p-fonte-tamanho-relogio);
  font-weight: var(--p-fonte-peso-seminegrito);
  font-variant-numeric: tabular-nums;
  line-height: var(--p-fonte-entrelinha-display);
  color: var(--p-cor-operacao-texto);
}

.relogio-operacao__selo {
  display: inline-flex;
  gap: var(--p-espaco-2);
  align-items: center;
  min-height: var(--p-espaco-7);
  padding: 0 var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-rotulo);
  font-weight: var(--p-fonte-peso-negrito);
  color: var(--p-cor-operacao-apoio);
  background: var(--p-cor-operacao-superficie);
  border-radius: var(--p-raio-total);
}

.relogio-operacao__selo--ao-vivo {
  color: var(--p-cor-operacao-ao-vivo);
  background: var(--p-cor-operacao-ao-vivo-fundo);
}

.relogio-operacao__ponto {
  width: var(--p-espaco-2);
  height: var(--p-espaco-2);
  background: currentcolor;
  border-radius: var(--p-raio-total);
}

@media (prefers-reduced-motion: no-preference) {
  .relogio-operacao__ponto {
    animation: relogio-operacao-pulso calc(var(--p-duracao-lenta) * 8) ease-in-out infinite;
  }
}

@keyframes relogio-operacao-pulso {
  50% {
    opacity: 0.35;
  }
}
</style>
