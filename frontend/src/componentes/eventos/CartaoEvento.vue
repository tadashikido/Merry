<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import ContagemRegressiva from '@/componentes/base/ContagemRegressiva.vue'
import EtiquetaTipo from '@/componentes/base/EtiquetaTipo.vue'
import NomesAnfitrioes from '@/componentes/base/NomesAnfitrioes.vue'
import TileTipo from '@/componentes/base/TileTipo.vue'
import EtiquetaFaseEvento from '@/componentes/eventos/EtiquetaFaseEvento.vue'
import { ROTULOS_FASE, descreverContagem } from '@/textos/eventos'
import { classeTomDoTipo, vocabularioDoTipo } from '@/textos/tiposEvento'
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
    :class="classeTomDoTipo(evento.tipo)"
    :to="{ name: 'evento', params: { id: evento.id } }"
    :aria-label="nomeAcessivel"
    data-teste="cartao-evento"
  >
    <span class="cartao-evento__topo">
      <TileTipo :tipo="evento.tipo" />
      <span class="cartao-evento__quando">
        <span
          class="cartao-evento__tipo"
          data-teste="tipo-evento"
        >
          <EtiquetaTipo :tipo="evento.tipo" />
        </span>
        <span class="cartao-evento__data numeros-tabulares">{{ quando }}</span>
      </span>
    </span>
    <NomesAnfitrioes
      class="cartao-evento__nomes"
      :primeiro="evento.nomePrimeiraPessoa"
      :segundo="evento.nomeSegundaPessoa"
      tamanho="cartao"
    />
    <span class="cartao-evento__rodape">
      <EtiquetaFaseEvento :fase="evento.fase" />
      <ContagemRegressiva :dias="evento.diasRestantes" />
    </span>
  </RouterLink>
</template>

<style scoped>
.cartao-evento {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  height: 100%;
  padding: var(--p-ritmo-cartao);
  overflow: hidden;
  color: var(--p-cor-texto);
  text-decoration: none;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-cartao-evento);
  box-shadow: var(--p-sombra-cartao);
  transition: border-color var(--p-duracao-rapida);
}

.cartao-evento::before {
  position: absolute;
  inset: 0 0 auto;
  height: var(--p-dimensao-filete-tipo);
  content: '';
  background: var(--tom-viva);
}

.cartao-evento:hover {
  border-color: var(--tom-viva);
}

.cartao-evento:active {
  background: var(--p-cor-fundo);
}

.cartao-evento__topo {
  display: flex;
  align-items: center;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.cartao-evento__quando {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--p-ritmo-campo);
  min-width: 0;
}

.cartao-evento__tipo {
  display: inline-flex;
}

.cartao-evento__data {
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
  gap: var(--p-ritmo-campo);
  padding-top: var(--p-ritmo-campo);
  border-top: 1px solid var(--p-cor-borda);
}
</style>
