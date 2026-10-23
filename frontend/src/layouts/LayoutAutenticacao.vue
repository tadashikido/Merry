<script setup lang="ts">
import MarcaProduto from '@/componentes/base/MarcaProduto.vue'
import { TEXTOS_AUTENTICACAO_LAYOUT } from '@/textos/autenticacao'
import { tiposEventoEmFrase } from '@/textos/tiposEvento'

withDefaults(defineProps<{ titulo: string; descricao?: string; demonstracao?: boolean }>(), {
  descricao: undefined,
  demonstracao: false,
})

const ID_TITULO = 'autenticacao-titulo'
const TIPOS_ATENDIDOS = TEXTOS_AUTENTICACAO_LAYOUT.tipos(tiposEventoEmFrase())
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
      <MarcaProduto class="layout-autenticacao__marca" />
      <MarcaProduto
        class="layout-autenticacao__logo"
        destaque
      />
      <div class="layout-autenticacao__lema">
        <p class="layout-autenticacao__frase">
          {{ TEXTOS_AUTENTICACAO_LAYOUT.frase }}
        </p>
        <p
          class="layout-autenticacao__tipos"
          data-teste="tipos-atendidos"
        >
          {{ TIPOS_ATENDIDOS }}
        </p>
      </div>
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
      <div
        v-if="$slots.complemento"
        class="layout-autenticacao__complemento"
      >
        <slot name="complemento" />
      </div>
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
  background: var(--p-cor-fundo-anfitriao);
}

.layout-autenticacao--demonstracao {
  min-height: auto;
}

.layout-autenticacao__editorial {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--p-ritmo-grupo) var(--p-ritmo-grupo);
  background: var(--p-cor-superficie);
  border-bottom: 1px solid var(--p-cor-borda);
}

.layout-autenticacao__logo,
.layout-autenticacao__lema {
  display: none;
}

.layout-autenticacao__area {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: var(--p-ritmo-cartao);
  padding: var(--p-ritmo-bloco) var(--p-ritmo-grupo) var(--p-ritmo-secao);
}

.layout-autenticacao__folha {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-cartao);
  width: 100%;
  max-width: var(--p-dimensao-largura-autenticacao);
  padding: var(--p-ritmo-bloco) var(--p-ritmo-cartao);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.layout-autenticacao__lacre {
  display: none;
}

.layout-autenticacao__textos {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.layout-autenticacao__titulo {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
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

.layout-autenticacao__complemento {
  width: 100%;
  max-width: var(--p-dimensao-largura-autenticacao);
}

.layout-autenticacao__rodape {
  max-width: var(--p-dimensao-largura-autenticacao);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
  text-align: center;
}

.layout-autenticacao--demonstracao .layout-autenticacao__lacre {
  display: inline-flex;
}

@media (min-width: 640px) {
  .layout-autenticacao__folha {
    padding: var(--p-ritmo-bloco);
  }

  .layout-autenticacao__titulo {
    font-size: var(--p-fonte-tamanho-pagina);
  }
}

@media (min-width: 1024px) {
  .layout-autenticacao:not(.layout-autenticacao--demonstracao) {
    display: grid;
    grid-template-columns: minmax(24rem, 2fr) 3fr;
  }

  .layout-autenticacao__editorial {
    position: sticky;
    top: 0;
    flex-direction: column;
    gap: var(--p-ritmo-bloco);
    height: 100vh;
    padding: var(--p-ritmo-secao) var(--p-ritmo-bloco);
    border-right: 1px solid var(--p-cor-borda);
    border-bottom: 0;
  }

  .layout-autenticacao__marca {
    display: none;
  }

  .layout-autenticacao__logo {
    display: inline-flex;
  }

  .layout-autenticacao__lema {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--p-ritmo-campo);
  }

  .layout-autenticacao__frase {
    max-width: 20ch;
    font-family: var(--p-fonte-serif);
    text-wrap: balance;
    font-size: var(--p-fonte-tamanho-secao);
    line-height: 1.45;
    color: var(--p-cor-texto-apoio);
    text-align: center;
  }

  .layout-autenticacao__tipos {
    max-width: 26ch;
    font-family: var(--p-fonte-serif);
    font-style: italic;
    text-wrap: balance;
    font-size: var(--p-fonte-tamanho-titulo);
    line-height: var(--p-fonte-entrelinha-leitura);
    color: var(--p-cor-texto-apoio);
    text-align: center;
  }

  .layout-autenticacao__area {
    justify-content: center;
    padding: var(--p-ritmo-secao) var(--p-ritmo-bloco);
  }
}
</style>
