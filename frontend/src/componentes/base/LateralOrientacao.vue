<script setup lang="ts">
import LateralDestaque from './LateralDestaque.vue'
import type { ItemOrientacaoAcesso } from './OrientacaoAcesso.vue'

defineProps<{ idTitulo: string; rotulo: string; titulo: string; itens: readonly ItemOrientacaoAcesso[] }>()
</script>

<template>
  <LateralDestaque
    :id-titulo="idTitulo"
    :rotulo="rotulo"
    :titulo="titulo"
  >
    <ul class="lateral-orientacao">
      <li
        v-for="item in itens"
        :key="item.chave"
        class="lateral-orientacao__item"
        :data-teste="item.teste"
      >
        <h3 class="lateral-orientacao__pergunta">
          {{ item.titulo }}
        </h3>
        <p class="lateral-orientacao__texto">
          {{ item.texto }}
        </p>
      </li>
    </ul>
  </LateralDestaque>
</template>

<style scoped>
.lateral-orientacao {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  margin: 0;
  padding: var(--p-ritmo-campo) 0;
  list-style: none;
}

.lateral-orientacao__item {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  padding-inline-start: var(--p-ritmo-grupo);
  border-inline-start: 2px solid var(--tom-viva, var(--p-cor-centelha));
}

.lateral-orientacao__pergunta {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-titulo);
}

.lateral-orientacao__texto {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}
</style>
