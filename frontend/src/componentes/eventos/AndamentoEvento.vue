<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { TEXTOS_CONFIRMACOES } from '@/textos/confirmacoes'
import { TEXTOS_ANDAMENTO_EVENTO } from '@/textos/eventos'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { DataCalendario, TipoEvento } from '@/tipos/eventos'
import { calcularPrazoConfirmacao } from '@/utilitarios/prazoConfirmacao'
import { formatarDiaMes } from '@/utilitarios/rsvp'

const props = defineProps<{
  eventoId: string
  tipo: TipoEvento
  data: DataCalendario
  diasRestantes: number
  dataLimiteRsvpEfetiva: DataCalendario
  percentualChecklist: number | null | undefined
  exibirChecklist: boolean
}>()

const vocabulario = computed(() => vocabularioOuNeutro(props.tipo))
const contracaoDe = computed(() => vocabulario.value.referencia.contracaoDe)
const parametros = computed(() => ({ id: props.eventoId }))

const mostrarChecklist = computed(() => props.exibirChecklist && props.percentualChecklist !== undefined)
const percentual = computed(() =>
  typeof props.percentualChecklist === 'number' ? Math.min(100, Math.max(0, Math.round(props.percentualChecklist))) : null,
)

const prazo = computed(() =>
  calcularPrazoConfirmacao({
    data: props.data,
    diasRestantes: props.diasRestantes,
    dataLimiteRsvpEfetiva: props.dataLimiteRsvpEfetiva,
  }),
)
const dataPrazo = computed(() => formatarDiaMes(props.dataLimiteRsvpEfetiva))
const valorPrazo = computed(() => {
  const atual = prazo.value
  if (!atual) {
    return ''
  }
  return atual.encerrado ? TEXTOS_ANDAMENTO_EVENTO.prazoEncerradoCurto : TEXTOS_ANDAMENTO_EVENTO.diasPrazo(atual.diasRestantes)
})
const situacaoPrazo = computed(() =>
  prazo.value?.encerrado ? TEXTOS_CONFIRMACOES.prazoEncerrado(dataPrazo.value) : TEXTOS_CONFIRMACOES.prazoAte(dataPrazo.value),
)
const prazoAcessivel = computed(() => {
  const atual = prazo.value
  if (!atual || atual.encerrado) {
    return situacaoPrazo.value
  }
  return TEXTOS_CONFIRMACOES.prazoAcessivel(dataPrazo.value, TEXTOS_CONFIRMACOES.prazoFaltam(atual.diasRestantes))
})
</script>

<template>
  <section
    class="andamento cartao pilha pilha--grupo"
    aria-labelledby="titulo-andamento-evento"
    data-teste="andamento-evento"
  >
    <h2
      id="titulo-andamento-evento"
      class="andamento__titulo"
    >
      {{ TEXTOS_ANDAMENTO_EVENTO.titulo(contracaoDe) }}
    </h2>

    <ul class="andamento__itens">
      <li
        v-if="mostrarChecklist"
        class="andamento__item"
        data-teste="andamento-checklist"
      >
        <h3 class="andamento__rotulo">
          {{ TEXTOS_ANDAMENTO_EVENTO.checklistTitulo }}
        </h3>
        <template v-if="percentual !== null">
          <span
            class="andamento__valor numeros-tabulares"
            aria-hidden="true"
          >{{ percentual }}%</span>
          <span
            class="andamento__barra"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="percentual"
            :aria-label="TEXTOS_ANDAMENTO_EVENTO.checklistAria(percentual)"
            data-teste="andamento-checklist-barra"
          >
            <span
              class="andamento__barra-preenchida"
              :style="{ width: `${percentual}%` }"
            />
          </span>
          <p class="andamento__legenda texto-legenda">
            {{ TEXTOS_ANDAMENTO_EVENTO.checklistLegenda }}
          </p>
          <RouterLink
            class="andamento__atalho"
            :to="{ name: 'evento-checklist', params: parametros }"
            data-teste="andamento-abrir-checklist"
          >
            {{ TEXTOS_ANDAMENTO_EVENTO.abrirChecklist }}
          </RouterLink>
        </template>
        <template v-else>
          <p class="andamento__vazio">
            {{ TEXTOS_ANDAMENTO_EVENTO.checklistVazioTitulo }}
          </p>
          <p class="andamento__legenda texto-legenda">
            {{ TEXTOS_ANDAMENTO_EVENTO.checklistVazioTexto(contracaoDe) }}
          </p>
          <RouterLink
            class="andamento__atalho"
            :to="{ name: 'evento-checklist', params: parametros }"
            data-teste="andamento-aplicar-checklist"
          >
            {{ TEXTOS_ANDAMENTO_EVENTO.aplicarChecklist }}
          </RouterLink>
        </template>
      </li>

      <li
        v-if="prazo"
        class="andamento__item"
        :class="{ 'andamento__item--encerrado': prazo.encerrado }"
        data-teste="andamento-confirmacao"
      >
        <h3 class="andamento__rotulo">
          {{ TEXTOS_ANDAMENTO_EVENTO.confirmacaoTitulo }}
        </h3>
        <span class="somente-leitor-tela">{{ prazoAcessivel }}</span>
        <span
          class="andamento__valor numeros-tabulares"
          aria-hidden="true"
          data-teste="andamento-confirmacao-valor"
        >{{ valorPrazo }}</span>
        <span
          class="andamento__situacao"
          aria-hidden="true"
        >{{ situacaoPrazo }}</span>
        <p
          class="andamento__legenda texto-legenda"
          data-teste="andamento-confirmacao-antes"
        >
          {{ TEXTOS_ANDAMENTO_EVENTO.antesDoEvento(prazo.diasAntesDoEvento, contracaoDe) }}
        </p>
        <RouterLink
          class="andamento__atalho"
          :to="{ name: 'painel-confirmacoes', params: parametros }"
          data-teste="andamento-ver-confirmacoes"
        >
          {{ TEXTOS_ANDAMENTO_EVENTO.verConfirmacoes }}
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.andamento {
  container: andamento / inline-size;
}

.andamento .andamento__titulo,
.andamento .andamento__rotulo,
.andamento__vazio,
.andamento__legenda {
  margin: 0;
}

.andamento .andamento__titulo {
  font-size: var(--p-fonte-tamanho-secao);
}

.andamento__itens {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
}

.andamento__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--p-ritmo-campo);
  min-width: 0;
  padding-block: var(--p-ritmo-grupo);
}

.andamento__item:first-child {
  padding-top: 0;
}

.andamento__item:last-child {
  padding-bottom: 0;
}

.andamento__item + .andamento__item {
  border-top: 1px solid var(--p-cor-borda);
}

.andamento .andamento__rotulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-secundario);
}

.andamento__valor {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1.1;
  color: var(--p-cor-primaria);
}

.andamento__item--encerrado .andamento__valor {
  color: var(--p-cor-texto-apoio);
}

.andamento__barra {
  display: block;
  width: 100%;
  height: 0.25rem;
  overflow: hidden;
  border-radius: var(--p-raio-total);
  background: var(--p-cor-borda-controle);
}

.andamento__barra-preenchida {
  display: block;
  height: 100%;
  background: var(--p-cor-primaria);
}

.andamento__situacao {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
}

.andamento__vazio {
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.andamento__legenda {
  max-width: 40ch;
  color: var(--p-cor-texto-secundario);
}

.andamento__atalho {
  display: inline-flex;
  align-items: center;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-acento-texto);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

@media (pointer: coarse) {
  .andamento__atalho {
    min-height: var(--p-dimensao-alvo-toque);
  }
}

@container andamento (min-width: 34rem) {
  .andamento__itens {
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
  }

  .andamento__item {
    padding: 0 var(--p-ritmo-cartao);
  }

  .andamento__item:first-child {
    padding-left: 0;
  }

  .andamento__item:last-child {
    padding-right: 0;
  }

  .andamento__item + .andamento__item {
    border-top: 0;
    border-left: 1px solid var(--p-cor-borda);
  }
}
</style>
