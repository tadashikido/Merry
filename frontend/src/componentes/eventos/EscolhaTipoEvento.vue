<script setup lang="ts">
import TileTipo from '@/componentes/base/TileTipo.vue'
import { TEXTOS_TIPO_EVENTO, VOCABULARIO_TIPO_EVENTO, classeTomDoTipo } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'

withDefaults(defineProps<{ idCampo: string; desabilitado?: boolean; erro?: string | null }>(), {
  desabilitado: false,
  erro: null,
})

const modelo = defineModel<TipoEvento>({ required: true })

function idOpcao(idCampo: string, tipo: TipoEvento): string {
  return `${idCampo}-${tipo}`
}
</script>

<template>
  <fieldset
    class="escolha-tipo-evento formulario-secao"
    :aria-describedby="erro ? `${idCampo}-erro` : undefined"
    data-teste="escolha-tipo-evento"
  >
    <legend class="formulario-secao__titulo">
      {{ TEXTOS_TIPO_EVENTO.grupo }}
    </legend>
    <div class="escolha-tipo-evento__opcoes">
      <label
        v-for="tipo in TIPOS_EVENTO"
        :key="tipo"
        class="escolha-tipo-evento__opcao"
        :class="[classeTomDoTipo(tipo), { 'escolha-tipo-evento__opcao--marcada': modelo === tipo }]"
        :for="idOpcao(idCampo, tipo)"
      >
        <input
          :id="idOpcao(idCampo, tipo)"
          v-model="modelo"
          class="escolha-tipo-evento__entrada"
          type="radio"
          :name="idCampo"
          :value="tipo"
          :disabled="desabilitado"
          :aria-describedby="`${idOpcao(idCampo, tipo)}-descricao`"
          :data-teste="`tipo-evento-${tipo}`"
        >
        <TileTipo :tipo="tipo" />
        <span class="escolha-tipo-evento__texto">
          <span class="escolha-tipo-evento__rotulo">{{ VOCABULARIO_TIPO_EVENTO[tipo].rotulo }}</span>
          <span
            :id="`${idOpcao(idCampo, tipo)}-descricao`"
            class="escolha-tipo-evento__descricao"
          >{{ VOCABULARIO_TIPO_EVENTO[tipo].descricao }}</span>
        </span>
      </label>
    </div>
    <p
      v-if="erro"
      :id="`${idCampo}-erro`"
      class="escolha-tipo-evento__erro"
      role="alert"
      data-teste="erro-tipo-evento"
    >
      {{ erro }}
    </p>
  </fieldset>
</template>

<style scoped>
.escolha-tipo-evento {
  container: escolha-tipo / inline-size;
}

.escolha-tipo-evento__opcoes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-campo);
}

.escolha-tipo-evento__opcao {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--p-ritmo-grupo);
  min-height: var(--p-dimensao-alvo-toque-movel);
  padding: var(--p-ritmo-grupo);
  cursor: pointer;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-tile);
  transition:
    background-color var(--p-duracao-rapida),
    border-color var(--p-duracao-rapida);
}

.escolha-tipo-evento__opcao:hover {
  border-color: var(--tom-tinta);
}

.escolha-tipo-evento__opcao--marcada {
  background: var(--tom-fundo);
  border-color: var(--tom-tinta);
  box-shadow: inset 0 0 0 1px var(--tom-tinta);
}

.escolha-tipo-evento__opcao--marcada :deep(.tile-tipo) {
  background: var(--p-cor-superficie);
}

.escolha-tipo-evento__entrada {
  position: absolute;
  inset-block-start: var(--p-ritmo-campo);
  inset-inline-end: var(--p-ritmo-campo);
  width: var(--p-espaco-5);
  height: var(--p-espaco-5);
  margin: 0;
  cursor: pointer;
  accent-color: var(--tom-tinta);
}

.escolha-tipo-evento__entrada:focus-visible {
  outline: var(--p-focus-ring-width) var(--p-focus-ring-style) var(--p-focus-ring-color);
  outline-offset: var(--p-focus-ring-offset);
}

.escolha-tipo-evento__entrada:disabled,
.escolha-tipo-evento__entrada:disabled ~ .escolha-tipo-evento__texto {
  cursor: not-allowed;
}

.escolha-tipo-evento__texto {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
  padding-inline-end: var(--p-ritmo-bloco);
}

.escolha-tipo-evento__rotulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-titulo);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-titulo);
}

.escolha-tipo-evento__opcao--marcada .escolha-tipo-evento__rotulo {
  color: var(--tom-profunda);
}

.escolha-tipo-evento__descricao {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.escolha-tipo-evento__opcao--marcada .escolha-tipo-evento__descricao {
  color: var(--tom-tinta);
}

.escolha-tipo-evento__erro {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-erro);
}

@container escolha-tipo (min-width: 30rem) {
  .escolha-tipo-evento__opcoes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .escolha-tipo-evento__opcao {
    transition: none;
  }
}
</style>
