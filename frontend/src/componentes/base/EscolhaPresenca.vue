<script setup lang="ts">
import { computed, useId } from 'vue'

import { TEXTOS_RSVP } from '@/textos/rsvp'
import type { EscolhaPresencaRsvp } from '@/tipos/rsvp'

const props = withDefaults(
  defineProps<{
    nome: string
    marcador?: string | null
    desabilitado?: boolean
    erro?: string | null
    idGrupo?: string
  }>(),
  { marcador: null, desabilitado: false, erro: null, idGrupo: undefined },
)

const escolha = defineModel<EscolhaPresencaRsvp | null>({ required: true })

const prefixo = useId()
const identificador = computed(() => props.idGrupo ?? `${prefixo}-grupo`)
const idErro = computed(() => `${identificador.value}-erro`)

const opcoes: { valor: EscolhaPresencaRsvp; rotulo: string; icone: string }[] = [
  { valor: 'Confirmado', rotulo: TEXTOS_RSVP.vou, icone: 'ie ie-concluir' },
  { valor: 'Recusado', rotulo: TEXTOS_RSVP.naoVou, icone: 'ie ie-fechar' },
]
</script>

<template>
  <div
    class="escolha-presenca"
    :class="{ 'escolha-presenca--invalida': Boolean(erro) }"
    data-teste="escolha-presenca"
  >
    <p
      class="escolha-presenca__nome"
      aria-hidden="true"
    >
      <span>{{ nome }}</span>
      <span
        v-if="marcador"
        class="escolha-presenca__marcador"
      >{{ marcador }}</span>
    </p>
    <div
      :id="identificador"
      class="escolha-presenca__opcoes"
      role="radiogroup"
      :aria-label="TEXTOS_RSVP.grupoAcessivel(nome)"
      :aria-invalid="Boolean(erro) || undefined"
      :aria-describedby="erro ? idErro : undefined"
      tabindex="-1"
    >
      <label
        v-for="opcao in opcoes"
        :key="opcao.valor"
        class="escolha-presenca__opcao"
        :class="[
          `escolha-presenca__opcao--${opcao.valor === 'Confirmado' ? 'vou' : 'nao-vou'}`,
          { 'escolha-presenca__opcao--marcada': escolha === opcao.valor },
        ]"
        :data-teste="`opcao-${opcao.valor}`"
      >
        <input
          v-model="escolha"
          class="escolha-presenca__entrada"
          type="radio"
          :name="identificador"
          :value="opcao.valor"
          :disabled="desabilitado"
        >
        <span
          :class="['escolha-presenca__icone', opcao.icone]"
          aria-hidden="true"
        />
        <span>{{ opcao.rotulo }}</span>
      </label>
    </div>
    <p
      v-if="erro"
      :id="idErro"
      class="escolha-presenca__erro"
      data-teste="erro-escolha"
    >
      {{ erro }}
    </p>
    <div
      v-if="$slots.default"
      class="escolha-presenca__extra"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.escolha-presenca {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
  padding: var(--p-espaco-4) 0;
}

.escolha-presenca__nome {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.escolha-presenca__marcador {
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-apoio-quente);
}

.escolha-presenca__opcoes {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-espaco-3);
}

.escolha-presenca__opcoes:focus {
  outline: none;
}

.escolha-presenca__opcao {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--p-espaco-4);
  min-height: var(--p-dimensao-alvo-presenca);
  padding: 0 var(--p-espaco-5);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
  cursor: pointer;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-controle-quente);
  border-radius: 12px;
  transition:
    background-color var(--p-duracao-rapida),
    border-color var(--p-duracao-rapida);
}

.escolha-presenca__opcao:hover {
  border-color: var(--p-cor-primaria);
}

.escolha-presenca__entrada {
  position: absolute;
  inset: 0;
  margin: 0;
  cursor: pointer;
  opacity: 0;
}

.escolha-presenca__entrada:disabled {
  cursor: not-allowed;
}

.escolha-presenca__opcao:has(.escolha-presenca__entrada:focus-visible) {
  outline: var(--p-focus-ring-width) var(--p-focus-ring-style) var(--p-focus-ring-color);
  outline-offset: var(--p-focus-ring-offset);
}

.escolha-presenca__icone {
  font-size: 1.25rem;
  color: var(--p-cor-apoio-quente);
}

.escolha-presenca__opcao--vou .escolha-presenca__icone {
  color: var(--p-cor-primaria);
}

.escolha-presenca__opcao--marcada {
  font-weight: var(--p-fonte-peso-seminegrito);
}

.escolha-presenca__opcao--vou.escolha-presenca__opcao--marcada {
  color: var(--p-cor-primaria);
  background: var(--p-cor-primaria-suave);
  border: 1.5px solid var(--p-cor-primaria);
}

.escolha-presenca__opcao--nao-vou.escolha-presenca__opcao--marcada {
  background: var(--p-cor-neutro-suave);
  border: 1.5px solid var(--p-cor-neutro);
}

.escolha-presenca--invalida .escolha-presenca__opcao {
  border-color: var(--p-cor-erro);
}

.escolha-presenca__erro {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-erro);
}

.escolha-presenca__extra:empty {
  display: none;
}
</style>
