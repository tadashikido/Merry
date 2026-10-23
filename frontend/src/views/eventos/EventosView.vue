<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import ContagemRegressiva from '@/componentes/base/ContagemRegressiva.vue'
import ListagemDados from '@/componentes/base/ListagemDados.vue'
import NomesAnfitrioes from '@/componentes/base/NomesAnfitrioes.vue'
import type { ColunaListagem } from '@/componentes/base/tipos'
import { useNotificacao } from '@/composables/useNotificacao'
import { useEventosStore } from '@/stores/eventos'
import { ROTULOS_FASE, TEXTOS_EVENTOS, VARIANTE_FASE, descreverContagem, resumoListaEventos } from '@/textos/eventos'
import { vocabularioDoTipo } from '@/textos/tiposEvento'
import type { EventoResumoDto, FaseEvento, SituacaoListagemEventos, TipoEvento } from '@/tipos/eventos'
import { contemTexto } from '@/utilitarios/busca'
import { contarPorFase, contarPorTipo, descreverCarteiraPorTipo, filtrarEventos } from '@/utilitarios/carteiraEventos'
import { formatarDataCalendario, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'

const PARAMETRO_ARQUIVADOS = 'arquivados'

const store = useEventosStore()
const rota = useRoute()
const roteador = useRouter()
const notificacao = useNotificacao()

const busca = ref('')
const tipo = ref<TipoEvento | null>(null)
const fase = ref<FaseEvento | null>(null)
const idEmAndamento = ref<string | null>(null)

const opcoesSituacao: { rotulo: string; valor: SituacaoListagemEventos }[] = [
  { rotulo: TEXTOS_EVENTOS.ativos, valor: 'Ativos' },
  { rotulo: TEXTOS_EVENTOS.arquivados, valor: 'Arquivados' },
]

const colunas: ColunaListagem<EventoResumoDto>[] = [
  { campo: 'nomePrimeiraPessoa', titulo: TEXTOS_EVENTOS.colunaEvento, principal: true, largura: '36%' },
  { campo: 'data', titulo: TEXTOS_EVENTOS.colunaData },
  { campo: 'fase', titulo: TEXTOS_EVENTOS.colunaFase },
  { campo: 'diasRestantes', titulo: TEXTOS_EVENTOS.colunaContagem, ocultarNoTablet: true },
  { campo: 'localCerimonia', titulo: TEXTOS_EVENTOS.colunaLocal, ocultarNoTablet: true },
]

const situacaoDaRota = computed<SituacaoListagemEventos>(() =>
  rota.query.situacao === PARAMETRO_ARQUIVADOS ? 'Arquivados' : 'Ativos',
)

const situacao = computed<SituacaoListagemEventos>({
  get: () => situacaoDaRota.value,
  set: (valor) => {
    void roteador.replace({ query: valor === 'Arquivados' ? { situacao: PARAMETRO_ARQUIVADOS } : {} })
  },
})

const emArquivados = computed(() => situacaoDaRota.value === 'Arquivados')

const listaEstavel = computed(() => !store.carregando && !store.falha)
const filtrosAtivos = computed(() => tipo.value !== null || fase.value !== null)

const itensFiltrados = computed(() =>
  filtrarEventos(store.itens, { tipo: tipo.value, fase: fase.value }).filter((evento) =>
    contemTexto(busca.value, evento.nomePrimeiraPessoa, evento.nomeSegundaPessoa),
  ),
)

const resumo = computed(() => {
  if (!listaEstavel.value || store.itens.length === 0) {
    return null
  }
  return resumoListaEventos(itensFiltrados.value.length, store.itens.length, situacaoDaRota.value)
})

const quantidadesPorTipo = computed(() => (listaEstavel.value ? contarPorTipo(store.itens) : []))
const quantidadesPorFase = computed(() => (listaEstavel.value ? contarPorFase(store.itens) : []))

const composicaoPorTipo = computed(() =>
  resumo.value && quantidadesPorTipo.value.length > 1 ? descreverCarteiraPorTipo(quantidadesPorTipo.value) : null,
)

const opcoesTipo = computed<{ rotulo: string; valor: TipoEvento | null }[]>(() => [
  { rotulo: TEXTOS_EVENTOS.todosOsTipos, valor: null },
  ...quantidadesPorTipo.value.map(({ tipo: valor, quantidade }) => ({
    rotulo: TEXTOS_EVENTOS.opcaoComQuantidade(vocabularioDoTipo(valor).rotulo, quantidade),
    valor,
  })),
  ...(tipo.value && !quantidadesPorTipo.value.some((item) => item.tipo === tipo.value)
    ? [{ rotulo: vocabularioDoTipo(tipo.value).rotulo, valor: tipo.value }]
    : []),
])

const opcoesFase = computed<{ rotulo: string; valor: FaseEvento | null }[]>(() => [
  { rotulo: TEXTOS_EVENTOS.todasAsFases, valor: null },
  ...quantidadesPorFase.value.map(({ fase: valor, quantidade }) => ({
    rotulo: TEXTOS_EVENTOS.opcaoComQuantidade(ROTULOS_FASE[valor], quantidade),
    valor,
  })),
  ...(fase.value && !quantidadesPorFase.value.some((item) => item.fase === fase.value)
    ? [{ rotulo: ROTULOS_FASE[fase.value], valor: fase.value }]
    : []),
])

function limparFiltros() {
  tipo.value = null
  fase.value = null
}

const mensagemErro = computed(() => {
  if (!store.falha) {
    return null
  }
  return store.falha.tipo === 'semPermissao' ? TEXTOS_EVENTOS.semAcesso : TEXTOS_EVENTOS.erroCarregarTexto
})

function nomes(evento: EventoResumoDto): string {
  return formatarNomesAnfitrioes(evento.nomePrimeiraPessoa, evento.nomeSegundaPessoa)
}

function dataComHorario(evento: EventoResumoDto): string {
  const data = formatarDataCalendario(evento.data)
  return evento.horario ? `${data}, ${evento.horario}` : data
}

function carregar() {
  void store.carregar(situacaoDaRota.value)
}

watch(situacaoDaRota, carregar, { immediate: true })

async function alternarArquivamento(evento: EventoResumoDto) {
  idEmAndamento.value = evento.id
  const resultado = evento.arquivado ? await store.restaurar(evento.id) : await store.arquivar(evento.id)
  idEmAndamento.value = null

  if (resultado.ok) {
    notificacao.sucesso(
      resultado.valor.arquivado ? TEXTOS_EVENTOS.arquivado(nomes(evento)) : TEXTOS_EVENTOS.restaurado(nomes(evento)),
    )
    return
  }

  if (resultado.falha.tipo === 'semPermissao') {
    notificacao.erro(TEXTOS_EVENTOS.semPermissao)
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
      :titulo="TEXTOS_EVENTOS.listaTitulo"
      :descricao="TEXTOS_EVENTOS.listaDescricao"
    >
      <template
        v-if="resumo"
        #detalhes
      >
        <p
          class="texto-legenda"
          aria-live="polite"
          data-teste="resumo-eventos"
        >
          {{ resumo }}
        </p>
        <p
          v-if="composicaoPorTipo"
          class="texto-legenda"
          data-teste="resumo-tipos"
        >
          {{ composicaoPorTipo }}
        </p>
      </template>
      <template #acoes>
        <Button
          :label="TEXTOS_EVENTOS.novoEvento"
          icon="ie ie-mais"
          data-teste="novo-evento"
          @click="roteador.push({ name: 'evento-novo' })"
        />
      </template>
    </CabecalhoPagina>

    <div class="eventos">
      <ListagemDados
        v-model:busca="busca"
        :itens="itensFiltrados"
        :colunas="colunas"
        chave="id"
        :rotulo="TEXTOS_EVENTOS.listaRotulo"
        :carregando="store.carregando"
        :erro="mensagemErro"
        :placeholder-busca="TEXTOS_EVENTOS.placeholderBusca"
        :titulo-vazio="emArquivados ? TEXTOS_EVENTOS.vazioArquivadosTitulo : TEXTOS_EVENTOS.vazioAtivosTitulo"
        :descricao-vazio="emArquivados ? TEXTOS_EVENTOS.vazioArquivadosTexto : TEXTOS_EVENTOS.vazioAtivosTexto"
        :filtros-ativos="filtrosAtivos"
        @tentar-novamente="carregar"
        @limpar-filtros="limparFiltros"
      >
        <template #filtros>
          <Select
            v-model="tipo"
            :options="opcoesTipo"
            option-label="rotulo"
            option-value="valor"
            :placeholder="TEXTOS_EVENTOS.todosOsTipos"
            :disabled="!listaEstavel"
            :aria-label="TEXTOS_EVENTOS.filtroTipo"
            class="eventos__filtro"
            data-teste="filtro-tipo"
          />
          <Select
            v-model="fase"
            :options="opcoesFase"
            option-label="rotulo"
            option-value="valor"
            :placeholder="TEXTOS_EVENTOS.todasAsFases"
            :disabled="!listaEstavel"
            :aria-label="TEXTOS_EVENTOS.filtroFase"
            class="eventos__filtro"
            data-teste="filtro-fase"
          />
          <SelectButton
            v-model="situacao"
            :options="opcoesSituacao"
            option-label="rotulo"
            option-value="valor"
            :allow-empty="false"
            :aria-label="TEXTOS_EVENTOS.filtroSituacao"
            data-teste="filtro-situacao"
          />
        </template>

        <template #acao-vazio>
          <Button
            v-if="!emArquivados"
            :label="TEXTOS_EVENTOS.novoEvento"
            severity="secondary"
            outlined
            @click="roteador.push({ name: 'evento-novo' })"
          />
        </template>

        <template #celula-nomePrimeiraPessoa="{ item }">
          <RouterLink
            class="eventos__link"
            :to="{ name: 'evento', params: { id: item.id } }"
            data-teste="link-evento"
          >
            <NomesAnfitrioes
              :primeiro="item.nomePrimeiraPessoa"
              :segundo="item.nomeSegundaPessoa"
            />
          </RouterLink>
          <span class="eventos__apoio texto-legenda">
            <span data-teste="tipo-evento">{{ vocabularioDoTipo(item.tipo).rotulo }}</span>
            <span
              v-if="item.convidadosEstimados"
              data-teste="convidados-estimados"
            >{{ TEXTOS_EVENTOS.convidadosEstimados(item.convidadosEstimados) }}</span>
          </span>
        </template>

        <template #celula-data="{ item }">
          <span class="numeros-tabulares">{{ dataComHorario(item) }}</span>
        </template>

        <template #celula-fase="{ item }">
          <span class="eventos__status">
            <BadgeStatus
              :texto="ROTULOS_FASE[item.fase]"
              :variante="VARIANTE_FASE[item.fase]"
            />
            <BadgeStatus
              v-if="item.arquivado"
              :texto="TEXTOS_EVENTOS.statusArquivado"
            />
          </span>
          <span
            class="eventos__contagem-na-fase numeros-tabulares"
            data-teste="contagem-na-fase"
          >{{ descreverContagem(item.diasRestantes) }}</span>
        </template>

        <template #celula-diasRestantes="{ item }">
          <ContagemRegressiva :dias="item.diasRestantes" />
        </template>

        <template #acoes-linha="{ item }">
          <Button
            v-if="!item.arquivado"
            :label="TEXTOS_EVENTOS.editar"
            :aria-label="TEXTOS_EVENTOS.acaoComNome(TEXTOS_EVENTOS.editar, nomes(item))"
            icon="ie ie-editar"
            severity="secondary"
            text
            :disabled="idEmAndamento !== null"
            data-teste="editar-evento"
            @click="roteador.push({ name: 'evento-editar', params: { id: item.id } })"
          />
          <Button
            :label="item.arquivado ? TEXTOS_EVENTOS.restaurar : TEXTOS_EVENTOS.arquivar"
            :aria-label="
              TEXTOS_EVENTOS.acaoComNome(item.arquivado ? TEXTOS_EVENTOS.restaurar : TEXTOS_EVENTOS.arquivar, nomes(item))
            "
            :icon="item.arquivado ? 'ie ie-restaurar' : 'ie ie-arquivar'"
            severity="secondary"
            text
            :loading="idEmAndamento === item.id"
            :disabled="idEmAndamento !== null && idEmAndamento !== item.id"
            :data-teste="item.arquivado ? 'restaurar-evento' : 'arquivar-evento'"
            @click="alternarArquivamento(item)"
          />
        </template>
      </ListagemDados>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.eventos {
  container: eventos / inline-size;
}

.eventos__filtro {
  min-height: var(--p-dimensao-alvo-toque);
}

.eventos__apoio {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--p-ritmo-campo);
}

.eventos__link {
  color: var(--p-cor-texto);
  text-decoration: none;
  border-radius: var(--p-raio-campo);
}

.eventos__link:hover {
  color: var(--p-cor-texto);
  text-decoration: underline;
  text-decoration-color: var(--p-cor-primaria);
}

.eventos :deep(.eventos__contagem-na-fase) {
  display: none;
}

.eventos__status {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo);
}

@container eventos (max-width: 39.99rem) {
  .eventos__filtro {
    flex: 1 1 100%;
  }
}

@container eventos (max-width: 63.99rem) {
  .eventos :deep(.listagem__tabela .eventos__contagem-na-fase) {
    display: block;
    margin-top: var(--p-ritmo-campo);
    font-size: var(--p-fonte-tamanho-controle);
    color: var(--p-cor-texto-apoio);
  }

  .eventos :deep(.listagem__tabela .listagem__coluna--secundaria),
  .eventos :deep(.listagem__tabela .listagem__acoes-linha .p-button-label) {
    display: none;
  }
}
</style>
