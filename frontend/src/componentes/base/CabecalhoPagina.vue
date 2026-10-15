<script setup lang="ts">
import { ROTULOS_NAVEGACAO } from '@/textos/rotulos'

withDefaults(defineProps<{ titulo: string; descricao?: string; tamanho?: 'pagina' | 'display' }>(), {
  descricao: undefined,
  tamanho: 'pagina',
})
</script>

<template>
  <header
    class="cabecalho-pagina"
    :class="`cabecalho-pagina--${tamanho}`"
  >
    <nav
      v-if="$slots.trilha"
      class="cabecalho-pagina__trilha"
      :aria-label="ROTULOS_NAVEGACAO.trilha"
    >
      <slot name="trilha" />
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
}

.cabecalho-pagina__descricao {
  max-width: var(--p-dimensao-largura-leitura);
  color: var(--p-cor-texto-secundario);
}

.cabecalho-pagina__detalhes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2) var(--p-espaco-4);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
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

@media (min-width: 640px) {
  .cabecalho-pagina__acoes {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .cabecalho-pagina__acoes :deep(.p-button) {
    width: auto;
  }
}

@media (min-width: 1024px) {
  .cabecalho-pagina__linha {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--p-ritmo-grupo) var(--p-espaco-8);
  }

  .cabecalho-pagina__textos {
    min-width: min(100%, 24rem);
  }

  .cabecalho-pagina__destaque {
    padding-left: var(--p-espaco-7);
    border-left: 1px solid var(--p-cor-borda);
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

  @container cabecalho-pagina (max-width: 54rem) {
    .cabecalho-pagina__destaque {
      padding-left: 0;
      border-left: 0;
    }
  }
}
</style>
