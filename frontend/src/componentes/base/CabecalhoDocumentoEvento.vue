<script setup lang="ts">
import EtiquetaTipo from '@/componentes/base/EtiquetaTipo.vue'
import type { CabecalhoFichaEvento } from '@/utilitarios/fichaBuffet'

defineProps<{
  documento: string
  gerado: string
  nomes: string
  cabecalho: CabecalhoFichaEvento | null
  rotuloDetalhes: string
  prefixoTeste: string
  aviso?: string
}>()
</script>

<template>
  <header class="cabecalho-documento pilha pilha--grupo">
    <div class="cabecalho-documento__documento">
      <p class="cabecalho-documento__nome">
        {{ documento }}
      </p>
      <p class="cabecalho-documento__gerado texto-legenda">
        {{ gerado }}
      </p>
    </div>
    <div class="cabecalho-documento__identificacao pilha pilha--campo">
      <EtiquetaTipo
        v-if="cabecalho?.tipoRotulo"
        class="cabecalho-documento__tipo"
        :tipo="cabecalho.tipo"
        :rotulo="cabecalho.tipoRotulo"
        com-icone
        :data-teste="`${prefixoTeste}-tipo`"
      />
      <h1 class="cabecalho-documento__anfitriao">
        {{ nomes }}
      </h1>
    </div>
    <dl
      v-if="cabecalho"
      class="cabecalho-documento__detalhes"
      :aria-label="rotuloDetalhes"
      :data-teste="`${prefixoTeste}-detalhes`"
    >
      <div
        v-for="detalhe in cabecalho.detalhes"
        :key="detalhe.chave"
        class="cabecalho-documento__detalhe"
        :data-teste="`${prefixoTeste}-detalhe-${detalhe.chave}`"
      >
        <dt>{{ detalhe.rotulo }}</dt>
        <dd class="numeros-tabulares">
          {{ detalhe.valor }}
        </dd>
      </div>
    </dl>
    <p
      v-if="aviso"
      class="cabecalho-documento__aviso"
      role="note"
      :data-teste="`${prefixoTeste}-aviso`"
    >
      {{ aviso }}
    </p>
  </header>
</template>

<style scoped>
.cabecalho-documento {
  container: cabecalho-documento / inline-size;
  padding-bottom: var(--p-ritmo-cartao);
  border-bottom: 1px solid var(--p-cor-texto);
}

.cabecalho-documento__documento {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  padding-bottom: var(--p-ritmo-campo);
  border-bottom: 1px solid var(--p-cor-divisoria);
}

.cabecalho-documento__nome {
  margin: 0;
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.cabecalho-documento__gerado {
  margin: 0;
  font-variant-numeric: lining-nums tabular-nums;
}

.cabecalho-documento__identificacao {
  min-width: 0;
}

.cabecalho-documento__tipo {
  align-self: flex-start;
}

.cabecalho-documento__anfitriao {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  letter-spacing: var(--p-fonte-espacamento-letras-display);
  overflow-wrap: anywhere;
}

.cabecalho-documento__detalhes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-campo) var(--p-ritmo-cartao);
  margin: 0;
}

.cabecalho-documento__detalhe {
  display: block;
  min-width: 0;
}

.cabecalho-documento__detalhe dt {
  font-size: var(--p-fonte-tamanho-rotulo);
  font-weight: var(--p-fonte-peso-negrito);
  letter-spacing: var(--p-fonte-espacamento-letras-rotulo);
  text-transform: uppercase;
  color: var(--p-cor-texto-apoio);
}

.cabecalho-documento__detalhe dd {
  margin: 0;
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.cabecalho-documento__aviso {
  margin: 0;
  padding-top: var(--p-ritmo-campo);
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-apoio);
  font-style: italic;
  line-height: var(--p-fonte-entrelinha-leitura);
  color: var(--p-cor-texto);
  border-top: 1px dotted var(--p-cor-borda-campo);
}

@container cabecalho-documento (min-width: 36rem) {
  .cabecalho-documento__anfitriao {
    font-size: var(--p-fonte-tamanho-pagina);
  }

  .cabecalho-documento__detalhes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media print {
  .cabecalho-documento {
    break-inside: avoid;
  }

  .cabecalho-documento__anfitriao {
    font-size: var(--p-fonte-tamanho-pagina-celular);
  }

  .cabecalho-documento__detalhes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cabecalho-documento__tipo {
    color: var(--p-cor-texto);
    background: none;
    border: 1px solid var(--p-cor-texto);
  }

  .cabecalho-documento__anfitriao,
  .cabecalho-documento__gerado,
  .cabecalho-documento__detalhe dt {
    color: var(--p-cor-texto);
  }

  .cabecalho-documento__aviso {
    border-top-color: var(--p-cor-texto-apoio);
  }
}
</style>
