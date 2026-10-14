<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'

import BadgeStatus from './BadgeStatus.vue'
import type { FiltroProblemaLinha, ItemProblemaLinha, ProblemaItemLinha, TextosListaProblemas } from './tipos'
import { formatarNumero } from '@/utilitarios/formatacao'

const FILTRO_TODOS = '__todos__'

const props = withDefaults(
  defineProps<{
    itens: ItemProblemaLinha[]
    filtros?: FiltroProblemaLinha[]
    textos: TextosListaProblemas
    limite?: number
  }>(),
  {
    filtros: () => [],
    limite: 50,
  },
)

const filtro = ref(FILTRO_TODOS)
const visiveis = ref(props.limite)

function contarTipo(tipo: string): number {
  return props.itens.filter((item) => item.problemas.some((problema) => problema.tipo === tipo)).length
}

const opcoesFiltro = computed(() => [
  { valor: FILTRO_TODOS, rotulo: `${props.textos.todos} (${formatarNumero(props.itens.length)})` },
  ...props.filtros
    .map((opcao) => ({ valor: opcao.tipo, rotulo: `${opcao.rotulo} (${formatarNumero(contarTipo(opcao.tipo))})`, quantidade: contarTipo(opcao.tipo) }))
    .filter((opcao) => opcao.quantidade > 0),
])

const filtrados = computed(() =>
  filtro.value === FILTRO_TODOS
    ? props.itens
    : props.itens.filter((item) => item.problemas.some((problema) => problema.tipo === filtro.value)),
)

const exibidos = computed(() => filtrados.value.slice(0, visiveis.value))
const restantes = computed(() => Math.max(filtrados.value.length - visiveis.value, 0))

function tiposDoItem(item: ItemProblemaLinha): ProblemaItemLinha[] {
  const vistos = new Set<string>()
  return item.problemas.filter((problema) => {
    if (vistos.has(problema.tipo)) {
      return false
    }
    vistos.add(problema.tipo)
    return true
  })
}

function mostrarMais() {
  visiveis.value += props.limite
}

watch(filtro, () => {
  visiveis.value = props.limite
})

watch(
  () => props.itens,
  () => {
    filtro.value = FILTRO_TODOS
    visiveis.value = props.limite
  },
)
</script>

<template>
  <div
    class="lista-problemas"
    data-teste="lista-problemas"
  >
    <SelectButton
      v-if="opcoesFiltro.length > 2"
      v-model="filtro"
      class="lista-problemas__filtro"
      :options="opcoesFiltro"
      option-label="rotulo"
      option-value="valor"
      :allow-empty="false"
      :aria-label="textos.filtro"
      data-teste="lista-problemas-filtro"
    />

    <p
      v-if="itens.length === 0"
      class="lista-problemas__vazio"
    >
      {{ textos.vazio }}
    </p>

    <ul
      v-else
      class="lista-problemas__itens"
      :aria-label="textos.rotulo"
    >
      <li
        v-for="item in exibidos"
        :key="item.linha"
        class="lista-problemas__item"
        data-teste="lista-problemas-item"
      >
        <div class="lista-problemas__cabecalho">
          <span class="lista-problemas__linha numeros-tabulares">{{ textos.linha(item.linha) }}</span>
          <span class="lista-problemas__titulo">{{ item.titulo }}</span>
          <span class="lista-problemas__tipos">
            <BadgeStatus
              v-for="problema in tiposDoItem(item)"
              :key="problema.tipo"
              :texto="problema.rotuloTipo"
              :variante="problema.variante"
            />
          </span>
        </div>
        <ul class="lista-problemas__mensagens">
          <li
            v-for="(problema, indice) in item.problemas"
            :key="indice"
            class="lista-problemas__mensagem"
          >
            <span
              v-if="problema.campo"
              class="lista-problemas__campo"
            >{{ problema.campo }}:</span>
            {{ problema.mensagem }}
          </li>
        </ul>
      </li>
    </ul>

    <Button
      v-if="restantes > 0"
      class="lista-problemas__mais"
      :label="textos.mostrarMais(Math.min(restantes, limite))"
      severity="secondary"
      text
      data-teste="lista-problemas-mais"
      @click="mostrarMais"
    />
  </div>
</template>

<style scoped>
.lista-problemas {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
}

.lista-problemas__filtro {
  flex-wrap: wrap;
}

.lista-problemas__vazio {
  margin: 0;
  color: var(--p-cor-texto-apoio);
}

.lista-problemas__itens {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.lista-problemas__item {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  padding: var(--p-espaco-4);
}

.lista-problemas__item + .lista-problemas__item {
  border-top: 1px solid var(--p-cor-borda);
}

.lista-problemas__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2) var(--p-espaco-3);
}

.lista-problemas__linha {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto-apoio);
}

.lista-problemas__titulo {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.lista-problemas__tipos {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
}

.lista-problemas__mensagens {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.lista-problemas__mensagem {
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.lista-problemas__campo {
  font-weight: var(--p-fonte-peso-seminegrito);
}

.lista-problemas__mais {
  align-self: flex-start;
}

@media (min-width: 640px) {
  .lista-problemas__item {
    display: grid;
    grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr);
    gap: var(--p-espaco-4);
    padding: var(--p-espaco-4) var(--p-espaco-6);
  }

  .lista-problemas__cabecalho {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
