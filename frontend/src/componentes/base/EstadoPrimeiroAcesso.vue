<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'

import type { PassoPrimeiroAcesso } from './tipos'

const props = defineProps<{ titulo: string; descricao: string; passos: PassoPrimeiroAcesso[]; rotuloAcao: string }>()

const emit = defineEmits<{ continuar: [] }>()

const indiceAtual = computed(() => props.passos.findIndex((passo) => !passo.concluido))
</script>

<template>
  <section
    class="primeiro-acesso"
    aria-labelledby="primeiro-acesso-titulo"
    data-teste="estado-primeiro-acesso"
  >
    <h2
      id="primeiro-acesso-titulo"
      class="primeiro-acesso__titulo"
    >
      {{ titulo }}
    </h2>
    <p class="primeiro-acesso__descricao">
      {{ descricao }}
    </p>
    <ol class="primeiro-acesso__passos">
      <li
        v-for="(passo, indice) in passos"
        :key="passo.chave"
        class="primeiro-acesso__passo"
        :class="{
          'primeiro-acesso__passo--concluido': passo.concluido,
          'primeiro-acesso__passo--atual': indice === indiceAtual,
        }"
        :aria-current="indice === indiceAtual ? 'step' : undefined"
        data-teste="passo-primeiro-acesso"
      >
        <span
          class="primeiro-acesso__marcador"
          aria-hidden="true"
        >
          <span
            v-if="passo.concluido"
            class="ie ie-concluir"
          />
          <template v-else>{{ indice + 1 }}</template>
        </span>
        <span>{{ passo.rotulo }}</span>
      </li>
    </ol>
    <Button
      class="primeiro-acesso__acao"
      :label="rotuloAcao"
      data-teste="primeiro-acesso-continuar"
      @click="emit('continuar')"
    />
  </section>
</template>

<style scoped>
.primeiro-acesso {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  max-width: 30rem;
  padding: var(--p-espaco-7);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.primeiro-acesso .primeiro-acesso__titulo {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: 1.625rem;
  font-weight: var(--p-fonte-peso-medio);
  line-height: 1.15;
}

.primeiro-acesso__descricao {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.primeiro-acesso__passos {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  margin: var(--p-espaco-1) 0 var(--p-espaco-2);
  padding: 0;
  list-style: none;
}

.primeiro-acesso__passo {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.primeiro-acesso__marcador {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  height: 1.375rem;
  font-size: var(--p-fonte-tamanho-rotulo);
  border: 1px solid var(--p-cor-borda-controle);
  border-radius: var(--p-raio-total);
}

.primeiro-acesso__passo--concluido {
  color: var(--p-cor-texto-apoio);
  text-decoration: line-through;
}

.primeiro-acesso__passo--concluido .primeiro-acesso__marcador {
  color: var(--p-cor-superficie);
  background: var(--p-cor-primaria);
  border-color: var(--p-cor-primaria);
}

.primeiro-acesso__passo--atual {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.primeiro-acesso__passo--atual .primeiro-acesso__marcador {
  font-weight: var(--p-fonte-peso-negrito);
  color: var(--p-cor-primaria);
  border: 1.5px solid var(--p-cor-primaria);
}

.primeiro-acesso__acao {
  align-self: flex-start;
}
</style>
