<script setup lang="ts">
import { computed } from 'vue'

import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'
import { TEXTOS_CRONOGRAMA_PUBLICO } from '@/textos/cronogramaPublico'

const props = withDefaults(
  defineProps<{
    inicio: string
    termino?: string | null
    terminaEmOutroDia?: boolean
    atividade: string
    local?: string | null
    responsavel?: string | null
    fornecedor?: string | null
    instrucoes?: string | null
    cerimonia?: boolean
    idTitulo?: string
  }>(),
  {
    termino: null,
    terminaEmOutroDia: false,
    local: null,
    responsavel: null,
    fornecedor: null,
    instrucoes: null,
    cerimonia: false,
    idTitulo: 'cartao-agora-titulo',
  },
)

const quando = computed(() => {
  if (!props.termino) {
    return TEXTOS_GRANDE_DIA.desde(props.inicio)
  }
  const termino = props.terminaEmOutroDia ? `${props.termino} ${TEXTOS_CRONOGRAMA_PUBLICO.maisUm}` : props.termino
  return TEXTOS_GRANDE_DIA.desdeAte(props.inicio, termino)
})
const quem = computed(() => [props.responsavel, props.fornecedor].filter((valor): valor is string => Boolean(valor)))
</script>

<template>
  <section
    class="cartao-agora"
    :class="{ 'cartao-agora--cerimonia': cerimonia }"
    :aria-labelledby="idTitulo"
    data-teste="cartao-agora"
  >
    <h2
      :id="idTitulo"
      class="cartao-agora__rotulo"
      tabindex="-1"
    >
      {{ TEXTOS_GRANDE_DIA.agora }}
    </h2>
    <p
      class="cartao-agora__atividade"
      data-teste="cartao-agora-atividade"
    >
      {{ atividade }}
    </p>
    <p class="cartao-agora__quando">
      {{ quando }}
    </p>
    <p
      v-if="local"
      class="cartao-agora__linha"
    >
      <span
        class="ie ie-local"
        aria-hidden="true"
      />
      <span class="somente-leitor-tela">{{ TEXTOS_CRONOGRAMA_PUBLICO.rotuloLocal }}: </span>
      <span>{{ local }}</span>
    </p>
    <p
      v-if="quem.length > 0"
      class="cartao-agora__linha cartao-agora__quem"
    >
      <span class="somente-leitor-tela">{{ TEXTOS_CRONOGRAMA_PUBLICO.rotuloQuem }}: </span>
      <span
        v-for="(nome, indice) in quem"
        :key="indice"
      >{{ nome }}</span>
    </p>
    <p
      v-if="instrucoes"
      class="cartao-agora__instrucoes"
    >
      <span class="somente-leitor-tela">{{ TEXTOS_CRONOGRAMA_PUBLICO.rotuloInstrucoes }}: </span>{{ instrucoes }}
    </p>
    <div
      v-if="$slots.contatos"
      class="cartao-agora__contatos"
    >
      <slot name="contatos" />
    </div>
    <div
      v-if="$slots.acoes"
      class="cartao-agora__acoes"
    >
      <slot name="acoes" />
    </div>
  </section>
</template>

<style scoped>
.cartao-agora {
  --p-cor-texto: var(--p-cor-operacao-cartao-texto);
  --p-cor-texto-secundario: var(--p-cor-operacao-cartao-apoio);
  --p-cor-texto-apoio: var(--p-cor-operacao-cartao-apoio);
  --p-cor-superficie: var(--p-cor-operacao-cartao);
  --p-cor-superficie-sutil: var(--p-cor-operacao-cartao-borda);
  --p-cor-borda: var(--p-cor-operacao-cartao-borda);
  --p-cor-primaria: var(--p-cor-operacao-cartao-texto);
  --p-button-outlined-secondary-color: var(--p-cor-operacao-cartao-texto);
  --p-button-outlined-secondary-border-color: var(--p-cor-operacao-cartao-apoio);
  --p-button-outlined-secondary-hover-background: var(--p-cor-operacao-cartao-borda);
  --p-button-outlined-secondary-active-background: var(--p-cor-operacao-cartao-borda);

  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  padding: var(--p-espaco-5);
  color: var(--p-cor-operacao-cartao-texto);
  background: var(--p-cor-operacao-cartao);
  border-radius: var(--p-raio-folha);
}

.cartao-agora :focus-visible {
  outline-color: var(--p-cor-acento-texto);
}

.cartao-agora__rotulo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-operacao-cartao-apoio);
}

.cartao-agora__atividade {
  margin: 0;
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-negrito);
  line-height: var(--p-fonte-entrelinha-titulo);
  overflow-wrap: anywhere;
}

.cartao-agora__quando {
  margin: 0;
  font-size: var(--p-fonte-tamanho-corpo);
  font-variant-numeric: tabular-nums;
  color: var(--p-cor-operacao-cartao-apoio);
}

.cartao-agora__linha {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-1) var(--p-espaco-3);
  align-items: center;
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  overflow-wrap: anywhere;
}

.cartao-agora__quem {
  color: var(--p-cor-operacao-cartao-apoio);
}

.cartao-agora__instrucoes {
  margin: var(--p-espaco-1) 0 0;
  padding-left: var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-corpo);
  white-space: pre-line;
  overflow-wrap: anywhere;
  border-left: var(--p-dimensao-fio-cronograma) solid var(--p-cor-operacao-cartao-apoio);
}

.cartao-agora--cerimonia .cartao-agora__instrucoes {
  border-left-color: var(--p-cor-acento-texto);
}

.cartao-agora__contatos,
.cartao-agora__acoes {
  padding-top: var(--p-espaco-2);
}
</style>
