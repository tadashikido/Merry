<script setup lang="ts">
import { useId } from 'vue'

import SecaoRecolhivel from '@/componentes/base/SecaoRecolhivel.vue'

withDefaults(
  defineProps<{
    titulo: string
    passos: readonly string[]
    nota?: string | null
    recolhivel?: boolean
  }>(),
  { nota: null, recolhivel: false },
)

const idTitulo = useId()
</script>

<template>
  <section
    class="como-aplicar"
    :aria-labelledby="idTitulo"
    data-teste="como-aplicar-modelo"
  >
    <SecaoRecolhivel :recolhivel="recolhivel">
      <template #titulo>
        <h2
          :id="idTitulo"
          class="como-aplicar__titulo texto-rotulo"
        >
          {{ titulo }}
        </h2>
      </template>
      <ol class="como-aplicar__passos">
        <li
          v-for="(passo, indice) in passos"
          :key="indice"
          class="como-aplicar__passo"
          data-teste="passo-aplicar-modelo"
        >
          <span
            class="como-aplicar__numero numeros-tabulares"
            aria-hidden="true"
          >{{ indice + 1 }}</span>
          <span class="como-aplicar__texto">{{ passo }}</span>
        </li>
      </ol>
      <p
        v-if="nota"
        class="como-aplicar__nota"
        data-teste="nota-aplicar-modelo"
      >
        {{ nota }}
      </p>
    </SecaoRecolhivel>
  </section>
</template>

<style scoped>
.como-aplicar {
  --recolhivel-espaco: var(--p-ritmo-grupo);

  container: como-aplicar / inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  min-width: 0;
  padding-left: var(--p-ritmo-grupo);
  border-left: 2px solid var(--p-cor-primaria);
}

.como-aplicar .como-aplicar__titulo,
.como-aplicar__nota {
  margin: 0;
}

.como-aplicar__passos {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.como-aplicar__passo {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: var(--p-ritmo-campo);
  align-items: baseline;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto);
}

.como-aplicar__numero {
  min-width: 1.25em;
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: 1;
  color: var(--p-cor-primaria);
}

.como-aplicar__nota {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-controle);
  font-style: italic;
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-secundario);
}

@container como-aplicar (min-width: 40rem) {
  .como-aplicar__passos {
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    column-gap: var(--p-ritmo-bloco);
  }
}
</style>
