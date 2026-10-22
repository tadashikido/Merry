<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LayoutPainel from './LayoutPainel.vue'
import { ITENS_RAIL_ASSESSORIA, itensRailAnfitriao } from './menuPainel'
import { gruposNavegacaoEvento } from './modulosEvento'
import type { ContextoEvento, IndicadorModulo, ModuloEvento, NivelTrilha, OpcaoSeletorEvento } from './tipos'
import { CHAVE_TRILHA, destinoTrocaEvento, montarTrilha } from './trilha'
import ResumoUsuario from '@/componentes/base/ResumoUsuario.vue'
import { somenteAssessoria } from '@/router/guardaAutenticacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useEventosStore } from '@/stores/eventos'
import { TEXTOS_AREA_ANFITRIAO } from '@/textos/acessoAnfitriao'
import { TEXTOS_CHECKLIST } from '@/textos/checklist'
import { formatarNomesAnfitrioes } from '@/utilitarios/formatacao'

const store = useAutenticacaoStore()
const eventos = useEventosStore()
const rota = useRoute()
const roteador = useRouter()
const saindo = ref(false)

const nomeUsuario = computed(() => store.usuario?.nome ?? '')
const nomeOrganizacao = computed(() => {
  const organizacao = store.usuario?.organizacao.nome ?? ''
  return store.ehAnfitriao ? TEXTOS_AREA_ANFITRIAO.rodape(organizacao) : organizacao
})
const itensRail = computed(() =>
  store.ehAnfitriao && store.eventoDoAnfitriao ? itensRailAnfitriao(store.eventoDoAnfitriao) : ITENS_RAIL_ASSESSORIA,
)

const eventoId = computed(() => {
  const id = rota.params.id
  return typeof id === 'string' && rota.path.startsWith('/eventos/') ? id : null
})

function podeAcessar(modulo: ModuloEvento): boolean {
  if (!store.ehAnfitriao) {
    return true
  }
  return !somenteAssessoria(roteador.resolve({ name: modulo.rota, params: { id: eventoId.value ?? '' } }))
}

const indicadoresEvento = computed<Partial<Record<string, IndicadorModulo>>>(() => {
  const atual = eventos.atual
  const percentual = atual && atual.id === eventoId.value ? atual.percentualChecklist : null
  if (store.ehAnfitriao || percentual === null || percentual === undefined) {
    return {}
  }
  return {
    checklist: {
      texto: TEXTOS_CHECKLIST.indicadorNavegacao(percentual),
      rotuloAcessivel: TEXTOS_CHECKLIST.indicadorNavegacaoAria(percentual),
    },
  }
})

const gruposEvento = computed(() =>
  eventoId.value
    ? gruposNavegacaoEvento(
        eventoId.value,
        typeof rota.name === 'string' ? rota.name : null,
        podeAcessar,
        undefined,
        indicadoresEvento.value,
      )
    : null,
)

const contextoEvento = computed<ContextoEvento | null>(() => {
  const atual = eventos.atual
  return atual && atual.id === eventoId.value ? atual : null
})

const nomeRotaAtual = computed(() => (typeof rota.name === 'string' ? rota.name : null))

const trilha = computed<NivelTrilha[]>(() => {
  const atual = contextoEvento.value
  return montarTrilha(
    nomeRotaAtual.value,
    rota.params,
    (nome) => roteador.getRoutes().find((registro) => registro.name === nome),
    {
      ehAnfitriao: store.ehAnfitriao,
      rotuloEvento: atual ? formatarNomesAnfitrioes(atual.nomePrimeiraPessoa, atual.nomeSegundaPessoa) : null,
    },
  )
})

provide(CHAVE_TRILHA, trilha)

const exibeSeletor = computed(() => !store.ehAnfitriao && eventoId.value !== null)

const opcoesSeletor = computed<OpcaoSeletorEvento[] | null>(() =>
  exibeSeletor.value
    ? eventos.ativos.map((evento) => ({
        id: evento.id,
        nomePrimeiraPessoa: evento.nomePrimeiraPessoa,
        nomeSegundaPessoa: evento.nomeSegundaPessoa,
        rotulo: formatarNomesAnfitrioes(evento.nomePrimeiraPessoa, evento.nomeSegundaPessoa),
        data: evento.data,
        diasRestantes: evento.diasRestantes,
      }))
    : null,
)

watch(
  eventoId,
  (id) => {
    if (id && eventos.atual?.id !== id) {
      void eventos.obter(id)
    }
  },
  { immediate: true },
)

watch(
  () => exibeSeletor.value && !eventos.ativosCarregados,
  (precisaCarregar) => {
    if (precisaCarregar) {
      void eventos.garantirAtivos()
    }
  },
  { immediate: true },
)

function trocarEvento(id: string) {
  if (id === eventoId.value) {
    return
  }
  void roteador.push(destinoTrocaEvento(nomeRotaAtual.value, id))
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
    :grupos-evento="gruposEvento"
    :contexto-evento="contextoEvento"
    :contexto="store.ehAnfitriao ? 'anfitriao' : 'assessoria'"
    :evento-id="eventoId"
    :opcoes-seletor="opcoesSeletor"
    @trocar-evento="trocarEvento"
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
