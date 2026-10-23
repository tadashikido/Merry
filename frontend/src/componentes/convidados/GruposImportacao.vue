<script setup lang="ts">
import { computed, useId } from 'vue'

import { gruposSugeridos, TEXTOS_ACOMPANHAMENTO_CONVITES } from '@/textos/convidados'
import { TEXTOS_IMPORTACAO } from '@/textos/importacaoConvidados'
import type { TipoEvento } from '@/tipos/eventos'
import type { ConvitePreVisualizadoDto } from '@/tipos/importacaoConvidados'
import type { GrupoExistente } from '@/utilitarios/gruposConvite'
import { resumirGruposImportacao } from '@/utilitarios/importacaoConvidados'

const LIMITE_GRUPOS = 6

const props = withDefaults(
  defineProps<{
    convites: readonly ConvitePreVisualizadoDto[]
    existentes?: ReadonlyMap<string, GrupoExistente> | null
    carregandoExistentes?: boolean
    tipo?: TipoEvento | null
  }>(),
  { existentes: null, carregandoExistentes: false, tipo: null },
)

const idTitulo = `grupos-importacao-${useId()}`

const resumo = computed(() => resumirGruposImportacao(props.convites, props.existentes))
const visiveis = computed(() => resumo.value.grupos.slice(0, LIMITE_GRUPOS))
const restantes = computed(() => Math.max(resumo.value.grupos.length - LIMITE_GRUPOS, 0))
const temConteudo = computed(() => resumo.value.grupos.length > 0 || resumo.value.semGrupo.convites > 0)

const frase = computed(() => {
  if (resumo.value.grupos.length === 0 || props.carregandoExistentes) {
    return null
  }
  return resumo.value.comparado
    ? TEXTOS_IMPORTACAO.gruposResumo(resumo.value.novos, resumo.value.jaExistentes)
    : TEXTOS_IMPORTACAO.gruposSemComparacao
})

const orientacao = computed(() =>
  resumo.value.grupos.length === 0 ? TEXTOS_ACOMPANHAMENTO_CONVITES.orientacaoGrupos(gruposSugeridos(props.tipo)) : null,
)
</script>

<template>
  <section
    v-if="temConteudo"
    class="grupos-importacao cartao"
    :aria-labelledby="idTitulo"
    data-teste="grupos-importacao"
  >
    <h2
      :id="idTitulo"
      class="grupos-importacao__titulo"
    >
      {{ TEXTOS_IMPORTACAO.gruposTitulo }}
    </h2>

    <p
      v-if="frase"
      class="grupos-importacao__frase"
      data-teste="grupos-importacao-frase"
    >
      {{ frase }}
    </p>

    <ul class="grupos-importacao__lista">
      <li
        v-for="grupo in visiveis"
        :key="grupo.chave"
        class="grupos-importacao__grupo"
        data-teste="grupo-importacao"
      >
        <span class="grupos-importacao__nome">{{ grupo.rotulo }}</span>
        <span class="grupos-importacao__detalhe numeros-tabulares">{{ TEXTOS_IMPORTACAO.grupoDetalhe(grupo.convites, grupo.pessoas) }}</span>
        <span
          v-if="grupo.existentes === 0"
          class="grupos-importacao__selo"
          data-teste="grupo-importacao-novo"
        >{{ TEXTOS_IMPORTACAO.grupoNovo }}</span>
        <span
          v-else-if="grupo.existentes !== null"
          class="grupos-importacao__existente"
          data-teste="grupo-importacao-existente"
        >{{ TEXTOS_IMPORTACAO.grupoExistente(grupo.existentes) }}</span>
      </li>
      <li
        v-if="resumo.semGrupo.convites > 0"
        class="grupos-importacao__grupo grupos-importacao__grupo--sem"
        data-teste="grupo-importacao-sem-grupo"
      >
        <span class="grupos-importacao__nome">{{ TEXTOS_IMPORTACAO.semGrupo }}</span>
        <span class="grupos-importacao__detalhe numeros-tabulares">{{ TEXTOS_IMPORTACAO.grupoDetalhe(resumo.semGrupo.convites, resumo.semGrupo.pessoas) }}</span>
      </li>
    </ul>

    <p
      v-if="restantes > 0"
      class="grupos-importacao__mais"
      data-teste="grupos-importacao-mais"
    >
      {{ TEXTOS_IMPORTACAO.maisGrupos(restantes) }}
    </p>

    <p
      v-if="orientacao"
      class="grupos-importacao__orientacao"
      data-teste="grupos-importacao-orientacao"
    >
      {{ orientacao }}
    </p>
  </section>
</template>

<style scoped>
.grupos-importacao {
  container: grupos-importacao / inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.grupos-importacao__titulo,
.grupos-importacao__frase,
.grupos-importacao__mais,
.grupos-importacao__orientacao {
  margin: 0;
}

.grupos-importacao__titulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-leve);
  color: var(--p-cor-texto);
}

.grupos-importacao__frase {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-secundario);
}

.grupos-importacao__lista {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.grupos-importacao__grupo {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'nome selo'
    'detalhe selo';
  align-items: center;
  gap: 0 var(--p-ritmo-campo);
  padding-block: var(--p-ritmo-campo);
}

.grupos-importacao__grupo + .grupos-importacao__grupo {
  border-block-start: 1px solid var(--p-cor-divisoria);
}

.grupos-importacao__nome {
  grid-area: nome;
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.grupos-importacao__grupo--sem .grupos-importacao__nome {
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto-secundario);
}

.grupos-importacao__detalhe {
  grid-area: detalhe;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.grupos-importacao__selo {
  grid-area: selo;
  padding: 0 var(--p-ritmo-campo);
  border: 1px solid var(--p-cor-primaria);
  border-radius: var(--p-raio-total);
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-primaria);
  white-space: nowrap;
}

.grupos-importacao__existente {
  grid-area: selo;
  max-inline-size: 9rem;
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-apoio);
  font-style: italic;
  text-align: end;
  color: var(--p-cor-texto-secundario);
}

.grupos-importacao__mais {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.grupos-importacao__orientacao {
  padding-inline-start: var(--p-ritmo-campo);
  border-inline-start: 2px solid var(--p-cor-primaria);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  color: var(--p-cor-texto-secundario);
}
</style>
