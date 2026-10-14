<script setup lang="ts">
import { computed } from 'vue'

import { TEXTOS_CRONOGRAMA_PUBLICO } from '@/textos/cronogramaPublico'
import type { DataCalendario } from '@/tipos/casamentos'
import { formatarDataCalendarioComDiaSemana, formatarNomesCasal } from '@/utilitarios/formatacao'

export interface LocalOperacao {
  rotulo: string
  valor: string
}

const props = withDefaults(
  defineProps<{
    primeiro: string
    segundo: string
    data: DataCalendario
    filtro: string
    locais?: LocalOperacao[]
    nivelTitulo?: 1 | 2
  }>(),
  { locais: () => [], nivelTitulo: 1 },
)

const dataExtenso = computed(() => {
  const texto = formatarDataCalendarioComDiaSemana(props.data)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})
const tituloOculto = computed(() => TEXTOS_CRONOGRAMA_PUBLICO.tituloOculto(formatarNomesCasal(props.primeiro, props.segundo)))
</script>

<template>
  <header class="cabecalho-operacao">
    <component
      :is="nivelTitulo === 1 ? 'h1' : 'h2'"
      class="cabecalho-operacao__nomes"
    >
      <span class="cabecalho-operacao__oculto">{{ tituloOculto }}</span>
      <span aria-hidden="true">
        {{ primeiro }}
        <span class="cabecalho-operacao__e">&amp;</span>
        {{ segundo }}
      </span>
    </component>
    <p
      class="cabecalho-operacao__data"
      data-teste="cabecalho-operacao-data"
    >
      {{ dataExtenso }}
    </p>
    <p
      class="cabecalho-operacao__filtro"
      data-teste="cabecalho-operacao-filtro"
    >
      {{ filtro }}
    </p>
    <dl
      v-if="locais.length > 0"
      class="cabecalho-operacao__locais"
      :aria-label="TEXTOS_CRONOGRAMA_PUBLICO.locais"
    >
      <div
        v-for="local in locais"
        :key="local.rotulo"
        class="cabecalho-operacao__local"
      >
        <dt>{{ local.rotulo }}</dt>
        <dd>{{ local.valor }}</dd>
      </div>
    </dl>
  </header>
</template>

<style scoped>
.cabecalho-operacao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  padding-bottom: var(--p-espaco-5);
  border-bottom: 1px solid var(--p-cor-operacao-divisoria);
}

.cabecalho-operacao__nomes {
  margin: 0;
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-operacao);
  font-weight: var(--p-fonte-peso-seminegrito);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-operacao-texto);
  text-align: left;
}

.cabecalho-operacao__e {
  font-family: var(--p-fonte-serif);
  font-weight: var(--p-fonte-peso-regular);
  font-style: italic;
  color: var(--p-cor-operacao-destaque);
}

.cabecalho-operacao__oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.cabecalho-operacao__data {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-operacao-apoio);
}

.cabecalho-operacao__filtro {
  align-self: flex-start;
  margin: var(--p-espaco-1) 0 0;
  padding: var(--p-espaco-1) var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-operacao-texto);
  border: 1px solid var(--p-cor-operacao-borda);
  border-radius: var(--p-raio-total);
}

.cabecalho-operacao__locais {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  margin: var(--p-espaco-2) 0 0;
}

.cabecalho-operacao__local {
  display: grid;
  grid-template-columns: var(--p-dimensao-coluna-horario-operacao) minmax(0, 1fr);
  gap: var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
}

.cabecalho-operacao__local dt {
  color: var(--p-cor-operacao-apoio);
}

.cabecalho-operacao__local dd {
  margin: 0;
  color: var(--p-cor-operacao-texto);
  overflow-wrap: anywhere;
}
</style>
