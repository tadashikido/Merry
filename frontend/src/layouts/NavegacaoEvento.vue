<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import SeletorEvento from './SeletorEvento.vue'
import type { ContextoEvento, GrupoNavegacaoEvento, OpcaoSeletorEvento } from './tipos'
import NomesAnfitrioes from '@/componentes/base/NomesAnfitrioes.vue'
import { descreverContagem } from '@/textos/eventos'
import { ROTULOS_NAVEGACAO } from '@/textos/rotulos'
import { formatarDataCalendarioCurta } from '@/utilitarios/formatacao'

const props = withDefaults(
  defineProps<{
    evento: ContextoEvento | null
    grupos: GrupoNavegacaoEvento[]
    eventoId?: string | null
    opcoesSeletor?: OpcaoSeletorEvento[] | null
    anexarSeletor?: 'body' | 'self'
  }>(),
  { eventoId: null, opcoesSeletor: null, anexarSeletor: 'body' },
)

const emit = defineEmits<{ trocarEvento: [id: string] }>()

const exibirSeletor = computed(
  () => props.evento !== null && props.eventoId !== null && (props.opcoesSeletor ?? []).some((opcao) => opcao.id !== props.eventoId),
)

const quando = computed(() =>
  props.evento
    ? ROTULOS_NAVEGACAO.quandoEvento(formatarDataCalendarioCurta(props.evento.data), descreverContagem(props.evento.diasRestantes))
    : '',
)
</script>

<template>
  <nav
    class="navegacao-evento"
    :aria-label="ROTULOS_NAVEGACAO.modulosEvento"
    data-teste="navegacao-evento"
  >
    <div
      class="navegacao-evento__cabecalho"
      data-teste="navegacao-evento-cabecalho"
    >
      <span class="navegacao-evento__rotulo">{{ ROTULOS_NAVEGACAO.rotuloEvento }}</span>
      <SeletorEvento
        v-if="exibirSeletor && evento && eventoId"
        :evento-id="eventoId"
        :evento="evento"
        :opcoes="opcoesSeletor ?? []"
        :anexar-em="anexarSeletor"
        @trocar="emit('trocarEvento', $event)"
      />
      <template v-else-if="evento">
        <NomesAnfitrioes
          class="navegacao-evento__nomes"
          :primeiro="evento.nomePrimeiraPessoa"
          :segundo="evento.nomeSegundaPessoa"
          tamanho="navegacao"
        />
        <span
          class="navegacao-evento__quando numeros-tabulares"
          data-teste="navegacao-evento-quando"
        >{{ quando }}</span>
      </template>
      <template v-else>
        <span
          class="navegacao-evento__esqueleto navegacao-evento__esqueleto--nomes"
          aria-hidden="true"
        />
        <span
          class="navegacao-evento__esqueleto"
          aria-hidden="true"
        />
      </template>
    </div>

    <div
      v-for="grupo in grupos"
      :key="grupo.chave"
      class="navegacao-evento__grupo"
      data-teste="grupo-evento"
    >
      <span
        :id="`grupo-evento-${grupo.chave}`"
        class="navegacao-evento__rotulo navegacao-evento__rotulo--grupo"
      >{{ grupo.rotulo }}</span>
      <ul
        class="navegacao-evento__itens"
        :aria-labelledby="`grupo-evento-${grupo.chave}`"
      >
        <li
          v-for="item in grupo.itens"
          :key="item.chave"
        >
          <RouterLink
            :to="item.rota"
            class="navegacao-evento__item"
            :class="{ 'navegacao-evento__item--ativo': item.ativo }"
            :aria-current="item.ativo ? 'page' : undefined"
            data-teste="item-evento"
          >
            <span class="navegacao-evento__texto">{{ item.rotulo }}</span>
            <span
              v-if="item.indicador"
              class="navegacao-evento__indicador numeros-tabulares"
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
.navegacao-evento {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-cartao);
}

.navegacao-evento__cabecalho {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 var(--p-espaco-3);
}

.navegacao-evento__rotulo {
  font-size: var(--p-fonte-tamanho-rotulo);
  font-weight: var(--p-fonte-peso-medio);
  letter-spacing: var(--p-fonte-espacamento-letras-rotulo);
  text-transform: uppercase;
  color: var(--p-cor-texto-apoio);
}

.navegacao-evento__rotulo--grupo {
  padding: 0 var(--p-espaco-3) var(--p-espaco-2);
}

.navegacao-evento__nomes {
  font-size: 1.375rem;
}

.navegacao-evento__quando {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.navegacao-evento__esqueleto {
  display: block;
  width: 60%;
  height: 0.75rem;
  margin-top: var(--p-espaco-1);
  background: var(--p-cor-neutro-suave);
  border-radius: var(--p-raio-tag);
}

.navegacao-evento__esqueleto--nomes {
  width: 85%;
  height: 1.25rem;
}

.navegacao-evento__grupo {
  display: flex;
  flex-direction: column;
}

.navegacao-evento__itens {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.navegacao-evento__item {
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

.navegacao-evento__texto {
  flex: 1 1 auto;
  min-width: 0;
}

.navegacao-evento__indicador {
  flex: none;
  margin-left: var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-apoio);
}

.navegacao-evento__item--ativo .navegacao-evento__indicador {
  color: var(--p-cor-primaria);
}

.navegacao-evento__item:hover {
  color: var(--p-cor-texto);
  background: var(--p-cor-superficie-sutil);
}

.navegacao-evento__item--ativo,
.navegacao-evento__item--ativo:hover {
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-primaria);
  background: var(--p-cor-primaria-suave);
}

@media (pointer: coarse) {
  .navegacao-evento__item {
    min-height: var(--p-dimensao-alvo-toque);
  }
}
</style>
