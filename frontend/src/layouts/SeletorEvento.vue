<script setup lang="ts">
import Select from 'primevue/select'

import type { ContextoEvento, OpcaoSeletorEvento } from './tipos'
import { LIMITE_BUSCA_EVENTO } from './trilha'
import NomesAnfitrioes from '@/componentes/base/NomesAnfitrioes.vue'
import { descreverContagem } from '@/textos/eventos'
import { ROTULOS_NAVEGACAO } from '@/textos/rotulos'
import { formatarDataCalendarioCurta } from '@/utilitarios/formatacao'

const props = withDefaults(
  defineProps<{
    eventoId: string
    evento: ContextoEvento
    opcoes: OpcaoSeletorEvento[]
    anexarEm?: 'body' | 'self'
  }>(),
  { anexarEm: 'body' },
)

const emit = defineEmits<{ trocar: [id: string] }>()

function quando(data: string, diasRestantes: number): string {
  return ROTULOS_NAVEGACAO.quandoEvento(formatarDataCalendarioCurta(data), descreverContagem(diasRestantes))
}

function aoEscolher(valor: unknown) {
  if (typeof valor === 'string' && valor !== props.eventoId) {
    emit('trocar', valor)
  }
}
</script>

<template>
  <Select
    :model-value="eventoId"
    :options="opcoes"
    option-label="rotulo"
    option-value="id"
    :filter="opcoes.length >= LIMITE_BUSCA_EVENTO"
    :filter-placeholder="ROTULOS_NAVEGACAO.buscarEvento"
    :empty-filter-message="ROTULOS_NAVEGACAO.nenhumEvento"
    :aria-label="ROTULOS_NAVEGACAO.trocarEvento"
    :append-to="anexarEm"
    class="seletor-evento"
    overlay-class="seletor-evento__painel"
    data-teste="seletor-evento"
    @update:model-value="aoEscolher"
  >
    <template #value>
      <NomesAnfitrioes
        class="seletor-evento__nomes"
        :primeiro="evento.nomePrimeiraPessoa"
        :segundo="evento.nomeSegundaPessoa"
        tamanho="navegacao"
      />
      <span
        class="seletor-evento__quando numeros-tabulares"
        data-teste="navegacao-evento-quando"
      >{{ quando(evento.data, evento.diasRestantes) }}</span>
    </template>
    <template #dropdownicon>
      <span
        class="ie ie-seta-baixo seletor-evento__seta"
        aria-hidden="true"
      />
    </template>
    <template #option="{ option, selected }">
      <span
        class="seletor-evento__opcao"
        :class="{ 'seletor-evento__opcao--atual': selected }"
        data-teste="opcao-evento"
      >
        <span class="seletor-evento__opcao-textos">
          <NomesAnfitrioes
            class="seletor-evento__opcao-nomes"
            :primeiro="option.nomePrimeiraPessoa"
            :segundo="option.nomeSegundaPessoa"
            tamanho="navegacao"
          />
          <span class="seletor-evento__opcao-quando numeros-tabulares">{{ quando(option.data, option.diasRestantes) }}</span>
        </span>
        <span
          v-if="selected"
          class="ie ie-concluido seletor-evento__marca"
          aria-hidden="true"
        />
      </span>
    </template>
  </Select>
</template>

<style scoped>
.seletor-evento.p-select {
  display: flex;
  width: calc(100% + 2 * var(--p-espaco-3));
  margin-inline: calc(-1 * var(--p-espaco-3));
  background: transparent;
  border-color: transparent;
  border-radius: var(--p-raio-controle);
  box-shadow: none;
  cursor: pointer;
  transition: background-color var(--p-duracao-rapida);
}

.seletor-evento.p-select:not(.p-disabled):hover {
  background: var(--p-cor-superficie-sutil);
  border-color: transparent;
}

.seletor-evento.p-select.p-focus {
  border-color: transparent;
  outline: 2px solid var(--p-cor-primaria);
  outline-offset: 2px;
}

.seletor-evento :deep(.p-select-label) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: var(--p-espaco-2) var(--p-espaco-3);
  overflow: hidden;
  white-space: normal;
  text-overflow: clip;
}

.seletor-evento :deep(.p-select-dropdown) {
  align-items: flex-start;
  width: auto;
  padding: calc(var(--p-espaco-2) + 0.375rem) var(--p-espaco-3) 0 0;
  color: var(--p-cor-texto-apoio);
  transition: color var(--p-duracao-rapida);
}

.seletor-evento.p-select:hover :deep(.p-select-dropdown),
.seletor-evento.p-select.p-focus :deep(.p-select-dropdown) {
  color: var(--p-cor-texto);
}

.seletor-evento__nomes {
  display: -webkit-box;
  overflow: hidden;
  font-size: 1.375rem;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.seletor-evento__quando {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.seletor-evento__opcao {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-3);
  width: 100%;
  min-width: 0;
}

.seletor-evento__opcao-textos {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.seletor-evento__opcao-nomes {
  overflow: hidden;
  font-size: 1.0625rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seletor-evento__opcao-quando {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.seletor-evento__marca {
  flex: none;
  color: var(--p-cor-primaria);
}

@media (pointer: coarse) {
  .seletor-evento :deep(.p-select-label) {
    min-height: var(--p-dimensao-alvo-toque);
  }
}
</style>

<style>
.seletor-evento__painel.p-select-overlay {
  min-width: min(16rem, 88vw);
  max-width: min(22rem, 88vw);
}

.seletor-evento__painel .p-select-option {
  min-height: var(--p-dimensao-alvo-toque);
}
</style>
