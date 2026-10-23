<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { useModelosChecklistStore } from '@/stores/modelosChecklist'
import { TEXTOS_TAREFAS } from '@/textos/tarefas'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { ModeloChecklistDto } from '@/tipos/checklist'
import type { TipoEvento } from '@/tipos/eventos'
import { modelosDoTipo } from '@/utilitarios/modelosPorTipo'

const LIMITE_EXEMPLOS = 4

const props = defineProps<{ eventoId: string; tipo: TipoEvento | null }>()

const modelos = useModelosChecklistStore()

const detalhe = ref<ModeloChecklistDto | null>(null)

const vocabulario = computed(() => vocabularioOuNeutro(props.tipo))

const principal = computed(() => {
  if (!modelos.lista) {
    return null
  }
  const disponiveis = modelosDoTipo(modelos.lista, props.tipo)
  return disponiveis.find((modelo) => modelo.sugerido) ?? disponiveis[0] ?? null
})

const exemplos = computed(() =>
  detalhe.value
    ? [...detalhe.value.itens]
        .sort((a, b) => b.diasAntesDoEvento - a.diasAntesDoEvento)
        .slice(0, LIMITE_EXEMPLOS)
    : [],
)

const restantes = computed(() => (detalhe.value ? Math.max(0, detalhe.value.itens.length - exemplos.value.length) : 0))

const visivel = computed(() => principal.value !== null && detalhe.value !== null && detalhe.value.itens.length > 0)

watch(
  () => principal.value?.id ?? null,
  async (id) => {
    if (detalhe.value?.id !== id) {
      detalhe.value = null
    }
    if (!id) {
      return
    }
    const resultado = await modelos.obter(id)
    if (principal.value?.id !== id) {
      return
    }
    detalhe.value = resultado.ok ? resultado.valor : null
  },
  { immediate: true },
)

onMounted(() => {
  if (modelos.lista === null && !modelos.carregandoLista) {
    void modelos.listar()
  }
})
</script>

<template>
  <section
    v-if="visivel && principal && detalhe"
    class="sugestao-modelo cartao"
    aria-labelledby="titulo-sugestao-tarefas"
    data-teste="sugestao-tarefas-modelo"
  >
    <div class="sugestao-modelo__corpo">
      <div class="sugestao-modelo__introducao pilha pilha--grupo">
        <h2
          id="titulo-sugestao-tarefas"
          class="texto-rotulo"
        >
          {{ TEXTOS_TAREFAS.sugestaoTitulo }}
        </h2>
        <p class="sugestao-modelo__texto">
          {{ TEXTOS_TAREFAS.sugestaoTexto(vocabulario.referencia.indefinido) }}
        </p>
        <div class="sugestao-modelo__modelo">
          <p
            class="sugestao-modelo__nome"
            data-teste="sugestao-modelo-nome"
          >
            {{ detalhe.nome }}
          </p>
          <p
            class="sugestao-modelo__apoio"
            data-teste="sugestao-modelo-quantidade"
          >
            {{ TEXTOS_TAREFAS.sugestaoQuantidade(detalhe.itens.length) }}
          </p>
        </div>
      </div>
      <div class="sugestao-modelo__exemplos pilha pilha--campo">
        <ul
          class="sugestao-modelo__itens"
          :aria-label="TEXTOS_TAREFAS.sugestaoListaRotulo"
        >
          <li
            v-for="item in exemplos"
            :key="item.id"
            class="sugestao-modelo__item"
            data-teste="sugestao-item"
          >
            {{ item.titulo }}
          </li>
        </ul>
        <p
          v-if="restantes > 0"
          class="sugestao-modelo__apoio"
          data-teste="sugestao-mais"
        >
          {{ TEXTOS_TAREFAS.sugestaoMais(restantes) }}
        </p>
      </div>
      <RouterLink
        class="sugestao-modelo__aplicar"
        :to="{ name: 'evento-checklist', params: { id: eventoId } }"
        data-teste="sugestao-aplicar"
      >
        {{ TEXTOS_TAREFAS.sugestaoAplicar }}
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.sugestao-modelo {
  container: sugestao-modelo / inline-size;
}

.sugestao-modelo__corpo {
  display: grid;
  grid-template-areas:
    'introducao'
    'exemplos'
    'acao';
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
}

.sugestao-modelo__introducao {
  grid-area: introducao;
  min-width: 0;
}

.sugestao-modelo__exemplos {
  grid-area: exemplos;
  min-width: 0;
}

.sugestao-modelo h2 {
  margin: 0;
}

.sugestao-modelo__texto {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.sugestao-modelo__modelo {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sugestao-modelo__nome {
  margin: 0;
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-titulo);
  font-style: italic;
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.sugestao-modelo__apoio {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.sugestao-modelo__itens {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
  padding: 0 0 0 var(--p-ritmo-grupo);
  list-style: none;
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.sugestao-modelo__item {
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.sugestao-modelo__aplicar {
  grid-area: acao;
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-acento-texto);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

@container sugestao-modelo (min-width: 36rem) {
  .sugestao-modelo__corpo {
    grid-template-areas:
      'introducao exemplos'
      'acao exemplos';
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    column-gap: var(--p-ritmo-bloco);
  }

  .sugestao-modelo__exemplos {
    padding-left: var(--p-ritmo-bloco);
    border-left: 1px solid var(--p-cor-divisoria);
  }
}

@media (pointer: coarse) {
  .sugestao-modelo__aplicar {
    min-height: var(--p-dimensao-alvo-toque);
  }
}
</style>
