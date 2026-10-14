<script setup lang="ts">
import Skeleton from 'primevue/skeleton'

import { MENSAGENS_PADRAO } from '@/textos/mensagens'

withDefaults(defineProps<{ variante?: 'lista' | 'cartao' | 'formulario'; linhas?: number }>(), {
  variante: 'lista',
  linhas: 5,
})
</script>

<template>
  <div
    class="estado-carregando"
    :class="`estado-carregando--${variante}`"
    role="status"
    aria-busy="true"
    data-teste="estado-carregando"
  >
    <span class="somente-leitor-tela">{{ MENSAGENS_PADRAO.carregando }}</span>

    <template v-if="variante === 'lista'">
      <div
        v-for="linha in linhas"
        :key="linha"
        class="estado-carregando__linha"
        aria-hidden="true"
      >
        <Skeleton
          width="40%"
          height="1rem"
        />
        <Skeleton
          width="20%"
          height="1rem"
        />
        <Skeleton
          width="5.5rem"
          height="1.5rem"
        />
      </div>
    </template>

    <template v-else-if="variante === 'cartao'">
      <div
        v-for="linha in linhas"
        :key="linha"
        class="estado-carregando__cartao"
        aria-hidden="true"
      >
        <Skeleton
          width="60%"
          height="1.25rem"
        />
        <Skeleton
          width="35%"
          height="1rem"
        />
        <Skeleton
          width="100%"
          height="2.75rem"
        />
      </div>
    </template>

    <template v-else>
      <div
        v-for="linha in linhas"
        :key="linha"
        class="estado-carregando__campo"
        aria-hidden="true"
      >
        <Skeleton
          width="8rem"
          height="0.875rem"
        />
        <Skeleton
          width="100%"
          height="2.75rem"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.estado-carregando {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.estado-carregando__linha {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-6);
  padding: var(--p-espaco-2) 0;
}

.estado-carregando__cartao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-4);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.estado-carregando__campo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}
</style>
