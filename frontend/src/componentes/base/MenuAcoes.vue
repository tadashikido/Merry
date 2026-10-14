<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'

import type { ItemMenuAcoes } from './tipos'

const props = withDefaults(
  defineProps<{ itens: ItemMenuAcoes[]; rotulo: string; rotuloAcessivel?: string; desabilitado?: boolean; somenteIcone?: boolean }>(),
  {
    rotuloAcessivel: undefined,
    desabilitado: false,
    somenteIcone: false,
  },
)

const emit = defineEmits<{ selecionar: [chave: string] }>()

const menu = ref<InstanceType<typeof Menu> | null>(null)
const aberto = ref(false)
const idMenu = `${useId()}-menu`

const modelo = computed<MenuItem[]>(() =>
  props.itens.map((item) => ({
    key: item.chave,
    label: item.rotulo,
    icon: item.icone,
    disabled: item.desabilitado,
    class: item.perigoso ? 'menu-acoes__item--perigoso' : undefined,
    command: () => emit('selecionar', item.chave),
  })),
)

function alternar(evento: Event) {
  menu.value?.toggle(evento)
}
</script>

<template>
  <span class="menu-acoes">
    <Button
      type="button"
      :label="somenteIcone ? undefined : rotulo"
      :aria-label="rotuloAcessivel ?? rotulo"
      :title="somenteIcone ? rotulo : undefined"
      icon="ie ie-mais-opcoes"
      severity="secondary"
      text
      aria-haspopup="menu"
      :aria-controls="idMenu"
      :aria-expanded="aberto"
      :disabled="desabilitado"
      data-teste="menu-acoes"
      @click="alternar"
    />
    <Menu
      :id="idMenu"
      ref="menu"
      :model="modelo"
      popup
      class="menu-acoes__lista"
      @show="aberto = true"
      @hide="aberto = false"
    />
  </span>
</template>

<style scoped>
.menu-acoes {
  display: inline-flex;
}
</style>

<style>
.menu-acoes__lista .menu-acoes__item--perigoso .p-menu-item-label,
.menu-acoes__lista .menu-acoes__item--perigoso .p-menu-item-icon {
  color: var(--p-cor-erro);
}
</style>
