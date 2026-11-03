<script setup lang="ts">
import { useInstalacaoPwa } from '@/composables/useInstalacaoPwa'

const { mostrarConvite, podeInstalar, ehIos, instalar, dispensar } = useInstalacaoPwa()
</script>

<template>
  <aside
    v-if="mostrarConvite"
    class="convite-instalacao"
    data-teste="convite-instalacao"
  >
    <p class="convite-instalacao__texto">
      Tenha o evento sempre à mão.
    </p>
    <button
      v-if="podeInstalar"
      type="button"
      class="convite-instalacao__acao"
      @click="instalar"
    >
      Adicionar à tela inicial
    </button>
    <p
      v-else-if="ehIos"
      class="convite-instalacao__dica"
    >
      No iPhone ou iPad: toque em Compartilhar e escolha “Adicionar à Tela de Início”.
    </p>
    <button
      type="button"
      class="convite-instalacao__fechar"
      aria-label="Dispensar convite de instalação"
      @click="dispensar"
    >
      ×
    </button>
  </aside>
</template>

<style scoped>
.convite-instalacao {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-item, 0.75rem);
  width: 100%;
  max-width: var(--p-dimensao-largura-publica);
  padding: var(--p-ritmo-item, 0.75rem) var(--p-ritmo-grupo, 1rem);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda-suave);
  border-radius: var(--p-raio-cartao);
}

.convite-instalacao__texto {
  flex: 1 1 auto;
  margin: 0;
  color: var(--p-cor-texto);
}

.convite-instalacao__dica {
  flex: 1 1 100%;
  margin: 0;
}

.convite-instalacao__acao {
  flex: none;
  padding: 0.4rem 0.9rem;
  font: inherit;
  color: var(--p-cor-primaria-texto, #ffffff);
  background: var(--p-cor-primaria);
  border: 0;
  border-radius: var(--p-raio-controle, 0.5rem);
  cursor: pointer;
}

.convite-instalacao__fechar {
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  font-size: 1.1rem;
  line-height: 1;
  color: var(--p-cor-texto-apoio);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.convite-instalacao__fechar:hover {
  background: var(--p-cor-superficie-contraste, rgba(0, 0, 0, 0.06));
}
</style>
