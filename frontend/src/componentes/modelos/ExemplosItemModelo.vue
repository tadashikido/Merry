<script setup lang="ts">
import { computed, useId } from 'vue'

import { TEXTOS_ITEM_MODELO } from '@/textos/checklist'
import { exemplosItemChecklist, referenciaDoModelo } from '@/textos/modelos'
import { ehTipoEvento } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'
import { descreverPrazoAproximado } from '@/utilitarios/prazoModelo'

const props = withDefaults(defineProps<{ tipo?: TipoEvento | null }>(), { tipo: null })

const idTitulo = useId()
const idApoio = useId()

const doTipo = computed(() => ehTipoEvento(props.tipo))
const referencia = computed(() => referenciaDoModelo(props.tipo))
const apoio = computed(() =>
  doTipo.value ? TEXTOS_ITEM_MODELO.exemplosApoioTipo(referencia.value.indefinido) : TEXTOS_ITEM_MODELO.exemplosApoioQualquer,
)
const exemplos = computed(() =>
  exemplosItemChecklist(props.tipo).map((exemplo) => ({
    ...exemplo,
    prazo: descreverPrazoAproximado(exemplo.dias, referencia.value.contracaoDe),
  })),
)
</script>

<template>
  <section
    class="exemplos-item"
    :aria-labelledby="idTitulo"
    data-teste="exemplos-item-modelo"
  >
    <h2
      :id="idTitulo"
      class="exemplos-item__titulo texto-rotulo"
    >
      {{ TEXTOS_ITEM_MODELO.exemplosTitulo }}
    </h2>
    <p
      :id="idApoio"
      class="exemplos-item__apoio"
      data-teste="apoio-exemplos-item"
    >
      {{ apoio }}
    </p>
    <ul
      class="exemplos-item__lista"
      :aria-labelledby="idApoio"
    >
      <li
        v-for="exemplo in exemplos"
        :key="exemplo.chave"
        class="exemplos-item__exemplo"
        data-teste="exemplo-item"
      >
        <span
          v-if="exemplo.tipoRotulo"
          class="exemplos-item__tipo"
          data-teste="tipo-exemplo-item"
        >{{ exemplo.tipoRotulo }}</span>
        <span class="exemplos-item__nome">{{ exemplo.titulo }}</span>
        <span class="exemplos-item__prazo">{{ exemplo.prazo }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.exemplos-item {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.exemplos-item .exemplos-item__titulo {
  margin: 0 0 var(--p-ritmo-campo);
}

.exemplos-item__apoio {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-secundario);
}

.exemplos-item__lista {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.exemplos-item__exemplo {
  display: flex;
  flex-direction: column;
  padding-block: var(--p-ritmo-campo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.exemplos-item__exemplo:last-child {
  border-bottom: 1px solid var(--p-cor-divisoria);
}

.exemplos-item__tipo,
.exemplos-item__prazo {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto-secundario);
}

.exemplos-item__nome {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-secao);
  font-style: italic;
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}
</style>
