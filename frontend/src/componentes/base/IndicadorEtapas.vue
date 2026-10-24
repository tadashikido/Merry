<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ etapas: readonly string[]; atual: number; rotulo: string }>()

const indiceAtual = computed(() => Math.min(Math.max(props.atual, 0), props.etapas.length - 1))
const resumoCompacto = computed(
  () => `Etapa ${indiceAtual.value + 1} de ${props.etapas.length}: ${props.etapas[indiceAtual.value] ?? ''}`,
)

function situacao(indice: number): 'concluida' | 'atual' | 'futura' {
  if (indice < indiceAtual.value) {
    return 'concluida'
  }
  return indice === indiceAtual.value ? 'atual' : 'futura'
}
</script>

<template>
  <nav
    class="indicador-etapas"
    :aria-label="rotulo"
    data-teste="indicador-etapas"
  >
    <p
      class="indicador-etapas__compacto"
      aria-hidden="true"
    >
      {{ resumoCompacto }}
    </p>
    <ol class="indicador-etapas__lista">
      <li
        v-for="(etapa, indice) in etapas"
        :key="etapa"
        class="indicador-etapas__etapa"
        :class="`indicador-etapas__etapa--${situacao(indice)}`"
        :aria-current="situacao(indice) === 'atual' ? 'step' : undefined"
        :data-situacao="situacao(indice)"
        data-teste="etapa"
      >
        <span
          class="indicador-etapas__marcador numeros-tabulares"
          aria-hidden="true"
        >
          <span
            v-if="situacao(indice) === 'concluida'"
            class="ie ie-concluir"
          />
          <template v-else>{{ indice + 1 }}</template>
        </span>
        <span class="indicador-etapas__nome">{{ etapa }}<span
          v-if="situacao(indice) === 'concluida'"
          class="somente-leitor-tela"
        > (concluída)</span></span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.indicador-etapas {
  container: indicador-etapas / inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.indicador-etapas__compacto {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.indicador-etapas__lista {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: var(--p-espaco-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.indicador-etapas__etapa {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-2);
  min-width: 0;
  padding-top: var(--p-espaco-2);
  border-top: 3px solid var(--p-cor-borda);
}

.indicador-etapas__etapa--concluida,
.indicador-etapas__etapa--atual {
  border-top-color: var(--p-cor-primaria);
}

.indicador-etapas__marcador {
  display: none;
}

.indicador-etapas__nome {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@container indicador-etapas (min-width: 36rem) {
  .indicador-etapas__compacto {
    display: none;
  }

  .indicador-etapas__etapa {
    padding-top: var(--p-espaco-3);
  }

  .indicador-etapas__marcador {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    font-size: var(--p-fonte-tamanho-controle);
    font-weight: var(--p-fonte-peso-seminegrito);
    color: var(--p-cor-texto-apoio);
    border: 1px solid var(--p-cor-borda-campo);
    border-radius: var(--p-raio-total);
  }

  .indicador-etapas__nome {
    position: static;
    width: auto;
    height: auto;
    clip-path: none;
    overflow: hidden;
    font-size: var(--p-fonte-tamanho-controle);
    color: var(--p-cor-texto-apoio);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .indicador-etapas__etapa--atual .indicador-etapas__marcador {
    color: var(--p-cor-superficie);
    background: var(--p-cor-primaria);
    border-color: var(--p-cor-primaria);
  }

  .indicador-etapas__etapa--concluida .indicador-etapas__marcador {
    color: var(--p-cor-primaria);
    border-color: var(--p-cor-primaria);
  }

  .indicador-etapas__etapa--atual .indicador-etapas__nome {
    font-weight: var(--p-fonte-peso-seminegrito);
    color: var(--p-cor-texto);
  }
}
</style>
