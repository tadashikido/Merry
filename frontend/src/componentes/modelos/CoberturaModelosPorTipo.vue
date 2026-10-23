<script setup lang="ts">
import { computed, useId } from 'vue'

import { TEXTOS_MODELOS_POR_TIPO } from '@/textos/modelos'
import { VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { coberturaPorTipo, situacaoComumCobertura, type CoberturaTipoModelos, type ModeloComTipoESugestao } from '@/utilitarios/modelosPorTipo'

const props = defineProps<{
  modelos: readonly ModeloComTipoESugestao[]
  recurso: string
  reaproveitamento: readonly string[]
}>()

const idTitulo = useId()
const idReaproveitamento = useId()

const coberturas = computed(() => coberturaPorTipo(props.modelos))

const apoioComum = computed(() => {
  const comum = situacaoComumCobertura(coberturas.value)
  return comum ? apoioDaSituacaoComum(comum) : null
})

const tipos = computed(() =>
  coberturas.value.map((cobertura) => {
    const vocabulario = VOCABULARIO_TIPO_EVENTO[cobertura.tipo]
    return {
      ...cobertura,
      rotulo: vocabulario.rotuloPlural,
      apoio: apoioDaCobertura(cobertura, vocabulario.contagem.singular),
    }
  }),
)

function apoioDaSituacaoComum(cobertura: CoberturaTipoModelos): string {
  if (cobertura.temSugerido) {
    return TEXTOS_MODELOS_POR_TIPO.comumComSugerido
  }
  if (cobertura.especificos > 0) {
    return TEXTOS_MODELOS_POR_TIPO.comumComEspecificos(cobertura.especificos)
  }
  return cobertura.disponiveis > 0 ? TEXTOS_MODELOS_POR_TIPO.comumSoQualquer : TEXTOS_MODELOS_POR_TIPO.nenhum
}

function apoioDaCobertura(cobertura: CoberturaTipoModelos, singular: string): string {
  if (cobertura.temSugerido) {
    return TEXTOS_MODELOS_POR_TIPO.comSugerido(singular)
  }
  if (cobertura.especificos > 0) {
    return TEXTOS_MODELOS_POR_TIPO.comEspecificos(cobertura.especificos)
  }
  return cobertura.disponiveis > 0 ? TEXTOS_MODELOS_POR_TIPO.soQualquer : TEXTOS_MODELOS_POR_TIPO.nenhum
}
</script>

<template>
  <section
    class="cobertura cartao"
    :aria-labelledby="idTitulo"
    data-teste="cobertura-modelos"
  >
    <div class="cobertura__topo">
      <h2
        :id="idTitulo"
        class="cobertura__titulo"
      >
        {{ TEXTOS_MODELOS_POR_TIPO.coberturaTitulo }}
      </h2>
      <p class="cobertura__apoio texto-legenda">
        {{ TEXTOS_MODELOS_POR_TIPO.coberturaApoio(recurso) }}
      </p>
    </div>

    <dl
      class="cobertura__tipos"
      :class="{ 'cobertura__tipos--comum': apoioComum }"
    >
      <div
        v-for="item in tipos"
        :key="item.tipo"
        class="cobertura__tipo"
        :class="{ 'cobertura__tipo--sem-modelo': item.disponiveis === 0 }"
        :data-tipo="item.tipo"
        data-teste="cobertura-tipo"
      >
        <dt class="cobertura__rotulo">
          {{ item.rotulo }}
        </dt>
        <dd class="cobertura__valor">
          <span
            class="cobertura__numero numeros-tabulares"
            data-teste="cobertura-quantidade"
          >{{ TEXTOS_MODELOS_POR_TIPO.quantidade(item.disponiveis) }}</span>
          <span
            v-if="!apoioComum"
            class="cobertura__nota"
            data-teste="cobertura-apoio"
          >{{ item.apoio }}</span>
        </dd>
      </div>
    </dl>

    <p
      v-if="apoioComum"
      class="cobertura__nota cobertura__comum"
      data-teste="cobertura-apoio-comum"
    >
      {{ apoioComum }}
    </p>

    <div
      v-if="reaproveitamento.length > 0"
      class="cobertura__reaproveitamento"
      data-teste="reaproveitamento-modelos"
    >
      <h3
        :id="idReaproveitamento"
        class="cobertura__subtitulo"
      >
        {{ TEXTOS_MODELOS_POR_TIPO.reaproveitamentoTitulo }}
      </h3>
      <ul
        class="cobertura__lista"
        :aria-labelledby="idReaproveitamento"
      >
        <li
          v-for="frase in reaproveitamento"
          :key="frase"
        >
          {{ frase }}
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.cobertura {
  container: cobertura-modelos / inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  min-width: 0;
}

.cobertura__topo {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.cobertura .cobertura__titulo,
.cobertura .cobertura__subtitulo,
.cobertura__apoio {
  margin: 0;
}

.cobertura .cobertura__titulo {
  font-size: var(--p-fonte-tamanho-secao);
}

.cobertura__apoio {
  color: var(--p-cor-texto-secundario);
}

.cobertura__tipos {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin: 0;
}

.cobertura__tipo {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
  padding-block: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.cobertura__rotulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-secundario);
}

.cobertura__valor {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
}

.cobertura__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-primaria);
}

.cobertura__tipo--sem-modelo .cobertura__numero {
  color: var(--p-cor-texto-apoio);
}

.cobertura__nota {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-controle);
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-secundario);
}

.cobertura__tipos--comum .cobertura__tipo {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  column-gap: var(--p-ritmo-grupo);
  padding-block: var(--p-ritmo-campo);
}

.cobertura__comum {
  margin: 0;
}

.cobertura__reaproveitamento {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  padding-left: var(--p-ritmo-grupo);
  border-left: 2px solid var(--p-cor-primaria);
}

.cobertura .cobertura__subtitulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.cobertura__lista {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-secundario);
}

@container cobertura-modelos (min-width: 36rem) {
  .cobertura__tipos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--p-ritmo-bloco);
  }
}
</style>
