<script setup lang="ts">
import { computed } from 'vue'

import BadgeStatus from './BadgeStatus.vue'
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
    concluido?: boolean
    cerimonia?: boolean
    rotuloMomento?: string | null
  }>(),
  {
    termino: null,
    terminaEmOutroDia: false,
    local: null,
    responsavel: null,
    fornecedor: null,
    instrucoes: null,
    concluido: false,
    cerimonia: false,
    rotuloMomento: null,
  },
)

const quem = computed(() => [props.responsavel, props.fornecedor].filter((valor): valor is string => Boolean(valor)))
</script>

<template>
  <li
    class="item-roteiro"
    :class="{ 'item-roteiro--cerimonia': cerimonia, 'item-roteiro--concluido': concluido }"
    data-teste="item-roteiro"
  >
    <div class="item-roteiro__horario">
      <time
        class="item-roteiro__inicio"
        :datetime="inicio"
      >{{ inicio }}</time>
      <span
        v-if="termino"
        class="item-roteiro__termino"
      >
        {{ TEXTOS_CRONOGRAMA_PUBLICO.ate(termino) }}
        <template v-if="terminaEmOutroDia">
          <span aria-hidden="true">{{ TEXTOS_CRONOGRAMA_PUBLICO.maisUm }}</span>
          <span class="item-roteiro__oculto">{{ TEXTOS_CRONOGRAMA_PUBLICO.doDiaSeguinte }}</span>
        </template>
      </span>
    </div>
    <div
      class="item-roteiro__fio"
      aria-hidden="true"
    >
      <span class="item-roteiro__no">
        <span
          v-if="cerimonia"
          class="item-roteiro__anel"
        />
      </span>
    </div>
    <div class="item-roteiro__conteudo">
      <div class="item-roteiro__topo">
        <p class="item-roteiro__atividade">
          {{ atividade }}
        </p>
        <span
          v-if="cerimonia && rotuloMomento"
          class="item-roteiro__momento"
          data-teste="item-roteiro-momento"
        >{{ rotuloMomento }}</span>
        <BadgeStatus
          v-if="concluido"
          :texto="TEXTOS_CRONOGRAMA_PUBLICO.feito"
          variante="sucesso"
          data-teste="item-roteiro-feito"
        />
      </div>
      <p
        v-if="local"
        class="item-roteiro__local"
      >
        <span
          class="ie ie-local item-roteiro__icone"
          aria-hidden="true"
        />
        <span class="item-roteiro__oculto">{{ TEXTOS_CRONOGRAMA_PUBLICO.rotuloLocal }}: </span>
        <span>{{ local }}</span>
      </p>
      <p
        v-if="quem.length > 0"
        class="item-roteiro__quem"
      >
        <span class="item-roteiro__oculto">{{ TEXTOS_CRONOGRAMA_PUBLICO.rotuloQuem }}: </span>
        <span
          v-for="(nome, indice) in quem"
          :key="indice"
          class="item-roteiro__pessoa"
        >{{ nome }}</span>
      </p>
      <p
        v-if="instrucoes"
        class="item-roteiro__instrucoes"
        data-teste="item-roteiro-instrucoes"
      >
        <span class="item-roteiro__oculto">{{ TEXTOS_CRONOGRAMA_PUBLICO.rotuloInstrucoes }}: </span>{{ instrucoes }}
      </p>
    </div>
  </li>
</template>

<style scoped>
.item-roteiro {
  display: grid;
  grid-template-columns: var(--p-dimensao-coluna-horario-operacao) var(--p-espaco-5) minmax(0, 1fr);
  gap: 0 var(--p-espaco-2);
  list-style: none;
}

.item-roteiro__horario {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  padding: var(--p-espaco-3) 0;
}

.item-roteiro__inicio {
  font-size: var(--p-fonte-tamanho-operacao);
  font-weight: var(--p-fonte-peso-negrito);
  font-variant-numeric: tabular-nums;
  line-height: var(--p-fonte-entrelinha-display);
  color: var(--p-cor-operacao-texto);
}

.item-roteiro__termino {
  font-size: var(--p-fonte-tamanho-apoio);
  font-variant-numeric: tabular-nums;
  color: var(--p-cor-operacao-apoio);
}

.item-roteiro__fio {
  position: relative;
  display: flex;
  justify-content: center;
}

.item-roteiro__fio::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: var(--p-dimensao-fio-cronograma);
  content: '';
  background: var(--p-cor-operacao-borda);
  transform: translateX(-50%);
}

.item-roteiro:first-child .item-roteiro__fio::before {
  top: calc(var(--p-espaco-4) + var(--p-dimensao-no-cronograma) / 2);
}

.item-roteiro:last-child .item-roteiro__fio::before {
  bottom: auto;
  height: calc(var(--p-espaco-4) + var(--p-dimensao-no-cronograma) / 2);
}

.item-roteiro:only-child .item-roteiro__fio::before {
  display: none;
}

.item-roteiro__no {
  position: relative;
  z-index: 1;
  width: var(--p-dimensao-no-cronograma);
  height: var(--p-dimensao-no-cronograma);
  margin-top: var(--p-espaco-4);
  background: var(--p-cor-operacao-apoio);
  border: var(--p-dimensao-fio-cronograma) solid var(--p-cor-operacao-apoio);
  border-radius: var(--p-raio-total);
}

.item-roteiro--concluido .item-roteiro__no {
  background: var(--p-cor-operacao-sucesso);
  border-color: var(--p-cor-operacao-sucesso);
}

.item-roteiro--cerimonia .item-roteiro__no {
  margin-left: calc(var(--p-dimensao-no-cronograma) / -3);
  background: var(--p-cor-operacao-fundo);
  border-color: var(--p-cor-operacao-destaque);
}

.item-roteiro__anel {
  position: absolute;
  top: calc(var(--p-dimensao-fio-cronograma) * -1);
  left: calc(var(--p-dimensao-no-cronograma) / 2);
  width: var(--p-dimensao-no-cronograma);
  height: var(--p-dimensao-no-cronograma);
  border: var(--p-dimensao-fio-cronograma) solid var(--p-cor-operacao-destaque);
  border-radius: var(--p-raio-total);
}

.item-roteiro__conteudo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
  padding: var(--p-espaco-3) 0 var(--p-espaco-5);
}

.item-roteiro__topo {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
  align-items: center;
  justify-content: space-between;
}

.item-roteiro__atividade {
  margin: 0;
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-operacao-texto);
  overflow-wrap: anywhere;
}

.item-roteiro--cerimonia .item-roteiro__atividade {
  color: var(--p-cor-operacao-destaque);
}

.item-roteiro__momento {
  padding: var(--p-espaco-1) var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-operacao-destaque);
  border: 1px solid var(--p-cor-operacao-borda);
  border-radius: var(--p-raio-total);
}

.item-roteiro__local,
.item-roteiro__quem {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-1) var(--p-espaco-3);
  align-items: center;
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-operacao-apoio);
  overflow-wrap: anywhere;
}

.item-roteiro__local {
  gap: var(--p-espaco-1);
  color: var(--p-cor-operacao-texto);
}

.item-roteiro__icone {
  flex-shrink: 0;
  color: var(--p-cor-operacao-apoio);
}

.item-roteiro__instrucoes {
  margin: var(--p-espaco-2) 0 0;
  padding-left: var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-corpo);
  color: var(--p-cor-operacao-texto);
  white-space: pre-line;
  overflow-wrap: anywhere;
  border-left: var(--p-dimensao-fio-cronograma) solid var(--p-cor-operacao-destaque);
}

.item-roteiro__oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
