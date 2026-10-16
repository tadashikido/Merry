<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'

defineProps<{
  nome: string
  descricao: string | null
  rota: RouteLocationRaw
  contagem: string
  sugerido: boolean
  rotuloSugerido: string
  acoes: ItemMenuAcoes[]
  rotuloAcoes: string
  rotuloAcessivelAcoes: string
}>()

const emit = defineEmits<{ selecionar: [chave: string] }>()
</script>

<template>
  <article class="cartao-modelo">
    <div class="cartao-modelo__corpo">
      <div class="cartao-modelo__textos">
        <div class="cartao-modelo__topo">
          <h2 class="cartao-modelo__nome">
            <RouterLink
              :to="rota"
              class="cartao-modelo__link"
              data-teste="link-modelo"
            >
              {{ nome }}
            </RouterLink>
          </h2>
          <div class="cartao-modelo__menu">
            <MenuAcoes
              :itens="acoes"
              :rotulo="rotuloAcoes"
              :rotulo-acessivel="rotuloAcessivelAcoes"
              somente-icone
              @selecionar="emit('selecionar', $event)"
            />
          </div>
        </div>
        <p
          v-if="descricao"
          class="cartao-modelo__descricao"
          data-teste="descricao-modelo"
        >
          {{ descricao }}
        </p>
      </div>
      <div class="cartao-modelo__rodape">
        <span class="cartao-modelo__selos">
          <BadgeStatus
            v-if="sugerido"
            :texto="rotuloSugerido"
            variante="informacao"
            icone="informacao"
          />
          <slot name="detalhes" />
        </span>
        <span
          class="cartao-modelo__contagem numeros-tabulares"
          data-teste="contagem-modelo"
        >{{ contagem }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.cartao-modelo {
  container: cartao-modelo / inline-size;
  position: relative;
  height: 100%;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.cartao-modelo:hover {
  border-color: var(--p-cor-borda-campo);
}

.cartao-modelo__corpo {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  height: 100%;
  padding: var(--p-ritmo-cartao);
}

.cartao-modelo__textos {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.cartao-modelo__topo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--p-ritmo-campo);
}

.cartao-modelo__nome {
  min-width: 0;
  margin: 0;
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-regular);
  line-height: var(--p-fonte-entrelinha-titulo);
  overflow-wrap: anywhere;
}

.cartao-modelo__link {
  color: var(--p-cor-texto);
  text-decoration: none;
}

.cartao-modelo__link:hover {
  color: var(--p-cor-texto);
  text-decoration: none;
}

.cartao-modelo__link::after {
  position: absolute;
  inset: 0;
  content: '';
  border-radius: var(--p-raio-painel);
}

.cartao-modelo__link:focus-visible {
  outline: none;
}

.cartao-modelo__link:focus-visible::after {
  outline: var(--p-focus-ring-width) var(--p-focus-ring-style) var(--p-focus-ring-color);
  outline-offset: var(--p-focus-ring-offset);
}

.cartao-modelo__menu {
  position: relative;
  z-index: 1;
  flex: none;
}

.cartao-modelo__descricao {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto-apoio);
  overflow-wrap: anywhere;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}

.cartao-modelo__rodape {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  padding-top: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.cartao-modelo__selos {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo);
}

.cartao-modelo__selos:empty {
  display: none;
}

.cartao-modelo__contagem {
  margin-left: auto;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

@container cartao-modelo (max-width: 17.99rem) {
  .cartao-modelo__corpo {
    padding: var(--p-ritmo-grupo);
  }
}
</style>
