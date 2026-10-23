<script setup lang="ts">
import { computed, useId } from 'vue'

import { ROTULOS_MARCO_CHECKLIST, TEXTOS_ITEM_MODELO, TEXTOS_MODELOS_CHECKLIST, complementoMarcoModelo, descreverPrazoRelativo } from '@/textos/checklist'
import { referenciaDoModelo } from '@/textos/modelos'
import type { ItemModeloChecklistDto } from '@/tipos/checklist'
import type { TipoEvento } from '@/tipos/eventos'
import { descreverPrazoAproximado, posicaoItemNoModelo } from '@/utilitarios/prazoModelo'

interface LinhaMarco {
  chave: string
  rotulo: string
  complemento: string | null
  contagem: string
  atual: boolean
}

interface LinhaItem {
  chave: string
  titulo: string
  prazo: string
  esteItem: boolean
}

const props = withDefaults(
  defineProps<{
    itens: readonly ItemModeloChecklistDto[]
    dias: number | null
    titulo?: string
    itemId?: string | null
    tipo?: TipoEvento | null
  }>(),
  { titulo: '', itemId: null, tipo: null },
)

const idTitulo = useId()

const contracaoDe = computed(() => referenciaDoModelo(props.tipo).contracaoDe)
const posicao = computed(() => posicaoItemNoModelo(props.itens, props.dias, props.itemId))

const previa = computed(() =>
  props.dias === null ? TEXTOS_ITEM_MODELO.posicaoSemDias : descreverPrazoAproximado(props.dias, contracaoDe.value),
)

const nota = computed(() => {
  if (posicao.value.outrosItens === 0) {
    return TEXTOS_ITEM_MODELO.primeiroItem
  }
  if (posicao.value.ampliaPrimeiro) {
    return TEXTOS_ITEM_MODELO.ampliaPrimeiro
  }
  return posicao.value.ampliaUltimo ? TEXTOS_ITEM_MODELO.ampliaUltimo : null
})

const marcos = computed<LinhaMarco[]>(() =>
  posicao.value.marcos.map((marco) => ({
    chave: marco.marco,
    rotulo: ROTULOS_MARCO_CHECKLIST[marco.marco],
    complemento: complementoMarcoModelo(marco.marco, contracaoDe.value),
    contagem: TEXTOS_MODELOS_CHECKLIST.resumoItens(marco.quantidade),
    atual: marco.atual,
  })),
)

const itensDoMarco = computed<LinhaItem[]>(() => {
  if (props.dias === null) {
    return []
  }
  const dias = props.dias
  const vizinhos = posicao.value.vizinhos.map((item) => ({
    chave: item.id,
    titulo: item.titulo,
    dias: item.diasAntesDoEvento,
    esteItem: false,
  }))
  const indice = vizinhos.findIndex((item) => item.dias < dias)
  const este = { chave: 'este-item', titulo: props.titulo.trim() || TEXTOS_ITEM_MODELO.esteItem, dias, esteItem: true }
  const linhas = indice === -1 ? [...vizinhos, este] : [...vizinhos.slice(0, indice), este, ...vizinhos.slice(indice)]
  return linhas.map((linha) => ({
    chave: linha.chave,
    titulo: linha.titulo,
    prazo: descreverPrazoRelativo(linha.dias, contracaoDe.value),
    esteItem: linha.esteItem,
  }))
})

const comTituloProprio = computed(() => props.titulo.trim() !== '')
</script>

<template>
  <section
    class="posicao-item"
    :aria-labelledby="idTitulo"
    data-teste="posicao-item-modelo"
  >
    <h2
      :id="idTitulo"
      class="posicao-item__titulo texto-rotulo"
    >
      {{ TEXTOS_ITEM_MODELO.posicaoTitulo }}
    </h2>

    <p
      class="posicao-item__previa"
      :class="{ 'posicao-item__previa--vazia': dias === null }"
      aria-live="polite"
      data-teste="previa-prazo-item"
    >
      {{ previa }}
    </p>

    <p
      v-if="nota"
      class="posicao-item__nota"
      data-teste="nota-alcance-item"
    >
      {{ nota }}
    </p>

    <ol
      v-if="marcos.length > 0"
      class="posicao-item__regua"
      :aria-label="TEXTOS_ITEM_MODELO.reguaRotulo"
      data-teste="regua-item-modelo"
    >
      <li
        v-for="marco in marcos"
        :key="marco.chave"
        class="posicao-item__marco"
        :class="{ 'posicao-item__marco--atual': marco.atual }"
        :data-teste="`marco-item-${marco.chave}`"
      >
        <span
          class="posicao-item__no"
          aria-hidden="true"
        />
        <span class="posicao-item__cabeca">
          <span class="posicao-item__nome">
            <span class="posicao-item__rotulo">{{ marco.rotulo }}</span>
            <span
              v-if="marco.complemento"
              class="posicao-item__complemento"
            >{{ ' ' }}{{ marco.complemento }}</span>
          </span>
          <span
            class="posicao-item__contagem"
            data-teste="contagem-marco-item"
          >{{ marco.contagem }}</span>
        </span>
        <span
          v-if="marco.atual"
          class="somente-leitor-tela"
        >{{ TEXTOS_ITEM_MODELO.esteItemEntraAqui }}</span>

        <ul
          v-if="marco.atual"
          class="posicao-item__itens"
          data-teste="itens-marco-atual"
        >
          <li
            v-for="linha in itensDoMarco"
            :key="linha.chave"
            class="posicao-item__item"
            :class="{ 'posicao-item__item--este': linha.esteItem }"
            :data-teste="linha.esteItem ? 'este-item' : 'vizinho-item'"
          >
            <span class="posicao-item__item-titulo">
              {{ linha.titulo }}<span
                v-if="linha.esteItem && comTituloProprio"
                class="posicao-item__selo"
              >{{ ' ' }}({{ TEXTOS_ITEM_MODELO.esteItem.toLowerCase() }})</span>
            </span>
            <span class="posicao-item__item-prazo">{{ linha.prazo }}</span>
          </li>
          <li
            v-if="posicao.maisNoMarco > 0"
            class="posicao-item__mais"
            data-teste="mais-no-marco"
          >
            {{ TEXTOS_ITEM_MODELO.maisNoMarco(posicao.maisNoMarco) }}
          </li>
        </ul>
        <p
          v-if="marco.atual && posicao.vizinhos.length === 0 && posicao.outrosItens > 0"
          class="posicao-item__sozinho"
          data-teste="sozinho-no-marco"
        >
          {{ TEXTOS_ITEM_MODELO.sozinhoNoMarco }}
        </p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.posicao-item {
  container: posicao-item / inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.posicao-item .posicao-item__titulo {
  margin: 0 0 var(--p-ritmo-campo);
}

.posicao-item__previa {
  margin: 0;
  padding-left: var(--p-ritmo-campo);
  border-left: 2px solid var(--p-cor-primaria);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-secao);
  font-style: italic;
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto);
}

.posicao-item__previa--vazia {
  border-left-color: var(--p-cor-borda);
  color: var(--p-cor-texto-secundario);
}

.posicao-item__nota,
.posicao-item__sozinho {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-secundario);
}

.posicao-item__regua {
  margin: var(--p-ritmo-campo) 0 0;
  padding: 0 0 0 calc(0.375rem + 1px);
  list-style: none;
}

.posicao-item__marco {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  padding-block: 0 var(--p-ritmo-grupo);
  padding-inline-start: var(--p-ritmo-grupo);
  border-inline-start: 2px solid var(--p-cor-borda);
}

.posicao-item__marco:last-child {
  padding-block-end: 0;
  border-inline-start-color: transparent;
}

.posicao-item__no {
  position: absolute;
  inset-block-start: 0.4rem;
  inset-inline-start: calc(-0.375rem - 1px);
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid var(--p-cor-borda);
  border-radius: 50%;
  background: var(--p-cor-superficie);
}

.posicao-item__marco--atual .posicao-item__no {
  border-color: var(--p-cor-primaria);
  background: var(--p-cor-primaria);
  box-shadow: 0 0 0 3px var(--p-cor-primaria-suave);
}

.posicao-item__cabeca {
  display: flex;
  flex-direction: column;
  gap: 0 var(--p-ritmo-grupo);
  min-width: 0;
}

.posicao-item__nome {
  min-width: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-secundario);
}

.posicao-item__rotulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto);
}

.posicao-item__marco--atual .posicao-item__rotulo {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-primaria);
}

.posicao-item__contagem {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto-secundario);
  white-space: nowrap;
}

.posicao-item__itens {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.posicao-item__item {
  display: flex;
  flex-direction: column;
  padding-block: var(--p-ritmo-campo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.posicao-item__item--este {
  padding-inline-start: var(--p-ritmo-campo);
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.posicao-item__item-titulo {
  min-width: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.posicao-item__item--este .posicao-item__item-titulo {
  font-weight: var(--p-fonte-peso-medio);
}

.posicao-item__selo {
  font-family: var(--p-fonte-serif);
  font-style: italic;
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto-secundario);
}

.posicao-item__item-prazo,
.posicao-item__mais {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto-secundario);
}

.posicao-item__mais {
  padding-top: var(--p-ritmo-campo);
  border-top: 1px solid var(--p-cor-divisoria);
}

@container posicao-item (min-width: 22rem) {
  .posicao-item__cabeca {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
  }
}
</style>
