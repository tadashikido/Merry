<script setup lang="ts">
import { computed } from 'vue'

import BadgeStatus from './BadgeStatus.vue'
import { TEXTOS_CRONOGRAMA } from '@/textos/cronograma'

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
    possuiNotaInterna?: boolean
    relativoCerimonia?: string | null
    ehCerimonia?: boolean
    conflitos?: string[]
    editavel?: boolean
    rotulo?: string
  }>(),
  {
    termino: null,
    terminaEmOutroDia: false,
    local: null,
    responsavel: null,
    fornecedor: null,
    instrucoes: null,
    possuiNotaInterna: false,
    relativoCerimonia: null,
    ehCerimonia: false,
    conflitos: () => [],
    editavel: false,
    rotulo: undefined,
  },
)

const emit = defineEmits<{ editar: [] }>()

const comConflito = computed(() => props.conflitos.length > 0)
const temComplementos = computed(() => Boolean(props.instrucoes) || props.possuiNotaInterna || comConflito.value)
const rotuloHorario = computed(() => {
  if (!props.termino) {
    return TEXTOS_CRONOGRAMA.rotuloHorarioInstante(props.inicio)
  }
  const termino = props.terminaEmOutroDia ? `${props.termino} ${TEXTOS_CRONOGRAMA.rotuloMaisUmDia}` : props.termino
  return TEXTOS_CRONOGRAMA.rotuloHorarioIntervalo(props.inicio, termino)
})
const metadados = computed(() =>
  [
    { chave: 'local', icone: 'ie ie-local', rotulo: TEXTOS_CRONOGRAMA.rotuloLocal, valor: props.local },
    { chave: 'responsavel', icone: 'ie ie-convidados', rotulo: TEXTOS_CRONOGRAMA.rotuloResponsavel, valor: props.responsavel },
    { chave: 'fornecedor', icone: 'ie ie-fornecedor', rotulo: TEXTOS_CRONOGRAMA.rotuloFornecedor, valor: props.fornecedor },
  ].filter((metadado) => metadado.valor),
)
</script>

<template>
  <li
    class="linha-cronograma"
    :class="{
      'linha-cronograma--cerimonia': ehCerimonia,
      'linha-cronograma--conflito': comConflito,
      'linha-cronograma--editavel': editavel,
    }"
    data-teste="linha-cronograma"
  >
    <div
      class="linha-cronograma__horario"
      aria-hidden="true"
    >
      <span
        class="linha-cronograma__inicio"
        data-teste="linha-cronograma-inicio"
      >{{ inicio }}</span>
      <span
        v-if="termino"
        class="linha-cronograma__termino"
        data-teste="linha-cronograma-termino"
      >{{ termino }}<span
        v-if="terminaEmOutroDia"
        class="linha-cronograma__mais-um"
      >+1</span></span>
    </div>

    <span
      class="linha-cronograma__fio"
      aria-hidden="true"
    >
      <span class="linha-cronograma__no">
        <span
          v-if="ehCerimonia"
          class="linha-cronograma__anel linha-cronograma__anel--segundo"
        />
      </span>
    </span>

    <component
      :is="editavel ? 'button' : 'div'"
      :type="editavel ? 'button' : undefined"
      class="linha-cronograma__conteudo"
      :class="{
        'linha-cronograma__conteudo--detalhes': metadados.length > 0,
        'linha-cronograma__conteudo--complementos': temComplementos,
      }"
      :aria-label="editavel ? rotulo : undefined"
      data-teste="linha-cronograma-conteudo"
      @click="editavel ? emit('editar') : undefined"
    >
      <span
        v-if="!editavel"
        class="somente-leitor-tela"
      >{{ rotuloHorario }}</span>
      <span class="linha-cronograma__cabeca">
        <span
          class="linha-cronograma__atividade"
          data-teste="linha-cronograma-atividade"
        >{{ atividade }}</span>
        <span
          v-if="relativoCerimonia"
          class="linha-cronograma__relativo"
          data-teste="linha-cronograma-relativo"
        >{{ relativoCerimonia }}</span>
      </span>
      <span
        v-if="metadados.length > 0"
        class="linha-cronograma__metadados"
      >
        <span
          v-for="metadado in metadados"
          :key="metadado.chave"
          class="linha-cronograma__metadado"
          :data-teste="`linha-cronograma-${metadado.chave}`"
        >
          <span
            :class="metadado.icone"
            aria-hidden="true"
          />
          <span class="somente-leitor-tela">{{ metadado.rotulo }}: </span>
          {{ metadado.valor }}
        </span>
      </span>
      <span
        v-if="temComplementos"
        class="linha-cronograma__complementos"
      >
        <span
          v-if="instrucoes"
          class="linha-cronograma__instrucoes"
          data-teste="linha-cronograma-instrucoes"
        >{{ instrucoes }}</span>
        <span
          v-if="possuiNotaInterna"
          class="linha-cronograma__nota"
          data-teste="linha-cronograma-nota"
        >
          <span
            class="ie ie-permissao"
            aria-hidden="true"
          />
          {{ TEXTOS_CRONOGRAMA.notaInterna }}
        </span>
        <span
          v-if="comConflito"
          class="linha-cronograma__conflitos"
        >
          <BadgeStatus
            v-for="conflito in conflitos"
            :key="conflito"
            :texto="conflito"
            variante="alerta"
            icone="aviso"
            data-teste="linha-cronograma-conflito"
          />
        </span>
      </span>
    </component>
  </li>
</template>

<style scoped>
.linha-cronograma {
  container: linha-cronograma / inline-size;
  display: grid;
  grid-template-columns: var(--p-dimensao-coluna-horario-cronograma-celular) var(--p-espaco-6) minmax(0, 1fr);
  align-items: stretch;
  list-style: none;
}

.linha-cronograma + .linha-cronograma .linha-cronograma__conteudo {
  border-top: 1px solid var(--p-cor-divisoria);
}

.linha-cronograma__horario {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--p-espaco-1);
  padding: var(--p-espaco-4) var(--p-espaco-1) var(--p-espaco-4) 0;
  font-family: var(--p-fonte-interface);
  font-variant-numeric: tabular-nums;
}

.linha-cronograma__inicio {
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.linha-cronograma__termino {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 100%;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.linha-cronograma__mais-um {
  margin-left: var(--p-espaco-1);
  font-size: var(--p-fonte-tamanho-rotulo);
  font-weight: var(--p-fonte-peso-seminegrito);
}

.linha-cronograma__fio {
  position: relative;
  display: flex;
  justify-content: center;
}

.linha-cronograma__fio::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: var(--p-dimensao-fio-cronograma);
  content: '';
  background: var(--p-cor-primaria);
  transform: translateX(-50%);
}

.linha-cronograma:first-child .linha-cronograma__fio::before {
  top: calc(var(--p-espaco-4) + var(--p-dimensao-no-cronograma) / 2);
}

.linha-cronograma:last-child .linha-cronograma__fio::before {
  bottom: auto;
  height: calc(var(--p-espaco-4) + var(--p-dimensao-no-cronograma) / 2);
}

.linha-cronograma:only-child .linha-cronograma__fio::before {
  display: none;
}

.linha-cronograma__no {
  position: relative;
  z-index: 1;
  width: var(--p-dimensao-no-cronograma);
  height: var(--p-dimensao-no-cronograma);
  margin-top: calc(var(--p-espaco-4) + var(--p-espaco-1) / 2);
  background: var(--p-cor-primaria);
  border: var(--p-dimensao-fio-cronograma) solid var(--p-cor-primaria);
  border-radius: var(--p-raio-total);
}

.linha-cronograma--conflito .linha-cronograma__no {
  background: var(--p-cor-superficie);
  border-color: var(--p-cor-alerta);
}

.linha-cronograma--cerimonia .linha-cronograma__no {
  margin-left: calc(var(--p-dimensao-no-cronograma) / -3);
  background: var(--p-cor-superficie);
  border-color: var(--p-cor-acento);
}

.linha-cronograma__anel--segundo {
  position: absolute;
  top: calc(var(--p-dimensao-fio-cronograma) * -1);
  left: calc(var(--p-dimensao-no-cronograma) / 2);
  width: var(--p-dimensao-no-cronograma);
  height: var(--p-dimensao-no-cronograma);
  border: var(--p-dimensao-fio-cronograma) solid var(--p-cor-acento);
  border-radius: var(--p-raio-total);
}

.linha-cronograma__conteudo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  min-width: 0;
  padding: var(--p-espaco-4) var(--p-espaco-4) var(--p-espaco-4) var(--p-espaco-2);
  font: inherit;
  color: var(--p-cor-texto);
  text-align: left;
  background: transparent;
  border: 0;
}

.linha-cronograma--editavel .linha-cronograma__conteudo {
  min-height: var(--p-dimensao-alvo-toque-movel);
  cursor: pointer;
  border-radius: var(--p-raio-controle);
  transition: background-color var(--p-duracao-rapida);
}

.linha-cronograma--editavel .linha-cronograma__conteudo:hover {
  background: var(--p-cor-superficie-sutil);
}

.linha-cronograma--editavel .linha-cronograma__conteudo:focus-visible {
  background: var(--p-cor-primaria-suave);
}

.linha-cronograma__cabeca {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.linha-cronograma__atividade {
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-seminegrito);
  line-height: var(--p-fonte-entrelinha-interface);
  overflow-wrap: anywhere;
}

.linha-cronograma__relativo,
.linha-cronograma__metadados,
.linha-cronograma__instrucoes,
.linha-cronograma__nota {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.linha-cronograma--cerimonia .linha-cronograma__relativo {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-acento-texto);
}

.linha-cronograma__metadados {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.linha-cronograma__metadado,
.linha-cronograma__nota {
  display: inline-flex;
  gap: var(--p-espaco-2);
  align-items: center;
  overflow-wrap: anywhere;
}

.linha-cronograma__complementos {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  min-width: 0;
}

.linha-cronograma__instrucoes {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  color: var(--p-cor-texto-secundario);
}

.linha-cronograma__conflitos {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
}

.linha-cronograma__conflitos :deep(.badge-status) {
  white-space: normal;
}

@container (min-width: 36rem) {
  .linha-cronograma {
    grid-template-columns: var(--p-dimensao-coluna-horario-cronograma) var(--p-espaco-8) minmax(0, 1fr);
  }
}

@container linha-cronograma (min-width: 30rem) {
  .linha-cronograma__metadados {
    flex-direction: row;
    flex-wrap: wrap;
    column-gap: var(--p-espaco-4);
  }
}

@container linha-cronograma (min-width: 36rem) {
  .linha-cronograma__cabeca {
    flex-direction: row;
    gap: var(--p-espaco-4);
    align-items: baseline;
    justify-content: space-between;
  }

  .linha-cronograma__relativo {
    flex-shrink: 0;
  }
}

@container linha-cronograma (min-width: 42rem) {
  .linha-cronograma__conteudo--detalhes {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(12rem, 16rem);
    gap: var(--p-espaco-2) var(--p-ritmo-cartao);
    align-items: start;
  }

  .linha-cronograma__conteudo--detalhes.linha-cronograma__conteudo--complementos {
    grid-template-rows: auto 1fr;
  }

  .linha-cronograma__conteudo--detalhes .linha-cronograma__cabeca,
  .linha-cronograma__conteudo--detalhes .linha-cronograma__complementos {
    grid-column: 1;
  }

  .linha-cronograma__conteudo--detalhes .linha-cronograma__cabeca {
    flex-wrap: wrap;
  }

  .linha-cronograma__conteudo--detalhes .linha-cronograma__metadados {
    flex-direction: column;
    grid-row: 1;
    grid-column: 2;
    padding-left: var(--p-ritmo-grupo);
    border-left: 1px solid var(--p-cor-divisoria);
  }

  .linha-cronograma__conteudo--complementos .linha-cronograma__metadados {
    grid-row: 1 / span 2;
  }

  .linha-cronograma__conteudo--detalhes .linha-cronograma__metadado {
    align-items: flex-start;
  }

  .linha-cronograma__conteudo--detalhes .linha-cronograma__metadado > [aria-hidden='true'] {
    margin-top: var(--p-espaco-1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .linha-cronograma--editavel .linha-cronograma__conteudo {
    transition: none;
  }
}
</style>
