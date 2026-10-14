<script setup lang="ts">
import { computed } from 'vue'

import { ROTULOS_CAMPOS } from '@/textos/rotulos'

const props = withDefaults(
  defineProps<{ rotulo: string; idCampo: string; obrigatorio?: boolean; dica?: string; erro?: string | null }>(),
  { obrigatorio: false, dica: undefined, erro: null },
)

const idDica = computed(() => `${props.idCampo}-dica`)
const idErro = computed(() => `${props.idCampo}-erro`)
const invalido = computed(() => Boolean(props.erro))
const descritoPor = computed(() => {
  if (invalido.value) {
    return idErro.value
  }
  return props.dica ? idDica.value : undefined
})
</script>

<template>
  <div
    class="campo-formulario"
    :class="{ 'campo-formulario--invalido': invalido }"
  >
    <div
      v-if="$slots['acao-rotulo']"
      class="campo-formulario__cabecalho"
    >
      <label
        class="campo-formulario__rotulo"
        :for="idCampo"
      >
        {{ rotulo }}
        <span
          v-if="obrigatorio"
          class="campo-formulario__obrigatorio"
        >({{ ROTULOS_CAMPOS.obrigatorio }})</span>
      </label>
      <slot name="acao-rotulo" />
    </div>
    <label
      v-else
      class="campo-formulario__rotulo"
      :for="idCampo"
    >
      {{ rotulo }}
      <span
        v-if="obrigatorio"
        class="campo-formulario__obrigatorio"
      >({{ ROTULOS_CAMPOS.obrigatorio }})</span>
    </label>
    <slot
      :id="idCampo"
      :invalido="invalido"
      :descrito-por="descritoPor"
      :obrigatorio="obrigatorio"
    />
    <p
      v-if="invalido"
      :id="idErro"
      class="campo-formulario__erro"
      data-teste="erro-campo"
    >
      <span
        class="ie ie-alerta"
        aria-hidden="true"
      />
      {{ erro }}
    </p>
    <p
      v-else-if="dica"
      :id="idDica"
      class="campo-formulario__dica"
    >
      {{ dica }}
    </p>
  </div>
</template>

<style scoped>
.campo-formulario {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  min-width: 0;
}

.campo-formulario__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--p-espaco-1) var(--p-ritmo-grupo);
}

.campo-formulario__rotulo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.campo-formulario__obrigatorio {
  margin-left: var(--p-espaco-1);
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto-apoio);
}

.campo-formulario :deep(.p-inputtext),
.campo-formulario :deep(.p-select),
.campo-formulario :deep(.p-textarea),
.campo-formulario :deep(.p-inputnumber),
.campo-formulario :deep(.p-datepicker) {
  width: 100%;
  min-height: var(--p-dimensao-alvo-toque);
}

.campo-formulario__dica,
.campo-formulario__erro {
  font-size: var(--p-fonte-tamanho-controle);
}

.campo-formulario__dica {
  color: var(--p-cor-texto-apoio);
}

.campo-formulario__erro {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-1);
  color: var(--p-cor-erro);
}
</style>
