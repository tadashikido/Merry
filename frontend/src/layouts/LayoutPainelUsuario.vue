<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LayoutPainel from './LayoutPainel.vue'
import { ITENS_RAIL_ASSESSORIA, itensRailCasal } from './menuPainel'
import { gruposNavegacaoCasamento } from './modulosCasamento'
import type { ContextoCasamento, IndicadorModulo, ModuloCasamento } from './tipos'
import ResumoUsuario from '@/componentes/base/ResumoUsuario.vue'
import { somenteAssessoria } from '@/router/guardaAutenticacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { TEXTOS_AREA_CASAL } from '@/textos/acessoCasal'
import { TEXTOS_CHECKLIST } from '@/textos/checklist'

const store = useAutenticacaoStore()
const casamentos = useCasamentosStore()
const rota = useRoute()
const roteador = useRouter()
const saindo = ref(false)

const nomeUsuario = computed(() => store.usuario?.nome ?? '')
const nomeOrganizacao = computed(() => {
  const organizacao = store.usuario?.organizacao.nome ?? ''
  return store.ehCasal ? TEXTOS_AREA_CASAL.rodape(organizacao) : organizacao
})
const itensRail = computed(() =>
  store.ehCasal && store.casamentoDoCasal ? itensRailCasal(store.casamentoDoCasal) : ITENS_RAIL_ASSESSORIA,
)

const casamentoId = computed(() => {
  const id = rota.params.id
  return typeof id === 'string' && rota.path.startsWith('/casamentos/') ? id : null
})

function podeAcessar(modulo: ModuloCasamento): boolean {
  if (!store.ehCasal) {
    return true
  }
  return !somenteAssessoria(roteador.resolve({ name: modulo.rota, params: { id: casamentoId.value ?? '' } }))
}

const indicadoresCasamento = computed<Partial<Record<string, IndicadorModulo>>>(() => {
  const atual = casamentos.atual
  const percentual = atual && atual.id === casamentoId.value ? atual.percentualChecklist : null
  if (store.ehCasal || percentual === null || percentual === undefined) {
    return {}
  }
  return {
    checklist: {
      texto: TEXTOS_CHECKLIST.indicadorNavegacao(percentual),
      rotuloAcessivel: TEXTOS_CHECKLIST.indicadorNavegacaoAria(percentual),
    },
  }
})

const gruposCasamento = computed(() =>
  casamentoId.value
    ? gruposNavegacaoCasamento(
        casamentoId.value,
        typeof rota.name === 'string' ? rota.name : null,
        podeAcessar,
        undefined,
        indicadoresCasamento.value,
      )
    : null,
)

const contextoCasamento = computed<ContextoCasamento | null>(() => {
  const atual = casamentos.atual
  return atual && atual.id === casamentoId.value ? atual : null
})

watch(
  casamentoId,
  (id) => {
    if (id && casamentos.atual?.id !== id) {
      void casamentos.obter(id)
    }
  },
  { immediate: true },
)

async function sair() {
  saindo.value = true
  await store.sair()
  saindo.value = false
}
</script>

<template>
  <LayoutPainel
    :itens-rail="itensRail"
    :grupos-casamento="gruposCasamento"
    :contexto-casamento="contextoCasamento"
    :contexto="store.ehCasal ? 'casal' : 'assessoria'"
  >
    <template #rodape-menu="{ variante }">
      <ResumoUsuario
        :nome="nomeUsuario"
        :organizacao="nomeOrganizacao"
        :saindo="saindo"
        :variante="variante"
        @sair="sair"
      />
    </template>

    <slot />
  </LayoutPainel>
</template>
