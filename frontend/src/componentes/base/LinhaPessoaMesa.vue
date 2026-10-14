<script setup lang="ts">
import { computed, useId } from 'vue'
import Checkbox from 'primevue/checkbox'

import BadgeStatus from './BadgeStatus.vue'
import { TEXTOS_MESAS } from '@/textos/mesas'

const props = withDefaults(
  defineProps<{
    nome: string
    apoio?: string | null
    crianca?: boolean
    acompanhante?: boolean
    selecionavel?: boolean
    desabilitada?: boolean
  }>(),
  { apoio: null, crianca: false, acompanhante: false, selecionavel: true, desabilitada: false },
)

const selecionada = defineModel<boolean>('selecionada', { default: false })

const idCampo = `pessoa-mesa-${useId()}`
const idApoio = computed(() => (props.apoio ? `${idCampo}-apoio` : undefined))
</script>

<template>
  <div
    class="linha-pessoa-mesa"
    :class="{ 'linha-pessoa-mesa--selecionada': selecionavel && selecionada }"
    data-teste="linha-pessoa-mesa"
  >
    <Checkbox
      v-if="selecionavel"
      v-model="selecionada"
      :input-id="idCampo"
      binary
      :disabled="desabilitada"
      :pt="{ input: { 'aria-describedby': idApoio } }"
      data-teste="selecionar-pessoa"
    />
    <span class="linha-pessoa-mesa__textos">
      <label
        v-if="selecionavel"
        :for="idCampo"
        class="linha-pessoa-mesa__nome"
      >{{ nome }}</label>
      <span
        v-else
        class="linha-pessoa-mesa__nome"
      >{{ nome }}</span>
      <span
        v-if="apoio"
        :id="idApoio"
        class="linha-pessoa-mesa__apoio"
      >{{ apoio }}</span>
    </span>
    <span
      v-if="crianca || acompanhante || $slots.extra"
      class="linha-pessoa-mesa__marcas"
    >
      <BadgeStatus
        v-if="crianca"
        :texto="TEXTOS_MESAS.crianca"
      />
      <BadgeStatus
        v-if="acompanhante"
        :texto="TEXTOS_MESAS.acompanhante"
        variante="informacao"
      />
      <slot name="extra" />
    </span>
  </div>
</template>

<style scoped>
.linha-pessoa-mesa {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2) var(--p-espaco-3);
  min-block-size: var(--p-dimensao-alvo-toque);
  padding: var(--p-espaco-1) var(--p-espaco-3);
  border: 1px solid transparent;
  border-radius: var(--p-raio-controle);
}

.linha-pessoa-mesa--selecionada {
  background: var(--p-cor-salvia);
  border-color: var(--p-cor-primaria);
}

.linha-pessoa-mesa__textos {
  display: flex;
  flex: 1 1 10rem;
  flex-direction: column;
  min-inline-size: 0;
}

.linha-pessoa-mesa__nome {
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
  cursor: pointer;
}

span.linha-pessoa-mesa__nome {
  cursor: default;
}

.linha-pessoa-mesa__apoio {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.linha-pessoa-mesa__marcas {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-1);
}

@media (pointer: coarse) {
  .linha-pessoa-mesa {
    min-block-size: var(--p-dimensao-alvo-toque-movel);
  }
}
</style>
