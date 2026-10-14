<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{ texto: string; idCampo: string; erro?: string | null; desabilitado?: boolean }>(),
  { erro: null, desabilitado: false },
)

const marcado = defineModel<boolean>({ required: true })

const entrada = ref<HTMLInputElement | null>(null)
const idErro = computed(() => `${props.idCampo}-erro`)

function focar() {
  entrada.value?.focus()
}

defineExpose({ focar })
</script>

<template>
  <div
    class="caixa-consentimento"
    :class="{ 'caixa-consentimento--invalida': Boolean(erro) }"
    data-teste="caixa-consentimento"
  >
    <label
      class="caixa-consentimento__rotulo"
      :for="idCampo"
    >
      <input
        :id="idCampo"
        ref="entrada"
        v-model="marcado"
        class="caixa-consentimento__entrada"
        type="checkbox"
        :disabled="desabilitado"
        :aria-invalid="Boolean(erro) || undefined"
        :aria-describedby="erro ? idErro : undefined"
        data-teste="consentimento-entrada"
      >
      <span>{{ texto }}</span>
    </label>
    <p
      v-if="erro"
      :id="idErro"
      class="caixa-consentimento__erro"
      data-teste="consentimento-erro"
    >
      {{ erro }}
    </p>
  </div>
</template>

<style scoped>
.caixa-consentimento {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.caixa-consentimento__rotulo {
  display: flex;
  align-items: flex-start;
  gap: var(--p-espaco-3);
  min-height: var(--p-dimensao-alvo-toque-movel);
  padding: var(--p-espaco-2) 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto);
  cursor: pointer;
}

.caixa-consentimento__entrada {
  flex-shrink: 0;
  width: var(--p-espaco-6);
  height: var(--p-espaco-6);
  margin: 0;
  cursor: pointer;
  accent-color: var(--p-cor-primaria);
}

.caixa-consentimento__entrada:focus-visible {
  outline: var(--p-focus-ring-width) var(--p-focus-ring-style) var(--p-focus-ring-color);
  outline-offset: var(--p-focus-ring-offset);
}

.caixa-consentimento__entrada:disabled {
  cursor: not-allowed;
}

.caixa-consentimento--invalida .caixa-consentimento__entrada {
  outline: 2px solid var(--p-cor-erro);
  outline-offset: 2px;
}

.caixa-consentimento__erro {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-erro);
}
</style>
