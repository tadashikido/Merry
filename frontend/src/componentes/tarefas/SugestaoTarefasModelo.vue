<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import LateralDestaque from '@/componentes/base/LateralDestaque.vue'
import { useModelosChecklistStore } from '@/stores/modelosChecklist'
import { TEXTOS_TAREFAS } from '@/textos/tarefas'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import type { ModeloChecklistDto } from '@/tipos/checklist'
import type { TipoEvento } from '@/tipos/eventos'
import { modelosDoTipo } from '@/utilitarios/modelosPorTipo'

const LIMITE_EXEMPLOS = 4

const props = withDefaults(
  defineProps<{ eventoId: string; tipo: TipoEvento | null; modeloId?: string | null; semAcao?: boolean; texto?: string | null }>(),
  { modeloId: null, semAcao: false, texto: null },
)

const modelos = useModelosChecklistStore()

const detalhe = ref<ModeloChecklistDto | null>(null)

const vocabulario = computed(() => vocabularioOuNeutro(props.tipo))

const principal = computed(() => {
  if (!modelos.lista) {
    return null
  }
  const disponiveis = modelosDoTipo(modelos.lista, props.tipo)
  if (props.modeloId) {
    return disponiveis.find((modelo) => modelo.id === props.modeloId) ?? null
  }
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
  <LateralDestaque
    v-if="visivel && principal && detalhe"
    elemento="section"
    id-titulo="titulo-sugestao-tarefas"
    class="sugestao-modelo"
    :class="{ 'sugestao-modelo--sem-acao': semAcao }"
    :rotulo="TEXTOS_TAREFAS.sugestaoTitulo"
    :titulo="detalhe.nome"
    data-teste="sugestao-tarefas-modelo"
  >
    <template #titulo>
      <span data-teste="sugestao-modelo-nome">{{ detalhe.nome }}</span>
    </template>
    <template #descricao>
      <span data-teste="sugestao-modelo-quantidade">{{ TEXTOS_TAREFAS.sugestaoQuantidade(detalhe.itens.length) }}</span>
    </template>
    <p class="sugestao-modelo__texto">
      {{ texto ?? TEXTOS_TAREFAS.sugestaoTexto(vocabulario.referencia.indefinido) }}
    </p>
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
        <span
          class="sugestao-modelo__caixa"
          aria-hidden="true"
        />
        <span class="sugestao-modelo__titulo-item">{{ item.titulo }}</span>
      </li>
    </ul>
    <template
      v-if="restantes > 0 || !semAcao"
      #rodape
    >
      <span
        v-if="restantes > 0"
        class="sugestao-modelo__apoio"
        data-teste="sugestao-mais"
      >{{ TEXTOS_TAREFAS.sugestaoMais(restantes) }}</span>
      <RouterLink
        v-if="!semAcao"
        class="sugestao-modelo__aplicar"
        :to="{ name: 'evento-checklist', params: { id: eventoId } }"
        data-teste="sugestao-aplicar"
      >
        <span
          class="ie ie-centelha sugestao-modelo__centelha"
          aria-hidden="true"
        />
        {{ TEXTOS_TAREFAS.sugestaoAplicar }}
      </RouterLink>
    </template>
  </LateralDestaque>
</template>

<style scoped>
.sugestao-modelo__texto {
  margin: 0;
  padding-block: var(--p-ritmo-campo);
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.sugestao-modelo__itens {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sugestao-modelo__item {
  display: flex;
  align-items: center;
  gap: var(--p-ritmo-grupo);
  padding-block: var(--p-ritmo-grupo);
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.sugestao-modelo__item + .sugestao-modelo__item {
  border-top: 1px solid var(--p-cor-divisoria);
}

.sugestao-modelo__caixa {
  flex: none;
  width: 1.125rem;
  height: 1.125rem;
  border: 1.5px solid var(--p-cor-borda-controle);
  border-radius: var(--p-raio-tag);
}

.sugestao-modelo__titulo-item {
  min-width: 0;
}

.sugestao-modelo__apoio {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.sugestao-modelo__aplicar {
  display: inline-flex;
  align-items: center;
  gap: var(--p-ritmo-campo);
  min-height: var(--p-dimensao-alvo-toque);
  margin-inline-start: auto;
  padding-inline: var(--p-ritmo-grupo);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-destaque-texto);
  text-decoration: none;
  background: var(--p-cor-destaque);
  border-radius: var(--p-raio-controle);
}

.sugestao-modelo__aplicar:hover {
  background: var(--p-cor-tom-champanhe-viva);
}

.sugestao-modelo__aplicar:focus-visible {
  outline: var(--p-focus-ring-width) var(--p-focus-ring-style) var(--p-focus-ring-color);
  outline-offset: var(--p-focus-ring-offset);
}

.sugestao-modelo__centelha {
  color: var(--p-cor-centelha);
}
</style>
