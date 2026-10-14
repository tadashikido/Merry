<script setup lang="ts">
import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'

withDefaults(
  defineProps<{ inicio: string; atividade: string; quem?: string | null; quando: string; idTitulo?: string }>(),
  { quem: null, idTitulo: 'linha-proximo-titulo' },
)
</script>

<template>
  <section
    class="linha-proximo"
    :aria-labelledby="idTitulo"
    data-teste="linha-proximo"
  >
    <div class="linha-proximo__texto">
      <h2
        :id="idTitulo"
        class="linha-proximo__rotulo"
      >
        <span>{{ TEXTOS_GRANDE_DIA.proximo }}</span>
        <span
          class="linha-proximo__quando"
          data-teste="linha-proximo-quando"
        > · {{ quando }}</span>
      </h2>
      <p
        class="linha-proximo__atividade"
        data-teste="linha-proximo-atividade"
      >
        {{ atividade }}
      </p>
      <p
        v-if="quem"
        class="linha-proximo__quem"
      >
        {{ quem }}
      </p>
    </div>
    <time
      class="linha-proximo__horario"
      :datetime="inicio"
    >{{ inicio }}</time>
  </section>
</template>

<style scoped>
.linha-proximo {
  display: flex;
  gap: var(--p-espaco-4);
  align-items: center;
  padding: var(--p-espaco-4) var(--p-espaco-5);
  border: 1px solid var(--p-cor-operacao-borda);
  border-radius: var(--p-raio-folha);
}

.linha-proximo__texto {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.linha-proximo__rotulo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-operacao-apoio);
}

.linha-proximo__quando {
  color: var(--p-cor-operacao-destaque);
}

.linha-proximo__atividade {
  margin: 0;
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-negrito);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-operacao-texto);
  overflow-wrap: anywhere;
}

.linha-proximo__quem {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-operacao-apoio);
  overflow-wrap: anywhere;
}

.linha-proximo__horario {
  flex-shrink: 0;
  font-size: var(--p-fonte-tamanho-operacao);
  font-weight: var(--p-fonte-peso-negrito);
  font-variant-numeric: tabular-nums;
  color: var(--p-cor-operacao-texto);
}
</style>
