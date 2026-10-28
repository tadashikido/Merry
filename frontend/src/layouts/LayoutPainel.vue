<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'

import NavegacaoEvento from './NavegacaoEvento.vue'
import RailNavegacao from './RailNavegacao.vue'
import type { ContextoEvento, ContextoVisual, GrupoNavegacaoEvento, ItemRail, OpcaoSeletorEvento } from './tipos'
import MarcaProduto from '@/componentes/base/MarcaProduto.vue'
import { useTelaPequena } from '@/composables/useTelaPequena'
import { ROTULOS_ACOES, ROTULOS_NAVEGACAO } from '@/textos/rotulos'
import { formatarNomesAnfitrioes } from '@/utilitarios/formatacao'

const props = withDefaults(
  defineProps<{
    itensRail: ItemRail[]
    gruposEvento?: GrupoNavegacaoEvento[] | null
    contextoEvento?: ContextoEvento | null
    contexto?: ContextoVisual
    eventoId?: string | null
    opcoesSeletor?: OpcaoSeletorEvento[] | null
  }>(),
  { gruposEvento: null, contextoEvento: null, contexto: 'assessoria', eventoId: null, opcoesSeletor: null },
)

const emit = defineEmits<{ trocarEvento: [id: string] }>()

defineSlots<{
  default(): unknown
  'rodape-menu'(propriedades: { variante: 'rail' | 'completa' }): unknown
}>()

const ID_CONTEUDO = 'conteudo-principal'
const ID_GAVETA = 'menu-gaveta'

const menuAberto = ref(false)
const telaPequena = useTelaPequena()
const rota = useRoute()

const temWorkspace = computed(() => props.gruposEvento !== null)
const nomesAnfitrioes = computed(() =>
  props.contextoEvento ? formatarNomesAnfitrioes(props.contextoEvento.nomePrimeiraPessoa, props.contextoEvento.nomeSegundaPessoa) : '',
)

watch(
  () => rota.fullPath,
  () => {
    menuAberto.value = false
  },
)

watch(telaPequena, (pequena) => {
  if (!pequena) {
    menuAberto.value = false
  }
})
</script>

<template>
  <div
    class="layout-painel"
    :class="[
      `layout-painel--${contexto}`,
      { 'layout-painel--compacto': telaPequena, 'layout-painel--workspace': temWorkspace && !telaPequena },
    ]"
  >
    <a
      class="layout-painel__pular"
      :href="`#${ID_CONTEUDO}`"
    >{{ ROTULOS_NAVEGACAO.pularConteudo }}</a>

    <aside
      v-if="!telaPequena"
      class="layout-painel__rail"
      data-teste="menu-lateral"
    >
      <MarcaProduto
        class="layout-painel__marca"
        somente-simbolo
        fundo="escuro"
      />
      <RailNavegacao :itens="itensRail" />
      <div
        v-if="$slots['rodape-menu']"
        class="layout-painel__rodape-rail"
      >
        <slot
          name="rodape-menu"
          variante="rail"
        />
      </div>
    </aside>

    <aside
      v-if="!telaPequena && gruposEvento"
      class="layout-painel__workspace"
      data-teste="workspace-evento"
    >
      <NavegacaoEvento
        :evento="contextoEvento"
        :grupos="gruposEvento"
        :evento-id="eventoId"
        :opcoes-seletor="opcoesSeletor"
        @trocar-evento="emit('trocarEvento', $event)"
      />
    </aside>

    <Drawer
      v-if="telaPequena"
      :id="ID_GAVETA"
      v-model:visible="menuAberto"
      class="layout-painel__gaveta"
      position="left"
      :block-scroll="true"
      data-teste="menu-gaveta"
    >
      <template #header>
        <MarcaProduto tom="claro" />
      </template>
      <div class="layout-painel__gaveta-corpo">
        <RailNavegacao
          :itens="itensRail"
          expandido
        />
        <div
          v-if="gruposEvento"
          class="layout-painel__gaveta-evento"
        >
          <NavegacaoEvento
            :evento="contextoEvento"
            :grupos="gruposEvento"
            :evento-id="eventoId"
            :opcoes-seletor="opcoesSeletor"
            anexar-seletor="self"
            @trocar-evento="emit('trocarEvento', $event)"
          />
        </div>
        <div
          v-if="$slots['rodape-menu']"
          class="layout-painel__rodape-gaveta"
        >
          <slot
            name="rodape-menu"
            variante="completa"
          />
        </div>
      </div>
    </Drawer>

    <div class="layout-painel__principal">
      <header
        v-if="telaPequena"
        class="layout-painel__barra"
      >
        <Button
          icon="ie ie-menu"
          text
          :aria-label="ROTULOS_ACOES.abrirMenu"
          :aria-expanded="menuAberto"
          :aria-controls="ID_GAVETA"
          class="layout-painel__botao-menu"
          data-teste="abrir-menu"
          @click="menuAberto = true"
        />
        <MarcaProduto
          class="layout-painel__marca-barra"
          tom="claro"
        />
        <span
          v-if="nomesAnfitrioes"
          class="layout-painel__anfitriao-barra"
          data-teste="barra-anfitriao"
        >{{ nomesAnfitrioes }}</span>
      </header>

      <main
        :id="ID_CONTEUDO"
        class="layout-painel__conteudo"
        tabindex="-1"
      >
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout-painel {
  display: grid;
  grid-template-columns: var(--p-dimensao-largura-rail) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--p-cor-fundo);
}

.layout-painel--workspace {
  grid-template-columns: var(--p-dimensao-largura-rail) var(--p-dimensao-largura-navegacao-evento) minmax(0, 1fr);
}

.layout-painel--compacto {
  grid-template-columns: minmax(0, 1fr);
}

.layout-painel--anfitriao {
  background: var(--p-cor-fundo-anfitriao);
}

.layout-painel__pular {
  position: absolute;
  top: var(--p-espaco-2);
  left: var(--p-espaco-2);
  z-index: var(--p-camada-menu);
  padding: var(--p-espaco-2) var(--p-espaco-4);
  color: var(--p-primary-contrast-color);
  background: var(--p-cor-primaria);
  border-radius: var(--p-raio-controle);
  transform: translateY(-200%);
}

.layout-painel__pular:focus {
  transform: none;
}

.layout-painel__rail {
  position: sticky;
  top: 0;
  z-index: var(--p-camada-cabecalho);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--p-espaco-6);
  height: 100vh;
  padding: var(--p-espaco-6) 0;
  color: var(--p-cor-lateral-escura-texto);
  background: var(--p-cor-rail);
}

.layout-painel__marca {
  --marca-tamanho-simbolo: 2.125rem;

  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--p-dimensao-alvo-toque);
  height: var(--p-dimensao-alvo-toque);
}

.layout-painel__rodape-rail {
  --p-cor-navegacao-texto: var(--p-cor-rail-icone);
  --p-cor-navegacao-ativo: var(--p-cor-lateral-escura-texto);
  --p-cor-superficie-sutil: var(--p-cor-lateral-escura);
  --p-cor-texto: var(--p-cor-lateral-escura-texto);
  --p-cor-texto-apoio: var(--p-cor-rail-icone);
  --p-focus-ring-color: var(--p-cor-centelha);

  margin-top: auto;
}

.layout-painel__workspace {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: var(--p-ritmo-cartao) var(--p-ritmo-grupo) var(--p-espaco-8);
  overflow-y: auto;
  background: var(--p-cor-superficie);
  border-right: 1px solid var(--p-cor-borda);
}

.layout-painel__principal {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.layout-painel__barra {
  position: sticky;
  top: 0;
  z-index: var(--p-camada-cabecalho);
  display: flex;
  align-items: center;
  gap: var(--p-espaco-2);
  min-height: var(--p-dimensao-altura-barra-celular);
  padding: 0 var(--p-espaco-4) 0 var(--p-espaco-1);
  color: var(--p-cor-texto);
  background: var(--p-cor-navegacao);
  border-bottom: 1px solid var(--p-cor-borda);
}

.layout-painel__barra .layout-painel__botao-menu {
  width: var(--p-dimensao-alvo-toque);
  height: var(--p-dimensao-alvo-toque);
  color: var(--p-cor-navegacao-texto);
}

.layout-painel__marca-barra {
  --marca-tamanho: 1.375rem;
}

.layout-painel__anfitriao-barra {
  min-width: 0;
  margin-left: auto;
  overflow: hidden;
  font-family: var(--p-fonte-display);
  font-variant-numeric: lining-nums;
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-regular);
  color: var(--p-cor-texto);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-painel__gaveta-corpo {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-cartao);
  min-height: 100%;
}

.layout-painel__gaveta-evento {
  padding: var(--p-ritmo-grupo) 0 0;
  border-top: 1px solid var(--p-cor-borda);
}

.layout-painel__rodape-gaveta {
  margin-top: auto;
  padding-top: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-borda);
}

.layout-painel__conteudo {
  width: 100%;
  max-width: calc(var(--p-dimensao-largura-ampla) + 2 * var(--p-ritmo-bloco));
  margin-inline: auto;
  padding: var(--p-ritmo-bloco) var(--p-ritmo-bloco) var(--p-ritmo-secao);
}

.layout-painel__conteudo:focus {
  outline: none;
}

.layout-painel--compacto .layout-painel__conteudo {
  padding: var(--p-ritmo-cartao) var(--p-ritmo-grupo) var(--p-ritmo-bloco);
}

@container aplicacao (min-width: 40rem) {
  .layout-painel--compacto .layout-painel__conteudo {
    padding: var(--p-ritmo-bloco) var(--p-ritmo-cartao);
  }
}
</style>

<style>
.layout-painel__gaveta.p-drawer {
  width: min(var(--p-dimensao-largura-gaveta), 88vw);
  color: var(--p-cor-navegacao-texto);
}

.layout-painel__gaveta .p-drawer-close-button {
  color: var(--p-cor-navegacao-texto);
}
</style>
