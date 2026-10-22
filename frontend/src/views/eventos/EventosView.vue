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
import NomesAnfitrioes from '@/componentes/base/NomesAnfitrioes.vue'
import type { ColunaListagem } from '@/componentes/base/tipos'
import { useNotificacao } from '@/composables/useNotificacao'
import { useEventosStore } from '@/stores/eventos'
import { ROTULOS_FASE, TEXTOS_EVENTOS, VARIANTE_FASE, resumoListaEventos } from '@/textos/eventos'
import type { EventoResumoDto, SituacaoListagemEventos } from '@/tipos/eventos'
import { contemTexto } from '@/utilitarios/busca'
import { formatarDataCalendario, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'

const PARAMETRO_ARQUIVADOS = 'arquivados'

const store = useEventosStore()
const rota = useRoute()
const roteador = useRouter()
const notificacao = useNotificacao()

const busca = ref('')
const idEmAndamento = ref<string | null>(null)

const opcoesSituacao: { rotulo: string; valor: SituacaoListagemEventos }[] = [
  { rotulo: TEXTOS_EVENTOS.ativos, valor: 'Ativos' },
  { rotulo: TEXTOS_EVENTOS.arquivados, valor: 'Arquivados' },
]

const colunas: ColunaListagem<EventoResumoDto>[] = [
  { campo: 'nomePrimeiraPessoa', titulo: TEXTOS_EVENTOS.colunaAnfitriao, principal: true, largura: '24%' },
  { campo: 'data', titulo: TEXTOS_EVENTOS.colunaData },
  { campo: 'fase', titulo: TEXTOS_EVENTOS.colunaFase },
  { campo: 'diasRestantes', titulo: TEXTOS_EVENTOS.colunaContagem },
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

const itensFiltrados = computed(() =>
  store.itens.filter((evento) => contemTexto(busca.value, evento.nomePrimeiraPessoa, evento.nomeSegundaPessoa)),
)

const resumo = computed(() => {
  if (store.carregando || store.falha || store.itens.length === 0) {
    return null
  }
  return resumoListaEventos(itensFiltrados.value.length, store.itens.length, situacaoDaRota.value)
})

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
      @tentar-novamente="carregar"
    >
      <template #filtros>
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
  </LayoutPainelUsuario>
</template>

<style scoped>
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

.eventos__status {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--p-ritmo-campo);
}
</style>
