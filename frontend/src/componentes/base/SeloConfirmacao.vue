<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{ titulo: string; animado?: boolean }>(), { animado: false })

const tituloRef = ref<HTMLHeadingElement | null>(null)

function focar() {
  tituloRef.value?.focus()
}

defineExpose({ focar })
</script>

<template>
  <section
    class="selo-confirmacao"
    :class="{ 'selo-confirmacao--animado': animado }"
    data-teste="selo-confirmacao"
  >
    <span
      class="selo-confirmacao__marca ie ie-concluir"
      aria-hidden="true"
    />
    <h2
      ref="tituloRef"
      class="selo-confirmacao__titulo"
      tabindex="-1"
    >
      {{ titulo }}
    </h2>
    <div
      v-if="$slots.default"
      class="selo-confirmacao__texto"
    >
      <slot />
    </div>
  </section>
</template>

<style scoped>
.selo-confirmacao {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-3);
  text-align: center;
}

.selo-confirmacao__marca {
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  font-size: 1.875rem;
  color: var(--p-cor-sucesso-texto);
  background: var(--p-cor-sucesso-suave);
  border-radius: var(--p-raio-total);
}

.selo-confirmacao .selo-confirmacao__titulo {
  font-family: var(--p-fonte-editorial);
  font-variant-numeric: lining-nums;
  font-size: 2.375rem;
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-titulo);
}

.selo-confirmacao__titulo:focus {
  outline: none;
}

.selo-confirmacao__texto {
  line-height: 1.55;
  color: var(--p-cor-texto-quente);
}

.selo-confirmacao--animado .selo-confirmacao__marca {
  animation: selo-confirmacao-carimbo var(--p-duracao-lenta) ease-out both;
}

@keyframes selo-confirmacao-carimbo {
  from {
    opacity: 0;
    transform: scale(0.96);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
