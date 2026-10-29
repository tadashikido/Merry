<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import Button from 'primevue/button'

import LayoutPublico from '@/layouts/LayoutPublico.vue'
import TileTipo from '@/componentes/base/TileTipo.vue'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useEventosStore } from '@/stores/eventos'
import { TEXTOS_NAO_ENCONTRADO } from '@/textos/naoEncontrado'
import { ehTipoEvento, vocabularioDoTipo } from '@/textos/tiposEvento'

type Perfil = 'visitante' | 'assessoria' | 'anfitriao'

interface Saida {
  rotulo: string
  destino: RouteLocationRaw
}

const autenticacao = useAutenticacaoStore()
const eventos = useEventosStore()

const perfil = computed<Perfil>(() => {
  if (!autenticacao.autenticado) {
    return 'visitante'
  }
  return autenticacao.ehAnfitriao ? 'anfitriao' : 'assessoria'
})

const referenciaDoEvento = computed(() => {
  const evento = eventos.atual
  if (evento && evento.id === autenticacao.eventoDoAnfitriao && ehTipoEvento(evento.tipo)) {
    return vocabularioDoTipo(evento.tipo).referencia.artigo
  }
  return TEXTOS_NAO_ENCONTRADO.referenciaNeutra
})

const saidaPrincipal = computed<Saida>(() => {
  const eventoId = autenticacao.eventoDoAnfitriao
  if (perfil.value === 'anfitriao' && eventoId) {
    return { rotulo: TEXTOS_NAO_ENCONTRADO.voltarPara(referenciaDoEvento.value), destino: { name: 'evento', params: { id: eventoId } } }
  }
  return { rotulo: TEXTOS_NAO_ENCONTRADO.voltar, destino: { name: 'inicio' } }
})

const dica = computed(() =>
  perfil.value === 'anfitriao' && autenticacao.eventoDoAnfitriao ? TEXTOS_NAO_ENCONTRADO.dicaAnfitriao : TEXTOS_NAO_ENCONTRADO.dica,
)
</script>

<template>
  <LayoutPublico vazio>
    <section
      class="nao-encontrado pilha pilha--bloco"
      aria-labelledby="nao-encontrado-titulo"
      :data-perfil="perfil"
    >
      <div class="pilha pilha--grupo nao-encontrado__mensagem">
        <TileTipo
          tom="champanhe"
          icone="busca"
          tamanho="grande"
          data-teste="lacre-nao-encontrado"
        />
        <h1 id="nao-encontrado-titulo">
          {{ TEXTOS_NAO_ENCONTRADO.titulo }}
        </h1>
        <div class="pilha pilha--campo nao-encontrado__textos">
          <p class="nao-encontrado__explicacao texto-destaque">
            {{ TEXTOS_NAO_ENCONTRADO.explicacao }}
          </p>
          <p
            class="nao-encontrado__dica texto-legenda"
            data-teste="dica-nao-encontrado"
          >
            {{ dica }}
          </p>
        </div>
      </div>
      <nav
        class="nao-encontrado__atalhos pilha pilha--grupo"
        :aria-label="TEXTOS_NAO_ENCONTRADO.rotuloAtalhos"
        data-teste="atalhos-nao-encontrado"
      >
        <Button
          :as="RouterLink"
          :to="saidaPrincipal.destino"
          :label="saidaPrincipal.rotulo"
          class="nao-encontrado__voltar"
          data-teste="voltar-inicio"
        />
        <Button
          v-if="perfil === 'assessoria'"
          :as="RouterLink"
          :to="{ name: 'eventos' }"
          :label="TEXTOS_NAO_ENCONTRADO.verEventos"
          severity="secondary"
          outlined
          class="nao-encontrado__voltar"
          data-teste="ver-eventos"
        />
      </nav>
      <aside
        v-if="perfil === 'visitante'"
        class="nao-encontrado__link-recebido pilha pilha--campo"
        aria-labelledby="nao-encontrado-link-recebido"
        data-teste="orientacao-link-recebido"
      >
        <h2
          id="nao-encontrado-link-recebido"
          class="nao-encontrado__link-recebido-titulo"
        >
          {{ TEXTOS_NAO_ENCONTRADO.linkRecebidoTitulo }}
        </h2>
        <p class="nao-encontrado__link-recebido-texto">
          {{ TEXTOS_NAO_ENCONTRADO.linkRecebidoTexto }}
        </p>
      </aside>
    </section>
  </LayoutPublico>
</template>

<style scoped>
.nao-encontrado {
  container: nao-encontrado / inline-size;
  text-align: center;
}

.nao-encontrado__mensagem,
.nao-encontrado__textos {
  align-items: center;
}

.nao-encontrado__explicacao {
  text-wrap: balance;
}

.nao-encontrado__dica {
  max-width: 36ch;
  text-wrap: pretty;
}

.nao-encontrado__voltar {
  text-decoration: none;
}

.nao-encontrado__link-recebido {
  padding-inline-start: var(--p-ritmo-grupo);
  text-align: start;
  border-inline-start: 2px solid var(--p-cor-primaria);
}

.nao-encontrado__link-recebido-titulo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto);
}

.nao-encontrado__link-recebido-texto {
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
  text-wrap: pretty;
}

@container nao-encontrado (min-width: 28rem) {
  .nao-encontrado__atalhos {
    flex-direction: row;
  }

  .nao-encontrado__atalhos > .nao-encontrado__voltar {
    flex: 1 1 0;
  }
}
</style>
