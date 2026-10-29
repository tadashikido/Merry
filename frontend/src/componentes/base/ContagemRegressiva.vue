<script setup lang="ts">
import { computed } from 'vue'

import { descreverContagem, descreverContagemAcessivel, legendaContagemDestaque, REFERENCIA_EVENTO_GENERICA } from '@/textos/eventos'

const props = withDefaults(
  defineProps<{ dias: number; variante?: 'compacta' | 'tabela' | 'destaque' | 'cabecalho'; referencia?: string }>(),
  {
    variante: 'compacta',
    referencia: REFERENCIA_EVENTO_GENERICA,
  },
)

const futuro = computed(() => props.dias > 0)
const texto = computed(() => descreverContagem(props.dias))
const textoAcessivel = computed(() => descreverContagemAcessivel(props.dias, props.referencia))
const numero = computed(() => props.dias.toLocaleString('pt-BR'))
const partesTabela = computed(() =>
  texto.value
    .split(/(\d[\d.]*)/)
    .filter((parte) => parte !== '')
    .map((parte) => ({ texto: parte, numero: /^\d/.test(parte) })),
)
</script>

<template>
  <span
    v-if="variante === 'compacta'"
    class="contagem contagem--compacta numeros-tabulares"
    :class="{ 'contagem--passado': dias < 0 }"
    data-teste="contagem-regressiva"
  >{{ texto }}</span>

  <span
    v-else-if="variante === 'tabela'"
    class="contagem contagem--tabela numeros-tabulares"
    :class="{ 'contagem--passado': dias < 0 }"
    data-teste="contagem-regressiva"
  ><template
    v-for="(parte, indice) in partesTabela"
    :key="indice"
  ><strong
    v-if="parte.numero"
    class="contagem__numero-tabela"
  >{{ parte.texto }}</strong><template v-else>{{ parte.texto }}</template></template></span>

  <div
    v-else
    class="contagem"
    :class="[`contagem--${variante}`, { 'contagem--passado': dias < 0 }]"
    role="group"
    :aria-label="textoAcessivel"
    data-teste="contagem-regressiva"
  >
    <template v-if="futuro">
      <span
        class="contagem__numero numeros-tabulares"
        aria-hidden="true"
      >{{ numero }}</span>
      <span
        class="contagem__legenda"
        aria-hidden="true"
      >{{ legendaContagemDestaque(dias, referencia) }}</span>
    </template>
    <span
      v-else
      class="contagem__frase"
      aria-hidden="true"
    >{{ texto }}</span>
    <div
      v-if="$slots.default"
      class="contagem__complemento"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.contagem--compacta {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  white-space: nowrap;
}

.contagem--compacta.contagem--passado {
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto-apoio);
}

.contagem--tabela {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
  white-space: nowrap;
}

.contagem__numero-tabela {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-titulo);
}

.contagem--destaque {
  container: contagem / inline-size;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-1);
  padding: var(--p-espaco-8) var(--p-espaco-6);
  text-align: center;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.contagem--cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-espaco-2);
}

.contagem__numero {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-display);
  font-weight: var(--p-fonte-peso-medio);
  line-height: 1;
  color: var(--p-cor-primaria);
}

.contagem__legenda {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.contagem__frase {
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-pagina-celular);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
}

.contagem--passado .contagem__frase {
  color: var(--p-cor-texto-apoio);
}

.contagem__complemento {
  margin-top: var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

@container contagem (min-width: 22rem) {
  .contagem--destaque .contagem__frase {
    font-size: var(--p-fonte-tamanho-pagina);
  }
}
</style>
