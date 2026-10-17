<script setup lang="ts">
import MarcaProduto from '@/componentes/base/MarcaProduto.vue'

withDefaults(defineProps<{ demonstracao?: boolean; variante?: 'padrao' | 'convite' | 'operacao'; amplo?: boolean }>(), {
  demonstracao: false,
  variante: 'padrao',
  amplo: false,
})
</script>

<template>
  <div
    class="layout-publico"
    :class="[`layout-publico--${variante}`, { 'tema-operacao': variante === 'operacao', 'layout-publico--amplo': amplo }]"
  >
    <header
      v-if="variante === 'padrao'"
      class="layout-publico__cabecalho"
    >
      <slot name="marca">
        <MarcaProduto somente-simbolo />
      </slot>
    </header>
    <component
      :is="demonstracao ? 'div' : 'main'"
      :id="demonstracao ? undefined : 'conteudo-principal'"
      class="layout-publico__folha"
    >
      <slot />
    </component>
    <footer
      v-if="$slots.rodape"
      class="layout-publico__rodape"
    >
      <slot name="rodape" />
    </footer>
  </div>
</template>

<style scoped>
.layout-publico {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-ritmo-cartao);
  min-height: 100vh;
  padding: var(--p-ritmo-cartao) var(--p-ritmo-grupo) var(--p-ritmo-bloco);
  background: var(--p-cor-fundo-casal);
}

.layout-publico__cabecalho {
  display: flex;
  justify-content: center;
}

.layout-publico__folha {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-cartao);
  width: 100%;
  max-width: var(--p-dimensao-largura-publica);
  padding: var(--p-ritmo-bloco) var(--p-ritmo-cartao);
  font-size: var(--p-fonte-tamanho-corpo);
  line-height: var(--p-fonte-entrelinha-corpo);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-folha);
}

.layout-publico__folha :deep(h1) {
  font-size: var(--p-fonte-tamanho-pagina);
  text-align: center;
}

.layout-publico__folha :deep(.p-button) {
  width: 100%;
  min-height: var(--p-dimensao-alvo-toque-movel);
}

.layout-publico__rodape {
  max-width: var(--p-dimensao-largura-publica);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
  text-align: center;
}

.layout-publico--convite {
  gap: var(--p-ritmo-cartao);
  padding: var(--p-ritmo-grupo) var(--p-ritmo-grupo) var(--p-ritmo-bloco);
  color: var(--p-cor-texto);
  background: var(--p-cor-fundo-convite);
}

.layout-publico--convite .layout-publico__folha {
  max-width: var(--p-dimensao-largura-convite);
  padding: 0;
  font-size: var(--p-fonte-tamanho-corpo);
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.layout-publico--convite.layout-publico--amplo .layout-publico__folha {
  max-width: calc(var(--p-dimensao-largura-convite) * 2 + var(--p-ritmo-secao));
}

.layout-publico--convite .layout-publico__rodape {
  max-width: var(--p-dimensao-largura-convite);
  color: var(--p-cor-apoio-quente);
}

.layout-publico--convite .layout-publico__rodape :deep(a) {
  color: var(--p-cor-primaria);
}

.layout-publico--operacao {
  gap: var(--p-ritmo-cartao);
  padding: var(--p-ritmo-cartao) var(--p-ritmo-grupo) var(--p-ritmo-bloco);
  color: var(--p-cor-operacao-texto);
  background: var(--p-cor-operacao-fundo);
}

.layout-publico--operacao .layout-publico__folha {
  max-width: var(--p-dimensao-largura-convite);
  padding: 0;
  font-size: var(--p-fonte-tamanho-corpo);
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.layout-publico--operacao.layout-publico--amplo .layout-publico__folha {
  max-width: var(--p-dimensao-largura-ampla);
}

.layout-publico--operacao .layout-publico__folha :deep(h1) {
  font-size: var(--p-fonte-tamanho-pagina-celular);
  text-align: left;
}

.layout-publico--operacao .layout-publico__rodape {
  max-width: var(--p-dimensao-largura-convite);
  color: var(--p-cor-operacao-apoio);
}

@media (min-width: 640px) {
  .layout-publico {
    padding-top: var(--p-ritmo-secao);
  }

  .layout-publico--operacao,
  .layout-publico--convite {
    padding-top: var(--p-ritmo-bloco);
  }

  .layout-publico__folha {
    padding: var(--p-ritmo-bloco);
  }

  .layout-publico__folha :deep(h1) {
    font-size: var(--p-fonte-tamanho-display);
  }
}
</style>
