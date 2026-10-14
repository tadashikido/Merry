<script setup lang="ts">
withDefaults(defineProps<{ variante?: 'padrao' | 'operacao' | 'selecao' }>(), { variante: 'padrao' })
</script>

<template>
  <div
    class="barra-acao-fixa"
    :class="`barra-acao-fixa--${variante}`"
    data-teste="barra-acao-fixa"
  >
    <div
      v-if="$slots.status"
      class="barra-acao-fixa__status"
      aria-live="polite"
    >
      <slot name="status" />
    </div>
    <div class="barra-acao-fixa__acao">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.barra-acao-fixa {
  position: sticky;
  bottom: 0;
  z-index: var(--p-camada-cabecalho);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-espaco-3);
  margin: 0 calc(-1 * var(--p-espaco-5)) calc(-1 * var(--p-espaco-8));
  padding: var(--p-espaco-3) var(--p-espaco-5) calc(var(--p-espaco-3) + env(safe-area-inset-bottom, 0px));
  background: var(--p-cor-superficie);
  border-top: 1px solid var(--p-cor-borda);
  box-shadow: var(--p-sombra-sobreposicao);
}

.barra-acao-fixa__status {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-apoio);
}

.barra-acao-fixa__acao {
  flex: 1 1 12rem;
}

.barra-acao-fixa__acao :deep(.p-button) {
  width: 100%;
  min-height: var(--p-dimensao-alvo-toque-movel);
}

.barra-acao-fixa--operacao {
  margin-bottom: calc(-1 * var(--p-espaco-8));
  background: var(--p-cor-operacao-fundo);
  border-top-color: var(--p-cor-operacao-divisoria);
}

.barra-acao-fixa--operacao .barra-acao-fixa__acao :deep(.p-button) {
  --p-button-primary-background: var(--p-cor-operacao-acao);
  --p-button-primary-border-color: var(--p-cor-operacao-acao);
  --p-button-primary-color: var(--p-cor-operacao-acao-texto);
  --p-button-primary-hover-background: var(--p-cor-operacao-texto);
  --p-button-primary-hover-border-color: var(--p-cor-operacao-texto);
  --p-button-primary-hover-color: var(--p-cor-operacao-acao-texto);
  --p-button-primary-active-background: var(--p-cor-operacao-texto);
  --p-button-primary-active-border-color: var(--p-cor-operacao-texto);
  --p-button-primary-active-color: var(--p-cor-operacao-acao-texto);

  min-height: var(--p-dimensao-altura-acao-operacao);
  font-weight: var(--p-fonte-peso-negrito);
}

.barra-acao-fixa--selecao {
  margin: 0;
  padding: var(--p-espaco-3) var(--p-espaco-4) calc(var(--p-espaco-3) + env(safe-area-inset-bottom, 0px));
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.barra-acao-fixa--selecao .barra-acao-fixa__status {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-2);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.barra-acao-fixa--selecao .barra-acao-fixa__acao {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--p-espaco-2);
}

.barra-acao-fixa--selecao .barra-acao-fixa__acao :deep(.p-button) {
  flex: 1 1 auto;
  width: auto;
}

@media (min-width: 640px) {
  .barra-acao-fixa:not(.barra-acao-fixa--selecao) {
    position: static;
    margin: 0;
    padding: var(--p-espaco-4) 0 0;
    box-shadow: none;
  }

  .barra-acao-fixa--selecao .barra-acao-fixa__acao {
    flex: 0 1 auto;
  }

  .barra-acao-fixa--selecao .barra-acao-fixa__acao :deep(.p-button) {
    flex: 0 0 auto;
    min-height: var(--p-dimensao-alvo-toque);
  }
}
</style>
