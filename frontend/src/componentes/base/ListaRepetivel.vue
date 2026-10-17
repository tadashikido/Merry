<script setup lang="ts" generic="T">
import { computed, nextTick, ref, useId } from 'vue'
import Button from 'primevue/button'

import type { TextosListaRepetivel } from './tipos'

const props = withDefaults(
  defineProps<{
    itens: T[]
    chave: (item: T) => string
    textos: TextosListaRepetivel
    minimo?: number
    maximo: number
    desabilitado?: boolean
  }>(),
  { minimo: 1, desabilitado: false },
)

const emit = defineEmits<{ adicionar: []; remover: [indice: number] }>()

const prefixo = useId()
const anuncio = ref('')
const idBotaoAdicionar = `${prefixo}-adicionar`

const podeAdicionar = computed(() => !props.desabilitado && props.itens.length < props.maximo)
const podeRemover = computed(() => !props.desabilitado && props.itens.length > props.minimo)
const noLimite = computed(() => props.itens.length >= props.maximo)
const noMinimo = computed(() => props.itens.length <= props.minimo)

function idBloco(indice: number): string {
  return `${prefixo}-item-${indice}`
}

function focarPrimeiroCampo(indice: number) {
  const bloco = document.getElementById(idBloco(indice))
  const campo = bloco?.querySelector<HTMLElement>('input, select, textarea, [tabindex]:not([tabindex="-1"])')
  if (campo) {
    campo.focus()
    return
  }
  document.getElementById(idBotaoAdicionar)?.focus()
}

async function adicionar() {
  if (!podeAdicionar.value) {
    return
  }
  emit('adicionar')
  await nextTick()
  const numero = props.itens.length
  anuncio.value = props.textos.adicionado(numero)
  focarPrimeiroCampo(numero - 1)
}

async function remover(indice: number) {
  if (!podeRemover.value) {
    return
  }
  emit('remover', indice)
  await nextTick()
  anuncio.value = props.textos.removido(indice + 1)
  focarPrimeiroCampo(Math.max(0, indice - 1))
}
</script>

<template>
  <div
    class="lista-repetivel"
    data-teste="lista-repetivel"
  >
    <ol class="lista-repetivel__itens">
      <li
        v-for="(item, indice) in itens"
        :id="idBloco(indice)"
        :key="chave(item)"
        class="lista-repetivel__item"
        data-teste="item-repetivel"
      >
        <fieldset class="lista-repetivel__bloco">
          <legend class="lista-repetivel__legenda">
            {{ textos.rotuloItem(indice + 1) }}
          </legend>
          <Button
            v-if="!desabilitado"
            class="lista-repetivel__remover"
            type="button"
            :label="textos.remover"
            :aria-label="`${textos.remover}: ${textos.rotuloItem(indice + 1)}`"
            icon="ie ie-fechar"
            severity="secondary"
            text
            size="small"
            :disabled="!podeRemover"
            data-teste="remover-item"
            @click="remover(indice)"
          />
          <div class="lista-repetivel__conteudo">
            <slot
              :item="item"
              :indice="indice"
              :prefixo="`${prefixo}-${indice}`"
            />
          </div>
        </fieldset>
      </li>
    </ol>

    <div class="lista-repetivel__rodape">
      <Button
        :id="idBotaoAdicionar"
        type="button"
        :label="textos.adicionar"
        icon="ie ie-mais"
        severity="secondary"
        outlined
        :disabled="!podeAdicionar"
        data-teste="adicionar-item"
        @click="adicionar"
      />
      <span
        class="lista-repetivel__contador numeros-tabulares"
        data-teste="contador-itens"
      >{{ textos.contador(itens.length, maximo) }}</span>
    </div>
    <p
      v-if="noLimite && !desabilitado"
      class="lista-repetivel__dica"
      data-teste="dica-limite"
    >
      {{ textos.limiteAtingido }}
    </p>
    <p
      v-else-if="noMinimo && !desabilitado"
      class="lista-repetivel__dica"
      data-teste="dica-minimo"
    >
      {{ textos.minimoAtingido }}
    </p>
    <p
      class="somente-leitor-tela"
      aria-live="polite"
      data-teste="anuncio-lista"
    >
      {{ anuncio }}
    </p>
  </div>
</template>

<style scoped>
.lista-repetivel {
  container: lista-repetivel / inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
}

.lista-repetivel__itens {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.lista-repetivel__bloco {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  min-width: 0;
  margin: 0;
  padding: var(--p-ritmo-grupo);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.lista-repetivel__legenda {
  float: left;
  grid-column: 1;
  width: auto;
  min-width: 0;
  padding: 0;
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.lista-repetivel__remover {
  grid-column: 2;
  justify-self: end;
}

.lista-repetivel__conteudo {
  display: flex;
  grid-column: 1 / -1;
  flex-direction: column;
  gap: var(--p-ritmo-grupo);
  min-width: 0;
}

.lista-repetivel__rodape {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
}

.lista-repetivel__rodape :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

.lista-repetivel__contador,
.lista-repetivel__dica {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.lista-repetivel__dica {
  margin: 0;
}

@container lista-repetivel (max-width: 30rem) {
  .lista-repetivel__rodape :deep(.p-button) {
    width: 100%;
  }
}
</style>
