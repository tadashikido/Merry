<script setup lang="ts">
import { computed } from 'vue'

import CartaoAgora from './CartaoAgora.vue'
import LinhaOperacao from './LinhaOperacao.vue'
import LinhaProximo from './LinhaProximo.vue'
import { TEXTOS_GRANDE_DIA } from '@/textos/grandeDia'
import type { ItemPainelGrandeDia } from '@/tipos/grandeDia'
import { distribuirPainel, LIMITE_DEPOIS, minutosAte } from '@/utilitarios/grandeDia'

const props = withDefaults(
  defineProps<{ itens: ItemPainelGrandeDia[]; minutoAtual: number; prefixo?: string; rotuloMomento?: string | null }>(),
  {
    prefixo: 'painel',
    rotuloMomento: null,
  },
)

defineSlots<{
  contatos?: (escopo: { item: ItemPainelGrandeDia }) => unknown
  acoes?: (escopo: { item: ItemPainelGrandeDia }) => unknown
}>()

const distribuicao = computed(() => distribuirPainel(props.itens))
const depois = computed(() => distribuicao.value.depois.slice(0, LIMITE_DEPOIS))

function quem(item: ItemPainelGrandeDia): string | null {
  const nomes = [item.responsavel, item.fornecedor].filter((valor): valor is string => Boolean(valor))
  return nomes.length > 0 ? nomes.join(' · ') : null
}

const quandoProximo = computed(() => {
  const proximo = distribuicao.value.proximo
  return proximo ? TEXTOS_GRANDE_DIA.emMinutos(minutosAte(proximo, props.minutoAtual)) : ''
})
</script>

<template>
  <div
    class="painel-agora-proximo"
    data-teste="painel-agora-proximo"
  >
    <CartaoAgora
      v-if="distribuicao.principal"
      :id-titulo="`${prefixo}-agora`"
      :inicio="distribuicao.principal.inicio"
      :termino="distribuicao.principal.termino"
      :termina-em-outro-dia="distribuicao.principal.terminaEmOutroDia"
      :atividade="distribuicao.principal.atividade"
      :local="distribuicao.principal.local"
      :responsavel="distribuicao.principal.responsavel"
      :fornecedor="distribuicao.principal.fornecedor"
      :instrucoes="distribuicao.principal.instrucoes"
      :cerimonia="distribuicao.principal.cerimonia"
      :rotulo-momento="rotuloMomento"
    >
      <template
        v-if="$slots.contatos"
        #contatos
      >
        <slot
          name="contatos"
          :item="distribuicao.principal"
        />
      </template>
    </CartaoAgora>

    <section
      v-else
      class="painel-agora-proximo__nada"
      :aria-labelledby="`${prefixo}-agora`"
      data-teste="painel-nada-agora"
    >
      <h2
        :id="`${prefixo}-agora`"
        class="painel-agora-proximo__titulo"
        tabindex="-1"
      >
        {{ TEXTOS_GRANDE_DIA.nadaAgora }}
      </h2>
      <p class="painel-agora-proximo__apoio">
        {{ TEXTOS_GRANDE_DIA.nadaAgoraTexto }}
      </p>
    </section>

    <section
      v-if="distribuicao.tambemAgora.length > 0"
      class="painel-agora-proximo__bloco"
      :aria-labelledby="`${prefixo}-tambem-agora`"
      data-teste="painel-tambem-agora"
    >
      <h2
        :id="`${prefixo}-tambem-agora`"
        class="painel-agora-proximo__titulo"
      >
        {{ TEXTOS_GRANDE_DIA.tambemAgora }}
      </h2>
      <ul class="painel-agora-proximo__lista">
        <LinhaOperacao
          v-for="item in distribuicao.tambemAgora"
          :key="item.chave"
          :inicio="item.inicio"
          :atividade="item.atividade"
          :detalhe="quem(item)"
        >
          <template
            v-if="$slots.acoes"
            #acoes
          >
            <slot
              name="acoes"
              :item="item"
            />
          </template>
        </LinhaOperacao>
      </ul>
    </section>

    <LinhaProximo
      v-if="distribuicao.proximo"
      :id-titulo="`${prefixo}-proximo`"
      :inicio="distribuicao.proximo.inicio"
      :atividade="distribuicao.proximo.atividade"
      :quem="quem(distribuicao.proximo)"
      :quando="quandoProximo"
    />
    <p
      v-else
      class="painel-agora-proximo__apoio"
      data-teste="painel-sem-proximo"
    >
      {{ TEXTOS_GRANDE_DIA.semProximo }}
    </p>

    <section
      v-if="depois.length > 0"
      class="painel-agora-proximo__bloco"
      :aria-labelledby="`${prefixo}-depois`"
      data-teste="painel-depois"
    >
      <h2
        :id="`${prefixo}-depois`"
        class="painel-agora-proximo__titulo"
      >
        {{ TEXTOS_GRANDE_DIA.depois }}
      </h2>
      <ol class="painel-agora-proximo__lista">
        <LinhaOperacao
          v-for="item in depois"
          :key="item.chave"
          :inicio="item.inicio"
          :atividade="item.atividade"
          :detalhe="quem(item)"
        />
      </ol>
    </section>
  </div>
</template>

<style scoped>
.painel-agora-proximo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.painel-agora-proximo__nada {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  padding: var(--p-espaco-4) var(--p-espaco-5);
  background: var(--p-cor-operacao-superficie);
  border-radius: var(--p-raio-folha);
}

.painel-agora-proximo__bloco {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.painel-agora-proximo__titulo {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-operacao-apoio);
}

.painel-agora-proximo__nada .painel-agora-proximo__titulo {
  font-size: var(--p-fonte-tamanho-titulo);
  color: var(--p-cor-operacao-texto);
}

.painel-agora-proximo__apoio {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-operacao-apoio);
}

.painel-agora-proximo__lista {
  margin: 0;
  padding: 0;
}
</style>
