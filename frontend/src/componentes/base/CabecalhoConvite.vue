<script setup lang="ts">
import { computed } from 'vue'

import { TEXTOS_RSVP } from '@/textos/rsvp'
import { vocabularioDoTipo } from '@/textos/tiposEvento'
import type { DataCalendario, TipoEvento } from '@/tipos/eventos'
import { formatarDataCalendarioComDiaSemana } from '@/utilitarios/formatacao'
import { formatarHorarioConvite } from '@/utilitarios/rsvp'

const props = withDefaults(
  defineProps<{
    primeiro: string
    segundo?: string | null
    tipo?: TipoEvento
    data: DataCalendario
    horario?: string | null
    localCerimonia?: string | null
    localRecepcao?: string | null
    variante?: 'completo' | 'compacto'
  }>(),
  { segundo: null, tipo: 'Casamento', horario: null, localCerimonia: null, localRecepcao: null, variante: 'completo' },
)

const dataExtenso = computed(() => formatarDataCalendarioComDiaSemana(props.data))
const dataNumerica = computed(() => props.data.split('-').reverse().join(' . '))
const horarioTexto = computed(() => {
  const horario = formatarHorarioConvite(props.horario)
  return horario ? TEXTOS_RSVP.horario(horario) : null
})
interface LocalConvite {
  rotulo: string
  valor: string
}

const vocabulario = computed(() => vocabularioDoTipo(props.tipo))
const locais = computed<LocalConvite[]>(() => {
  const candidatos: { rotulo: string; valor: string | null }[] = [
    { rotulo: vocabulario.value.locais.principal, valor: props.localCerimonia },
    { rotulo: vocabulario.value.locais.secundario, valor: props.localRecepcao },
  ]
  return candidatos.filter((local): local is LocalConvite => Boolean(local.valor))
})
</script>

<template>
  <header
    class="cabecalho-convite"
    :class="`cabecalho-convite--${variante}`"
    data-teste="cabecalho-convite"
  >
    <svg
      v-if="variante === 'completo' && vocabulario.aneisNoConvite"
      class="cabecalho-convite__aneis"
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="11"
        cy="15"
        r="7"
      />
      <circle
        cx="17"
        cy="13"
        r="7"
      />
    </svg>
    <p
      v-if="variante === 'completo'"
      class="cabecalho-convite__frase"
    >
      {{ TEXTOS_RSVP.fraseConvite }}
    </p>
    <h1 class="cabecalho-convite__anfitriao">
      <span class="cabecalho-convite__nome">{{ primeiro }}</span>
      <template v-if="segundo">
        <span
          class="cabecalho-convite__e"
          aria-hidden="true"
        >&amp;</span>
        <span class="somente-leitor-tela">{{ ` ${TEXTOS_RSVP.conector} ` }}</span>
        <span class="cabecalho-convite__nome">{{ segundo }}</span>
      </template>
    </h1>
    <span
      v-if="variante === 'completo'"
      class="cabecalho-convite__data-numerica numeros-tabulares"
      aria-hidden="true"
    >{{ dataNumerica }}</span>
    <p
      class="cabecalho-convite__quando"
      data-teste="cabecalho-convite-data"
    >
      <span>{{ dataExtenso }}</span>
      <span v-if="horarioTexto">{{ horarioTexto }}</span>
    </p>
    <dl
      v-if="variante === 'completo' && locais.length > 0"
      class="cabecalho-convite__locais"
    >
      <div
        v-for="local in locais"
        :key="local.rotulo"
        class="cabecalho-convite__local"
      >
        <dt>{{ local.rotulo }}</dt>
        <dd>{{ local.valor }}</dd>
      </div>
    </dl>
  </header>
</template>

<style scoped>
.cabecalho-convite {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-4);
  padding: var(--p-espaco-10) var(--p-espaco-6) var(--p-espaco-8);
  text-align: center;
  background: var(--p-cor-cartao-convite);
  border: 1px solid var(--p-cor-borda-convite);
  border-radius: var(--p-raio-tag);
}

.cabecalho-convite__aneis {
  width: 2.75rem;
  height: 2.75rem;
  fill: none;
  stroke: var(--p-cor-acento);
  stroke-width: 1.1;
}

.cabecalho-convite__frase {
  max-width: 18rem;
  font-family: var(--p-fonte-serif);
  font-variant-numeric: lining-nums;
  font-size: 1.1875rem;
  font-style: italic;
  line-height: 1.45;
  color: var(--p-cor-texto-publico);
}

.cabecalho-convite .cabecalho-convite__anfitriao {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: 3.25rem;
  font-weight: var(--p-fonte-peso-leve);
  line-height: 1;
  color: var(--p-cor-texto);
  text-align: center;
  overflow-wrap: anywhere;
}

.cabecalho-convite__e {
  margin: var(--p-espaco-1) 0;
  font-family: var(--p-fonte-serif);
  font-size: 0.7em;
  font-weight: var(--p-fonte-peso-regular);
  font-style: italic;
  line-height: 1;
  color: var(--p-cor-acento-texto);
}

.cabecalho-convite__data-numerica {
  margin-top: var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-corpo);
  letter-spacing: 0.3em;
  color: var(--p-cor-texto);
}

.cabecalho-convite__quando {
  display: flex;
  flex-direction: column;
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: 1.5;
  color: var(--p-cor-apoio-publico);
}

.cabecalho-convite__quando span:first-child::first-letter {
  text-transform: uppercase;
}

.cabecalho-convite__locais {
  display: grid;
  gap: var(--p-espaco-3);
  width: 100%;
  margin: var(--p-espaco-2) 0 0;
  padding-top: var(--p-espaco-4);
  border-top: 1px solid var(--p-cor-borda-publica);
}

.cabecalho-convite__local {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cabecalho-convite__local dt {
  font-size: 0.6875rem;
  font-weight: var(--p-fonte-peso-seminegrito);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--p-cor-apoio-publico);
}

.cabecalho-convite__local dd {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.cabecalho-convite--compacto {
  gap: var(--p-espaco-1);
  padding: var(--p-espaco-5) var(--p-espaco-5);
}

.cabecalho-convite--compacto .cabecalho-convite__anfitriao {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0 0.25em;
  font-size: var(--p-fonte-tamanho-pagina-celular);
}

.cabecalho-convite--compacto .cabecalho-convite__e {
  margin: 0;
  font-size: 1em;
}

@media (min-width: 640px) {
  .cabecalho-convite .cabecalho-convite__anfitriao {
    font-size: 3.625rem;
  }

  .cabecalho-convite--compacto .cabecalho-convite__anfitriao {
    font-size: var(--p-fonte-tamanho-pagina);
  }

  .cabecalho-convite__locais {
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  }
}
</style>
