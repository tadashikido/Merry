<script setup lang="ts" generic="T extends ModeloComTipo & { id: string }">
import { computed, useId } from 'vue'

import { TEXTOS_MODELOS_POR_TIPO } from '@/textos/modelos'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { agruparModelosPorTipo, type GrupoModelos, type ModeloComTipo } from '@/utilitarios/modelosPorTipo'

const props = defineProps<{
  modelos: readonly T[]
  recurso: string
  testeItem: string
}>()

defineSlots<{ modelo(escopo: { modelo: T }): unknown }>()

const prefixo = useId()

const grupos = computed(() =>
  agruparModelosPorTipo(props.modelos).map((grupo) => ({
    ...grupo,
    id: `${prefixo}-${grupo.chave}`,
    titulo: tituloDoGrupo(grupo),
    nota: notaDoGrupo(grupo),
  })),
)

function tituloDoGrupo(grupo: GrupoModelos<T>): string {
  if (grupo.tipo) {
    return VOCABULARIO_TIPO_EVENTO[grupo.tipo].rotuloPlural
  }
  return grupo.chave === 'qualquer' ? TEXTOS_MODELOS_POR_TIPO.grupoQualquerTitulo : TEXTOS_MODELOS_POR_TIPO.grupoOutrosTitulo
}

function notaDoGrupo(grupo: GrupoModelos<T>): string {
  if (grupo.tipo) {
    return TEXTOS_MODELOS_POR_TIPO.notaTipo(props.recurso, VOCABULARIO_TIPO_EVENTO[grupo.tipo].contagem.singular)
  }
  return grupo.chave === 'qualquer' ? TEXTOS_MODELOS_POR_TIPO.notaQualquer(props.recurso) : TEXTOS_MODELOS_POR_TIPO.notaOutros
}
</script>

<template>
  <div class="grupos-modelos">
    <div class="grupos-modelos__lista">
      <section
        v-for="grupo in grupos"
        :key="grupo.chave"
        class="grupos-modelos__grupo"
        :class="{ 'grupos-modelos__grupo--varios': grupo.modelos.length > 1 }"
        :aria-labelledby="grupo.id"
        :data-grupo="grupo.chave"
        data-teste="grupo-modelos"
      >
        <div class="grupos-modelos__cabecalho">
          <h2
            :id="grupo.id"
            class="grupos-modelos__titulo"
            data-teste="grupo-modelos-titulo"
          >
            {{ grupo.titulo }}
          </h2>
          <span
            class="grupos-modelos__quantidade numeros-tabulares"
            data-teste="grupo-modelos-quantidade"
          >{{ TEXTOS_MODELOS_POR_TIPO.quantidade(grupo.modelos.length) }}</span>
        </div>
        <p
          class="grupos-modelos__nota"
          data-teste="grupo-modelos-nota"
        >
          {{ grupo.nota }}
        </p>
        <ul
          class="grade grade--larga grupos-modelos__grade"
          :aria-labelledby="grupo.id"
        >
          <li
            v-for="modelo in grupo.modelos"
            :key="modelo.id"
            :data-teste="testeItem"
          >
            <slot
              name="modelo"
              :modelo="modelo"
            />
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.grupos-modelos {
  container: grupos-modelos / inline-size;
  min-width: 0;
}

.grupos-modelos__lista {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-bloco);
  min-width: 0;
}

.grupos-modelos__grupo {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.grupos-modelos__grupo + .grupos-modelos__grupo {
  padding-top: var(--p-ritmo-bloco);
  border-top: 1px solid var(--p-cor-divisoria);
}

.grupos-modelos__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
}

.grupos-modelos .grupos-modelos__titulo {
  margin: 0;
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.grupos-modelos__quantidade {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.grupos-modelos__nota {
  margin: 0;
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-controle);
  font-style: italic;
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-secundario);
}

.grupos-modelos__grade {
  margin: var(--p-ritmo-campo) 0 0;
  padding: 0;
  list-style: none;
}

@container grupos-modelos (min-width: 46rem) {
  .grupos-modelos__lista {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grupos-modelos__grupo + .grupos-modelos__grupo {
    padding-top: 0;
    border-top: 0;
  }

  .grupos-modelos__grupo--varios {
    grid-column: 1 / -1;
  }

  .grupos-modelos__grupo .grupos-modelos__grade {
    --grade-minimo: 20rem;
  }
}

@container grupos-modelos (max-width: 39.99rem) {
  .grupos-modelos__grade {
    --grade-espaco: var(--p-ritmo-grupo);
  }
}
</style>
