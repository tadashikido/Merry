<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import BadgeStatus from './BadgeStatus.vue'
import CanaisContato from './CanaisContato.vue'

withDefaults(
  defineProps<{
    nomeEmpresa: string
    destino: RouteLocationRaw
    responsavel?: string | null
    categoria?: string | null
    telefone?: string | null
    email?: string | null
    site?: string | null
    instagram?: string | null
    arquivado?: boolean
    rotuloArquivado?: string
  }>(),
  {
    responsavel: null,
    categoria: null,
    telefone: null,
    email: null,
    site: null,
    instagram: null,
    arquivado: false,
    rotuloArquivado: 'Arquivado',
  },
)
</script>

<template>
  <li
    class="linha-fornecedor"
    data-teste="linha-fornecedor"
  >
    <div class="linha-fornecedor__textos">
      <span
        v-if="categoria"
        class="linha-fornecedor__categoria"
      >{{ categoria }}</span>
      <span class="linha-fornecedor__titulo">
        <RouterLink
          :to="destino"
          class="linha-fornecedor__nome"
          data-teste="link-fornecedor"
        >{{ nomeEmpresa }}</RouterLink>
        <BadgeStatus
          v-if="arquivado"
          :texto="rotuloArquivado"
          variante="neutro"
          icone="arquivar"
        />
      </span>
      <span
        v-if="responsavel"
        class="linha-fornecedor__responsavel"
      >{{ responsavel }}</span>
    </div>
    <CanaisContato
      class="linha-fornecedor__canais"
      :nome="nomeEmpresa"
      :telefone="telefone"
      :email="email"
      :site="site"
      :instagram="instagram"
      variante="compacta"
    />
    <div
      v-if="$slots.acoes"
      class="linha-fornecedor__acoes"
    >
      <slot name="acoes" />
    </div>
  </li>
</template>

<style scoped>
.linha-fornecedor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'textos acoes'
    'canais canais';
  gap: var(--p-espaco-1) var(--p-espaco-3);
  align-items: center;
  padding: var(--p-ritmo-grupo) var(--p-ritmo-cartao);
  list-style: none;
}

.linha-fornecedor + .linha-fornecedor {
  border-top: 1px solid var(--p-cor-divisoria);
}

.linha-fornecedor__textos {
  display: flex;
  grid-area: textos;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.linha-fornecedor__categoria {
  font-size: var(--p-fonte-tamanho-rotulo);
  color: var(--p-cor-texto-apoio);
}

.linha-fornecedor__titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
}

.linha-fornecedor__nome {
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.linha-fornecedor__nome:hover {
  color: var(--p-cor-primaria);
  text-decoration: underline;
}

.linha-fornecedor__responsavel {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
  overflow-wrap: anywhere;
}

.linha-fornecedor__canais {
  grid-area: canais;
}

.linha-fornecedor__acoes {
  grid-area: acoes;
  align-self: start;
}

@container lista-fornecedores (min-width: 40rem) {
  .linha-fornecedor {
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-areas: 'textos canais acoes';
    gap: var(--p-espaco-3);
  }

  .linha-fornecedor__acoes {
    align-self: center;
  }
}
</style>
