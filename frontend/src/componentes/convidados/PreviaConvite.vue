<script setup lang="ts">
import { computed, useId } from 'vue'

import { TEXTOS_PREVIA_CONVITE } from '@/textos/convidados'
import { TEXTOS_RSVP } from '@/textos/rsvp'
import type { DataCalendario, TipoEvento } from '@/tipos/eventos'
import { formatarDataCalendarioExtenso, formatarNomesEmFrase } from '@/utilitarios/formatacao'
import { celebracaoDoConvite, formatarDiaMes } from '@/utilitarios/rsvp'

export interface PessoaPreviaConvite {
  chave: string
  nome: string
  crianca: boolean
}

const props = defineProps<{
  tipo: TipoEvento | null | undefined
  nomePrimeiraPessoa: string
  nomeSegundaPessoa: string | null
  data: DataCalendario
  dataLimite: DataCalendario
  nomeConvite: string
  pessoas: readonly PessoaPreviaConvite[]
  limiteAcompanhantes: number
}>()

const idTitulo = useId()

const nomes = computed(() => formatarNomesEmFrase(props.nomePrimeiraPessoa, props.nomeSegundaPessoa))
const celebracao = computed(() => celebracaoDoConvite(props.tipo, props.nomePrimeiraPessoa, props.nomeSegundaPessoa))

const linhasPessoas = computed(() =>
  props.pessoas.map((pessoa, indice) => {
    const nome = pessoa.nome.replace(/\s+/g, ' ').trim()
    return {
      chave: pessoa.chave,
      nome: nome || TEXTOS_PREVIA_CONVITE.pessoaProvisoria(indice + 1),
      provisorio: nome === '',
      crianca: pessoa.crianca,
    }
  }),
)

const nomeExibido = computed(() => {
  const informado = props.nomeConvite.replace(/\s+/g, ' ').trim()
  if (informado) {
    return { texto: informado, provisorio: false }
  }
  const primeira = linhasPessoas.value[0]
  if (primeira && !primeira.provisorio) {
    return { texto: primeira.nome, provisorio: false }
  }
  return { texto: TEXTOS_PREVIA_CONVITE.nomeProvisorio, provisorio: true }
})
</script>

<template>
  <section
    class="previa-convite"
    :aria-labelledby="idTitulo"
    data-teste="previa-convite"
  >
    <div class="previa-convite__grade">
      <div class="previa-convite__cabecalho">
        <h2
          :id="idTitulo"
          class="previa-convite__titulo"
        >
          {{ TEXTOS_PREVIA_CONVITE.titulo }}
        </h2>
        <p class="previa-convite__subtitulo">
          {{ TEXTOS_PREVIA_CONVITE.subtitulo }}
        </p>
      </div>

      <div
        class="previa-convite__cartao"
        data-teste="previa-cartao"
      >
        <div class="previa-convite__evento">
          <p
            class="previa-convite__nomes"
            data-teste="previa-nomes"
          >
            {{ nomes }}
          </p>
          <p
            class="previa-convite__celebracao"
            data-teste="previa-celebracao"
          >
            {{ celebracao }}
          </p>
          <p class="previa-convite__data">
            {{ formatarDataCalendarioExtenso(data) }}
          </p>
        </div>

        <dl class="previa-convite__dados">
          <div class="previa-convite__dado">
            <dt>{{ TEXTOS_RSVP.conviteDe }}</dt>
            <dd
              :class="{ 'previa-convite__provisorio': nomeExibido.provisorio }"
              data-teste="previa-nome-convite"
            >
              {{ nomeExibido.texto }}
            </dd>
          </div>
          <div class="previa-convite__dado">
            <dt>{{ TEXTOS_RSVP.quemVai }}</dt>
            <dd>
              <ul class="previa-convite__pessoas">
                <li
                  v-for="pessoa in linhasPessoas"
                  :key="pessoa.chave"
                  class="previa-convite__pessoa"
                  data-teste="previa-pessoa"
                >
                  <span :class="{ 'previa-convite__provisorio': pessoa.provisorio }">{{ pessoa.nome }}</span>
                  <span
                    v-if="pessoa.crianca"
                    class="previa-convite__crianca"
                    data-teste="previa-crianca"
                  >{{ ` ${TEXTOS_RSVP.crianca}` }}</span>
                </li>
              </ul>
            </dd>
          </div>
        </dl>

        <p
          v-if="limiteAcompanhantes > 0"
          class="previa-convite__apoio"
          data-teste="previa-acompanhantes"
        >
          {{ TEXTOS_RSVP.acompanhantesLimite(limiteAcompanhantes) }}
        </p>
        <p
          class="previa-convite__prazo"
          data-teste="previa-prazo"
        >
          {{ TEXTOS_RSVP.prazo(formatarDiaMes(dataLimite)) }}
        </p>
      </div>

      <div class="previa-convite__notas">
        <p
          class="previa-convite__nota"
          data-teste="previa-privacidade"
        >
          {{ TEXTOS_PREVIA_CONVITE.privacidade }}
        </p>
        <p
          class="previa-convite__nota"
          data-teste="previa-restricoes"
        >
          {{ TEXTOS_PREVIA_CONVITE.restricoes }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.previa-convite {
  container: previa-convite / inline-size;
  min-width: 0;
}

.previa-convite__grade {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'cabecalho'
    'cartao'
    'notas';
  gap: var(--p-ritmo-grupo);
}

.previa-convite p,
.previa-convite dl,
.previa-convite dd,
.previa-convite h2 {
  margin: 0;
}

.previa-convite__cabecalho {
  grid-area: cabecalho;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.previa-convite__titulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-regular);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.previa-convite__subtitulo,
.previa-convite__nota,
.previa-convite__apoio {
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.previa-convite__cartao {
  grid-area: cartao;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  min-width: 0;
  padding: var(--p-ritmo-cartao);
  border: 1px solid var(--p-cor-borda);
  border-top: 2px solid var(--p-cor-primaria);
  border-radius: var(--p-raio-painel);
  background: var(--p-cor-superficie);
  overflow-wrap: anywhere;
}

.previa-convite__evento {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  padding-bottom: var(--p-ritmo-grupo);
  border-bottom: 1px solid var(--p-cor-borda);
  text-align: center;
}

.previa-convite__nomes {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-regular);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-primaria);
}

.previa-convite__celebracao {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-secundario);
}

.previa-convite__data {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.previa-convite__dados {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
}

.previa-convite__dado {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.previa-convite__dado dt {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.previa-convite__dado dd {
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
}

.previa-convite__pessoas {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.previa-convite__pessoa {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--p-ritmo-campo);
  font-weight: var(--p-fonte-peso-regular);
}

.previa-convite__crianca {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.previa-convite__provisorio {
  font-family: var(--p-fonte-serif);
  font-style: italic;
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto-apoio);
}

.previa-convite__prazo {
  padding-top: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-borda);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
}

.previa-convite__notas {
  grid-area: notas;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  padding-inline-start: var(--p-ritmo-grupo);
  border-inline-start: 2px solid var(--p-cor-primaria);
}

@container previa-convite (min-width: 36rem) {
  .previa-convite__grade {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'cabecalho cartao'
      'notas cartao';
    grid-template-rows: auto 1fr;
    gap: var(--p-ritmo-grupo) var(--p-ritmo-bloco);
  }

  .previa-convite__notas {
    align-self: start;
  }
}
</style>
