<script setup lang="ts">
import MarcaProduto from './MarcaProduto.vue'
import { MENSAGENS_AUTENTICACAO } from '@/textos/autenticacao'

withDefaults(defineProps<{ texto?: string }>(), { texto: MENSAGENS_AUTENTICACAO.abrindoConta })
</script>

<template>
  <div
    class="indicador-abertura"
    role="status"
    aria-busy="true"
    data-teste="indicador-abertura"
  >
    <MarcaProduto somente-simbolo />
    <p class="indicador-abertura__texto">
      {{ texto }}
    </p>
  </div>
</template>

<style scoped>
.indicador-abertura {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--p-espaco-3);
  min-height: 100vh;
  padding: var(--p-espaco-6);
  background: var(--p-cor-fundo);
}

.indicador-abertura__texto {
  color: var(--p-cor-texto-apoio);
}
</style>
