<script setup lang="ts">
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'
import type { TotaisConvidadosDto } from '@/tipos/convidados'

defineProps<{ totais: TotaisConvidadosDto }>()
</script>

<template>
  <section
    class="confirmados-grande-dia"
    aria-labelledby="grande-dia-convidados"
    data-teste="grande-dia-convidados"
  >
    <h2
      id="grande-dia-convidados"
      class="confirmados-grande-dia__titulo"
    >
      {{ TEXTOS_GRANDE_DIA.convidadosTitulo }}
    </h2>
    <p
      class="confirmados-grande-dia__total"
      data-teste="grande-dia-confirmados"
    >
      <span class="confirmados-grande-dia__numero">{{ totais.confirmados.total.toLocaleString('pt-BR') }}</span>{{ ' ' }}<span class="confirmados-grande-dia__legenda">{{ TEXTOS_GRANDE_DIA.confirmadas(totais.confirmados.total) }}</span>
    </p>
    <p class="confirmados-grande-dia__apoio">
      {{ TEXTOS_CONVIDADOS.detalheFaixas(totais.confirmados.adultos, totais.confirmados.criancas) }}
    </p>
    <p
      v-if="totais.pendentes.total > 0"
      class="confirmados-grande-dia__apoio"
      data-teste="grande-dia-sem-resposta"
    >
      {{ TEXTOS_GRANDE_DIA.semResposta(totais.pendentes.total) }}
    </p>
  </section>
</template>

<style scoped>
.confirmados-grande-dia {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.confirmados-grande-dia__titulo {
  margin: 0 0 var(--p-espaco-1);
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-operacao-apoio);
}

.confirmados-grande-dia__total {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-1) var(--p-espaco-3);
  align-items: baseline;
  margin: 0;
}

.confirmados-grande-dia__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-operacao);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: tabular-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-operacao-texto);
}

.confirmados-grande-dia__legenda {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-titulo);
  font-style: italic;
  color: var(--p-cor-operacao-texto);
}

.confirmados-grande-dia__apoio {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-operacao-apoio);
}
</style>
