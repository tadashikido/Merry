<script setup lang="ts">
import { computed, useId } from 'vue'

import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import { TEXTOS_MODELOS_POR_TIPO, exemplosNomeModelo, ondeApareceModelo, rotuloSugeridoDoModelo } from '@/textos/modelos'
import type { TipoEvento } from '@/tipos/eventos'

const props = withDefaults(
  defineProps<{
    recurso: string
    rotuloSugerido: string
    dicas: readonly string[]
    edicao?: boolean
    tipo?: TipoEvento | null
    sugerido?: boolean
    contagem?: string | null
  }>(),
  { edicao: false, tipo: null, sugerido: false, contagem: null },
)

const idOnde = useId()
const idBomModelo = useId()
const idExemplos = useId()

const selo = computed(() => rotuloSugeridoDoModelo(props.tipo, props.rotuloSugerido))
const ondeAparece = computed(() => ondeApareceModelo(props.edicao ? props.tipo : null, props.recurso))
const nota = computed(() =>
  props.edicao ? TEXTOS_MODELOS_POR_TIPO.edicaoNaoMudaAplicados(props.recurso) : TEXTOS_MODELOS_POR_TIPO.novoParaQualquerTipo,
)
const exemplos = exemplosNomeModelo()
</script>

<template>
  <div
    class="orientacao-modelo"
    data-teste="orientacao-formulario-modelo"
  >
    <div class="orientacao-modelo__secoes">
      <section
        class="orientacao-modelo__secao"
        :aria-labelledby="idOnde"
        data-teste="onde-modelo"
      >
        <h2
          :id="idOnde"
          class="orientacao-modelo__titulo texto-rotulo"
        >
          {{ TEXTOS_MODELOS_POR_TIPO.ondeTitulo }}
        </h2>
        <p class="orientacao-modelo__selo">
          <BadgeStatus
            v-if="edicao && sugerido"
            :texto="selo"
            variante="informacao"
            icone="informacao"
            data-teste="selo-modelo"
          />
          <span
            v-else
            class="orientacao-modelo__origem"
            data-teste="selo-modelo"
          >{{ TEXTOS_MODELOS_POR_TIPO.origemAssessoria }}</span>
          <span
            v-if="edicao && contagem"
            class="orientacao-modelo__contagem"
            data-teste="contagem-modelo"
          >{{ contagem }}</span>
        </p>
        <p
          class="orientacao-modelo__onde"
          data-teste="onde-aparece-modelo"
        >
          {{ ondeAparece }}
        </p>
        <p
          class="orientacao-modelo__nota"
          data-teste="nota-onde-modelo"
        >
          {{ nota }}
        </p>
      </section>

      <section
        class="orientacao-modelo__secao"
        :aria-labelledby="idBomModelo"
        data-teste="bom-modelo"
      >
        <h2
          :id="idBomModelo"
          class="orientacao-modelo__titulo texto-rotulo"
        >
          {{ TEXTOS_MODELOS_POR_TIPO.bomModeloTitulo }}
        </h2>
        <p
          :id="idExemplos"
          class="orientacao-modelo__apoio"
        >
          {{ TEXTOS_MODELOS_POR_TIPO.exemplosApoio }}
        </p>
        <dl
          class="orientacao-modelo__exemplos"
          :aria-labelledby="idExemplos"
          data-teste="exemplos-nome-modelo"
        >
          <div
            v-for="exemplo in exemplos"
            :key="exemplo.tipo"
            class="orientacao-modelo__exemplo"
            :data-teste="`exemplo-nome-${exemplo.tipo}`"
          >
            <dt class="orientacao-modelo__tipo">
              {{ exemplo.rotulo }}
            </dt>
            <dd class="orientacao-modelo__nome">
              {{ exemplo.exemplo }}
            </dd>
          </div>
        </dl>
        <ul
          class="orientacao-modelo__dicas"
          data-teste="dicas-modelo"
        >
          <li
            v-for="(dica, indice) in dicas"
            :key="indice"
          >
            {{ dica }}
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.orientacao-modelo {
  container: orientacao-modelo / inline-size;
  min-width: 0;
}

.orientacao-modelo__secoes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
}

.orientacao-modelo__secao {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.orientacao-modelo .orientacao-modelo__titulo {
  margin: 0 0 var(--p-ritmo-campo);
}

.orientacao-modelo__selo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo);
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto-secundario);
}

.orientacao-modelo__origem {
  font-family: var(--p-fonte-serif);
  font-style: italic;
}

.orientacao-modelo__onde {
  margin: 0;
  padding-left: var(--p-ritmo-campo);
  border-left: 2px solid var(--p-cor-primaria);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-secao);
  font-style: italic;
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto);
}

.orientacao-modelo__nota,
.orientacao-modelo__apoio {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-secundario);
}

.orientacao-modelo__exemplos {
  display: flex;
  flex-direction: column;
  margin: 0;
}

.orientacao-modelo__exemplo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  column-gap: var(--p-ritmo-campo);
  align-items: baseline;
  padding-block: var(--p-ritmo-campo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.orientacao-modelo__exemplo:last-child {
  border-bottom: 1px solid var(--p-cor-divisoria);
}

.orientacao-modelo__tipo {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.orientacao-modelo__nome {
  margin: 0;
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-secao);
  font-style: italic;
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.orientacao-modelo__dicas {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: var(--p-ritmo-campo) 0 0;
  padding: 0 0 0 var(--p-ritmo-grupo);
  border-left: 2px solid var(--p-cor-primaria);
  list-style: none;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto);
}

@container orientacao-modelo (min-width: 22rem) {
  .orientacao-modelo__exemplo {
    grid-template-columns: minmax(0, 7rem) minmax(0, 1fr);
  }
}

@container orientacao-modelo (min-width: 36rem) {
  .orientacao-modelo__secoes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--p-ritmo-bloco);
  }
}
</style>
