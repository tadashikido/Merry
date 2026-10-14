<script setup lang="ts">
import { computed, useId } from 'vue'

import type { SegmentoProgresso } from './tipos'
import { formatarNumero } from '@/utilitarios/formatacao'

const props = defineProps<{ titulo: string; segmentos: SegmentoProgresso[]; rotuloAcessivel: string; vazio?: string }>()

const idTitulo = `${useId()}-barra-progresso`

const total = computed(() => props.segmentos.reduce((soma, segmento) => soma + Math.max(0, segmento.valor), 0))
const visiveis = computed(() => props.segmentos.filter((segmento) => segmento.valor > 0))

</script>

<template>
  <section
    class="barra-progresso"
    :aria-labelledby="idTitulo"
    data-teste="barra-progresso-envio"
  >
    <h2
      :id="idTitulo"
      class="barra-progresso__titulo"
    >
      {{ titulo }} <span class="barra-progresso__total numeros-tabulares">({{ formatarNumero(total) }})</span>
    </h2>

    <div
      class="barra-progresso__trilho"
      :class="{ 'barra-progresso__trilho--vazio': total === 0 }"
      role="img"
      :aria-label="total === 0 && vazio ? vazio : rotuloAcessivel"
      data-teste="barra-progresso-trilho"
    >
      <span
        v-for="segmento in visiveis"
        :key="segmento.chave"
        class="barra-progresso__segmento"
        :class="`barra-progresso__segmento--${segmento.tom}`"
        :style="{ flexGrow: segmento.valor }"
        :data-teste="`segmento-${segmento.chave}`"
      />
    </div>

    <dl class="barra-progresso__legenda">
      <div
        v-for="segmento in segmentos"
        :key="segmento.chave"
        class="barra-progresso__item"
        :data-teste="`legenda-${segmento.chave}`"
      >
        <dt class="barra-progresso__rotulo">
          <span
            class="barra-progresso__amostra"
            :class="`barra-progresso__segmento--${segmento.tom}`"
            aria-hidden="true"
          />
          {{ segmento.rotulo }}
        </dt>
        <dd class="barra-progresso__valor numeros-tabulares">
          {{ formatarNumero(segmento.valor) }}
        </dd>
      </div>
    </dl>

    <p
      v-if="$slots.rodape"
      class="barra-progresso__rodape"
    >
      <slot name="rodape" />
    </p>
  </section>
</template>

<style scoped>
.barra-progresso {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  padding: var(--p-espaco-5);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.barra-progresso__titulo {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-secao);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.barra-progresso__total {
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto-apoio);
}

.barra-progresso__trilho {
  display: flex;
  gap: 2px;
  height: var(--p-espaco-3);
  overflow: hidden;
  background: var(--p-cor-superficie);
  border-radius: var(--p-raio-total);
}

.barra-progresso__trilho--vazio {
  border: 1px dashed var(--p-cor-borda-campo);
}

.barra-progresso__segmento {
  flex-shrink: 0;
  flex-basis: 0;
  min-width: var(--p-espaco-2);
  height: 100%;
  transition: flex-grow var(--p-duracao-lenta) ease-out;
}

.barra-progresso__segmento--neutro {
  background: var(--p-cor-borda-campo);
}

.barra-progresso__segmento--informacao {
  background: var(--p-cor-informacao);
}

.barra-progresso__segmento--marca {
  background: var(--p-cor-primaria);
}

.barra-progresso__legenda {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--p-espaco-3) var(--p-espaco-4);
  margin: 0;
}

.barra-progresso__item {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.barra-progresso__rotulo {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.barra-progresso__amostra {
  flex: none;
  width: var(--p-espaco-3);
  height: var(--p-espaco-3);
  border-radius: var(--p-raio-tag);
}

.barra-progresso__valor {
  margin: 0;
  padding-left: var(--p-espaco-5);
  font-family: var(--p-fonte-editorial);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.barra-progresso__rodape {
  margin: 0;
  padding-top: var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
  border-top: 1px solid var(--p-cor-borda);
}

@media (min-width: 640px) {
  .barra-progresso__legenda {
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .barra-progresso__segmento {
    transition: none;
  }
}
</style>
