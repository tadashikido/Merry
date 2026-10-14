<script setup lang="ts">
defineProps<{ titulo: string; texto: string }>()
</script>

<template>
  <section
    class="faixa-fase-dia"
    role="status"
    data-teste="faixa-fase-dia"
  >
    <span
      class="ie ie-calendario faixa-fase-dia__icone"
      aria-hidden="true"
    />
    <div class="faixa-fase-dia__texto">
      <h2
        class="faixa-fase-dia__titulo"
        data-teste="faixa-fase-dia-titulo"
      >
        {{ titulo }}
      </h2>
      <p class="faixa-fase-dia__descricao">
        {{ texto }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.faixa-fase-dia {
  display: flex;
  gap: var(--p-espaco-3);
  align-items: flex-start;
  padding: var(--p-espaco-4);
  background: var(--p-cor-operacao-superficie);
  border-left: var(--p-dimensao-fio-cronograma) solid var(--p-cor-operacao-destaque);
  border-radius: var(--p-raio-painel);
}

.faixa-fase-dia__icone {
  flex-shrink: 0;
  margin-top: var(--p-espaco-1);
  font-size: var(--p-fonte-tamanho-titulo);
  color: var(--p-cor-operacao-destaque);
}

.faixa-fase-dia__texto {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.faixa-fase-dia__titulo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-operacao-texto);
}

.faixa-fase-dia__descricao {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-operacao-apoio);
}
</style>
