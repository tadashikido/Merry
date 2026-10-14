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
      :class="{ 'regua__marco--concluido': marco.concluido }"
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
  margin: 0;
  padding: 0;
  list-style: none;
}

.regua__marco {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  padding: 0 0 var(--p-espaco-6) var(--p-espaco-6);
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
  gap: var(--p-espaco-2);
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-regular);
}

.regua__numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-medio);
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
  top: var(--p-espaco-2);
  left: 0;
  width: var(--p-espaco-3);
  height: var(--p-espaco-3);
  background: var(--p-cor-superficie);
  border: 2px solid var(--p-cor-borda-campo);
  border-radius: var(--p-raio-total);
  transform: translateX(-50%);
}

.regua__marco--concluido .regua__no {
  background: var(--p-cor-primaria);
  border-color: var(--p-cor-primaria);
}

@media (min-width: 640px) {
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
    padding: var(--p-espaco-1) var(--p-espaco-5) var(--p-espaco-6) 0;
  }

  .regua__rotulo {
    flex-direction: column;
    gap: 0;
  }

  .regua__conteudo {
    position: relative;
    padding: 0 0 var(--p-espaco-6) var(--p-espaco-6);
    border-left: 1px solid var(--p-cor-borda);
  }

  .regua__marco:last-child .regua__conteudo {
    padding-bottom: 0;
  }
}
</style>
