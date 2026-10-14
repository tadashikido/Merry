<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'

import NavegacaoCasamento from './NavegacaoCasamento.vue'
import RailNavegacao from './RailNavegacao.vue'
import type { ContextoCasamento, ContextoVisual, GrupoNavegacaoCasamento, ItemRail } from './tipos'
import MarcaProduto from '@/componentes/base/MarcaProduto.vue'
import { useTelaPequena } from '@/composables/useTelaPequena'
import { ROTULOS_ACOES, ROTULOS_NAVEGACAO } from '@/textos/rotulos'
import { formatarNomesCasal } from '@/utilitarios/formatacao'

const props = withDefaults(
  defineProps<{
    itensRail: ItemRail[]
    gruposCasamento?: GrupoNavegacaoCasamento[] | null
    contextoCasamento?: ContextoCasamento | null
    contexto?: ContextoVisual
  }>(),
  { gruposCasamento: null, contextoCasamento: null, contexto: 'assessoria' },
)

defineSlots<{
  default(): unknown
  'rodape-menu'(propriedades: { variante: 'rail' | 'completa' }): unknown
}>()

const ID_CONTEUDO = 'conteudo-principal'
const ID_GAVETA = 'menu-gaveta'

const menuAberto = ref(false)
const telaPequena = useTelaPequena()
const rota = useRoute()

const temWorkspace = computed(() => props.gruposCasamento !== null)
const nomesCasal = computed(() =>
  props.contextoCasamento ? formatarNomesCasal(props.contextoCasamento.nomePrimeiraPessoa, props.contextoCasamento.nomeSegundaPessoa) : '',
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
        tom="claro"
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
      v-if="!telaPequena && gruposCasamento"
      class="layout-painel__workspace"
      data-teste="workspace-casamento"
    >
      <NavegacaoCasamento
        :casamento="contextoCasamento"
        :grupos="gruposCasamento"
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
          v-if="gruposCasamento"
          class="layout-painel__gaveta-casamento"
        >
          <NavegacaoCasamento
            :casamento="contextoCasamento"
            :grupos="gruposCasamento"
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
          v-if="nomesCasal"
          class="layout-painel__casal-barra"
          data-teste="barra-casal"
        >{{ nomesCasal }}</span>
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
  grid-template-columns: var(--p-dimensao-largura-rail) var(--p-dimensao-largura-navegacao-casamento) minmax(0, 1fr);
}

.layout-painel--compacto {
  grid-template-columns: minmax(0, 1fr);
}

.layout-painel--casal {
  background: var(--p-cor-fundo-casal);
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
  gap: var(--p-espaco-5);
  height: 100vh;
  padding: var(--p-espaco-4) 0;
  background: var(--p-cor-navegacao);
}

.layout-painel__marca {
  padding: var(--p-espaco-1) 0 var(--p-espaco-2);
}

.layout-painel__rodape-rail {
  margin-top: auto;
}

.layout-painel__workspace {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: var(--p-espaco-6) var(--p-espaco-3);
  overflow-y: auto;
  background: var(--p-cor-superficie);
  border-right: 1px solid var(--p-cor-borda);
}

.layout-painel--casal .layout-painel__workspace {
  border-right-color: var(--p-cor-borda-quente);
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
  color: var(--p-cor-navegacao-ativo);
  background: var(--p-cor-navegacao);
}

.layout-painel__barra .layout-painel__botao-menu {
  width: var(--p-dimensao-alvo-toque);
  height: var(--p-dimensao-alvo-toque);
  color: var(--p-cor-navegacao-ativo);
}

.layout-painel__marca-barra :deep(.marca__nome) {
  font-size: 1.375rem;
}

.layout-painel__casal-barra {
  min-width: 0;
  margin-left: auto;
  overflow: hidden;
  font-family: var(--p-fonte-editorial);
  font-variant-numeric: lining-nums;
  font-size: 1.0625rem;
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-navegacao-texto);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-painel__gaveta-corpo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
  min-height: 100%;
}

.layout-painel__gaveta-casamento {
  padding: var(--p-espaco-5) var(--p-espaco-2);
  background: var(--p-cor-superficie);
  border-radius: var(--p-raio-painel);
}

.layout-painel__rodape-gaveta {
  margin-top: auto;
  padding-top: var(--p-espaco-4);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.layout-painel__conteudo {
  width: 100%;
  max-width: var(--p-dimensao-largura-conteudo);
  padding: var(--p-espaco-8) var(--p-espaco-10) var(--p-espaco-10);
}

.layout-painel__conteudo:focus {
  outline: none;
}

.layout-painel--compacto .layout-painel__conteudo {
  padding: var(--p-espaco-6) var(--p-espaco-4) var(--p-espaco-8);
}

@media (min-width: 640px) {
  .layout-painel--compacto .layout-painel__conteudo {
    padding: var(--p-espaco-8) var(--p-espaco-6);
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
