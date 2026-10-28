<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import SeletorEvento from './SeletorEvento.vue'
import type { ContextoEvento, GrupoNavegacaoEvento, OpcaoSeletorEvento } from './tipos'
import EtiquetaTipo from '@/componentes/base/EtiquetaTipo.vue'
import NomesAnfitrioes from '@/componentes/base/NomesAnfitrioes.vue'
import { classeIcone } from '@/design/icones'
import { descreverContagem } from '@/textos/eventos'
import { classeTomDoTipo, ehTipoEvento } from '@/textos/tiposEvento'
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

const tipoEvento = computed(() => (props.evento && ehTipoEvento(props.evento.tipo) ? props.evento.tipo : null))
const classeTom = computed(() => classeTomDoTipo(tipoEvento.value))

const CHAVE_GRANDE_DIA = 'grande-dia'

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
      :class="classeTom"
      data-teste="navegacao-evento-cabecalho"
    >
      <EtiquetaTipo
        v-if="tipoEvento"
        class="navegacao-evento__tipo"
        :tipo="tipoEvento"
        com-icone
      />
      <span
        v-else
        class="navegacao-evento__rotulo navegacao-evento__rotulo--cartao"
      >{{ ROTULOS_NAVEGACAO.rotuloEvento }}</span>
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
            :class="{ 'navegacao-evento__item--ativo': item.ativo, 'navegacao-evento__item--grande-dia': item.chave === CHAVE_GRANDE_DIA }"
            :aria-current="item.ativo ? 'page' : undefined"
            data-teste="item-evento"
          >
            <span
              v-if="item.chave === CHAVE_GRANDE_DIA"
              :class="[classeIcone('centelha'), 'navegacao-evento__centelha']"
              aria-hidden="true"
            />
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
  --nomes-cor: var(--tom-profunda);
  --nomes-conector: var(--tom-tinta);
  --p-cor-texto-apoio: var(--tom-data);
  --p-cor-superficie-sutil: var(--p-cor-superficie);

  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  padding: 1.125rem;
  background: var(--tom-fundo);
  border-radius: var(--p-raio-cartao-evento);
}

.navegacao-evento__tipo {
  align-self: flex-start;
  padding: 0;
  font-size: var(--p-fonte-tamanho-rotulo);
  font-weight: var(--p-fonte-peso-negrito);
  letter-spacing: var(--p-fonte-espacamento-letras-etiqueta);
  text-transform: uppercase;
  background: transparent;
}

.navegacao-evento__rotulo {
  font-size: var(--p-fonte-tamanho-rotulo-navegacao);
  font-weight: var(--p-fonte-peso-negrito);
  letter-spacing: var(--p-fonte-espacamento-letras-rotulo);
  text-transform: uppercase;
  color: var(--p-cor-texto-apoio);
}

.navegacao-evento__rotulo--cartao {
  font-size: var(--p-fonte-tamanho-rotulo);
  letter-spacing: var(--p-fonte-espacamento-letras-etiqueta);
  color: var(--tom-tinta);
}

.navegacao-evento__rotulo--grupo {
  padding: 0 var(--p-espaco-3) 0.375rem;
}

.navegacao-evento__nomes {
  font-size: var(--p-fonte-tamanho-cartao-evento);
  line-height: 1.1;
}

.navegacao-evento__quando {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--tom-data);
}

.navegacao-evento__esqueleto {
  display: block;
  width: 60%;
  height: 0.75rem;
  margin-top: var(--p-espaco-1);
  background: var(--p-cor-superficie);
  border-radius: var(--p-raio-tag);
}

.navegacao-evento__esqueleto--nomes {
  width: 85%;
  height: 1.5rem;
}

.navegacao-evento__grupo {
  display: flex;
  flex-direction: column;
}

.navegacao-evento__itens {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.navegacao-evento__item {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-2);
  min-height: var(--p-dimensao-alvo-toque);
  padding: 0 var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
  text-decoration: none;
  border-radius: var(--p-raio-aba);
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
  font-size: var(--p-fonte-tamanho-rotulo);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto-apoio);
}

.navegacao-evento__item--ativo .navegacao-evento__indicador {
  color: var(--p-cor-acento-texto);
}

.navegacao-evento__item:hover {
  color: var(--p-cor-titulo);
  background: var(--p-cor-superficie-sutil);
}

.navegacao-evento__item--ativo,
.navegacao-evento__item--ativo:hover {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-titulo);
  background: var(--p-cor-primaria-suave);
}

.navegacao-evento__item--grande-dia {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-destaque-texto);
}

.navegacao-evento__centelha {
  font-size: 0.875rem;
  color: var(--p-cor-centelha-clara);
}
</style>
