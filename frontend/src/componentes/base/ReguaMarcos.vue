<script setup lang="ts">
import { useId } from 'vue'

import type { MarcoRegua } from './tipos'

defineProps<{ marcos: MarcoRegua[]; rotulo: string }>()

defineSlots<{ marco(props: { marco: MarcoRegua; idTitulo: string }): unknown }>()

const prefixo = `regua-${useId()}`

function idTitulo(chave: string): string {
  return `${prefixo}-${chave}`
}
</script>

<template>
  <ol
    class="regua"
    :aria-label="rotulo"
    data-teste="regua-marcos"
  >
    <li
      v-for="marco in marcos"
      :key="marco.chave"
      class="regua__marco"
      :class="{ 'regua__marco--concluido': marco.concluido, 'regua__marco--atual': Boolean(marco.destaque) }"
      :data-teste="`marco-${marco.chave}`"
    >
      <div class="regua__cabeca">
        <h2
          :id="idTitulo(marco.chave)"
          class="regua__rotulo"
        >
          <span class="regua__numero">{{ marco.rotulo }}</span>
          <span
            v-if="marco.complemento"
            class="regua__complemento"
          >{{ marco.complemento }}</span>
        </h2>
        <span
          v-if="marco.destaque"
          class="regua__destaque"
          data-teste="regua-destaque"
        >{{ marco.destaque }}</span>
        <span
          v-if="marco.detalhe"
          class="regua__detalhe numeros-tabulares"
        >{{ marco.detalhe }}</span>
      </div>
      <div class="regua__conteudo">
        <span
          class="regua__no"
          aria-hidden="true"
        />
        <slot
          name="marco"
          :marco="marco"
          :id-titulo="idTitulo(marco.chave)"
        />
      </div>
    </li>
  </ol>
</template>

<style scoped>
.regua {
  container: regua / inline-size;
  margin: 0;
  padding: 0;
  list-style: none;
}

.regua__marco {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  padding: 0 0 var(--p-ritmo-cartao) var(--p-ritmo-cartao);
  border-left: 1px solid var(--p-cor-borda);
}

.regua__marco:last-child {
  padding-bottom: 0;
}

.regua__cabeca {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-espaco-1) var(--p-espaco-3);
}

.regua__rotulo {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-ritmo-campo);
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-regular);
}

.regua__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.regua__complemento,
.regua__detalhe {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.regua__conteudo {
  position: static;
  min-width: 0;
}

.regua__no {
  position: absolute;
  top: var(--p-ritmo-campo);
  left: 0;
  width: var(--p-espaco-3);
  height: var(--p-espaco-3);
  background: var(--p-cor-superficie);
  border: 2px solid var(--p-cor-borda-campo);
  border-radius: var(--p-raio-total);
  transform: translateX(-50%);
}

.regua__marco--concluido .regua__no {
  background: var(--p-cor-sucesso);
  border-color: var(--p-cor-sucesso);
}

.regua__destaque {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-controle);
  font-style: italic;
  color: var(--p-cor-acento-texto);
}

.regua__marco--atual .regua__no {
  border-color: var(--p-cor-acento-texto);
  box-shadow: 0 0 0 3px var(--p-cor-superficie), 0 0 0 4px var(--p-cor-acento-texto);
}

@container regua (min-width: 36rem) {
  .regua__marco {
    display: grid;
    grid-template-columns: 9rem minmax(0, 1fr);
    gap: 0;
    padding: 0;
    border-left: 0;
  }

  .regua__cabeca {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--p-espaco-1);
    padding: var(--p-espaco-1) var(--p-ritmo-cartao) var(--p-ritmo-cartao) 0;
  }

  .regua__rotulo {
    flex-direction: column;
    gap: 0;
  }

  .regua__conteudo {
    position: relative;
    padding: 0 0 var(--p-ritmo-cartao) var(--p-ritmo-cartao);
    border-left: 1px solid var(--p-cor-borda);
  }

  .regua__marco:last-child .regua__conteudo {
    padding-bottom: 0;
  }
}
</style>
