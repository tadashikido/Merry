<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'

import LayoutPublico from '@/layouts/LayoutPublico.vue'
import LacreIcone from '@/componentes/base/LacreIcone.vue'
import { TEXTOS_NAO_ENCONTRADO } from '@/textos/naoEncontrado'
</script>

<template>
  <LayoutPublico>
    <section
      class="nao-encontrado pilha pilha--bloco"
      aria-labelledby="nao-encontrado-titulo"
    >
      <div class="pilha pilha--grupo nao-encontrado__mensagem">
        <LacreIcone
          icone="ie-busca"
          data-teste="lacre-nao-encontrado"
        />
        <h1 id="nao-encontrado-titulo">
          {{ TEXTOS_NAO_ENCONTRADO.titulo }}
        </h1>
        <div class="pilha pilha--campo nao-encontrado__textos">
          <p class="nao-encontrado__explicacao texto-destaque">
            {{ TEXTOS_NAO_ENCONTRADO.explicacao }}
          </p>
          <p
            class="nao-encontrado__dica texto-legenda"
            data-teste="dica-nao-encontrado"
          >
            {{ TEXTOS_NAO_ENCONTRADO.dica }}
          </p>
        </div>
      </div>
      <Button
        :as="RouterLink"
        :to="{ name: 'inicio' }"
        :label="TEXTOS_NAO_ENCONTRADO.voltar"
        class="nao-encontrado__voltar"
        data-teste="voltar-inicio"
      />
    </section>
  </LayoutPublico>
</template>

<style scoped>
.nao-encontrado {
  text-align: center;
}

.nao-encontrado__mensagem,
.nao-encontrado__textos {
  align-items: center;
}

.nao-encontrado__explicacao {
  text-wrap: balance;
}

.nao-encontrado__dica {
  max-width: 36ch;
  text-wrap: pretty;
}

.nao-encontrado__voltar {
  text-decoration: none;
}
</style>
