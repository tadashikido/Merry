<script setup lang="ts">
import { computed, useId } from 'vue'
import { RouterLink } from 'vue-router'

import { TEXTOS_PROXIMOS_PASSOS_CONFIRMACOES as TEXTOS } from '@/textos/confirmacoes'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { PainelConfirmacoesDto } from '@/tipos/confirmacoes'
import type { DataCalendario, TipoEvento } from '@/tipos/eventos'
import { formatarNumero } from '@/utilitarios/formatacao'
import { proximosPassosConfirmacoes, type PassoConfirmacao } from '@/utilitarios/painelConfirmacoes'

const props = defineProps<{
  painel: PainelConfirmacoesDto
  tipo: TipoEvento | null
  dataEvento: DataCalendario | null
  arquivado: boolean
  eventoId: string
}>()

const idTitulo = `proximos-passos-confirmacoes-${useId()}`

const vocabulario = computed(() => vocabularioOuNeutro(props.tipo))
const situacao = computed(() => proximosPassosConfirmacoes(props.painel, props.dataEvento))
const prazoEncerrado = computed(() => !props.painel.prazo.aceitaRespostas)

const frasePrazo = computed(() => {
  const dias = situacao.value.diasPrazoAntesDoEvento
  return dias === null ? null : TEXTOS.prazoAntes(dias, vocabulario.value.referencia.contracaoDe)
})

const mostrarPassos = computed(() => !props.arquivado && !prazoEncerrado.value && situacao.value.semResposta > 0)

function textoPasso(passo: PassoConfirmacao): { titulo: string; apoio: string } {
  if (passo.chave === 'aEnviar') {
    return { titulo: TEXTOS.aEnviar(passo.quantidade), apoio: TEXTOS.aEnviarApoio(passo.quantidade) }
  }
  if (passo.chave === 'semLembrete') {
    const visualizados = situacao.value.visualizadosSemLembrete
    return {
      titulo: TEXTOS.semLembrete(passo.quantidade),
      apoio: visualizados > 0 ? TEXTOS.visualizaram(visualizados) : TEXTOS.semLembreteApoio,
    }
  }
  return { titulo: TEXTOS.jaLembrados(passo.quantidade), apoio: TEXTOS.jaLembradosApoio }
}

const passos = computed(() =>
  mostrarPassos.value ? situacao.value.passos.map((passo) => ({ chave: passo.chave, ...textoPasso(passo) })) : [],
)

const notaSituacao = computed(() => {
  if (situacao.value.semResposta === 0) {
    return situacao.value.confirmadas > 0 ? { teste: 'todos-responderam', texto: TEXTOS.todosResponderam } : null
  }
  if (props.arquivado) {
    return null
  }
  if (prazoEncerrado.value) {
    return { teste: 'prazo-encerrado', texto: TEXTOS.prazoEncerrado(situacao.value.semResposta) }
  }
  return passos.value.length === 0 ? { teste: 'sem-passos', texto: TEXTOS.semPassos } : null
})

const mesas = computed(() => (situacao.value.confirmadas > 0 ? TEXTOS.mesas(vocabulario.value.mesaEspecial) : null))
</script>

<template>
  <section
    class="passos-confirmacoes cartao"
    :aria-labelledby="idTitulo"
    data-teste="proximos-passos-confirmacoes"
  >
    <div class="passos-confirmacoes__corpo">
      <div class="passos-confirmacoes__situacao pilha pilha--grupo">
        <h2
          :id="idTitulo"
          class="passos-confirmacoes__titulo"
        >
          {{ TEXTOS.titulo }}
        </h2>

        <p
          v-if="frasePrazo"
          class="passos-confirmacoes__prazo"
          data-teste="passos-prazo-evento"
        >
          {{ frasePrazo }}
        </p>

        <ul
          class="passos-confirmacoes__numeros"
          :aria-label="TEXTOS.numerosRotulo"
        >
          <li
            class="passos-confirmacoes__numero-item"
            data-teste="passos-confirmadas"
          >
            <span
              class="passos-confirmacoes__numero numeros-tabulares"
              aria-hidden="true"
            >{{ formatarNumero(situacao.confirmadas) }}</span>
            <span
              class="passos-confirmacoes__legenda"
              aria-hidden="true"
            >{{ TEXTOS.confirmadas(situacao.confirmadas) }}</span>
            <span class="somente-leitor-tela">{{ TEXTOS.confirmadasAcessivel(situacao.confirmadas) }}</span>
          </li>
          <li
            v-if="situacao.semResposta > 0"
            class="passos-confirmacoes__numero-item"
            data-teste="passos-maximo"
          >
            <span
              class="passos-confirmacoes__numero numeros-tabulares"
              aria-hidden="true"
            >{{ formatarNumero(situacao.maximo) }}</span>
            <span
              class="passos-confirmacoes__legenda"
              aria-hidden="true"
            >{{ TEXTOS.maximo }}</span>
            <span class="somente-leitor-tela">{{ TEXTOS.maximoAcessivel(situacao.maximo) }}</span>
          </li>
        </ul>

        <p
          v-if="situacao.semResposta === 0 && situacao.confirmadas > 0"
          class="passos-confirmacoes__nota"
          data-teste="passos-numero-fechado"
        >
          {{ TEXTOS.numeroFechado }}
        </p>
      </div>

      <div class="passos-confirmacoes__acoes pilha pilha--grupo">
        <ol
          v-if="passos.length > 0"
          class="passos-confirmacoes__lista"
          :aria-label="TEXTOS.passosRotulo"
        >
          <li
            v-for="passo in passos"
            :key="passo.chave"
            class="passos-confirmacoes__passo"
            :data-teste="`passo-${passo.chave}`"
          >
            <span class="passos-confirmacoes__passo-titulo">{{ passo.titulo }}</span>
            <span class="passos-confirmacoes__passo-apoio">{{ passo.apoio }}</span>
          </li>
        </ol>

        <p
          v-if="notaSituacao"
          class="passos-confirmacoes__nota"
          :data-teste="`passos-${notaSituacao.teste}`"
        >
          {{ notaSituacao.texto }}
        </p>

        <p
          v-if="mostrarPassos && situacao.lembradosHoje > 0"
          class="passos-confirmacoes__nota"
          data-teste="passos-lembrados-hoje"
        >
          {{ TEXTOS.lembradosHoje(situacao.lembradosHoje) }}
        </p>

        <div
          v-if="mesas"
          class="passos-confirmacoes__mesas pilha pilha--campo"
          data-teste="passos-mesas"
        >
          <p class="passos-confirmacoes__mesas-texto">
            {{ mesas }}
          </p>
          <RouterLink
            :to="{ name: 'evento-mesas', params: { id: eventoId } }"
            class="passos-confirmacoes__link"
            data-teste="passos-organizar-mesas"
          >
            {{ TEXTOS.organizarMesas }}
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.passos-confirmacoes {
  container: proximos-passos / inline-size;
  min-width: 0;
}

.passos-confirmacoes__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
}

.passos-confirmacoes__situacao,
.passos-confirmacoes__acoes {
  min-width: 0;
}

.passos-confirmacoes__titulo,
.passos-confirmacoes__prazo,
.passos-confirmacoes__nota,
.passos-confirmacoes__mesas-texto {
  margin: 0;
}

.passos-confirmacoes__titulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  color: var(--p-cor-texto);
}

.passos-confirmacoes__prazo {
  padding-inline-start: var(--p-ritmo-campo);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  font-variant-numeric: lining-nums;
  line-height: 1.35;
  color: var(--p-cor-texto);
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.passos-confirmacoes__numeros {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--p-ritmo-campo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.passos-confirmacoes__numero-item {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.passos-confirmacoes__numero-item + .passos-confirmacoes__numero-item {
  padding-inline-start: var(--p-ritmo-campo);
  border-inline-start: 1px solid var(--p-cor-divisoria);
}

.passos-confirmacoes__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1.1;
  color: var(--p-cor-texto);
}

.passos-confirmacoes__legenda {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  line-height: 1.2;
  color: var(--p-cor-texto-secundario);
  overflow-wrap: break-word;
}

.passos-confirmacoes__nota {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.passos-confirmacoes__lista {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
  padding: 0;
  padding-inline-start: var(--p-ritmo-campo);
  list-style: none;
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.passos-confirmacoes__passo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.passos-confirmacoes__passo-titulo {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.passos-confirmacoes__passo-apoio {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.passos-confirmacoes__mesas {
  padding-block-start: var(--p-ritmo-campo);
  border-block-start: 1px solid var(--p-cor-divisoria);
}

.passos-confirmacoes__mesas-texto {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto);
}

.passos-confirmacoes__link {
  align-self: flex-start;
  padding-block: var(--p-espaco-1);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-primaria);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

@container proximos-passos (min-width: 36rem) {
  .passos-confirmacoes__corpo {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--p-ritmo-bloco);
  }
}
</style>
