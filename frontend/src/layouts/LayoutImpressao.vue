<script setup lang="ts">
withDefaults(defineProps<{ rotuloAcoes: string; demonstracao?: boolean }>(), { demonstracao: false })
</script>

<template>
  <div
    class="layout-impressao"
    :class="{ 'layout-impressao--demonstracao': demonstracao }"
  >
    <nav
      v-if="$slots.acoes"
      class="layout-impressao__acoes"
      :aria-label="rotuloAcoes"
      data-teste="acoes-impressao"
    >
      <slot name="acoes" />
    </nav>
    <component
      :is="demonstracao ? 'div' : 'main'"
      :id="demonstracao ? undefined : 'conteudo-principal'"
      class="layout-impressao__folha"
    >
      <slot />
    </component>
  </div>
</template>

<style scoped>
.layout-impressao {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-4);
  min-height: 100vh;
  padding: var(--p-espaco-4) var(--p-espaco-3) var(--p-espaco-8);
  background: var(--p-cor-fundo);
}

.layout-impressao--demonstracao {
  min-height: 0;
}

.layout-impressao__acoes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-espaco-3);
  width: 100%;
  max-width: 210mm;
}

.layout-impressao__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

.layout-impressao__folha {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
  width: 100%;
  max-width: 210mm;
  padding: var(--p-espaco-6) var(--p-espaco-5);
  color: var(--p-cor-texto);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-controle);
  box-shadow: var(--p-sombra-suave);
}

@media (min-width: 640px) {
  .layout-impressao__folha {
    padding: 16mm;
  }
}

@media print {
  .layout-impressao {
    display: block;
    min-height: 0;
    padding: 0;
    background: none;
  }

  .layout-impressao__acoes {
    display: none;
  }

  .layout-impressao__folha {
    max-width: none;
    padding: 0;
    font-size: 10.5pt;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
}
</style>

<style>
@media print {
  @page {
    size: A4 portrait;
    margin: 16mm;
  }
}
</style>
