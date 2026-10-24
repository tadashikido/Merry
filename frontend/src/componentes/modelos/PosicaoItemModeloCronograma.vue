<script setup lang="ts">
import { computed, useId } from 'vue'

import { ROTULOS_DIA_CRONOGRAMA } from '@/textos/cronograma'
import { momentoDoModelo } from '@/textos/modelos'
import { TEXTOS_ITEM_MODELO_CRONOGRAMA, TEXTOS_MODELOS_CRONOGRAMA } from '@/textos/modelosCronograma'
import type { TipoEvento } from '@/tipos/eventos'
import type { ItemModeloCronogramaDto } from '@/tipos/modelosCronograma'
import { descreverRelativoCerimonia } from '@/utilitarios/cronograma'
import { posicaoItemNoModeloCronograma, type ItemNaPosicao } from '@/utilitarios/modelosCronograma'

interface LinhaDia {
  chave: string
  rotulo: string
  contagem: string
  atual: boolean
}

interface LinhaItem {
  chave: string
  atividade: string
  horario: string
  esteItem: boolean
}

const props = withDefaults(
  defineProps<{
    itens: readonly ItemModeloCronogramaDto[]
    atual: ItemNaPosicao | null
    atividade?: string
    itemId?: string | null
    tipo?: TipoEvento | null
    previaNoCampo?: boolean
  }>(),
  { atividade: '', itemId: null, tipo: null, previaNoCampo: false },
)

const idTitulo = useId()

const contracaoMomento = computed(() => momentoDoModelo(props.tipo).contracaoDe)
const posicao = computed(() => posicaoItemNoModeloCronograma(props.itens, props.atual, props.itemId))

const previa = computed(() =>
  props.atual === null
    ? TEXTOS_ITEM_MODELO_CRONOGRAMA.posicaoSemInicio
    : (descreverRelativoCerimonia(props.atual.minutos, contracaoMomento.value) ?? TEXTOS_ITEM_MODELO_CRONOGRAMA.posicaoSemInicio),
)

const nota = computed(() => {
  if (posicao.value.outrosItens === 0) {
    return TEXTOS_ITEM_MODELO_CRONOGRAMA.primeiroItem
  }
  if (posicao.value.ampliaComeco) {
    return TEXTOS_ITEM_MODELO_CRONOGRAMA.ampliaComeco
  }
  return posicao.value.ampliaFim ? TEXTOS_ITEM_MODELO_CRONOGRAMA.ampliaFim : null
})

const dias = computed<LinhaDia[]>(() =>
  posicao.value.dias.map((dia) => ({
    chave: dia.dia,
    rotulo: ROTULOS_DIA_CRONOGRAMA[dia.dia],
    contagem: TEXTOS_MODELOS_CRONOGRAMA.resumoDia(dia.quantidade, dia.intervalo),
    atual: dia.atual,
  })),
)

function horario(inicio: string, minutos: number): string {
  return TEXTOS_ITEM_MODELO_CRONOGRAMA.horarioComDistancia(inicio, descreverRelativoCerimonia(minutos, contracaoMomento.value) ?? '')
}

const itensDoDia = computed<LinhaItem[]>(() => {
  const atual = props.atual
  if (atual === null) {
    return []
  }
  const vizinhos = posicao.value.vizinhos.map((item) => ({
    chave: item.id,
    atividade: item.atividade,
    minutos: item.minutosDesdeCerimonia,
    inicio: item.inicio,
    esteItem: false,
  }))
  const indice = vizinhos.findIndex((item) => item.minutos > atual.minutos)
  const este = {
    chave: 'este-item',
    atividade: props.atividade.trim() || TEXTOS_ITEM_MODELO_CRONOGRAMA.esteItem,
    minutos: atual.minutos,
    inicio: atual.inicio,
    esteItem: true,
  }
  const linhas = indice === -1 ? [...vizinhos, este] : [...vizinhos.slice(0, indice), este, ...vizinhos.slice(indice)]
  return linhas.map((linha) => ({
    chave: linha.chave,
    atividade: linha.atividade,
    horario: horario(linha.inicio, linha.minutos),
    esteItem: linha.esteItem,
  }))
})

const comAtividadePropria = computed(() => props.atividade.trim() !== '')
</script>

<template>
  <section
    class="posicao-cronograma"
    :aria-labelledby="idTitulo"
    data-teste="posicao-item-modelo-cronograma"
  >
    <h2
      :id="idTitulo"
      class="posicao-cronograma__titulo texto-rotulo"
    >
      {{ TEXTOS_ITEM_MODELO_CRONOGRAMA.posicaoTitulo }}
    </h2>

    <p
      class="posicao-cronograma__previa"
      :class="{ 'posicao-cronograma__previa--vazia': atual === null, 'com-lateral__so-leitor-ao-lado': previaNoCampo }"
      aria-live="polite"
      data-teste="previa-horario-item"
    >
      {{ previa }}
    </p>

    <p
      v-if="nota"
      class="posicao-cronograma__nota"
      data-teste="nota-alcance-item"
    >
      {{ nota }}
    </p>

    <ol
      v-if="dias.length > 0"
      class="posicao-cronograma__regua"
      :aria-label="TEXTOS_ITEM_MODELO_CRONOGRAMA.diasRotulo"
      data-teste="dias-item-modelo"
    >
      <li
        v-for="dia in dias"
        :key="dia.chave"
        class="posicao-cronograma__dia"
        :class="{ 'posicao-cronograma__dia--atual': dia.atual }"
        :data-teste="`dia-item-${dia.chave}`"
      >
        <span
          class="posicao-cronograma__no"
          aria-hidden="true"
        />
        <span class="posicao-cronograma__cabeca">
          <span class="posicao-cronograma__rotulo">{{ dia.rotulo }}</span>
          <span
            class="posicao-cronograma__contagem"
            data-teste="contagem-dia-item"
          >{{ dia.contagem }}</span>
        </span>
        <span
          v-if="dia.atual"
          class="somente-leitor-tela"
        >{{ TEXTOS_ITEM_MODELO_CRONOGRAMA.esteItemEntraAqui }}</span>

        <ul
          v-if="dia.atual"
          class="posicao-cronograma__itens"
          data-teste="itens-dia-atual"
        >
          <li
            v-for="linha in itensDoDia"
            :key="linha.chave"
            class="posicao-cronograma__item"
            :class="{ 'posicao-cronograma__item--este': linha.esteItem }"
            :data-teste="linha.esteItem ? 'este-item' : 'vizinho-item'"
          >
            <span class="posicao-cronograma__item-atividade">
              {{ linha.atividade }}<span
                v-if="linha.esteItem && comAtividadePropria"
                class="posicao-cronograma__selo"
              >{{ ' ' }}({{ TEXTOS_ITEM_MODELO_CRONOGRAMA.esteItem.toLowerCase() }})</span>
            </span>
            <span class="posicao-cronograma__item-horario">{{ linha.horario }}</span>
          </li>
          <li
            v-if="posicao.maisNoDia > 0"
            class="posicao-cronograma__mais"
            data-teste="mais-no-dia"
          >
            {{ TEXTOS_ITEM_MODELO_CRONOGRAMA.maisNoDia(posicao.maisNoDia) }}
          </li>
        </ul>
        <p
          v-if="dia.atual && posicao.vizinhos.length === 0 && posicao.outrosItens > 0"
          class="posicao-cronograma__sozinho"
          data-teste="sozinho-no-dia"
        >
          {{ TEXTOS_ITEM_MODELO_CRONOGRAMA.sozinhoNoDia }}
        </p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.posicao-cronograma {
  container: posicao-cronograma / inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.posicao-cronograma .posicao-cronograma__titulo {
  margin: 0 0 var(--p-ritmo-campo);
}

.posicao-cronograma__previa {
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

.posicao-cronograma__previa--vazia {
  border-left-color: var(--p-cor-borda);
  color: var(--p-cor-texto-secundario);
}

.posicao-cronograma__nota,
.posicao-cronograma__sozinho {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-secundario);
}

.posicao-cronograma__regua {
  margin: var(--p-ritmo-campo) 0 0;
  padding: 0 0 0 calc(0.375rem + 1px);
  list-style: none;
}

.posicao-cronograma__dia {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  padding-block: 0 var(--p-ritmo-grupo);
  padding-inline-start: var(--p-ritmo-grupo);
  border-inline-start: 2px solid var(--p-cor-borda);
}

.posicao-cronograma__dia:last-child {
  padding-block-end: 0;
  border-inline-start-color: transparent;
}

.posicao-cronograma__no {
  position: absolute;
  inset-block-start: 0.4rem;
  inset-inline-start: calc(-0.375rem - 1px);
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid var(--p-cor-borda);
  border-radius: 50%;
  background: var(--p-cor-superficie);
}

.posicao-cronograma__dia--atual .posicao-cronograma__no {
  border-color: var(--p-cor-primaria);
  background: var(--p-cor-primaria);
  box-shadow: 0 0 0 3px var(--p-cor-primaria-suave);
}

.posicao-cronograma__cabeca {
  display: flex;
  flex-direction: column;
  gap: 0 var(--p-ritmo-grupo);
  min-width: 0;
}

.posicao-cronograma__rotulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
}

.posicao-cronograma__dia--atual .posicao-cronograma__rotulo {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-primaria);
}

.posicao-cronograma__contagem {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto-secundario);
}

.posicao-cronograma__itens {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.posicao-cronograma__item {
  display: flex;
  flex-direction: column;
  padding-block: var(--p-ritmo-campo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.posicao-cronograma__item--este {
  padding-inline-start: var(--p-ritmo-campo);
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.posicao-cronograma__item-atividade {
  min-width: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.posicao-cronograma__item--este .posicao-cronograma__item-atividade {
  font-weight: var(--p-fonte-peso-medio);
}

.posicao-cronograma__selo {
  font-family: var(--p-fonte-serif);
  font-style: italic;
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto-secundario);
}

.posicao-cronograma__item-horario,
.posicao-cronograma__mais {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto-secundario);
}

.posicao-cronograma__mais {
  padding-top: var(--p-ritmo-campo);
  border-top: 1px solid var(--p-cor-divisoria);
}

@container posicao-cronograma (min-width: 22rem) {
  .posicao-cronograma__cabeca {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
  }
}
</style>
