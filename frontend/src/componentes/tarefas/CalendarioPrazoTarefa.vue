<script setup lang="ts">
import { computed } from 'vue'

import { TEXTOS_TAREFAS } from '@/textos/tarefas'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { EventoDto } from '@/tipos/eventos'
import { formatarDataCalendarioCurta } from '@/utilitarios/formatacao'
import {
  descreverDistancia,
  descreverFaltaParaEvento,
  marcosDoPrazo,
  type ChaveMarcoPrazo,
} from '@/utilitarios/prazoTarefaEvento'

interface LinhaMarco {
  chave: ChaveMarcoPrazo
  rotulo: string
  data: string
  distancia: string | null
  alerta: string | null
}

const props = defineProps<{ evento: EventoDto; prazo: string; geradaDeModelo: boolean }>()

const vocabulario = computed(() => vocabularioOuNeutro(props.evento.tipo))

const marcos = computed(() => marcosDoPrazo(props.evento, props.prazo))
const temPrazo = computed(() => marcos.value.some((marco) => marco.chave === 'prazo'))

function rotuloDo(chave: ChaveMarcoPrazo): string {
  switch (chave) {
    case 'hoje':
      return TEXTOS_TAREFAS.marcoHoje
    case 'prazo':
      return TEXTOS_TAREFAS.marcoPrazo
    case 'confirmacoes':
      return TEXTOS_TAREFAS.marcoConfirmacoes
    default:
      return TEXTOS_TAREFAS.marcoEvento(vocabulario.value.referencia.contracaoDe)
  }
}

const linhas = computed<LinhaMarco[]>(() =>
  marcos.value.map((marco) => ({
    chave: marco.chave,
    rotulo: rotuloDo(marco.chave),
    data: formatarDataCalendarioCurta(marco.data),
    distancia: marco.chave === 'prazo' || marco.chave === 'confirmacoes' ? descreverDistancia(marco.diasAteHoje) : null,
    alerta: marco.chave === 'prazo' && marco.diasAteHoje < 0 ? TEXTOS_TAREFAS.calendarioPrazoPassou : null,
  })),
)
</script>

<template>
  <section
    class="calendario-prazo"
    aria-labelledby="titulo-calendario-prazo"
    data-teste="calendario-prazo"
  >
    <div class="calendario-prazo__grade">
      <div class="calendario-prazo__cabecalho">
        <h2
          id="titulo-calendario-prazo"
          class="calendario-prazo__titulo"
        >
          {{ TEXTOS_TAREFAS.calendarioTitulo(vocabulario.referencia.contracaoDe) }}
        </h2>
        <p
          class="calendario-prazo__falta"
          data-teste="calendario-falta"
        >
          {{ descreverFaltaParaEvento(evento.diasRestantes, vocabulario) }}
        </p>
      </div>

      <ol class="calendario-prazo__marcos">
        <li
          v-for="linha in linhas"
          :key="linha.chave"
          class="calendario-prazo__marco"
          :class="`calendario-prazo__marco--${linha.chave}`"
          :data-teste="`marco-${linha.chave}`"
        >
          <span
            class="calendario-prazo__ponto"
            aria-hidden="true"
          />
          <span class="calendario-prazo__linha">
            <span class="calendario-prazo__rotulo">{{ linha.rotulo }}</span>
            <span class="calendario-prazo__data numeros-tabulares">{{ linha.data }}</span>
          </span>
          <span
            v-if="linha.distancia"
            class="calendario-prazo__apoio"
          >{{ linha.distancia }}</span>
          <span
            v-if="linha.alerta"
            class="calendario-prazo__apoio calendario-prazo__apoio--alerta"
            data-teste="prazo-passou"
          >{{ linha.alerta }}</span>
        </li>
      </ol>

      <div
        v-if="!temPrazo || geradaDeModelo"
        class="calendario-prazo__notas"
      >
        <p
          v-if="!temPrazo"
          class="calendario-prazo__nota"
          data-teste="calendario-sem-prazo"
        >
          {{ TEXTOS_TAREFAS.calendarioSemPrazo(vocabulario.referencia.contracaoDe) }}
        </p>

        <p
          v-if="geradaDeModelo"
          class="calendario-prazo__nota"
          data-teste="calendario-origem"
        >
          {{ TEXTOS_TAREFAS.calendarioOrigemChecklist }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.calendario-prazo {
  container: calendario-prazo / inline-size;
  min-width: 0;
}

.calendario-prazo__grade {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'cabecalho'
    'marcos'
    'notas';
  gap: var(--p-ritmo-grupo);
}

.calendario-prazo__cabecalho {
  grid-area: cabecalho;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.calendario-prazo__titulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-regular);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.calendario-prazo__falta {
  margin: 0;
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-apoio);
}

.calendario-prazo__marcos {
  grid-area: marcos;
  margin: 0;
  padding: 0 0 0 calc(0.375rem + 1px);
  list-style: none;
}

.calendario-prazo__marco {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  padding-block: 0 var(--p-ritmo-grupo);
  padding-inline-start: var(--p-ritmo-grupo);
  border-inline-start: 2px solid var(--p-cor-borda);
}

.calendario-prazo__marco:last-child {
  padding-block-end: 0;
  border-inline-start-color: transparent;
}

.calendario-prazo__ponto {
  position: absolute;
  inset-block-start: 0.3rem;
  inset-inline-start: calc(-0.375rem - 1px);
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid var(--p-cor-borda);
  border-radius: 50%;
  background: var(--p-cor-superficie);
}

.calendario-prazo__marco--evento .calendario-prazo__ponto {
  border-color: var(--p-cor-primaria);
}

.calendario-prazo__marco--prazo .calendario-prazo__ponto {
  border-color: var(--p-cor-primaria);
  background: var(--p-cor-primaria);
  box-shadow: 0 0 0 3px var(--p-cor-primaria-suave);
}

.calendario-prazo__linha {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0 var(--p-ritmo-grupo);
  min-width: 0;
}

.calendario-prazo__rotulo {
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.calendario-prazo__data {
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
}

.calendario-prazo__marco--prazo .calendario-prazo__rotulo,
.calendario-prazo__marco--evento .calendario-prazo__rotulo {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.calendario-prazo__marco--prazo .calendario-prazo__data {
  font-weight: var(--p-fonte-peso-medio);
}

.calendario-prazo__apoio {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.calendario-prazo__apoio--alerta {
  color: var(--p-cor-alerta-texto);
}

.calendario-prazo__notas {
  grid-area: notas;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  padding-top: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-borda);
}

.calendario-prazo__nota {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

@container calendario-prazo (min-width: 36rem) {
  .calendario-prazo__grade {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'cabecalho marcos'
      'notas marcos';
    grid-template-rows: auto 1fr;
    gap: var(--p-ritmo-grupo) var(--p-ritmo-bloco);
  }

  .calendario-prazo__notas {
    align-self: start;
  }
}
</style>
