<script setup lang="ts">
import { computed } from 'vue'

import { TEXTOS_CONFIRMACOES } from '@/textos/confirmacoes'
import type { DataCalendario } from '@/tipos/eventos'
import { formatarDiaMes } from '@/utilitarios/rsvp'

const DIAS_ALERTA = 3

const props = defineProps<{ dataLimite: DataCalendario; diasRestantes: number; aceitaRespostas: boolean }>()

const data = computed(() => formatarDiaMes(props.dataLimite))
const encerrado = computed(() => !props.aceitaRespostas || props.diasRestantes < 0)
const variante = computed(() => {
  if (encerrado.value) {
    return 'encerrado'
  }
  return props.diasRestantes <= DIAS_ALERTA ? 'alerta' : 'normal'
})
const titulo = computed(() => (encerrado.value ? TEXTOS_CONFIRMACOES.prazoEncerrado(data.value) : TEXTOS_CONFIRMACOES.prazoAte(data.value)))
const complemento = computed(() => (encerrado.value ? null : TEXTOS_CONFIRMACOES.prazoFaltam(props.diasRestantes)))
</script>

<template>
  <div
    class="indicador-prazo"
    :class="`indicador-prazo--${variante}`"
    role="group"
    :aria-label="complemento ? TEXTOS_CONFIRMACOES.prazoAcessivel(data, complemento) : titulo"
    data-teste="indicador-prazo"
  >
    <span
      class="indicador-prazo__icone ie"
      :class="encerrado ? 'ie-prazo' : 'ie-calendario'"
      aria-hidden="true"
    />
    <div
      class="indicador-prazo__textos"
      aria-hidden="true"
    >
      <span class="indicador-prazo__titulo">{{ titulo }}</span>
      <span
        v-if="complemento"
        class="indicador-prazo__complemento numeros-tabulares"
        data-teste="indicador-prazo-complemento"
      >{{ complemento }}</span>
    </div>
    <div
      v-if="$slots.acao"
      class="indicador-prazo__acao"
    >
      <slot name="acao" />
    </div>
  </div>
</template>

<style scoped>
.indicador-prazo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-4) var(--p-espaco-5);
  color: var(--p-cor-texto);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-left: 4px solid var(--p-cor-primaria);
  border-radius: var(--p-raio-painel);
}

.indicador-prazo--alerta {
  background: var(--p-cor-alerta-suave);
  border-left-color: var(--p-cor-alerta);
}

.indicador-prazo--encerrado {
  background: var(--p-cor-neutro-suave);
  border-left-color: var(--p-cor-neutro);
}

.indicador-prazo__icone {
  font-size: var(--p-fonte-tamanho-titulo);
  color: var(--p-cor-primaria);
}

.indicador-prazo--alerta .indicador-prazo__icone {
  color: var(--p-cor-alerta);
}

.indicador-prazo--encerrado .indicador-prazo__icone {
  color: var(--p-cor-neutro);
}

.indicador-prazo__textos {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.indicador-prazo__titulo {
  font-weight: var(--p-fonte-peso-seminegrito);
}

.indicador-prazo__complemento {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.indicador-prazo__acao {
  flex: none;
}
</style>
