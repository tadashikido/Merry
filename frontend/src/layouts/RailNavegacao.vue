<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { itemRailAtivo } from './menuPainel'
import type { ItemRail } from './tipos'
import { ROTULOS_NAVEGACAO } from '@/textos/rotulos'

const props = withDefaults(defineProps<{ itens: ItemRail[]; expandido?: boolean }>(), { expandido: false })

const rota = useRoute()
const itensComEstado = computed(() => props.itens.map((item) => ({ ...item, ativo: itemRailAtivo(item, rota.path) })))
</script>

<template>
  <nav
    class="rail-navegacao"
    :class="{ 'rail-navegacao--expandido': expandido }"
    :aria-label="ROTULOS_NAVEGACAO.navegacaoGlobal"
  >
    <ul class="rail-navegacao__lista">
      <li
        v-for="item in itensComEstado"
        :key="item.rotulo"
      >
        <RouterLink
          :to="item.rota"
          class="rail-navegacao__link"
          :class="{ 'rail-navegacao__link--ativo': item.ativo }"
          :aria-current="item.ativo ? 'page' : undefined"
          :data-rotulo="expandido ? undefined : item.rotulo"
          data-teste="item-menu"
        >
          <span
            :class="['ie', `ie-${item.icone}`, 'rail-navegacao__icone']"
            aria-hidden="true"
          />
          <span :class="expandido ? 'rail-navegacao__rotulo' : 'somente-leitor-tela'">{{ item.rotulo }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.rail-navegacao__lista {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rail-navegacao--expandido .rail-navegacao__lista {
  align-items: stretch;
}

.rail-navegacao__link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--p-dimensao-alvo-toque);
  height: var(--p-dimensao-alvo-toque);
  color: var(--p-cor-rail-icone);
  text-decoration: none;
  border-radius: var(--p-raio-controle);
  transition:
    background-color var(--p-duracao-rapida),
    color var(--p-duracao-rapida);
}

.rail-navegacao__link:hover,
.rail-navegacao__link:focus-visible {
  --p-focus-ring-color: var(--p-cor-centelha);

  color: var(--p-cor-lateral-escura-texto);
  background: var(--p-cor-lateral-escura);
}

.rail-navegacao__link--ativo,
.rail-navegacao__link--ativo:hover {
  color: var(--p-cor-rail-ativo-icone);
  background: var(--p-cor-rail-ativo);
}

.rail-navegacao__icone {
  font-size: 1.25rem;
}

.rail-navegacao--expandido .rail-navegacao__link {
  color: var(--p-cor-navegacao-texto);
}

.rail-navegacao--expandido .rail-navegacao__link:hover,
.rail-navegacao--expandido .rail-navegacao__link:focus-visible {
  --p-focus-ring-color: var(--p-cor-primaria);

  color: var(--p-cor-navegacao-ativo);
  background: var(--p-cor-superficie-sutil);
}

.rail-navegacao--expandido .rail-navegacao__link--ativo,
.rail-navegacao--expandido .rail-navegacao__link--ativo:hover {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-navegacao-ativo);
  background: var(--p-cor-primaria-suave);
}

.rail-navegacao__link[data-rotulo]::after {
  position: absolute;
  top: 50%;
  left: calc(100% + var(--p-espaco-3));
  z-index: var(--p-camada-menu);
  padding: var(--p-espaco-1) var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-toast-texto);
  white-space: nowrap;
  pointer-events: none;
  content: attr(data-rotulo);
  background: var(--p-cor-toast);
  border-radius: var(--p-raio-controle);
  box-shadow: var(--p-sombra-sobreposicao);
  opacity: 0;
  transform: translate(-4px, -50%);
  transition:
    opacity var(--p-duracao-rapida),
    transform var(--p-duracao-rapida);
}

.rail-navegacao__link[data-rotulo]:hover::after,
.rail-navegacao__link[data-rotulo]:focus-visible::after {
  opacity: 1;
  transform: translate(0, -50%);
}

.rail-navegacao--expandido .rail-navegacao__link {
  justify-content: flex-start;
  gap: var(--p-espaco-3);
  width: 100%;
  min-height: var(--p-dimensao-alvo-toque);
  padding: 0 var(--p-espaco-3);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
}
</style>
