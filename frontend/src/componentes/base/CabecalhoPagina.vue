<script setup lang="ts">
import { computed, inject } from 'vue'

import TrilhaPagina from './TrilhaPagina.vue'
import type { ItemTrilha } from './tipos'
import { CHAVE_TRILHA } from '@/layouts/trilha'
import { ROTULOS_NAVEGACAO } from '@/textos/rotulos'

const props = withDefaults(
  defineProps<{
    titulo: string
    descricao?: string
    tamanho?: 'pagina' | 'display'
    rotuloTrilha?: string
    rotulosTrilha?: Partial<Record<string, string | null | undefined>>
  }>(),
  {
    descricao: undefined,
    tamanho: 'pagina',
    rotuloTrilha: undefined,
    rotulosTrilha: () => ({}),
  },
)

const niveisTrilha = inject(CHAVE_TRILHA, null)

const itensTrilha = computed<ItemTrilha[]>(() => {
  const niveis = niveisTrilha?.value ?? []
  if (niveis.length < 2) {
    return []
  }
  const ultimo = niveis.length - 1
  return niveis.map((nivel, indice) => {
    const atual = indice === ultimo
    const dinamico = atual ? props.rotuloTrilha : props.rotulosTrilha[nivel.chave]
    const reserva = atual ? props.titulo : ROTULOS_NAVEGACAO.eventoGenerico
    return {
      chave: nivel.chave,
      rotulo: dinamico || nivel.rotulo || reserva,
      rota: atual ? null : nivel.rota,
    }
  })
})
</script>

<template>
  <header
    class="cabecalho-pagina"
    :class="`cabecalho-pagina--${tamanho}`"
  >
    <nav
      v-if="$slots.trilha || itensTrilha.length > 0"
      class="cabecalho-pagina__trilha"
      :aria-label="ROTULOS_NAVEGACAO.trilha"
    >
      <slot name="trilha">
        <TrilhaPagina :itens="itensTrilha" />
      </slot>
    </nav>
    <div class="cabecalho-pagina__linha">
      <div class="cabecalho-pagina__textos">
        <h1 class="cabecalho-pagina__titulo">
          <slot name="titulo">
            {{ titulo }}
          </slot>
        </h1>
        <p
          v-if="descricao"
          class="cabecalho-pagina__descricao"
        >
          {{ descricao }}
        </p>
        <div
          v-if="$slots.detalhes"
          class="cabecalho-pagina__detalhes"
        >
          <slot name="detalhes" />
        </div>
      </div>
      <div
        v-if="$slots.destaque || $slots.acoes"
        class="cabecalho-pagina__complementos"
      >
        <div
          v-if="$slots.destaque"
          class="cabecalho-pagina__destaque"
        >
          <slot name="destaque" />
        </div>
        <div
          v-if="$slots.acoes"
          class="cabecalho-pagina__acoes"
        >
          <slot name="acoes" />
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.cabecalho-pagina {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  margin-bottom: var(--p-espaco-7);
  container: cabecalho-pagina / inline-size;
}

.cabecalho-pagina__trilha {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.cabecalho-pagina__trilha :deep(a) {
  color: var(--p-cor-texto-apoio);
  text-decoration: none;
}

.cabecalho-pagina__trilha :deep(a:hover) {
  color: var(--p-cor-texto);
  text-decoration: underline;
}

.cabecalho-pagina__trilha :deep([aria-current='page']) {
  color: var(--p-cor-texto);
}

.cabecalho-pagina__linha {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.cabecalho-pagina__textos {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  min-width: 0;
}

.cabecalho-pagina .cabecalho-pagina__titulo {
  font-size: var(--p-fonte-tamanho-pagina-celular);
  line-height: var(--p-fonte-entrelinha-titulo);
  overflow-wrap: anywhere;
}

.cabecalho-pagina__descricao {
  max-width: var(--p-dimensao-largura-leitura);
  color: var(--p-cor-texto-secundario);
  overflow-wrap: anywhere;
}

.cabecalho-pagina__detalhes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2) var(--p-espaco-4);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.cabecalho-pagina__complementos {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  min-width: 0;
}

.cabecalho-pagina__destaque {
  flex-shrink: 0;
}

.cabecalho-pagina__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.cabecalho-pagina__acoes :deep(.p-button) {
  width: 100%;
  min-height: var(--p-dimensao-alvo-toque);
}

@container cabecalho-pagina (min-width: 36rem) {
  .cabecalho-pagina__acoes {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .cabecalho-pagina__acoes :deep(.p-button) {
    width: auto;
  }
}

@container cabecalho-pagina (min-width: 40rem) {
  .cabecalho-pagina__linha {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--p-ritmo-grupo) var(--p-espaco-8);
  }

  .cabecalho-pagina__textos {
    flex: 999 1 auto;
    min-width: min(100%, 24rem);
  }

  .cabecalho-pagina__complementos {
    flex: 1 1 auto;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--p-ritmo-grupo) var(--p-espaco-8);
  }

  .cabecalho-pagina__acoes {
    flex-shrink: 0;
    margin-left: auto;
  }

  .cabecalho-pagina .cabecalho-pagina__titulo {
    font-size: var(--p-fonte-tamanho-pagina);
  }

  .cabecalho-pagina--display .cabecalho-pagina__titulo {
    font-size: var(--p-fonte-tamanho-display);
    line-height: var(--p-fonte-entrelinha-display);
  }
}
</style>
