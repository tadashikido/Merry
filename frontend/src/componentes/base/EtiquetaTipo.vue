<script setup lang="ts">
import { computed } from 'vue'

import { classeIcone } from '@/design/icones'
import type { TomCelebracao } from '@/design/tokens'
import { ROTULOS_NAVEGACAO } from '@/textos/rotulos'
import { ICONE_DO_TOM, classeTom, ehTipoEvento, tomDoTipo, vocabularioDoTipo } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'

const props = withDefaults(
  defineProps<{ tipo?: TipoEvento | null; tom?: TomCelebracao | null; rotulo?: string; comIcone?: boolean }>(),
  { tipo: null, tom: null, rotulo: undefined, comIcone: false },
)

const tomAplicado = computed<TomCelebracao>(() => props.tom ?? tomDoTipo(props.tipo))
const texto = computed(() => props.rotulo ?? (ehTipoEvento(props.tipo) ? vocabularioDoTipo(props.tipo).rotulo : ROTULOS_NAVEGACAO.rotuloEvento))
</script>

<template>
  <span
    class="etiqueta-tipo"
    :class="classeTom(tomAplicado)"
    :data-tom="tomAplicado"
    data-teste="etiqueta-tipo"
  >
    <span
      v-if="comIcone"
      :class="[classeIcone(ICONE_DO_TOM[tomAplicado]), 'etiqueta-tipo__icone']"
      aria-hidden="true"
    />
    {{ texto }}
  </span>
</template>

<style scoped>
.etiqueta-tipo {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  line-height: 1.2;
  color: var(--tom-tinta);
  white-space: nowrap;
  background: var(--tom-fundo);
  border-radius: var(--p-raio-total);
}

.etiqueta-tipo__icone {
  font-size: 0.875rem;
}
</style>
