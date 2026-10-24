<script setup lang="ts">
import { computed, ref, useId } from 'vue'

import { ROTULOS_CATEGORIA_FORNECEDOR, TEXTOS_COBERTURA_FORNECEDORES } from '@/textos/fornecedores'
import type { CategoriaSemFornecedor, CoberturaCarteira } from '@/utilitarios/coberturaFornecedores'
import { descreverCarteiraPorTipo } from '@/utilitarios/carteiraEventos'

const props = withDefaults(
  defineProps<{ cobertura: CoberturaCarteira; comReaproveitamento?: boolean; limite?: number | null }>(),
  {
    comReaproveitamento: false,
    limite: null,
  },
)

const idTitulo = useId()
const idFaltas = useId()
const idLista = useId()
const expandida = ref(false)
const idReaproveitamento = useId()

const frase = computed(() =>
  props.cobertura.daCarteira
    ? TEXTOS_COBERTURA_FORNECEDORES.carteira(descreverCarteiraPorTipo(props.cobertura.porTipo))
    : TEXTOS_COBERTURA_FORNECEDORES.semCarteira(),
)
const completa = computed(() => props.cobertura.essenciais > 0 && props.cobertura.faltando.length === 0)
const excedentes = computed(() =>
  props.limite === null ? 0 : Math.max(0, props.cobertura.faltando.length - props.limite),
)
const faltasVisiveis = computed(() =>
  excedentes.value === 0 || expandida.value || props.limite === null
    ? props.cobertura.faltando
    : props.cobertura.faltando.slice(0, props.limite),
)

function apoio(item: CategoriaSemFornecedor): string {
  return props.cobertura.daCarteira
    ? TEXTOS_COBERTURA_FORNECEDORES.essencialParaEventos(item.eventos)
    : TEXTOS_COBERTURA_FORNECEDORES.essencialEm(item.tipos)
}
</script>

<template>
  <section
    class="cobertura cartao"
    :aria-labelledby="idTitulo"
    data-teste="cobertura-fornecedores"
    :data-carteira="cobertura.daCarteira ? 'sim' : 'nao'"
  >
    <div class="cobertura__corpo">
      <div class="cobertura__resumo pilha pilha--grupo">
        <h2
          :id="idTitulo"
          class="cobertura__titulo texto-rotulo"
        >
          {{ TEXTOS_COBERTURA_FORNECEDORES.titulo }}
        </h2>
        <p
          class="cobertura__frase"
          data-teste="cobertura-frase"
        >
          {{ frase }}
        </p>
        <p
          class="cobertura__contagem"
          data-teste="cobertura-contagem"
        >
          <span class="cobertura__numero">{{ cobertura.cobertas.toLocaleString('pt-BR') }}</span>{{ ' ' }}<span class="cobertura__legenda">{{ TEXTOS_COBERTURA_FORNECEDORES.legenda(cobertura.essenciais) }}</span>
        </p>
      </div>

      <div class="cobertura__faltas pilha pilha--campo">
        <p
          v-if="completa"
          class="cobertura__completa"
          data-teste="cobertura-todas"
        >
          {{ TEXTOS_COBERTURA_FORNECEDORES.todas }}
        </p>
        <template v-else>
          <h3
            :id="idFaltas"
            class="cobertura__subtitulo"
          >
            {{ TEXTOS_COBERTURA_FORNECEDORES.faltasTitulo }}
          </h3>
          <ul
            :id="idLista"
            class="cobertura__lista"
            :aria-labelledby="idFaltas"
          >
            <li
              v-for="item in faltasVisiveis"
              :key="item.categoria"
              class="cobertura__item"
              :data-teste="`cobertura-falta-${item.categoria}`"
            >
              <span
                class="cobertura__marcador"
                aria-hidden="true"
              />
              <span class="cobertura__textos">
                <span class="cobertura__categoria">{{ ROTULOS_CATEGORIA_FORNECEDOR[item.categoria] }}<span class="somente-leitor-tela">,</span></span>
                <span
                  class="cobertura__apoio"
                  data-teste="cobertura-apoio"
                >{{ apoio(item) }}</span>
                <span
                  v-if="item.arquivados > 0"
                  class="cobertura__arquivados"
                  data-teste="cobertura-arquivados"
                >{{ TEXTOS_COBERTURA_FORNECEDORES.arquivados(item.arquivados) }}</span>
              </span>
            </li>
          </ul>
          <button
            v-if="excedentes > 0"
            type="button"
            class="cobertura__alternar"
            :aria-expanded="expandida"
            :aria-controls="idLista"
            data-teste="cobertura-alternar"
            @click="expandida = !expandida"
          >
            <span
              :class="['ie', expandida ? 'ie-seta-baixo' : 'ie-seta-direita']"
              aria-hidden="true"
            />
            {{ expandida ? TEXTOS_COBERTURA_FORNECEDORES.menosFaltas : TEXTOS_COBERTURA_FORNECEDORES.maisFaltas(excedentes) }}
          </button>
        </template>
      </div>

      <div
        v-if="comReaproveitamento"
        class="cobertura__reaproveitamento pilha pilha--campo"
      >
        <h3
          :id="idReaproveitamento"
          class="cobertura__subtitulo"
        >
          {{ TEXTOS_COBERTURA_FORNECEDORES.reaproveitamentoTitulo }}
        </h3>
        <ul
          class="cobertura__dicas"
          :aria-labelledby="idReaproveitamento"
          data-teste="cobertura-reaproveitamento"
        >
          <li
            v-for="dica in TEXTOS_COBERTURA_FORNECEDORES.reaproveitamento"
            :key="dica"
          >
            {{ dica }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cobertura {
  container: cobertura-fornecedores / inline-size;
}

.cobertura__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: var(--p-ritmo-bloco);
}

.cobertura .cobertura__titulo,
.cobertura__frase,
.cobertura__contagem,
.cobertura__completa,
.cobertura .cobertura__subtitulo {
  margin: 0;
}

.cobertura__frase {
  padding-left: var(--p-ritmo-grupo);
  border-left: 2px solid var(--p-cor-primaria);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto);
}

.cobertura__contagem {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--p-espaco-2);
}

.cobertura__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1.1;
  color: var(--p-cor-primaria);
}

.cobertura__legenda {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto-secundario);
}

.cobertura .cobertura__subtitulo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.cobertura__completa {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-corpo);
  font-style: italic;
  color: var(--p-cor-texto);
}

.cobertura__lista,
.cobertura__dicas {
  margin: 0;
  padding: 0;
  list-style: none;
}

.cobertura__lista {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid var(--p-cor-divisoria);
}

.cobertura__alternar {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--p-espaco-1);
  min-height: var(--p-dimensao-alvo-toque);
  padding: 0;
  font: inherit;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-primaria-escura);
  cursor: pointer;
  background: none;
  border: 0;
}

.cobertura__item {
  display: grid;
  grid-template-columns: var(--p-espaco-3) minmax(0, 1fr);
  gap: var(--p-espaco-3);
  align-items: baseline;
  padding: var(--p-espaco-2) 0;
  border-bottom: 1px solid var(--p-cor-divisoria);
}

.cobertura__marcador {
  box-sizing: border-box;
  width: var(--p-espaco-3);
  height: var(--p-espaco-3);
  border: 1.5px dashed var(--p-cor-texto-apoio);
  border-radius: var(--p-raio-total);
}

.cobertura__textos {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.cobertura__categoria {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.cobertura__apoio,
.cobertura__arquivados {
  font-size: var(--p-fonte-tamanho-apoio);
  font-variant-numeric: lining-nums;
  color: var(--p-cor-texto-secundario);
}

.cobertura__arquivados {
  font-family: var(--p-fonte-serif);
  font-style: italic;
}

.cobertura__dicas {
  display: grid;
  gap: var(--p-espaco-2);
  padding-left: var(--p-ritmo-grupo);
  border-left: 2px solid var(--p-cor-primaria);
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

@container cobertura-fornecedores (min-width: 36rem) {
  .cobertura__corpo {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
    column-gap: var(--p-ritmo-bloco);
  }

  .cobertura__resumo {
    grid-column: 1;
    grid-row: 1;
  }

  .cobertura__reaproveitamento {
    grid-column: 1;
    grid-row: 2;
  }

  .cobertura__faltas {
    grid-column: 2;
    grid-row: 1 / span 2;
  }

  .cobertura__lista {
    grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
    column-gap: var(--p-ritmo-bloco);
  }
}
</style>
