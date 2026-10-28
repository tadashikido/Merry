<script setup lang="ts">
import { classeIcone } from '@/design/icones'

withDefaults(defineProps<{ rotulo: string; placeholder?: string; id?: string }>(), { placeholder: undefined, id: undefined })

const termo = defineModel<string>({ default: '' })
</script>

<template>
  <label
    class="campo-busca"
    data-teste="campo-busca"
  >
    <span
      :class="[classeIcone('busca'), 'campo-busca__icone']"
      aria-hidden="true"
    />
    <input
      :id="id"
      v-model="termo"
      class="campo-busca__entrada"
      type="search"
      :aria-label="rotulo"
      :placeholder="placeholder"
      autocomplete="off"
    >
  </label>
</template>

<style scoped>
.campo-busca {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-3);
  width: 100%;
  min-height: var(--p-dimensao-altura-botao);
  padding: 0 var(--p-espaco-4);
  color: var(--p-cor-texto-apoio);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda-campo);
  border-radius: var(--p-raio-campo);
  transition: border-color var(--p-duracao-rapida);
}

.campo-busca:hover {
  border-color: var(--p-cor-texto-apoio);
}

.campo-busca:focus-within {
  border-color: var(--p-cor-primaria);
  outline: var(--p-focus-ring-width) var(--p-focus-ring-style) var(--p-focus-ring-color);
  outline-offset: var(--p-focus-ring-offset);
}

.campo-busca__entrada {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  font: inherit;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
  background: transparent;
  border: 0;
  outline: 0;
}

.campo-busca__entrada::placeholder {
  color: var(--p-cor-placeholder);
}
</style>
