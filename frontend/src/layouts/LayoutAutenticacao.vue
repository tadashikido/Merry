<script setup lang="ts">
import MarcaProduto from '@/componentes/base/MarcaProduto.vue'
import { TEXTOS_AUTENTICACAO_LAYOUT } from '@/textos/autenticacao'

withDefaults(defineProps<{ titulo: string; descricao?: string; demonstracao?: boolean }>(), {
  descricao: undefined,
  demonstracao: false,
})

const ID_TITULO = 'autenticacao-titulo'
</script>

<template>
  <div
    class="layout-autenticacao"
    :class="{ 'layout-autenticacao--demonstracao': demonstracao }"
  >
    <header
      v-if="!demonstracao"
      class="layout-autenticacao__editorial"
    >
      <MarcaProduto
        class="layout-autenticacao__marca"
        tom="claro"
      />
      <p class="layout-autenticacao__frase">
        {{ TEXTOS_AUTENTICACAO_LAYOUT.frase }}
      </p>
    </header>
    <div class="layout-autenticacao__area">
      <component
        :is="demonstracao ? 'div' : 'main'"
        :id="demonstracao ? undefined : 'conteudo-principal'"
        class="layout-autenticacao__folha"
        :aria-labelledby="demonstracao ? undefined : ID_TITULO"
      >
        <span
          class="layout-autenticacao__lacre"
          aria-hidden="true"
          data-teste="lacre"
        >
          <MarcaProduto somente-simbolo />
        </span>
        <div class="layout-autenticacao__textos">
          <component
            :is="demonstracao ? 'p' : 'h1'"
            :id="demonstracao ? undefined : ID_TITULO"
            class="layout-autenticacao__titulo"
            tabindex="-1"
            data-teste="titulo-autenticacao"
          >
            {{ titulo }}
          </component>
          <p
            v-if="descricao"
            class="layout-autenticacao__descricao"
          >
            {{ descricao }}
          </p>
        </div>
        <slot />
      </component>
      <footer
        v-if="$slots.rodape"
        class="layout-autenticacao__rodape"
      >
        <slot name="rodape" />
      </footer>
    </div>
  </div>
</template>

<style scoped>
.layout-autenticacao {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--p-cor-fundo);
}

.layout-autenticacao--demonstracao {
  min-height: auto;
}

.layout-autenticacao__editorial {
  display: flex;
  align-items: center;
  padding: var(--p-espaco-4) var(--p-espaco-5);
  color: var(--p-cor-navegacao-texto);
  background: var(--p-cor-navegacao);
}

.layout-autenticacao__frase {
  display: none;
}

.layout-autenticacao__area {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-6);
  padding: var(--p-espaco-8) var(--p-espaco-4) var(--p-espaco-10);
}

.layout-autenticacao__folha {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
  width: 100%;
  max-width: var(--p-dimensao-largura-autenticacao);
  padding: var(--p-espaco-8) var(--p-espaco-5);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.layout-autenticacao__lacre {
  display: inline-flex;
}

.layout-autenticacao__lacre :deep(.marca__simbolo) {
  width: 2.25rem;
  height: 2.25rem;
}

.layout-autenticacao__textos {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.layout-autenticacao__titulo {
  font-family: var(--p-fonte-editorial);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.layout-autenticacao__titulo:focus {
  outline: none;
}

.layout-autenticacao__descricao {
  color: var(--p-cor-texto-apoio);
}

.layout-autenticacao__folha :deep(.p-button:not(.p-button-text):not(.p-button-link)) {
  width: 100%;
  min-height: var(--p-dimensao-alvo-toque-movel);
}

.layout-autenticacao__rodape {
  max-width: var(--p-dimensao-largura-autenticacao);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
  text-align: center;
}

@media (min-width: 640px) {
  .layout-autenticacao__folha {
    padding: var(--p-espaco-10);
  }

  .layout-autenticacao__titulo {
    font-size: var(--p-fonte-tamanho-pagina);
  }
}

@media (min-width: 1024px) {
  .layout-autenticacao:not(.layout-autenticacao--demonstracao) {
    display: grid;
    grid-template-columns: minmax(22rem, 2fr) 3fr;
  }

  .layout-autenticacao__editorial {
    position: sticky;
    top: 0;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    height: 100vh;
    padding: var(--p-espaco-10) var(--p-espaco-12);
  }

  .layout-autenticacao__marca :deep(.marca__simbolo) {
    width: 2.25rem;
    height: 2.25rem;
  }

  .layout-autenticacao__marca :deep(.marca__nome) {
    font-size: 2rem;
  }

  .layout-autenticacao__frase {
    display: block;
    max-width: 16ch;
    font-family: var(--p-fonte-editorial);
    font-variant-numeric: lining-nums;
    font-size: var(--p-fonte-tamanho-display);
    font-weight: var(--p-fonte-peso-medio);
    line-height: 1.05;
    color: var(--p-cor-navegacao-ativo);
  }

  .layout-autenticacao__area {
    justify-content: center;
    padding: var(--p-espaco-12) var(--p-espaco-10);
  }
}
</style>
