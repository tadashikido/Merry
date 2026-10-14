<script setup lang="ts">
import type { NomeIcone } from '@/design/icones'

withDefaults(defineProps<{ titulo: string; descricao?: string; icone?: NomeIcone }>(), {
  descricao: undefined,
  icone: 'arquivar',
})
</script>

<template>
  <section
    class="estado-vazio"
    data-teste="estado-vazio"
  >
    <span
      class="estado-vazio__circulo"
      aria-hidden="true"
    >
      <span :class="['ie', `ie-${icone}`]" />
    </span>
    <h2 class="estado-vazio__titulo">
      {{ titulo }}
    </h2>
    <p
      v-if="descricao"
      class="estado-vazio__descricao"
    >
      {{ descricao }}
    </p>
    <div
      v-if="$slots.acao"
      class="estado-vazio__acao"
    >
      <slot name="acao" />
    </div>
  </section>
</template>

<style scoped>
.estado-vazio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-12) var(--p-espaco-6);
  text-align: center;
}

.estado-vazio__circulo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  font-size: 1.25rem;
  color: var(--p-cor-primaria);
  background: var(--p-cor-salvia);
  border-radius: var(--p-raio-total);
}

.estado-vazio .estado-vazio__titulo {
  font-size: var(--p-fonte-tamanho-titulo);
  line-height: 1.35;
}

.estado-vazio__descricao {
  max-width: 28rem;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: 1.55;
  color: var(--p-cor-texto-secundario);
}

.estado-vazio__acao {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-2);
  margin-top: var(--p-espaco-2);
}
</style>
