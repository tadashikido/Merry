<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LayoutPainel from './LayoutPainel.vue'
import { ITENS_RAIL_ASSESSORIA, itensRailCasal } from './menuPainel'
import { gruposNavegacaoCasamento } from './modulosCasamento'
import type { ContextoCasamento, IndicadorModulo, ModuloCasamento, NivelTrilha, OpcaoSeletorCasamento } from './tipos'
import { CHAVE_TRILHA, destinoTrocaCasamento, montarTrilha } from './trilha'
import ResumoUsuario from '@/componentes/base/ResumoUsuario.vue'
import { somenteAssessoria } from '@/router/guardaAutenticacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { TEXTOS_AREA_CASAL } from '@/textos/acessoCasal'
import { TEXTOS_CHECKLIST } from '@/textos/checklist'
import { formatarNomesCasal } from '@/utilitarios/formatacao'

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

const nomeRotaAtual = computed(() => (typeof rota.name === 'string' ? rota.name : null))

const trilha = computed<NivelTrilha[]>(() => {
  const atual = contextoCasamento.value
  return montarTrilha(
    nomeRotaAtual.value,
    rota.params,
    (nome) => roteador.getRoutes().find((registro) => registro.name === nome),
    {
      ehCasal: store.ehCasal,
      rotuloCasamento: atual ? formatarNomesCasal(atual.nomePrimeiraPessoa, atual.nomeSegundaPessoa) : null,
    },
  )
})

provide(CHAVE_TRILHA, trilha)

const exibeSeletor = computed(() => !store.ehCasal && casamentoId.value !== null)

const opcoesSeletor = computed<OpcaoSeletorCasamento[] | null>(() =>
  exibeSeletor.value
    ? casamentos.ativos.map((casamento) => ({
        id: casamento.id,
        nomePrimeiraPessoa: casamento.nomePrimeiraPessoa,
        nomeSegundaPessoa: casamento.nomeSegundaPessoa,
        rotulo: formatarNomesCasal(casamento.nomePrimeiraPessoa, casamento.nomeSegundaPessoa),
        data: casamento.data,
        diasRestantes: casamento.diasRestantes,
      }))
    : null,
)

watch(
  casamentoId,
  (id) => {
    if (id && casamentos.atual?.id !== id) {
      void casamentos.obter(id)
    }
  },
  { immediate: true },
)

watch(
  () => exibeSeletor.value && !casamentos.ativosCarregados,
  (precisaCarregar) => {
    if (precisaCarregar) {
      void casamentos.garantirAtivos()
    }
  },
  { immediate: true },
)

function trocarCasamento(id: string) {
  if (id === casamentoId.value) {
    return
  }
  void roteador.push(destinoTrocaCasamento(nomeRotaAtual.value, id))
}

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
    :casamento-id="casamentoId"
    :opcoes-seletor="opcoesSeletor"
    @trocar-casamento="trocarCasamento"
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
