<script setup lang="ts">
withDefaults(
  defineProps<{
    titulo: string
    prazoRelativo: string
    metadados?: string[]
    descricao?: string | null
  }>(),
  { metadados: () => [], descricao: null },
)
</script>

<template>
  <li
    class="item-modelo"
    data-teste="item-modelo-checklist"
  >
    <div class="item-modelo__conteudo">
      <span
        class="item-modelo__titulo"
        data-teste="titulo-item-modelo"
      >{{ titulo }}</span>
      <p class="item-modelo__metadados">
        <span
          class="item-modelo__prazo numeros-tabulares"
          data-teste="prazo-item-modelo"
        >{{ prazoRelativo }}</span>
        <span
          v-for="(metadado, indice) in metadados"
          :key="indice"
          class="item-modelo__metadado"
        >{{ metadado }}</span>
      </p>
      <p
        v-if="descricao"
        class="item-modelo__descricao"
      >
        {{ descricao }}
      </p>
    </div>
    <div
      v-if="$slots.acoes"
      class="item-modelo__acoes"
    >
      <slot name="acoes" />
    </div>
  </li>
</template>

<style scoped>
.item-modelo {
  display: flex;
  align-items: flex-start;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-3) var(--p-espaco-2);
  list-style: none;
}

.item-modelo + .item-modelo {
  border-top: 1px solid var(--p-cor-divisoria);
}

.item-modelo__conteudo {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.item-modelo__titulo {
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.item-modelo__metadados {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-1) var(--p-espaco-3);
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.item-modelo__prazo {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-primaria);
}

.item-modelo__descricao {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
  overflow-wrap: anywhere;
}

.item-modelo__acoes {
  flex: none;
}
</style>
