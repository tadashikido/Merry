<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'

import { TEXTOS_CRONOGRAMA } from '@/textos/cronograma'
import { rotuloCategoria } from '@/utilitarios/cronogramaPublico'
import type { FornecedorNoRoteiro } from '@/utilitarios/cronograma'

const props = withDefaults(
  defineProps<{
    fornecedores: FornecedorNoRoteiro[]
    responsaveis: string[]
    podeCompartilhar?: boolean
    orientar?: boolean
  }>(),
  { podeCompartilhar: false, orientar: false },
)

const emit = defineEmits<{ 'abrir-links': [] }>()

const vazio = computed(() => props.fornecedores.length === 0 && props.responsaveis.length === 0)
</script>

<template>
  <section
    v-if="!vazio || orientar"
    class="equipe-roteiro cartao pilha pilha--cartao"
    aria-labelledby="titulo-equipe-roteiro"
    data-teste="equipe-roteiro"
  >
    <h2
      id="titulo-equipe-roteiro"
      class="equipe-roteiro__titulo texto-rotulo"
    >
      {{ TEXTOS_CRONOGRAMA.equipeTitulo }}
    </h2>

    <p
      v-if="vazio"
      class="equipe-roteiro__nota texto-legenda"
      data-teste="equipe-roteiro-vazia"
    >
      {{ TEXTOS_CRONOGRAMA.equipeVazia }}
    </p>

    <div
      v-else
      class="equipe-roteiro__grupos"
    >
      <div
        v-if="fornecedores.length > 0"
        class="equipe-roteiro__grupo pilha pilha--campo"
        data-teste="equipe-fornecedores"
      >
        <h3 class="equipe-roteiro__subtitulo">
          {{ TEXTOS_CRONOGRAMA.equipeFornecedores }}
          <span class="equipe-roteiro__quantidade numeros-tabulares">{{ fornecedores.length.toLocaleString('pt-BR') }}</span>
        </h3>
        <ul class="equipe-roteiro__lista">
          <li
            v-for="fornecedor in fornecedores"
            :key="fornecedor.fornecedorEventoId"
            class="equipe-roteiro__item"
            data-teste="equipe-fornecedor"
          >
            <span class="equipe-roteiro__nome">{{ fornecedor.nomeEmpresa }}</span>
            <span class="equipe-roteiro__detalhe">{{
              TEXTOS_CRONOGRAMA.equipeFornecedorDetalhe(rotuloCategoria(fornecedor.categoria), fornecedor.quantidadeItens)
            }}</span>
          </li>
        </ul>
      </div>

      <div
        v-if="responsaveis.length > 0"
        class="equipe-roteiro__grupo pilha pilha--campo"
        data-teste="equipe-responsaveis"
      >
        <h3 class="equipe-roteiro__subtitulo">
          {{ TEXTOS_CRONOGRAMA.equipeResponsaveis }}
          <span class="equipe-roteiro__quantidade numeros-tabulares">{{ responsaveis.length.toLocaleString('pt-BR') }}</span>
        </h3>
        <ul class="equipe-roteiro__lista">
          <li
            v-for="responsavel in responsaveis"
            :key="responsavel"
            class="equipe-roteiro__item"
            data-teste="equipe-responsavel"
          >
            <span class="equipe-roteiro__nome">{{ responsavel }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div
      v-if="podeCompartilhar && !vazio"
      class="equipe-roteiro__links pilha pilha--campo"
    >
      <p class="equipe-roteiro__nota texto-legenda">
        {{ TEXTOS_CRONOGRAMA.equipeApoioLinks }}
      </p>
      <Button
        :label="TEXTOS_CRONOGRAMA.acaoLinksEquipe"
        icon="ie ie-link"
        severity="secondary"
        outlined
        size="small"
        class="equipe-roteiro__acao"
        aria-haspopup="dialog"
        data-teste="abrir-links-lateral"
        @click="emit('abrir-links')"
      />
    </div>
  </section>
</template>

<style scoped>
.equipe-roteiro {
  container: equipe-roteiro / inline-size;
}

.equipe-roteiro__titulo,
.equipe-roteiro__nota {
  margin: 0;
}

.equipe-roteiro__grupos {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo);
}

.equipe-roteiro__subtitulo {
  display: flex;
  gap: var(--p-ritmo-campo);
  align-items: baseline;
  justify-content: space-between;
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.equipe-roteiro__quantidade {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-secundario);
}

.equipe-roteiro__lista {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  margin: 0;
  padding: 0;
  list-style: none;
}

.equipe-roteiro__item {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
  font-size: var(--p-fonte-tamanho-controle);
}

.equipe-roteiro__nome {
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.equipe-roteiro__detalhe {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.equipe-roteiro__links {
  padding-top: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.equipe-roteiro__acao {
  align-self: flex-start;
}

@media (pointer: coarse) {
  .equipe-roteiro__acao {
    min-height: var(--p-dimensao-alvo-toque);
  }
}

@container equipe-roteiro (min-width: 36rem) {
  .equipe-roteiro__grupos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--p-ritmo-bloco);
  }
}
</style>
