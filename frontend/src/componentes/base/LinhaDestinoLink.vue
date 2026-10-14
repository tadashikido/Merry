<script setup lang="ts">
import { computed } from 'vue'

import BadgeStatus from './BadgeStatus.vue'
import type { VarianteStatus } from './tipos'
import { TEXTOS_LINKS_CRONOGRAMA } from '@/textos/cronogramaPublico'
import type { SituacaoLinkCronograma } from '@/tipos/cronogramaPublico'

const props = withDefaults(defineProps<{ rotulo: string; detalhe?: string | null; situacao: SituacaoLinkCronograma }>(), {
  detalhe: null,
})

const VARIANTES: Record<SituacaoLinkCronograma, VarianteStatus> = {
  ativo: 'sucesso',
  semLink: 'neutro',
  indisponivel: 'alerta',
}

const variante = computed(() => VARIANTES[props.situacao])
</script>

<template>
  <li
    class="linha-destino-link"
    data-teste="linha-destino-link"
  >
    <div class="linha-destino-link__identificacao">
      <span class="linha-destino-link__rotulo">{{ rotulo }}</span>
      <span
        v-if="detalhe"
        class="linha-destino-link__detalhe"
      >{{ detalhe }}</span>
    </div>
    <BadgeStatus
      class="linha-destino-link__situacao"
      :texto="TEXTOS_LINKS_CRONOGRAMA.situacao[situacao]"
      :variante="variante"
      data-teste="linha-destino-link-situacao"
    />
    <div
      v-if="$slots.acoes"
      class="linha-destino-link__acoes"
    >
      <slot name="acoes" />
    </div>
  </li>
</template>

<style scoped>
.linha-destino-link {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--p-espaco-2) var(--p-espaco-3);
  align-items: center;
  padding: var(--p-espaco-3) 0;
  list-style: none;
  border-bottom: 1px solid var(--p-cor-divisoria);
}

.linha-destino-link:last-child {
  border-bottom: 0;
}

.linha-destino-link__identificacao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.linha-destino-link__rotulo {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.linha-destino-link__detalhe {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.linha-destino-link__acoes {
  display: flex;
  flex-wrap: wrap;
  grid-column: 1 / -1;
  gap: var(--p-espaco-2);
  align-items: center;
}

@media (max-width: 639px) {
  .linha-destino-link__acoes :deep(.p-button:not(.p-button-icon-only)) {
    flex: 1 1 auto;
    min-height: var(--p-dimensao-alvo-toque-movel);
  }
}
</style>
