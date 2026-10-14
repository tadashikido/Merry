<script setup lang="ts">
withDefaults(defineProps<{ inicio: string; atividade: string; detalhe?: string | null; concluido?: boolean }>(), {
  detalhe: null,
  concluido: false,
})
</script>

<template>
  <li
    class="linha-operacao"
    :class="{ 'linha-operacao--concluido': concluido }"
    data-teste="linha-operacao"
  >
    <time
      class="linha-operacao__horario"
      :datetime="inicio"
    >{{ inicio }}</time>
    <div class="linha-operacao__texto">
      <span
        class="linha-operacao__atividade"
        data-teste="linha-operacao-atividade"
      >{{ atividade }}</span>
      <span
        v-if="detalhe"
        class="linha-operacao__detalhe"
      >
        <span
          v-if="concluido"
          class="ie ie-concluido"
          aria-hidden="true"
        />
        {{ detalhe }}
      </span>
    </div>
    <div
      v-if="$slots.acoes"
      class="linha-operacao__acoes"
    >
      <slot name="acoes" />
    </div>
  </li>
</template>

<style scoped>
.linha-operacao {
  display: flex;
  gap: var(--p-espaco-3);
  align-items: center;
  min-height: var(--p-dimensao-alvo-toque-movel);
  padding: var(--p-espaco-2) 0;
  list-style: none;
  border-top: 1px solid var(--p-cor-operacao-divisoria);
}

.linha-operacao:first-child {
  border-top: 0;
}

.linha-operacao__horario {
  flex-shrink: 0;
  width: var(--p-dimensao-coluna-horario-cronograma-celular);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  font-variant-numeric: tabular-nums;
  color: var(--p-cor-operacao-texto);
}

.linha-operacao__texto {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.linha-operacao__atividade {
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-operacao-texto);
  overflow-wrap: anywhere;
}

.linha-operacao__detalhe {
  display: inline-flex;
  gap: var(--p-espaco-1);
  align-items: center;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-operacao-apoio);
}

.linha-operacao--concluido .linha-operacao__detalhe {
  color: var(--p-cor-operacao-sucesso);
}

.linha-operacao--concluido .linha-operacao__atividade,
.linha-operacao--concluido .linha-operacao__horario {
  color: var(--p-cor-operacao-apoio);
}

.linha-operacao__acoes {
  flex-shrink: 0;
}
</style>
