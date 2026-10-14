<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import ContagemRegressiva from '@/componentes/base/ContagemRegressiva.vue'
import ListagemDados from '@/componentes/base/ListagemDados.vue'
import NomesCasal from '@/componentes/base/NomesCasal.vue'
import type { ColunaListagem } from '@/componentes/base/tipos'
import { useNotificacao } from '@/composables/useNotificacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { ROTULOS_FASE, TEXTOS_CASAMENTOS, VARIANTE_FASE, resumoListaCasamentos } from '@/textos/casamentos'
import type { CasamentoResumoDto, SituacaoListagemCasamentos } from '@/tipos/casamentos'
import { contemTexto } from '@/utilitarios/busca'
import { formatarDataCalendario, formatarNomesCasal } from '@/utilitarios/formatacao'

const PARAMETRO_ARQUIVADOS = 'arquivados'

const store = useCasamentosStore()
const rota = useRoute()
const roteador = useRouter()
const notificacao = useNotificacao()

const busca = ref('')
const idEmAndamento = ref<string | null>(null)

const opcoesSituacao: { rotulo: string; valor: SituacaoListagemCasamentos }[] = [
  { rotulo: TEXTOS_CASAMENTOS.ativos, valor: 'Ativos' },
  { rotulo: TEXTOS_CASAMENTOS.arquivados, valor: 'Arquivados' },
]

const colunas: ColunaListagem<CasamentoResumoDto>[] = [
  { campo: 'nomePrimeiraPessoa', titulo: TEXTOS_CASAMENTOS.colunaCasal, principal: true },
  { campo: 'data', titulo: TEXTOS_CASAMENTOS.colunaData },
  { campo: 'fase', titulo: TEXTOS_CASAMENTOS.colunaFase },
  { campo: 'diasRestantes', titulo: TEXTOS_CASAMENTOS.colunaContagem },
  { campo: 'localCerimonia', titulo: TEXTOS_CASAMENTOS.colunaLocal, ocultarNoTablet: true },
]

const situacaoDaRota = computed<SituacaoListagemCasamentos>(() =>
  rota.query.situacao === PARAMETRO_ARQUIVADOS ? 'Arquivados' : 'Ativos',
)

const situacao = computed<SituacaoListagemCasamentos>({
  get: () => situacaoDaRota.value,
  set: (valor) => {
    void roteador.replace({ query: valor === 'Arquivados' ? { situacao: PARAMETRO_ARQUIVADOS } : {} })
  },
})

const emArquivados = computed(() => situacaoDaRota.value === 'Arquivados')

const itensFiltrados = computed(() =>
  store.itens.filter((casamento) => contemTexto(busca.value, casamento.nomePrimeiraPessoa, casamento.nomeSegundaPessoa)),
)

const resumo = computed(() => {
  if (store.carregando || store.falha || store.itens.length === 0) {
    return null
  }
  return resumoListaCasamentos(itensFiltrados.value.length, store.itens.length, situacaoDaRota.value)
})

const mensagemErro = computed(() => {
  if (!store.falha) {
    return null
  }
  return store.falha.tipo === 'semPermissao' ? TEXTOS_CASAMENTOS.semAcesso : TEXTOS_CASAMENTOS.erroCarregarTexto
})

function nomes(casamento: CasamentoResumoDto): string {
  return formatarNomesCasal(casamento.nomePrimeiraPessoa, casamento.nomeSegundaPessoa)
}

function dataComHorario(casamento: CasamentoResumoDto): string {
  const data = formatarDataCalendario(casamento.data)
  return casamento.horario ? `${data}, ${casamento.horario}` : data
}

function carregar() {
  void store.carregar(situacaoDaRota.value)
}

watch(situacaoDaRota, carregar, { immediate: true })

async function alternarArquivamento(casamento: CasamentoResumoDto) {
  idEmAndamento.value = casamento.id
  const resultado = casamento.arquivado ? await store.restaurar(casamento.id) : await store.arquivar(casamento.id)
  idEmAndamento.value = null

  if (resultado.ok) {
    notificacao.sucesso(
      resultado.valor.arquivado ? TEXTOS_CASAMENTOS.arquivado(nomes(casamento)) : TEXTOS_CASAMENTOS.restaurado(nomes(casamento)),
    )
    return
  }

  if (resultado.falha.tipo === 'semPermissao') {
    notificacao.erro(TEXTOS_CASAMENTOS.semPermissao)
    return
  }

  notificacao.erro()
  if (resultado.falha.tipo === 'naoEncontrado') {
    carregar()
  }
}
</script>

<template>
  <LayoutPainelUsuario>
    <CabecalhoPagina
      :titulo="TEXTOS_CASAMENTOS.listaTitulo"
      :descricao="TEXTOS_CASAMENTOS.listaDescricao"
    >
      <template
        v-if="resumo"
        #detalhes
      >
        <p
          class="texto-legenda"
          aria-live="polite"
          data-teste="resumo-casamentos"
        >
          {{ resumo }}
        </p>
      </template>
      <template #acoes>
        <Button
          :label="TEXTOS_CASAMENTOS.novoCasamento"
          icon="ie ie-mais"
          data-teste="novo-casamento"
          @click="roteador.push({ name: 'casamento-novo' })"
        />
      </template>
    </CabecalhoPagina>

    <ListagemDados
      v-model:busca="busca"
      :itens="itensFiltrados"
      :colunas="colunas"
      chave="id"
      :rotulo="TEXTOS_CASAMENTOS.listaRotulo"
      :carregando="store.carregando"
      :erro="mensagemErro"
      :placeholder-busca="TEXTOS_CASAMENTOS.placeholderBusca"
      :titulo-vazio="emArquivados ? TEXTOS_CASAMENTOS.vazioArquivadosTitulo : TEXTOS_CASAMENTOS.vazioAtivosTitulo"
      :descricao-vazio="emArquivados ? TEXTOS_CASAMENTOS.vazioArquivadosTexto : TEXTOS_CASAMENTOS.vazioAtivosTexto"
      @tentar-novamente="carregar"
    >
      <template #filtros>
        <SelectButton
          v-model="situacao"
          :options="opcoesSituacao"
          option-label="rotulo"
          option-value="valor"
          :allow-empty="false"
          :aria-label="TEXTOS_CASAMENTOS.filtroSituacao"
          data-teste="filtro-situacao"
        />
      </template>

      <template #acao-vazio>
        <Button
          v-if="!emArquivados"
          :label="TEXTOS_CASAMENTOS.novoCasamento"
          severity="secondary"
          outlined
          @click="roteador.push({ name: 'casamento-novo' })"
        />
      </template>

      <template #celula-nomePrimeiraPessoa="{ item }">
        <RouterLink
          class="casamentos__link"
          :to="{ name: 'casamento', params: { id: item.id } }"
          data-teste="link-casamento"
        >
          <NomesCasal
            :primeiro="item.nomePrimeiraPessoa"
            :segundo="item.nomeSegundaPessoa"
          />
        </RouterLink>
      </template>

      <template #celula-data="{ item }">
        <span class="numeros-tabulares casamentos__data">{{ dataComHorario(item) }}</span>
      </template>

      <template #celula-fase="{ item }">
        <span class="casamentos__status">
          <BadgeStatus
            :texto="ROTULOS_FASE[item.fase]"
            :variante="VARIANTE_FASE[item.fase]"
          />
          <BadgeStatus
            v-if="item.arquivado"
            :texto="TEXTOS_CASAMENTOS.statusArquivado"
          />
        </span>
      </template>

      <template #celula-diasRestantes="{ item }">
        <ContagemRegressiva :dias="item.diasRestantes" />
      </template>

      <template #acoes-linha="{ item }">
        <Button
          v-if="!item.arquivado"
          :label="TEXTOS_CASAMENTOS.editar"
          :aria-label="TEXTOS_CASAMENTOS.acaoComNome(TEXTOS_CASAMENTOS.editar, nomes(item))"
          icon="ie ie-editar"
          severity="secondary"
          text
          :disabled="idEmAndamento !== null"
          data-teste="editar-casamento"
          @click="roteador.push({ name: 'casamento-editar', params: { id: item.id } })"
        />
        <Button
          :label="item.arquivado ? TEXTOS_CASAMENTOS.restaurar : TEXTOS_CASAMENTOS.arquivar"
          :aria-label="
            TEXTOS_CASAMENTOS.acaoComNome(item.arquivado ? TEXTOS_CASAMENTOS.restaurar : TEXTOS_CASAMENTOS.arquivar, nomes(item))
          "
          :icon="item.arquivado ? 'ie ie-restaurar' : 'ie ie-arquivar'"
          severity="secondary"
          text
          :loading="idEmAndamento === item.id"
          :disabled="idEmAndamento !== null && idEmAndamento !== item.id"
          :data-teste="item.arquivado ? 'restaurar-casamento' : 'arquivar-casamento'"
          @click="alternarArquivamento(item)"
        />
      </template>
    </ListagemDados>
  </LayoutPainelUsuario>
</template>

<style scoped>
.casamentos__link {
  color: var(--p-cor-texto);
  text-decoration: none;
  border-radius: var(--p-raio-campo);
}

.casamentos__link :deep(.nomes-casal) {
  overflow-wrap: normal;
}

.casamentos__link:hover {
  color: var(--p-cor-texto);
  text-decoration: underline;
  text-decoration-color: var(--p-cor-primaria);
}

.casamentos__data {
  white-space: nowrap;
}

.casamentos__status {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo);
}
</style>
