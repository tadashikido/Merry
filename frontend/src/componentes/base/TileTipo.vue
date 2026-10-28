<script setup lang="ts">
import { computed } from 'vue'

import { classeIcone, type NomeIcone } from '@/design/icones'
import type { TomCelebracao } from '@/design/tokens'
import { ICONE_DO_TOM, classeTom, tomDoTipo } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'

const props = withDefaults(
  defineProps<{ tipo?: TipoEvento | null; tom?: TomCelebracao | null; icone?: NomeIcone; tamanho?: 'padrao' | 'grande' }>(),
  { tipo: null, tom: null, icone: undefined, tamanho: 'padrao' },
)

const tomAplicado = computed<TomCelebracao>(() => props.tom ?? tomDoTipo(props.tipo))
const iconeAplicado = computed<NomeIcone>(() => props.icone ?? ICONE_DO_TOM[tomAplicado.value])
</script>

<template>
  <span
    class="tile-tipo"
    :class="[classeTom(tomAplicado), `tile-tipo--${tamanho}`]"
    :data-tom="tomAplicado"
    aria-hidden="true"
    data-teste="tile-tipo"
  >
    <span :class="classeIcone(iconeAplicado)" />
  </span>
</template>

<style scoped>
.tile-tipo {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: var(--p-dimensao-tile-icone);
  height: var(--p-dimensao-tile-icone);
  font-size: 1.375rem;
  color: var(--tom-tinta);
  background: var(--tom-fundo);
  border-radius: var(--p-raio-tile);
}

.tile-tipo--grande {
  width: var(--p-dimensao-tile-vazio);
  height: var(--p-dimensao-tile-vazio);
  font-size: 1.75rem;
  border-radius: var(--p-raio-painel);
}
</style>
