<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

import { useOperadorAutenticacaoStore } from '@/stores/operadorAutenticacao'
import { TEXTOS_OPERADOR } from '@/textos/operador'

const store = useOperadorAutenticacaoStore()
const roteador = useRouter()

onMounted(() => {
  if (!store.operador) {
    void store.carregarOperador()
  }
})

async function sair() {
  await store.sair()
  await roteador.replace({ name: 'operador-entrar' })
}
</script>

<template>
  <main class="operador-area">
    <header class="operador-area__topo">
      <div class="operador-area__identificacao">
        <p class="operador-area__rotulo">
          {{ TEXTOS_OPERADOR.areaTitulo }}
        </p>
        <h1
          v-if="store.operador"
          class="operador-area__titulo"
          data-teste="operador-saudacao"
        >
          {{ TEXTOS_OPERADOR.saudacao(store.operador.nome) }}
        </h1>
      </div>
      <div class="operador-area__acoes">
        <Button
          :label="TEXTOS_OPERADOR.trocarSenha"
          severity="secondary"
          data-teste="operador-trocar-senha"
          @click="roteador.push({ name: 'operador-senha' })"
        />
        <Button
          :label="TEXTOS_OPERADOR.sair"
          severity="secondary"
          data-teste="operador-sair"
          @click="sair"
        />
      </div>
    </header>
    <p class="operador-area__placeholder">
      {{ TEXTOS_OPERADOR.areaPlaceholder }}
    </p>
  </main>
</template>

<style scoped>
.operador-area {
  max-width: 60rem;
  margin-inline: auto;
  padding: 1.5rem;
}

.operador-area__topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.operador-area__rotulo {
  margin: 0;
  color: var(--p-text-muted-color, #64748b);
  font-size: 0.875rem;
}

.operador-area__titulo {
  margin: 0.25rem 0 0;
}

.operador-area__acoes {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.operador-area__placeholder {
  margin-top: 1.5rem;
}
</style>
