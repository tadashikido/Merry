<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import type { ContextoCasamento, GrupoNavegacaoCasamento } from './tipos'
import NomesCasal from '@/componentes/base/NomesCasal.vue'
import { descreverContagem } from '@/textos/casamentos'
import { ROTULOS_NAVEGACAO } from '@/textos/rotulos'
import { formatarDataCalendarioCurta } from '@/utilitarios/formatacao'

const props = defineProps<{ casamento: ContextoCasamento | null; grupos: GrupoNavegacaoCasamento[] }>()

const quando = computed(() =>
  props.casamento
    ? ROTULOS_NAVEGACAO.quandoCasamento(formatarDataCalendarioCurta(props.casamento.data), descreverContagem(props.casamento.diasRestantes))
    : '',
)
</script>

<template>
  <nav
    class="navegacao-casamento"
    :aria-label="ROTULOS_NAVEGACAO.modulosCasamento"
    data-teste="navegacao-casamento"
  >
    <div
      class="navegacao-casamento__cabecalho"
      data-teste="navegacao-casamento-cabecalho"
    >
      <span class="navegacao-casamento__rotulo">{{ ROTULOS_NAVEGACAO.rotuloCasamento }}</span>
      <template v-if="casamento">
        <NomesCasal
          class="navegacao-casamento__nomes"
          :primeiro="casamento.nomePrimeiraPessoa"
          :segundo="casamento.nomeSegundaPessoa"
          tamanho="navegacao"
        />
        <span
          class="navegacao-casamento__quando numeros-tabulares"
          data-teste="navegacao-casamento-quando"
        >{{ quando }}</span>
      </template>
      <template v-else>
        <span
          class="navegacao-casamento__esqueleto navegacao-casamento__esqueleto--nomes"
          aria-hidden="true"
        />
        <span
          class="navegacao-casamento__esqueleto"
          aria-hidden="true"
        />
      </template>
    </div>

    <div
      v-for="grupo in grupos"
      :key="grupo.chave"
      class="navegacao-casamento__grupo"
      data-teste="grupo-casamento"
    >
      <span
        :id="`grupo-casamento-${grupo.chave}`"
        class="navegacao-casamento__rotulo navegacao-casamento__rotulo--grupo"
      >{{ grupo.rotulo }}</span>
      <ul
        class="navegacao-casamento__itens"
        :aria-labelledby="`grupo-casamento-${grupo.chave}`"
      >
        <li
          v-for="item in grupo.itens"
          :key="item.chave"
        >
          <RouterLink
            :to="item.rota"
            class="navegacao-casamento__item"
            :class="{ 'navegacao-casamento__item--ativo': item.ativo }"
            :aria-current="item.ativo ? 'page' : undefined"
            data-teste="item-casamento"
          >
            <span class="navegacao-casamento__texto">{{ item.rotulo }}</span>
            <span
              v-if="item.indicador"
              class="navegacao-casamento__indicador numeros-tabulares"
              data-teste="indicador-modulo"
            >
              <span aria-hidden="true">{{ item.indicador.texto }}</span>
              <span class="somente-leitor-tela">, {{ item.indicador.rotuloAcessivel }}</span>
            </span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.navegacao-casamento {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-cartao);
}

.navegacao-casamento__cabecalho {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 var(--p-espaco-3);
}

.navegacao-casamento__rotulo {
  font-size: var(--p-fonte-tamanho-rotulo);
  font-weight: var(--p-fonte-peso-medio);
  letter-spacing: var(--p-fonte-espacamento-letras-rotulo);
  text-transform: uppercase;
  color: var(--p-cor-texto-apoio);
}

.navegacao-casamento__rotulo--grupo {
  padding: 0 var(--p-espaco-3) var(--p-espaco-2);
}

.navegacao-casamento__nomes {
  font-size: 1.375rem;
}

.navegacao-casamento__quando {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.navegacao-casamento__esqueleto {
  display: block;
  width: 60%;
  height: 0.75rem;
  margin-top: var(--p-espaco-1);
  background: var(--p-cor-neutro-suave);
  border-radius: var(--p-raio-tag);
}

.navegacao-casamento__esqueleto--nomes {
  width: 85%;
  height: 1.25rem;
}

.navegacao-casamento__grupo {
  display: flex;
  flex-direction: column;
}

.navegacao-casamento__itens {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.navegacao-casamento__item {
  display: flex;
  align-items: center;
  min-height: 2.25rem;
  padding: 0 var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-secundario);
  text-decoration: none;
  border-radius: var(--p-raio-controle);
  transition:
    background-color var(--p-duracao-rapida),
    color var(--p-duracao-rapida);
}

.navegacao-casamento__texto {
  flex: 1 1 auto;
  min-width: 0;
}

.navegacao-casamento__indicador {
  flex: none;
  margin-left: var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-apoio);
}

.navegacao-casamento__item--ativo .navegacao-casamento__indicador {
  color: var(--p-cor-primaria);
}

.navegacao-casamento__item:hover {
  color: var(--p-cor-texto);
  background: var(--p-cor-superficie-sutil);
}

.navegacao-casamento__item--ativo,
.navegacao-casamento__item--ativo:hover {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-primaria);
  background: var(--p-cor-primaria-suave);
}

@media (pointer: coarse) {
  .navegacao-casamento__item {
    min-height: var(--p-dimensao-alvo-toque);
  }
}
</style>
