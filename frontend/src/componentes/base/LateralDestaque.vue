<script setup lang="ts">
withDefaults(defineProps<{ rotulo: string; titulo: string; descricao?: string; elemento?: 'aside' | 'section'; idTitulo?: string }>(), {
  descricao: undefined,
  elemento: 'aside',
  idTitulo: undefined,
})
</script>

<template>
  <component
    :is="elemento"
    class="lateral-destaque"
    :aria-labelledby="idTitulo"
    data-teste="lateral-destaque"
  >
    <header class="lateral-destaque__cabecalho">
      <span class="lateral-destaque__rotulo">{{ rotulo }}</span>
      <h2
        :id="idTitulo"
        class="lateral-destaque__titulo"
      >
        <slot name="titulo">
          {{ titulo }}
        </slot>
      </h2>
      <p
        v-if="descricao || $slots.descricao"
        class="lateral-destaque__descricao"
      >
        <slot name="descricao">
          {{ descricao }}
        </slot>
      </p>
    </header>
    <div
      v-if="$slots.default"
      class="lateral-destaque__corpo"
    >
      <slot />
    </div>
    <footer
      v-if="$slots.rodape"
      class="lateral-destaque__rodape"
    >
      <slot name="rodape" />
    </footer>
  </component>
</template>

<style scoped>
.lateral-destaque {
  overflow: hidden;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-cartao-amplo);
  box-shadow: var(--p-sombra-cartao);
}

.lateral-destaque__cabecalho {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: var(--p-espaco-5) var(--p-ritmo-cartao);
  color: var(--p-cor-lateral-escura-texto);
  background: var(--p-cor-lateral-escura);
}

.lateral-destaque__rotulo {
  font-size: var(--p-fonte-tamanho-rotulo-navegacao);
  font-weight: var(--p-fonte-peso-negrito);
  letter-spacing: var(--p-fonte-espacamento-letras-rotulo);
  text-transform: uppercase;
  color: var(--p-cor-centelha);
}

.lateral-destaque .lateral-destaque__titulo {
  font-size: 1.375rem;
  font-style: italic;
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-lateral-escura-texto);
}

.lateral-destaque__descricao {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-lateral-escura-apoio);
}

.lateral-destaque__corpo {
  padding: var(--p-espaco-3) var(--p-ritmo-cartao);
}

.lateral-destaque__rodape {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-1) var(--p-ritmo-cartao) var(--p-ritmo-cartao);
}
</style>
