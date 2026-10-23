<script setup lang="ts">
import { computed, useId } from 'vue'
import Button from 'primevue/button'

import { TEXTOS_GRUPOS_SEM_MESA as TEXTOS } from '@/textos/mesas'
import type { PessoaMesaDto } from '@/tipos/mesas'
import { formatarNumero } from '@/utilitarios/formatacao'
import { semMesaPorGrupo } from '@/utilitarios/mesas'

const LIMITE_GRUPOS = 5

const props = defineProps<{
  pessoas: readonly PessoaMesaDto[]
  grupoAtivo: string
}>()

const emit = defineEmits<{ filtrar: [chave: string] }>()

const idTitulo = `grupos-sem-mesa-${useId()}`

const grupos = computed(() => semMesaPorGrupo(props.pessoas))
const visiveis = computed(() => {
  const lista = grupos.value.slice(0, LIMITE_GRUPOS)
  const ativo = grupos.value.find((grupo) => grupo.chave === props.grupoAtivo)
  if (ativo && !lista.includes(ativo)) {
    lista.push(ativo)
  }
  return lista
})
const restantes = computed(() => grupos.value.length - visiveis.value.length)
</script>

<template>
  <section
    v-if="grupos.length > 1"
    class="grupos-sem-mesa pilha pilha--campo"
    :aria-labelledby="idTitulo"
    data-teste="grupos-sem-mesa"
  >
    <h3
      :id="idTitulo"
      class="grupos-sem-mesa__titulo"
    >
      {{ TEXTOS.titulo }}
    </h3>
    <ul class="grupos-sem-mesa__lista">
      <li
        v-for="grupo in visiveis"
        :key="grupo.chave"
      >
        <Button
          class="grupos-sem-mesa__botao"
          :class="{ 'grupos-sem-mesa__botao--ativo': grupo.chave === grupoAtivo }"
          severity="secondary"
          text
          size="small"
          :aria-pressed="grupo.chave === grupoAtivo"
          :aria-label="TEXTOS.grupoAcessivel(grupo.rotulo, grupo.quantidade)"
          data-teste="grupo-sem-mesa"
          @click="emit('filtrar', grupo.chave)"
        >
          <span class="grupos-sem-mesa__rotulo">{{ grupo.rotulo }}</span>{{ ' ' }}
          <span class="grupos-sem-mesa__quantidade numeros-tabulares">{{ formatarNumero(grupo.quantidade) }}</span>
        </Button>
      </li>
      <li
        v-if="restantes > 0"
        class="grupos-sem-mesa__mais"
        data-teste="grupos-sem-mesa-mais"
      >
        {{ TEXTOS.mais(restantes) }}
      </li>
    </ul>
    <p class="grupos-sem-mesa__nota">
      {{ TEXTOS.nota }}
    </p>
  </section>
</template>

<style scoped>
.grupos-sem-mesa {
  min-width: 0;
  padding-inline: var(--p-ritmo-campo);
}

.grupos-sem-mesa__titulo,
.grupos-sem-mesa__nota {
  margin: 0;
}

.grupos-sem-mesa__titulo {
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-secundario);
}

.grupos-sem-mesa__lista {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-1) var(--p-espaco-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.grupos-sem-mesa__botao {
  gap: var(--p-espaco-1);
}

.grupos-sem-mesa__rotulo {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.grupos-sem-mesa__quantidade {
  color: var(--p-cor-texto-secundario);
}

.grupos-sem-mesa__botao--ativo .grupos-sem-mesa__rotulo {
  font-weight: var(--p-fonte-peso-medio);
  text-decoration-thickness: 2px;
}

.grupos-sem-mesa__mais {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-secundario);
}

.grupos-sem-mesa__nota {
  font-family: var(--p-fonte-serif);
  font-size: var(--p-fonte-tamanho-apoio);
  font-style: italic;
  color: var(--p-cor-texto-apoio);
}
</style>
