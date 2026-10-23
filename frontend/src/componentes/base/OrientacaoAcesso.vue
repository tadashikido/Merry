<script setup lang="ts">
export interface ItemOrientacaoAcesso {
  chave: string
  titulo: string
  texto: string
  teste?: string
}

defineProps<{ idTitulo: string; titulo: string; itens: readonly ItemOrientacaoAcesso[] }>()

defineSlots<{
  acao?: (props: { item: ItemOrientacaoAcesso }) => unknown
  default?: () => unknown
}>()
</script>

<template>
  <aside
    class="orientacao-acesso pilha pilha--grupo"
    :aria-labelledby="idTitulo"
  >
    <h2
      :id="idTitulo"
      class="orientacao-acesso__titulo"
    >
      {{ titulo }}
    </h2>
    <ul class="orientacao-acesso__itens pilha pilha--grupo">
      <li
        v-for="item in itens"
        :key="item.chave"
        class="orientacao-acesso__item"
        :data-teste="item.teste"
      >
        <h3 class="orientacao-acesso__pergunta">
          {{ item.titulo }}
        </h3>
        <p class="orientacao-acesso__texto">
          {{ item.texto }}
        </p>
        <slot
          name="acao"
          :item="item"
        />
      </li>
    </ul>
    <div
      v-if="$slots.default"
      class="orientacao-acesso__nota"
    >
      <slot />
    </div>
  </aside>
</template>

<style scoped>
.orientacao-acesso__titulo {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-regular);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.orientacao-acesso__itens {
  margin: 0;
  padding: 0;
  list-style: none;
}

.orientacao-acesso__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--p-ritmo-campo);
  padding-inline-start: var(--p-ritmo-grupo);
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.orientacao-acesso__pergunta {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
}

.orientacao-acesso__texto,
.orientacao-acesso__nota {
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.orientacao-acesso__nota {
  padding-top: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-borda);
}

.orientacao-acesso__nota :deep(strong) {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.orientacao-acesso__item :slotted(a) {
  font-size: var(--p-fonte-tamanho-controle);
}

@media (pointer: coarse) {
  .orientacao-acesso__item :slotted(a) {
    display: inline-flex;
    align-items: center;
    min-height: var(--p-dimensao-alvo-toque);
  }
}
</style>
