<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    rotulo: string
    opcoes: { rotulo: string; valor: string }[]
    valorAtual?: string | null
    desabilitado?: boolean
  }>(),
  { valorAtual: null, desabilitado: false },
)

const emit = defineEmits<{ escolher: [valor: string] }>()

const atual = computed(() => (props.valorAtual ?? '').trim().toLocaleLowerCase('pt-BR'))

function marcada(valor: string): boolean {
  return atual.value !== '' && valor.trim().toLocaleLowerCase('pt-BR') === atual.value
}
</script>

<template>
  <div
    v-if="opcoes.length > 0"
    class="atalhos-preenchimento"
    role="group"
    :aria-label="rotulo"
    data-teste="atalhos-preenchimento"
  >
    <span
      class="atalhos-preenchimento__rotulo"
      aria-hidden="true"
    >{{ rotulo }}</span>
    <button
      v-for="opcao in opcoes"
      :key="opcao.rotulo"
      type="button"
      class="atalhos-preenchimento__opcao"
      :class="{ 'atalhos-preenchimento__opcao--marcada': marcada(opcao.valor) }"
      :aria-pressed="marcada(opcao.valor)"
      :disabled="desabilitado"
      data-teste="atalho-preenchimento"
      @click="emit('escolher', opcao.valor)"
    >
      {{ opcao.rotulo }}
    </button>
  </div>
</template>

<style scoped>
.atalhos-preenchimento {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
  align-items: center;
}

.atalhos-preenchimento__rotulo {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.atalhos-preenchimento__opcao {
  max-width: 100%;
  min-height: var(--p-dimensao-alvo-toque);
  padding: var(--p-espaco-1) var(--p-espaco-3);
  overflow: hidden;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-secundario);
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda-controle);
  border-radius: var(--p-raio-total);
}

.atalhos-preenchimento__opcao:hover:not(:disabled) {
  background: var(--p-cor-superficie-sutil);
}

.atalhos-preenchimento__opcao--marcada {
  color: var(--p-cor-primaria);
  background: var(--p-cor-salvia);
  border-color: var(--p-cor-primaria);
}

.atalhos-preenchimento__opcao:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (pointer: coarse) {
  .atalhos-preenchimento__opcao {
    min-height: var(--p-dimensao-alvo-toque-movel);
  }
}
</style>
