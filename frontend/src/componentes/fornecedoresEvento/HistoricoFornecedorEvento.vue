<script setup lang="ts">
import { computed, useId } from 'vue'
import Button from 'primevue/button'

import { ROTULOS_STATUS_FORNECEDOR_EVENTO, TEXTOS_HISTORICO_FORNECEDOR_EVENTO } from '@/textos/fornecedoresEvento'
import type { ParticipacaoFornecedorDto } from '@/tipos/fornecedoresEvento'
import { formatarDataCalendarioCurta, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'
import { resumirParticipacoes } from '@/utilitarios/fornecedoresEvento'

const props = defineProps<{
  eventoAtualId: string
  escolhido: boolean
  participacoes: ParticipacaoFornecedorDto[] | null
  falha: boolean
}>()

const emit = defineEmits<{ 'tentar-novamente': [] }>()

const idTitulo = useId()
const resumo = computed(() => (props.participacoes ? resumirParticipacoes(props.participacoes, props.eventoAtualId) : null))
</script>

<template>
  <section
    class="historico pilha pilha--grupo"
    :aria-labelledby="idTitulo"
    data-teste="historico-fornecedor"
  >
    <h2
      :id="idTitulo"
      class="historico__titulo texto-rotulo"
    >
      {{ TEXTOS_HISTORICO_FORNECEDOR_EVENTO.titulo }}
    </h2>

    <div
      class="historico__corpo pilha pilha--grupo"
      aria-live="polite"
    >
      <p
        v-if="!escolhido"
        class="historico__apoio"
        data-teste="historico-sem-escolha"
      >
        {{ TEXTOS_HISTORICO_FORNECEDOR_EVENTO.semEscolha }}
      </p>

      <div
        v-else-if="falha"
        class="historico__erro"
        data-teste="historico-erro"
      >
        <p class="historico__apoio">
          {{ TEXTOS_HISTORICO_FORNECEDOR_EVENTO.erro }}
        </p>
        <Button
          type="button"
          :label="TEXTOS_HISTORICO_FORNECEDOR_EVENTO.tentarNovamente"
          severity="secondary"
          text
          size="small"
          data-teste="historico-tentar-novamente"
          @click="emit('tentar-novamente')"
        />
      </div>

      <p
        v-else-if="!resumo"
        class="historico__apoio"
        data-teste="historico-carregando"
      >
        {{ TEXTOS_HISTORICO_FORNECEDOR_EVENTO.carregando }}
      </p>

      <p
        v-else-if="resumo.total === 0"
        class="historico__frase historico__frase--vazia"
        data-teste="historico-vazio"
      >
        {{ TEXTOS_HISTORICO_FORNECEDOR_EVENTO.vazio }}
      </p>

      <template v-else>
        <div class="historico__resumo">
          <p
            class="historico__frase"
            data-teste="historico-total"
          >
            <span class="historico__numero numeros-tabulares">{{ resumo.total.toLocaleString('pt-BR') }}</span>{{ ' ' }}<span class="historico__legenda">{{ TEXTOS_HISTORICO_FORNECEDOR_EVENTO.legenda(resumo.total) }}</span>
          </p>
          <p
            class="historico__contratados"
            data-teste="historico-contratados"
          >
            {{ TEXTOS_HISTORICO_FORNECEDOR_EVENTO.contratados(resumo.contratados) }}
          </p>
        </div>

        <ul
          class="historico__lista"
          :aria-label="TEXTOS_HISTORICO_FORNECEDOR_EVENTO.listaRotulo"
          data-teste="historico-lista"
        >
          <li
            v-for="participacao in resumo.recentes"
            :key="participacao.eventoId"
            class="historico__item"
            data-teste="historico-item"
          >
            <span class="historico__nomes">{{ formatarNomesAnfitrioes(participacao.nomePrimeiraPessoa, participacao.nomeSegundaPessoa) }}<span class="somente-leitor-tela">,</span></span>
            <span class="historico__data numeros-tabulares">{{ formatarDataCalendarioCurta(participacao.dataEvento) }}<span class="somente-leitor-tela">,</span></span>
            <span
              class="historico__situacao"
              :class="{ 'historico__situacao--contratado': participacao.status === 'Contratado' }"
            >{{ ROTULOS_STATUS_FORNECEDOR_EVENTO[participacao.status] }}<template v-if="participacao.eventoArquivado"> · {{ TEXTOS_HISTORICO_FORNECEDOR_EVENTO.arquivado }}</template></span>
          </li>
        </ul>

        <p
          v-if="resumo.restantes > 0"
          class="historico__apoio"
          data-teste="historico-mais"
        >
          {{ TEXTOS_HISTORICO_FORNECEDOR_EVENTO.maisN(resumo.restantes) }}
        </p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.historico {
  container: historico-vinculo / inline-size;
  min-width: 0;
}

.historico .historico__titulo,
.historico__apoio,
.historico__frase,
.historico__contratados {
  margin: 0;
}

.historico__apoio {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.historico__erro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo);
}

.historico__erro :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

.historico__resumo {
  display: grid;
  gap: var(--p-ritmo-campo);
  padding-inline-start: var(--p-ritmo-grupo);
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.historico__frase {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--p-ritmo-campo);
}

.historico__frase--vazia {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  color: var(--p-cor-texto-secundario);
}

.historico__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1.1;
  color: var(--p-cor-primaria);
}

.historico__legenda {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  color: var(--p-cor-texto-secundario);
}

.historico__contratados {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.historico__lista {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--p-cor-divisoria);
}

.historico__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0 var(--p-ritmo-grupo);
  padding-block: var(--p-ritmo-campo);
  border-bottom: 1px solid var(--p-cor-divisoria);
  font-size: var(--p-fonte-tamanho-controle);
}

.historico__nomes {
  grid-column: 1 / -1;
  min-width: 0;
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.historico__data,
.historico__situacao {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.historico__situacao {
  text-align: end;
}

.historico__situacao--contratado {
  color: var(--p-cor-texto);
}

@container historico-vinculo (min-width: 30rem) {
  .historico__item {
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: baseline;
  }

  .historico__nomes {
    grid-column: auto;
  }
}
</style>
