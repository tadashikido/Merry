<script setup lang="ts">
import { computed } from 'vue'
import Skeleton from 'primevue/skeleton'

import { formatarNumero } from '@/utilitarios/formatacao'

const props = withDefaults(
  defineProps<{
    idCampo: string
    titulo: string
    descricao: string
    quantidade: number | null
    rotuloQuantidade?: string
    complemento?: string | null
    desabilitado?: boolean
  }>(),
  { rotuloQuantidade: undefined, complemento: null, desabilitado: false },
)

const marcado = defineModel<boolean>({ required: true })

const carregando = computed(() => props.quantidade === null)
const idDescricao = computed(() => `${props.idCampo}-descricao`)
const numero = computed(() => (props.quantidade === null ? '' : formatarNumero(props.quantidade)))
</script>

<template>
  <li
    class="opcao-copia"
    :class="{
      'opcao-copia--marcada': marcado && !desabilitado,
      'opcao-copia--desabilitada': desabilitado,
    }"
    data-teste="opcao-copia"
  >
    <label
      class="opcao-copia__rotulo"
      :for="idCampo"
    >
      <input
        :id="idCampo"
        v-model="marcado"
        class="opcao-copia__entrada"
        type="checkbox"
        :disabled="desabilitado"
        :aria-describedby="idDescricao"
        data-teste="opcao-copia-entrada"
      >
      <span
        class="opcao-copia__quantidade"
        aria-hidden="true"
        data-teste="opcao-copia-quantidade"
      >
        <Skeleton
          v-if="carregando"
          width="2ch"
          height="1em"
        />
        <template v-else>{{ numero }}</template>
      </span>
      <span class="opcao-copia__texto">
        <span class="opcao-copia__titulo">
          {{ titulo }}
          <span
            v-if="rotuloQuantidade && !carregando"
            class="somente-leitor-tela"
          >{{ `: ${rotuloQuantidade}` }}</span>
        </span>
        <span
          :id="idDescricao"
          class="opcao-copia__descricao"
        >
          {{ descricao }}
          <span
            v-if="complemento"
            class="opcao-copia__complemento"
            data-teste="opcao-copia-complemento"
          >{{ complemento }}</span>
        </span>
      </span>
    </label>
  </li>
</template>

<style scoped>
.opcao-copia {
  list-style: none;
}

.opcao-copia + .opcao-copia {
  border-top: 1px solid var(--p-cor-divisoria);
}

.opcao-copia__rotulo {
  display: grid;
  grid-template-columns: auto var(--p-espaco-12) minmax(0, 1fr);
  align-items: start;
  gap: var(--p-espaco-3);
  min-height: var(--p-dimensao-alvo-toque-movel);
  padding: var(--p-espaco-4);
  cursor: pointer;
}

.opcao-copia__entrada {
  width: var(--p-espaco-5);
  height: var(--p-espaco-5);
  margin: var(--p-espaco-2) 0 0;
  cursor: pointer;
  accent-color: var(--p-cor-primaria);
}

.opcao-copia__entrada:focus-visible {
  outline: var(--p-focus-ring-width) var(--p-focus-ring-style) var(--p-focus-ring-color);
  outline-offset: var(--p-focus-ring-offset);
}

.opcao-copia__quantidade {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-medio);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  text-align: end;
  color: var(--p-cor-texto-apoio);
}

.opcao-copia--marcada .opcao-copia__quantidade {
  color: var(--p-cor-primaria);
}

.opcao-copia__texto {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
  padding-top: var(--p-espaco-1);
}

.opcao-copia__titulo {
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-seminegrito);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
}

.opcao-copia__descricao {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-corpo);
  color: var(--p-cor-texto-apoio);
}

.opcao-copia__complemento {
  display: block;
}

.opcao-copia--desabilitada .opcao-copia__rotulo,
.opcao-copia--desabilitada .opcao-copia__entrada {
  cursor: not-allowed;
}

.opcao-copia--desabilitada .opcao-copia__titulo {
  color: var(--p-cor-texto-apoio);
}
</style>
