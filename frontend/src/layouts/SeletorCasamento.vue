<script setup lang="ts">
import Select from 'primevue/select'

import type { ContextoCasamento, OpcaoSeletorCasamento } from './tipos'
import { LIMITE_BUSCA_CASAMENTO } from './trilha'
import NomesCasal from '@/componentes/base/NomesCasal.vue'
import { descreverContagem } from '@/textos/casamentos'
import { ROTULOS_NAVEGACAO } from '@/textos/rotulos'
import { formatarDataCalendarioCurta } from '@/utilitarios/formatacao'

const props = withDefaults(
  defineProps<{
    casamentoId: string
    casamento: ContextoCasamento
    opcoes: OpcaoSeletorCasamento[]
    anexarEm?: 'body' | 'self'
  }>(),
  { anexarEm: 'body' },
)

const emit = defineEmits<{ trocar: [id: string] }>()

function quando(data: string, diasRestantes: number): string {
  return ROTULOS_NAVEGACAO.quandoCasamento(formatarDataCalendarioCurta(data), descreverContagem(diasRestantes))
}

function aoEscolher(valor: unknown) {
  if (typeof valor === 'string' && valor !== props.casamentoId) {
    emit('trocar', valor)
  }
}
</script>

<template>
  <Select
    :model-value="casamentoId"
    :options="opcoes"
    option-label="rotulo"
    option-value="id"
    :filter="opcoes.length >= LIMITE_BUSCA_CASAMENTO"
    :filter-placeholder="ROTULOS_NAVEGACAO.buscarCasamento"
    :empty-filter-message="ROTULOS_NAVEGACAO.nenhumCasamento"
    :aria-label="ROTULOS_NAVEGACAO.trocarCasamento"
    :append-to="anexarEm"
    class="seletor-casamento"
    overlay-class="seletor-casamento__painel"
    data-teste="seletor-casamento"
    @update:model-value="aoEscolher"
  >
    <template #value>
      <NomesCasal
        class="seletor-casamento__nomes"
        :primeiro="casamento.nomePrimeiraPessoa"
        :segundo="casamento.nomeSegundaPessoa"
        tamanho="navegacao"
      />
      <span
        class="seletor-casamento__quando numeros-tabulares"
        data-teste="navegacao-casamento-quando"
      >{{ quando(casamento.data, casamento.diasRestantes) }}</span>
    </template>
    <template #dropdownicon>
      <span
        class="ie ie-seta-baixo seletor-casamento__seta"
        aria-hidden="true"
      />
    </template>
    <template #option="{ option, selected }">
      <span
        class="seletor-casamento__opcao"
        :class="{ 'seletor-casamento__opcao--atual': selected }"
        data-teste="opcao-casamento"
      >
        <span class="seletor-casamento__opcao-textos">
          <NomesCasal
            class="seletor-casamento__opcao-nomes"
            :primeiro="option.nomePrimeiraPessoa"
            :segundo="option.nomeSegundaPessoa"
            tamanho="navegacao"
          />
          <span class="seletor-casamento__opcao-quando numeros-tabulares">{{ quando(option.data, option.diasRestantes) }}</span>
        </span>
        <span
          v-if="selected"
          class="ie ie-concluido seletor-casamento__marca"
          aria-hidden="true"
        />
      </span>
    </template>
  </Select>
</template>

<style scoped>
.seletor-casamento.p-select {
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

.seletor-casamento.p-select:not(.p-disabled):hover {
  background: var(--p-cor-superficie-sutil);
  border-color: transparent;
}

.seletor-casamento.p-select.p-focus {
  border-color: transparent;
  outline: 2px solid var(--p-cor-primaria);
  outline-offset: 2px;
}

.seletor-casamento :deep(.p-select-label) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: var(--p-espaco-2) var(--p-espaco-3);
  overflow: hidden;
  white-space: normal;
  text-overflow: clip;
}

.seletor-casamento :deep(.p-select-dropdown) {
  align-items: flex-start;
  width: auto;
  padding: calc(var(--p-espaco-2) + 0.375rem) var(--p-espaco-3) 0 0;
  color: var(--p-cor-texto-apoio);
  transition: color var(--p-duracao-rapida);
}

.seletor-casamento.p-select:hover :deep(.p-select-dropdown),
.seletor-casamento.p-select.p-focus :deep(.p-select-dropdown) {
  color: var(--p-cor-texto);
}

.seletor-casamento__nomes {
  display: -webkit-box;
  overflow: hidden;
  font-size: 1.375rem;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.seletor-casamento__quando {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.seletor-casamento__opcao {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-3);
  width: 100%;
  min-width: 0;
}

.seletor-casamento__opcao-textos {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.seletor-casamento__opcao-nomes {
  overflow: hidden;
  font-size: 1.0625rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seletor-casamento__opcao-quando {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.seletor-casamento__marca {
  flex: none;
  color: var(--p-cor-primaria);
}

@media (pointer: coarse) {
  .seletor-casamento :deep(.p-select-label) {
    min-height: var(--p-dimensao-alvo-toque);
  }
}
</style>

<style>
.seletor-casamento__painel.p-select-overlay {
  min-width: min(16rem, 88vw);
  max-width: min(22rem, 88vw);
}

.seletor-casamento__painel .p-select-option {
  min-height: var(--p-dimensao-alvo-toque);
}
</style>
