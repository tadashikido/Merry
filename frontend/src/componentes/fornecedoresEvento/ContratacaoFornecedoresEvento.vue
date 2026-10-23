<script setup lang="ts">
import { computed } from 'vue'

import { TEXTOS_CONTRATACAO_FORNECEDORES } from '@/textos/fornecedoresEvento'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'
import type { FornecedorEventoDto } from '@/tipos/fornecedoresEvento'
import { coberturaEssenciais } from '@/utilitarios/fornecedoresEvento'

const props = defineProps<{ vinculos: FornecedorEventoDto[]; tipo: TipoEvento }>()

const vocabulario = computed(() => vocabularioOuNeutro(props.tipo))
const cobertura = computed(() => coberturaEssenciais(props.vinculos, vocabulario.value.fornecedoresEssenciais))
const todasContratadas = computed(() => cobertura.value.total > 0 && cobertura.value.contratadas === cobertura.value.total)
const emConversa = computed(() =>
  cobertura.value.emCotacao + cobertura.value.emNegociacao > 0
    ? TEXTOS_CONTRATACAO_FORNECEDORES.emConversa(cobertura.value.emCotacao, cobertura.value.emNegociacao)
    : null,
)
</script>

<template>
  <section
    class="contratacao cartao pilha pilha--grupo"
    aria-labelledby="titulo-contratacao-fornecedores"
    data-teste="contratacao-fornecedores"
  >
    <h2
      id="titulo-contratacao-fornecedores"
      class="contratacao__titulo texto-rotulo"
    >
      {{ TEXTOS_CONTRATACAO_FORNECEDORES.titulo }}
    </h2>

    <p
      v-if="todasContratadas"
      class="contratacao__frase contratacao__frase--completa"
      data-teste="contratacao-todas"
    >
      {{ TEXTOS_CONTRATACAO_FORNECEDORES.todas }}
    </p>
    <p
      v-else
      class="contratacao__frase"
      data-teste="contratacao-contagem"
    >
      <span class="contratacao__numero numeros-tabulares">{{ cobertura.contratadas.toLocaleString('pt-BR') }}</span>{{ ' ' }}<span class="contratacao__legenda">{{ TEXTOS_CONTRATACAO_FORNECEDORES.legenda(cobertura.total) }}</span>
    </p>

    <ul
      class="contratacao__lista"
      :aria-label="TEXTOS_CONTRATACAO_FORNECEDORES.listaRotulo"
    >
      <li
        v-for="item in cobertura.itens"
        :key="item.categoria"
        class="contratacao__item"
        :class="`contratacao__item--${item.situacao}`"
        :data-teste="`essencial-${item.categoria}`"
        :data-situacao="item.situacao"
      >
        <span
          class="contratacao__marcador"
          aria-hidden="true"
        />
        <span class="contratacao__categoria">{{ ROTULOS_CATEGORIA_FORNECEDOR[item.categoria] }}<span class="somente-leitor-tela">,</span></span>
        <span class="contratacao__situacao">{{ TEXTOS_CONTRATACAO_FORNECEDORES.situacoes[item.situacao] }}</span>
      </li>
    </ul>

    <p
      v-if="emConversa"
      class="contratacao__conversa"
      data-teste="contratacao-em-conversa"
    >
      {{ emConversa }}
    </p>

    <p
      class="contratacao__nota texto-legenda"
      data-teste="contratacao-nota"
    >
      {{ TEXTOS_CONTRATACAO_FORNECEDORES.nota(vocabulario.referencia.indefinido) }}
    </p>
  </section>
</template>

<style scoped>
.contratacao {
  container: contratacao / inline-size;
}

.contratacao .contratacao__titulo,
.contratacao__frase,
.contratacao__conversa,
.contratacao__nota {
  margin: 0;
}

.contratacao__frase {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--p-espaco-2);
}

.contratacao__frase--completa {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  color: var(--p-cor-texto);
}

.contratacao__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1.1;
  color: var(--p-cor-primaria);
}

.contratacao__legenda {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  color: var(--p-cor-texto-secundario);
}

.contratacao__lista {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--p-cor-divisoria);
}

.contratacao__item {
  display: grid;
  grid-template-columns: var(--p-espaco-3) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--p-espaco-3);
  min-width: 0;
  padding: var(--p-espaco-2) 0;
  border-bottom: 1px solid var(--p-cor-divisoria);
  font-size: var(--p-fonte-tamanho-controle);
}

.contratacao__marcador {
  box-sizing: border-box;
  width: var(--p-espaco-3);
  height: var(--p-espaco-3);
  border: 1.5px solid var(--p-cor-primaria);
  border-radius: var(--p-raio-total);
}

.contratacao__item--SemFornecedor .contratacao__marcador {
  border-style: dashed;
  border-color: var(--p-cor-texto-apoio);
}

.contratacao__item--Cotacao .contratacao__marcador,
.contratacao__item--EmNegociacao .contratacao__marcador {
  background: linear-gradient(90deg, var(--p-cor-primaria) 50%, transparent 50%);
}

.contratacao__item--Contratado .contratacao__marcador {
  background: var(--p-cor-primaria);
}

.contratacao__categoria {
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.contratacao__situacao {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
  text-align: end;
}

.contratacao__item--Contratado .contratacao__situacao {
  color: var(--p-cor-texto);
}

.contratacao__conversa {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

@container contratacao (min-width: 30rem) {
  .contratacao__lista {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--p-ritmo-bloco);
  }
}
</style>
