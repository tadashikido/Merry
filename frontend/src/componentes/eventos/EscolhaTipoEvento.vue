<script setup lang="ts">
import { TEXTOS_TIPO_EVENTO, VOCABULARIO_TIPO_EVENTO } from '@/textos/tiposEvento'
import { TIPOS_EVENTO, type TipoEvento } from '@/tipos/eventos'

withDefaults(defineProps<{ idCampo: string; desabilitado?: boolean; erro?: string | null }>(), {
  desabilitado: false,
  erro: null,
})

const modelo = defineModel<TipoEvento>({ required: true })

function idOpcao(idCampo: string, tipo: TipoEvento): string {
  return `${idCampo}-${tipo}`
}
</script>

<template>
  <fieldset
    class="escolha-tipo-evento"
    :aria-describedby="erro ? `${idCampo}-erro` : undefined"
    data-teste="escolha-tipo-evento"
  >
    <legend class="escolha-tipo-evento__legenda texto-rotulo">
      {{ TEXTOS_TIPO_EVENTO.grupo }}
    </legend>
    <div class="escolha-tipo-evento__opcoes">
      <label
        v-for="tipo in TIPOS_EVENTO"
        :key="tipo"
        class="escolha-tipo-evento__opcao"
        :class="{ 'escolha-tipo-evento__opcao--marcada': modelo === tipo }"
        :for="idOpcao(idCampo, tipo)"
      >
        <input
          :id="idOpcao(idCampo, tipo)"
          v-model="modelo"
          class="escolha-tipo-evento__entrada"
          type="radio"
          :name="idCampo"
          :value="tipo"
          :disabled="desabilitado"
          :aria-describedby="`${idOpcao(idCampo, tipo)}-descricao`"
          :data-teste="`tipo-evento-${tipo}`"
        >
        <span class="escolha-tipo-evento__texto">
          <span class="escolha-tipo-evento__rotulo">{{ VOCABULARIO_TIPO_EVENTO[tipo].rotulo }}</span>
          <span
            :id="`${idOpcao(idCampo, tipo)}-descricao`"
            class="escolha-tipo-evento__descricao"
          >{{ VOCABULARIO_TIPO_EVENTO[tipo].descricao }}</span>
        </span>
      </label>
    </div>
    <p
      v-if="erro"
      :id="`${idCampo}-erro`"
      class="escolha-tipo-evento__erro"
      role="alert"
      data-teste="erro-tipo-evento"
    >
      {{ erro }}
    </p>
  </fieldset>
</template>

<style scoped>
.escolha-tipo-evento {
  container-type: inline-size;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.escolha-tipo-evento__legenda {
  padding: 0;
  margin-bottom: var(--p-ritmo-grupo);
}

.escolha-tipo-evento__opcoes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--p-espaco-3);
}

.escolha-tipo-evento__opcao {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: var(--p-espaco-3);
  min-height: var(--p-dimensao-alvo-toque-movel);
  padding: var(--p-espaco-4);
  cursor: pointer;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-controle);
}

.escolha-tipo-evento__opcao--marcada {
  background: var(--p-cor-primaria-suave);
  border-color: var(--p-cor-primaria);
  box-shadow: inset 0 0 0 1px var(--p-cor-primaria);
}

.escolha-tipo-evento__entrada {
  width: var(--p-espaco-5);
  height: var(--p-espaco-5);
  margin: var(--p-espaco-1) 0 0;
  cursor: pointer;
  accent-color: var(--p-cor-primaria);
}

.escolha-tipo-evento__entrada:focus-visible {
  outline: var(--p-focus-ring-width) var(--p-focus-ring-style) var(--p-focus-ring-color);
  outline-offset: var(--p-focus-ring-offset);
}

.escolha-tipo-evento__entrada:disabled,
.escolha-tipo-evento__entrada:disabled + .escolha-tipo-evento__texto {
  cursor: not-allowed;
}

.escolha-tipo-evento__texto {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.escolha-tipo-evento__rotulo {
  font-size: var(--p-fonte-tamanho-corpo);
  font-weight: var(--p-fonte-peso-seminegrito);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
}

.escolha-tipo-evento__opcao--marcada .escolha-tipo-evento__rotulo {
  color: var(--p-cor-primaria-escura);
}

.escolha-tipo-evento__descricao {
  font-size: var(--p-fonte-tamanho-apoio);
  line-height: var(--p-fonte-entrelinha-corpo);
  color: var(--p-cor-texto-apoio);
}

.escolha-tipo-evento__erro {
  margin: var(--p-ritmo-campo) 0 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-erro);
}

@container (min-width: 40rem) {
  .escolha-tipo-evento__opcoes {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
