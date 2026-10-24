<script setup lang="ts">
import { computed, useId } from 'vue'

import BadgeStatus from './BadgeStatus.vue'
import type { SituacaoLugar, VarianteStatus } from './tipos'

const props = withDefaults(
  defineProps<{
    situacao: SituacaoLugar
    titulo: string
    subtitulo?: string
    rotuloSituacao?: string
    detalhe?: string
  }>(),
  { subtitulo: undefined, rotuloSituacao: undefined, detalhe: undefined },
)

const VARIANTES: Record<Exclude<SituacaoLugar, 'vazio'>, VarianteStatus> = {
  pendente: 'informacao',
  expirado: 'alerta',
  ativo: 'sucesso',
}

const idTitulo = `${useId()}-lugar`
const variante = computed(() => (props.situacao === 'vazio' ? null : VARIANTES[props.situacao]))
</script>

<template>
  <div
    class="lugar-acesso"
    :class="`lugar-acesso--${situacao}`"
    role="listitem"
    :aria-labelledby="idTitulo"
    :data-situacao="situacao"
    data-teste="lugar-acesso"
  >
    <div class="lugar-acesso__cabecalho">
      <p
        :id="idTitulo"
        class="lugar-acesso__titulo"
      >
        {{ titulo }}
      </p>
      <p
        v-if="subtitulo"
        class="lugar-acesso__subtitulo"
      >
        {{ subtitulo }}
      </p>
    </div>

    <div
      v-if="variante && rotuloSituacao"
      class="lugar-acesso__situacao"
    >
      <BadgeStatus
        :texto="rotuloSituacao"
        :variante="variante"
      />
      <span
        v-if="detalhe"
        class="lugar-acesso__detalhe numeros-tabulares"
        data-teste="lugar-detalhe"
      >{{ detalhe }}</span>
    </div>

    <slot />

    <div
      v-if="$slots.acoes"
      class="lugar-acesso__acoes"
    >
      <slot name="acoes" />
    </div>
  </div>
</template>

<style scoped>
.lugar-acesso {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  min-width: 0;
  padding: var(--p-espaco-5);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.lugar-acesso--vazio {
  background: var(--p-cor-fundo);
  border-style: dashed;
  border-color: var(--p-cor-borda-campo);
}

.lugar-acesso__cabecalho {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.lugar-acesso__titulo {
  margin: 0;
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.lugar-acesso__subtitulo {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
  overflow-wrap: anywhere;
}

.lugar-acesso__situacao {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
}

.lugar-acesso__detalhe {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.lugar-acesso__acoes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
  margin-top: auto;
}

@container (max-width: 35.99rem) {
  .lugar-acesso__acoes > :deep(.p-button:not(.p-button-icon-only)) {
    flex: 1 1 100%;
    min-height: var(--p-dimensao-alvo-toque);
  }
}
</style>
