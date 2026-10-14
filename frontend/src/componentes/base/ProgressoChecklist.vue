<script setup lang="ts">
import { computed, useId } from 'vue'

import { TEXTOS_CHECKLIST } from '@/textos/checklist'

const props = withDefaults(
  defineProps<{
    percentual: number | null
    concluidas: number
    consideradas: number
    canceladas?: number
  }>(),
  { canceladas: 0 },
)

const idRotulo = `progresso-checklist-${useId()}`

const valor = computed(() => Math.min(100, Math.max(0, props.percentual ?? 0)))
const semChecklist = computed(() => props.percentual === null)
const textoAcessivel = computed(() =>
  props.percentual === null
    ? TEXTOS_CHECKLIST.semChecklist
    : TEXTOS_CHECKLIST.percentualAria(props.percentual, props.concluidas, props.consideradas),
)
</script>

<template>
  <div
    class="progresso-checklist"
    :class="{ 'progresso-checklist--vazio': semChecklist }"
    data-teste="progresso-checklist"
  >
    <p
      :id="idRotulo"
      class="progresso-checklist__linha"
    >
      <span
        v-if="!semChecklist"
        class="progresso-checklist__percentual"
        data-teste="percentual-checklist"
      >{{ valor }}%</span>
      <span class="progresso-checklist__frase">
        <template v-if="semChecklist">{{ TEXTOS_CHECKLIST.semChecklist }}</template>
        <template v-else>
          <span data-teste="frase-progresso">{{ TEXTOS_CHECKLIST.progresso(concluidas, consideradas) }}</span>
          <span
            v-if="canceladas > 0"
            class="progresso-checklist__canceladas"
          >{{ TEXTOS_CHECKLIST.canceladas(canceladas) }}</span>
        </template>
      </span>
    </p>
    <div
      class="progresso-checklist__trilho"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="valor"
      :aria-valuetext="textoAcessivel"
      :aria-labelledby="idRotulo"
      data-teste="barra-checklist"
    >
      <span
        class="progresso-checklist__preenchimento"
        :style="{ inlineSize: `${valor}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.progresso-checklist {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  min-width: 0;
}

.progresso-checklist__linha {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-espaco-1) var(--p-espaco-4);
  margin: 0;
}

.progresso-checklist__percentual {
  font-family: var(--p-fonte-editorial);
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-medio);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-primaria);
}

.progresso-checklist__frase {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.progresso-checklist__canceladas {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.progresso-checklist__trilho {
  height: 6px;
  overflow: hidden;
  background: var(--p-cor-trilho);
  border-radius: var(--p-raio-total);
}

.progresso-checklist__preenchimento {
  display: block;
  height: 100%;
  background: var(--p-cor-primaria);
  border-radius: var(--p-raio-total);
  transition: inline-size var(--p-duracao-lenta) ease-out;
}

.progresso-checklist--vazio .progresso-checklist__trilho {
  background: var(--p-cor-superficie);
  border: 1px dashed var(--p-cor-borda-campo);
}

@media (prefers-reduced-motion: reduce) {
  .progresso-checklist__preenchimento {
    transition: none;
  }
}
</style>
