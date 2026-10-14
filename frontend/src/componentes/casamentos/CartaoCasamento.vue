<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import ContagemRegressiva from '@/componentes/base/ContagemRegressiva.vue'
import NomesCasal from '@/componentes/base/NomesCasal.vue'
import { ROTULOS_FASE, VARIANTE_FASE, descreverContagem } from '@/textos/casamentos'
import type { CasamentoResumoDto } from '@/tipos/casamentos'
import { formatarDataCalendarioComDiaSemana, formatarNomesCasal } from '@/utilitarios/formatacao'

const props = defineProps<{ casamento: CasamentoResumoDto }>()

const quando = computed(() => {
  const data = formatarDataCalendarioComDiaSemana(props.casamento.data)
  return props.casamento.horario ? `${data}, ${props.casamento.horario}` : data
})

const nomeAcessivel = computed(() =>
  [
    formatarNomesCasal(props.casamento.nomePrimeiraPessoa, props.casamento.nomeSegundaPessoa).replace(' & ', ' e '),
    quando.value,
    ROTULOS_FASE[props.casamento.fase],
    descreverContagem(props.casamento.diasRestantes),
  ].join(', '),
)
</script>

<template>
  <RouterLink
    class="cartao-casamento"
    :to="{ name: 'casamento', params: { id: casamento.id } }"
    :aria-label="nomeAcessivel"
    data-teste="cartao-casamento"
  >
    <span class="cartao-casamento__quando numeros-tabulares">{{ quando }}</span>
    <NomesCasal
      class="cartao-casamento__nomes"
      :primeiro="casamento.nomePrimeiraPessoa"
      :segundo="casamento.nomeSegundaPessoa"
      tamanho="cartao"
    />
    <span class="cartao-casamento__rodape">
      <BadgeStatus
        :texto="ROTULOS_FASE[casamento.fase]"
        :variante="VARIANTE_FASE[casamento.fase]"
      />
      <ContagemRegressiva :dias="casamento.diasRestantes" />
    </span>
  </RouterLink>
</template>

<style scoped>
.cartao-casamento {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  height: 100%;
  padding: var(--p-ritmo-cartao);
  color: var(--p-cor-texto);
  text-decoration: none;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.cartao-casamento:hover {
  border-color: var(--p-cor-borda-campo);
}

.cartao-casamento:active {
  background: var(--p-cor-fundo);
}

.cartao-casamento__quando {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.cartao-casamento__nomes {
  flex: 1;
}

.cartao-casamento__rodape {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-espaco-2);
  padding-top: var(--p-espaco-3);
  border-top: 1px solid var(--p-cor-borda);
}
</style>
