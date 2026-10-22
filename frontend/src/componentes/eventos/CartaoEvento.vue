<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import ContagemRegressiva from '@/componentes/base/ContagemRegressiva.vue'
import NomesAnfitrioes from '@/componentes/base/NomesAnfitrioes.vue'
import { ROTULOS_FASE, VARIANTE_FASE, descreverContagem } from '@/textos/eventos'
import { vocabularioDoTipo } from '@/textos/tiposEvento'
import type { EventoResumoDto } from '@/tipos/eventos'
import { formatarDataCalendarioComDiaSemana, formatarNomesEmFrase } from '@/utilitarios/formatacao'

const props = defineProps<{ evento: EventoResumoDto }>()

const quando = computed(() => {
  const data = formatarDataCalendarioComDiaSemana(props.evento.data)
  return props.evento.horario ? `${data}, ${props.evento.horario}` : data
})

const tipo = computed(() => vocabularioDoTipo(props.evento.tipo).rotulo)

const nomeAcessivel = computed(() =>
  [
    formatarNomesEmFrase(props.evento.nomePrimeiraPessoa, props.evento.nomeSegundaPessoa),
    tipo.value,
    quando.value,
    ROTULOS_FASE[props.evento.fase],
    descreverContagem(props.evento.diasRestantes),
  ].join(', '),
)
</script>

<template>
  <RouterLink
    class="cartao-evento"
    :to="{ name: 'evento', params: { id: evento.id } }"
    :aria-label="nomeAcessivel"
    data-teste="cartao-evento"
  >
    <span class="cartao-evento__quando">
      <span data-teste="tipo-evento">{{ tipo }}</span>
      <span class="numeros-tabulares">{{ quando }}</span>
    </span>
    <NomesAnfitrioes
      class="cartao-evento__nomes"
      :primeiro="evento.nomePrimeiraPessoa"
      :segundo="evento.nomeSegundaPessoa"
      tamanho="cartao"
    />
    <span class="cartao-evento__rodape">
      <BadgeStatus
        :texto="ROTULOS_FASE[evento.fase]"
        :variante="VARIANTE_FASE[evento.fase]"
      />
      <ContagemRegressiva :dias="evento.diasRestantes" />
    </span>
  </RouterLink>
</template>

<style scoped>
.cartao-evento {
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

.cartao-evento:hover {
  border-color: var(--p-cor-borda-campo);
}

.cartao-evento:active {
  background: var(--p-cor-fundo);
}

.cartao-evento__quando {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.cartao-evento__nomes {
  flex: 1;
}

.cartao-evento__rodape {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-espaco-2);
  padding-top: var(--p-espaco-3);
  border-top: 1px solid var(--p-cor-borda);
}
</style>
