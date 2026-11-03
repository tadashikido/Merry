<script setup lang="ts">
import { onMounted } from 'vue'

import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import { useOperacaoAssessoriasStore } from '@/stores/operacaoAssessorias'
import { TEXTOS_OPERACAO } from '@/textos/operacao'

const store = useOperacaoAssessoriasStore()

onMounted(() => {
  void store.carregarDashboard()
})
</script>

<template>
  <section class="operacao-dashboard">
    <h1 class="operacao-dashboard__titulo">
      {{ TEXTOS_OPERACAO.dashboardTitulo }}
    </h1>

    <EstadoCarregando
      v-if="store.carregando"
      variante="cartao"
      :linhas="4"
    />
    <EstadoErro
      v-else-if="store.erro"
      @tentar-novamente="store.carregarDashboard"
    />
    <div
      v-else-if="store.dashboard"
      class="operacao-dashboard__grade"
    >
      <article class="operacao-card">
        <p class="operacao-card__rotulo">
          {{ TEXTOS_OPERACAO.cardTotalAssessorias }}
        </p>
        <p class="operacao-card__numero">
          {{ store.dashboard.totalAssessorias }}
        </p>
      </article>
      <article class="operacao-card">
        <p class="operacao-card__rotulo">
          {{ TEXTOS_OPERACAO.cardAtivas30 }}
        </p>
        <p class="operacao-card__numero">
          {{ store.dashboard.ativas30Dias }}
        </p>
      </article>
      <article class="operacao-card">
        <p class="operacao-card__rotulo">
          {{ TEXTOS_OPERACAO.cardTotalEventos }}
        </p>
        <p class="operacao-card__numero">
          {{ store.dashboard.totalEventos }}
        </p>
      </article>
      <article class="operacao-card">
        <p class="operacao-card__rotulo">
          {{ TEXTOS_OPERACAO.cardNovas }}
        </p>
        <p class="operacao-card__numero">
          {{ store.dashboard.novasNoPeriodo }}
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.operacao-dashboard {
  max-width: 60rem;
  margin-inline: auto;
  padding: 1.5rem;
}

.operacao-dashboard__titulo {
  margin: 0 0 1.25rem;
}

.operacao-dashboard__grade {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1rem;
}

.operacao-card {
  padding: 1.25rem;
  background: var(--p-cor-superficie, #fff);
  border: 1px solid var(--p-cor-borda, #e2e8f0);
  border-radius: var(--p-raio-painel, 0.75rem);
}

.operacao-card__rotulo {
  margin: 0;
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.875rem;
}

.operacao-card__numero {
  margin: 0.5rem 0 0;
  font-size: 2rem;
  font-weight: 700;
}
</style>
