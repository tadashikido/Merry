<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import ItemTarefa from '@/componentes/base/ItemTarefa.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import SugestaoTarefasModelo from '@/componentes/tarefas/SugestaoTarefasModelo.vue'
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useEventosStore } from '@/stores/eventos'
import { useTarefasStore } from '@/stores/tarefas'
import {
  ROTULOS_CATEGORIA_TAREFA,
  ROTULOS_RESPONSAVEL_TAREFA,
  ROTULOS_SITUACAO_FILTRO_TAREFA,
  ROTULOS_STATUS_TAREFA,
  TEXTOS_TAREFAS,
} from '@/textos/tarefas'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import {
  CATEGORIAS_TAREFA,
  RESPONSAVEIS_TAREFA,
  SITUACOES_FILTRO_TAREFA,
  type FiltroCategoriaTarefa,
  type FiltroResponsavelTarefa,
  type SituacaoFiltroTarefa,
  type StatusTarefa,
  type TarefaDto,
} from '@/tipos/tarefas'
import { formatarDataCalendarioComDiaSemana, formatarNomesAnfitrioes, formatarNumero } from '@/utilitarios/formatacao'
import {
  agruparPorHorizonte,
  badgeTarefa,
  contagemSituacao,
  filtrarTarefas,
  metadadosTarefa,
  tarefaAberta,
  type GrupoTarefas,
} from '@/utilitarios/tarefas'

type AcaoTarefa = 'editar' | 'iniciar' | 'reabrir' | 'cancelar' | 'excluir'

const SITUACOES_ANFITRIAO: SituacaoFiltroTarefa[] = ['abertas', 'concluidas', 'todas']

const props = defineProps<{ id: string }>()

const autenticacao = useAutenticacaoStore()
const eventos = useEventosStore()
const store = useTarefasStore()
const rota = useRoute()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const situacao = ref<SituacaoFiltroTarefa>('abertas')
const responsavel = ref<FiltroResponsavelTarefa>('Todos')
const categoria = ref<FiltroCategoriaTarefa>('Todas')
const tarefaEmAndamento = ref<string | null>(null)

const evento = computed(() => (eventos.atual?.id === props.id ? eventos.atual : null))
const nomes = computed(() =>
  evento.value ? formatarNomesAnfitrioes(evento.value.nomePrimeiraPessoa, evento.value.nomeSegundaPessoa) : '',
)
const lista = computed(() => (store.eventoId === props.id ? store.lista : null))
const falha = computed(() => (store.eventoId === props.id ? store.falha : null))
const visaoDoAnfitriao = computed(() => autenticacao.ehAnfitriao || lista.value?.somenteDoAnfitriao === true)
const arquivado = computed(() => lista.value?.eventoArquivado ?? evento.value?.arquivado ?? false)
const podeGerenciar = computed(() => !visaoDoAnfitriao.value && !arquivado.value)
const resumo = computed(() => lista.value?.resumo ?? null)
const vocabulario = computed(() => vocabularioOuNeutro(evento.value?.tipo))
const checklistVazio = computed(() => lista.value !== null && !lista.value.tarefas.some((tarefa) => tarefa.geradaDeModelo))
const mostrarSugestao = computed(() => podeGerenciar.value && !falha.value && evento.value !== null && checklistVazio.value)

const titulo = computed(() => (visaoDoAnfitriao.value ? TEXTOS_TAREFAS.tituloAnfitriao : TEXTOS_TAREFAS.titulo))
const detalhes = computed(() => {
  if (!resumo.value) {
    return null
  }
  return visaoDoAnfitriao.value
    ? TEXTOS_TAREFAS.resumoAnfitriao(resumo.value.abertas)
    : TEXTOS_TAREFAS.resumo(resumo.value.abertas, resumo.value.concluidas)
})
const descricao = computed(() =>
  evento.value ? `${nomes.value}, ${formatarDataCalendarioComDiaSemana(evento.value.data)}` : undefined,
)

const progresso = computed(() => {
  if (!resumo.value) {
    return null
  }
  const ativas = Math.max(0, resumo.value.total - resumo.value.canceladas)
  const concluidas = Math.min(resumo.value.concluidas, ativas)
  const percentual = ativas > 0 ? Math.round((concluidas * 100) / ativas) : 0
  return { ativas, concluidas, percentual }
})

const indicadores = computed(() => {
  if (!resumo.value) {
    return []
  }
  const itens: { chave: string; rotulo: string; valor: number; atraso: boolean }[] = [
    { chave: 'abertas', rotulo: TEXTOS_TAREFAS.indicadorAbertas, valor: resumo.value.abertas, atraso: false },
    { chave: 'atrasadas', rotulo: TEXTOS_TAREFAS.indicadorAtrasadas, valor: resumo.value.atrasadas, atraso: resumo.value.atrasadas > 0 },
    { chave: 'semana', rotulo: TEXTOS_TAREFAS.indicadorSemana, valor: resumo.value.estaSemana, atraso: false },
  ]
  if (!visaoDoAnfitriao.value) {
    itens.push({ chave: 'canceladas', rotulo: TEXTOS_TAREFAS.indicadorCanceladas, valor: resumo.value.canceladas, atraso: false })
  }
  return itens
})

const situacoesDisponiveis = computed(() => (visaoDoAnfitriao.value ? SITUACOES_ANFITRIAO : [...SITUACOES_FILTRO_TAREFA]))
const opcoesSituacao = computed(() =>
  situacoesDisponiveis.value.map((valor) => ({
    valor,
    rotulo: TEXTOS_TAREFAS.opcaoSituacao(ROTULOS_SITUACAO_FILTRO_TAREFA[valor], contagemSituacao(resumo.value, valor)),
  })),
)
const opcoesResponsavel: { valor: FiltroResponsavelTarefa; rotulo: string }[] = [
  { valor: 'Todos', rotulo: TEXTOS_TAREFAS.responsavelTodos },
  ...RESPONSAVEIS_TAREFA.map((valor) => ({ valor, rotulo: ROTULOS_RESPONSAVEL_TAREFA[valor] })),
]
const opcoesCategoria: { valor: FiltroCategoriaTarefa; rotulo: string }[] = [
  { valor: 'Todas', rotulo: TEXTOS_TAREFAS.categoriaTodas },
  ...CATEGORIAS_TAREFA.map((valor) => ({ valor, rotulo: ROTULOS_CATEGORIA_TAREFA[valor] })),
]

const tarefasFiltradas = computed(() =>
  filtrarTarefas(lista.value?.tarefas ?? [], {
    situacao: situacao.value,
    responsavel: visaoDoAnfitriao.value ? 'Todos' : responsavel.value,
    categoria: visaoDoAnfitriao.value ? 'Todas' : categoria.value,
  }),
)

const grupos = computed<GrupoTarefas[] | null>(() =>
  situacao.value === 'abertas' ? agruparPorHorizonte(tarefasFiltradas.value) : null,
)

const semTarefas = computed(() => lista.value !== null && lista.value.tarefas.length === 0)
const filtrosSecundariosPadrao = computed(() => responsavel.value === 'Todos' && categoria.value === 'Todas')

function situacaoDaRota(): SituacaoFiltroTarefa {
  const valor = rota.query.situacao
  return typeof valor === 'string' && (SITUACOES_FILTRO_TAREFA as readonly string[]).includes(valor)
    ? (valor as SituacaoFiltroTarefa)
    : 'abertas'
}

watch(
  () => props.id,
  (id) => {
    situacao.value = situacaoDaRota()
    responsavel.value = 'Todos'
    categoria.value = 'Todas'
    void eventos.obter(id)
    void store.carregar(id)
  },
  { immediate: true },
)

watch(
  () => rota.query.situacao,
  () => {
    situacao.value = situacaoDaRota()
  },
)

watch(situacoesDisponiveis, (disponiveis) => {
  if (!disponiveis.includes(situacao.value)) {
    situacao.value = 'abertas'
  }
})

watch(situacao, (valor) => {
  const atual = rota.query.situacao
  const desejado = valor === 'abertas' ? undefined : valor
  if (atual !== desejado) {
    void roteador.replace({ query: { ...rota.query, situacao: desejado } })
  }
})

watch(
  nomes,
  (valor) => {
    if (valor) {
      document.title = TEXTOS_TAREFAS.tituloDocumento(valor)
    }
  },
  { immediate: true },
)

function limparFiltros() {
  situacao.value = 'todas'
  responsavel.value = 'Todos'
  categoria.value = 'Todas'
}

function rotuloAlternar(tarefa: TarefaDto): string {
  if (tarefa.status === 'Cancelada' || arquivado.value) {
    return TEXTOS_TAREFAS.somenteLeituraAria(tarefa.titulo, ROTULOS_STATUS_TAREFA[tarefa.status])
  }
  return tarefa.status === 'Concluida' ? TEXTOS_TAREFAS.reabrirAria(tarefa.titulo) : TEXTOS_TAREFAS.concluirAria(tarefa.titulo)
}

function mensagemSucesso(status: StatusTarefa): string {
  if (status === 'Concluida') {
    return visaoDoAnfitriao.value ? TEXTOS_TAREFAS.toastConcluidaAnfitriao : TEXTOS_TAREFAS.toastConcluida
  }
  if (status === 'Cancelada') {
    return TEXTOS_TAREFAS.toastCancelada
  }
  return status === 'EmAndamento' ? TEXTOS_TAREFAS.toastIniciada : TEXTOS_TAREFAS.toastReaberta
}

function mensagemFalha(tipo: string, mensagem: string | null): string {
  if (tipo === 'semPermissao') {
    return TEXTOS_TAREFAS.semPermissao
  }
  if (tipo === 'regra' && mensagem) {
    return mensagem
  }
  if (tipo === 'naoEncontrado') {
    return TEXTOS_TAREFAS.tarefaNaoEncontradaTexto
  }
  return TEXTOS_TAREFAS.erroAlterar
}

async function mudarStatus(tarefa: TarefaDto, status: StatusTarefa, permitirDesfazer: boolean) {
  const anterior = tarefa.status
  tarefaEmAndamento.value = tarefa.id
  const resultado = await store.alterarStatus(props.id, tarefa.id, status)
  tarefaEmAndamento.value = null

  if (!resultado.ok) {
    notificacao.erro(mensagemFalha(resultado.falha.tipo, resultado.falha.mensagem))
    if (resultado.falha.tipo === 'naoEncontrado') {
      void store.carregar(props.id)
    }
    return
  }

  const reverter = async () => {
    const volta = await store.alterarStatus(props.id, tarefa.id, anterior)
    if (volta.ok) {
      notificacao.sucesso(mensagemSucesso(anterior))
    } else {
      notificacao.erro(mensagemFalha(volta.falha.tipo, volta.falha.mensagem))
    }
  }

  notificacao.sucesso(mensagemSucesso(status), permitirDesfazer ? { desfazer: reverter } : undefined)
}

function alternar(tarefa: TarefaDto) {
  if (arquivado.value || tarefa.status === 'Cancelada' || tarefaEmAndamento.value) {
    return
  }
  const novo: StatusTarefa = tarefa.status === 'Concluida' ? 'AFazer' : 'Concluida'
  void mudarStatus(tarefa, novo, novo === 'Concluida')
}

function acoesDaTarefa(tarefa: TarefaDto): ItemMenuAcoes[] {
  const itens: ItemMenuAcoes[] = [{ chave: 'editar', rotulo: TEXTOS_TAREFAS.acaoEditar, icone: 'ie ie-editar' }]
  if (tarefa.status === 'AFazer') {
    itens.push({ chave: 'iniciar', rotulo: TEXTOS_TAREFAS.acaoIniciar, icone: 'ie ie-prazo' })
  }
  if (tarefa.status === 'Concluida' || tarefa.status === 'Cancelada') {
    itens.push({ chave: 'reabrir', rotulo: TEXTOS_TAREFAS.acaoReabrir, icone: 'ie ie-restaurar' })
  }
  if (tarefaAberta(tarefa.status)) {
    itens.push({ chave: 'cancelar', rotulo: TEXTOS_TAREFAS.acaoCancelar, icone: 'ie ie-fechar' })
  }
  itens.push({ chave: 'excluir', rotulo: TEXTOS_TAREFAS.acaoExcluir, icone: 'ie ie-excluir', perigoso: true })
  return itens
}

function executarAcao(tarefa: TarefaDto, chave: string) {
  switch (chave as AcaoTarefa) {
    case 'editar':
      void roteador.push({ name: 'tarefa-editar', params: { id: props.id, tarefaId: tarefa.id } })
      return
    case 'iniciar':
      void mudarStatus(tarefa, 'EmAndamento', false)
      return
    case 'reabrir':
      void mudarStatus(tarefa, 'AFazer', false)
      return
    case 'cancelar':
      void mudarStatus(tarefa, 'Cancelada', true)
      return
    case 'excluir':
      excluir(tarefa)
  }
}

function excluir(tarefa: TarefaDto) {
  confirmarExclusao({
    nomeItem: tarefa.titulo,
    mensagem: TEXTOS_TAREFAS.confirmarExclusaoTexto,
    aoConfirmar: async () => {
      const resultado = await store.remover(props.id, tarefa.id)
      if (!resultado.ok) {
        notificacao.erro(mensagemFalha(resultado.falha.tipo, resultado.falha.mensagem))
        throw new Error(resultado.falha.mensagem ?? resultado.falha.tipo)
      }
    },
  })
}

function novaTarefa() {
  void roteador.push({ name: 'tarefa-nova', params: { id: props.id } })
}
</script>

<template>
  <LayoutPainelUsuario>
    <div
      v-if="falha?.tipo === 'naoEncontrado'"
      class="pilha pilha--grupo"
    >
      <EstadoErro
        :titulo="visaoDoAnfitriao ? TEXTOS_TAREFAS.naoEncontradoAnfitriaoTitulo : TEXTOS_TAREFAS.naoEncontradoTitulo"
        :mensagem="TEXTOS_TAREFAS.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="tarefas__voltar"
        :to="autenticacao.eventoDoAnfitriao ? { name: 'evento', params: { id: autenticacao.eventoDoAnfitriao } } : { name: 'eventos' }"
        data-teste="voltar"
      >
        {{ autenticacao.eventoDoAnfitriao ? TEXTOS_TAREFAS.voltarNossoEvento : TEXTOS_TAREFAS.voltarEventos }}
      </RouterLink>
    </div>

    <template v-else>
      <CabecalhoPagina
        :titulo="titulo"
        :descricao="descricao"
      >
        <template
          v-if="detalhes"
          #detalhes
        >
          <span data-teste="resumo-tarefas">{{ detalhes }}</span>
        </template>
        <template
          v-if="resumo && resumo.total > 0"
          #destaque
        >
          <p
            v-if="resumo.atrasadas > 0"
            class="tarefas__destaque tarefas__destaque--atraso"
            data-teste="destaque-atrasadas"
          >
            <span class="tarefas__destaque-numero">{{ formatarNumero(resumo.atrasadas) }}</span>
            <span class="tarefas__destaque-rotulo">{{ TEXTOS_TAREFAS.destaqueAtrasadas(resumo.atrasadas) }}</span>
          </p>
          <p
            v-else
            class="tarefas__destaque tarefas__destaque--em-dia"
            data-teste="destaque-em-dia"
          >
            <span
              class="ie ie-concluido"
              aria-hidden="true"
            />
            <span class="tarefas__destaque-rotulo">{{ TEXTOS_TAREFAS.destaqueEmDia }}</span>
          </p>
        </template>
        <template
          v-if="podeGerenciar && !falha"
          #acoes
        >
          <Button
            :label="TEXTOS_TAREFAS.nova"
            icon="ie ie-mais"
            data-teste="nova-tarefa"
            @click="novaTarefa"
          />
        </template>
      </CabecalhoPagina>

      <div class="tarefas com-lateral pilha pilha--bloco">
        <MensagemFormulario
          v-if="arquivado"
          variante="alerta"
          :mensagem="TEXTOS_TAREFAS.arquivado"
          data-teste="aviso-arquivado"
        />

        <EstadoCarregando
          v-if="store.carregando && !lista"
          variante="lista"
          :linhas="5"
        />

        <EstadoErro
          v-else-if="falha?.tipo === 'semPermissao'"
          :titulo="TEXTOS_TAREFAS.erroTitulo"
          :mensagem="TEXTOS_TAREFAS.semAcesso"
          :pode-tentar-novamente="false"
          variante="semPermissao"
        />

        <EstadoErro
          v-else-if="falha"
          :titulo="TEXTOS_TAREFAS.erroTitulo"
          :mensagem="TEXTOS_TAREFAS.erroTexto"
          @tentar-novamente="store.carregar(id)"
        />

        <div
          v-else-if="semTarefas"
          class="tarefas__corpo"
          :class="{ 'tarefas__corpo--sem-lateral': !mostrarSugestao }"
        >
          <EstadoVazio
            icone="checklist"
            :titulo="visaoDoAnfitriao ? TEXTOS_TAREFAS.vazioAnfitriaoTitulo : TEXTOS_TAREFAS.vazioTitulo"
            :descricao="visaoDoAnfitriao ? TEXTOS_TAREFAS.vazioAnfitriaoTexto : TEXTOS_TAREFAS.vazioTextoEvento(vocabulario.referencia.artigo)"
          >
            <template
              v-if="podeGerenciar"
              #acao
            >
              <Button
                :label="TEXTOS_TAREFAS.nova"
                icon="ie ie-mais"
                severity="secondary"
                outlined
                data-teste="nova-tarefa-vazio"
                @click="novaTarefa"
              />
            </template>
          </EstadoVazio>
          <div
            v-if="mostrarSugestao && evento"
            class="tarefas__lateral"
          >
            <SugestaoTarefasModelo
              :evento-id="id"
              :tipo="evento.tipo"
            />
          </div>
        </div>

        <div
          v-else-if="lista"
          class="tarefas__corpo"
        >
          <div class="tarefas__principal pilha pilha--cartao">
            <div
              class="tarefas__filtros"
              data-teste="filtros-tarefas"
            >
              <div class="tarefas__trilho">
                <SelectButton
                  v-model="situacao"
                  :options="opcoesSituacao"
                  option-label="rotulo"
                  option-value="valor"
                  :allow-empty="false"
                  :aria-label="TEXTOS_TAREFAS.filtroSituacao"
                  data-teste="filtro-situacao"
                />
              </div>
              <div
                v-if="!visaoDoAnfitriao"
                class="tarefas__filtros-secundarios"
              >
                <SelectButton
                  v-model="responsavel"
                  :options="opcoesResponsavel"
                  option-label="rotulo"
                  option-value="valor"
                  :allow-empty="false"
                  :aria-label="TEXTOS_TAREFAS.filtroResponsavel"
                  data-teste="filtro-responsavel"
                />
                <Select
                  v-model="categoria"
                  :options="opcoesCategoria"
                  option-label="rotulo"
                  option-value="valor"
                  :aria-label="TEXTOS_TAREFAS.filtroCategoria"
                  data-teste="filtro-categoria"
                />
              </div>
            </div>

            <div
              v-if="tarefasFiltradas.length === 0"
              class="tarefas__vazio-filtro cartao"
              data-teste="vazio-filtro"
            >
              <p>{{ TEXTOS_TAREFAS.vazioFiltro }}</p>
              <Button
                v-if="situacao !== 'todas' || !filtrosSecundariosPadrao"
                :label="TEXTOS_TAREFAS.verTodas"
                severity="secondary"
                text
                data-teste="ver-todas"
                @click="limparFiltros"
              />
            </div>

            <div
              v-else-if="grupos"
              class="pilha pilha--cartao"
            >
              <section
                v-for="grupo in grupos"
                :key="grupo.horizonte"
                class="tarefas__grupo pilha pilha--campo"
                :aria-labelledby="`grupo-${grupo.horizonte}`"
                :data-teste="`grupo-${grupo.horizonte}`"
              >
                <h2
                  :id="`grupo-${grupo.horizonte}`"
                  class="tarefas__titulo-grupo texto-rotulo"
                  :class="{ 'tarefas__titulo-grupo--atraso': grupo.horizonte === 'atrasadas' }"
                >
                  {{ grupo.rotulo }}
                </h2>
                <ul
                  class="tarefas__lista cartao"
                  :aria-labelledby="`grupo-${grupo.horizonte}`"
                >
                  <ItemTarefa
                    v-for="tarefa in grupo.tarefas"
                    :key="tarefa.id"
                    :titulo="tarefa.titulo"
                    :metadados="metadadosTarefa(tarefa, visaoDoAnfitriao)"
                    :descricao="tarefa.descricao"
                    :badge="badgeTarefa(tarefa)"
                    :concluida="tarefa.status === 'Concluida'"
                    :cancelada="tarefa.status === 'Cancelada'"
                    :pode-alternar="!arquivado"
                    :alternando="tarefaEmAndamento === tarefa.id"
                    :rotulo-alternar="rotuloAlternar(tarefa)"
                    @alternar="alternar(tarefa)"
                  >
                    <template
                      v-if="podeGerenciar"
                      #acoes
                    >
                      <MenuAcoes
                        :itens="acoesDaTarefa(tarefa)"
                        :rotulo="TEXTOS_TAREFAS.maisAcoes"
                        :rotulo-acessivel="TEXTOS_TAREFAS.maisAcoesAria(tarefa.titulo)"
                        :desabilitado="tarefaEmAndamento !== null"
                        somente-icone
                        @selecionar="executarAcao(tarefa, $event)"
                      />
                    </template>
                  </ItemTarefa>
                </ul>
              </section>
            </div>

            <ul
              v-else
              class="tarefas__lista cartao"
              :aria-label="TEXTOS_TAREFAS.listaRotulo"
            >
              <ItemTarefa
                v-for="tarefa in tarefasFiltradas"
                :key="tarefa.id"
                :titulo="tarefa.titulo"
                :metadados="metadadosTarefa(tarefa, visaoDoAnfitriao)"
                :descricao="tarefa.descricao"
                :badge="badgeTarefa(tarefa)"
                :concluida="tarefa.status === 'Concluida'"
                :cancelada="tarefa.status === 'Cancelada'"
                :pode-alternar="!arquivado"
                :alternando="tarefaEmAndamento === tarefa.id"
                :rotulo-alternar="rotuloAlternar(tarefa)"
                @alternar="alternar(tarefa)"
              >
                <template
                  v-if="podeGerenciar"
                  #acoes
                >
                  <MenuAcoes
                    :itens="acoesDaTarefa(tarefa)"
                    :rotulo="TEXTOS_TAREFAS.maisAcoes"
                    :rotulo-acessivel="TEXTOS_TAREFAS.maisAcoesAria(tarefa.titulo)"
                    :desabilitado="tarefaEmAndamento !== null"
                    somente-icone
                    @selecionar="executarAcao(tarefa, $event)"
                  />
                </template>
              </ItemTarefa>
            </ul>
          </div>

          <aside
            class="tarefas__lateral pilha pilha--grupo"
            aria-labelledby="titulo-progresso-tarefas"
            data-teste="lateral-tarefas"
          >
            <div
              v-if="progresso"
              class="tarefas__progresso cartao pilha pilha--grupo"
              data-teste="progresso-tarefas"
            >
              <h2
                id="titulo-progresso-tarefas"
                class="texto-rotulo"
              >
                {{ visaoDoAnfitriao ? TEXTOS_TAREFAS.progressoTituloAnfitriao : TEXTOS_TAREFAS.progressoTitulo }}
              </h2>
              <div class="pilha pilha--campo">
                <p
                  class="tarefas__percentual"
                  data-teste="percentual-tarefas"
                >
                  {{ progresso.percentual }}%
                </p>
                <div
                  class="tarefas__trilho-progresso"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-valuenow="progresso.percentual"
                  :aria-valuetext="TEXTOS_TAREFAS.progressoAria(progresso.percentual, progresso.concluidas, progresso.ativas)"
                  aria-labelledby="titulo-progresso-tarefas"
                  data-teste="barra-progresso-tarefas"
                >
                  <span
                    class="tarefas__preenchimento"
                    :style="{ inlineSize: `${progresso.percentual}%` }"
                  />
                </div>
                <p
                  class="tarefas__legenda-progresso texto-legenda"
                  data-teste="legenda-progresso-tarefas"
                >
                  {{
                    visaoDoAnfitriao
                      ? TEXTOS_TAREFAS.progressoLegendaAnfitriao(progresso.concluidas, progresso.ativas)
                      : TEXTOS_TAREFAS.progressoLegenda(progresso.concluidas, progresso.ativas)
                  }}
                </p>
              </div>
              <dl class="tarefas__indicadores">
                <div
                  v-for="indicador in indicadores"
                  :key="indicador.chave"
                  class="tarefas__indicador"
                  :class="{ 'tarefas__indicador--atraso': indicador.atraso }"
                  :data-teste="`indicador-${indicador.chave}`"
                >
                  <dt>{{ indicador.rotulo }}</dt>
                  <dd class="numeros-tabulares">
                    {{ formatarNumero(indicador.valor) }}
                  </dd>
                </div>
              </dl>
            </div>

            <SugestaoTarefasModelo
              v-if="mostrarSugestao && evento"
              :evento-id="id"
              :tipo="evento.tipo"
            />

            <p
              v-if="visaoDoAnfitriao"
              class="tarefas__rodape texto-legenda"
            >
              {{ TEXTOS_TAREFAS.rodapeAnfitriao }}
            </p>
          </aside>
        </div>
      </div>
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.tarefas {
  container: tarefas com-lateral / inline-size;
}

.tarefas__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco);
  align-items: start;
}

.tarefas__principal {
  min-width: 0;
}

.tarefas__filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-ritmo-grupo);
  min-width: 0;
}

.tarefas__trilho {
  max-width: 100%;
  overflow-x: auto;
}

.tarefas__filtros-secundarios {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-grupo);
}

.tarefas__titulo-grupo {
  margin: 0;
}

.tarefas__titulo-grupo--atraso {
  color: var(--p-cor-erro-texto);
}

.tarefas .tarefas__lista {
  margin: 0;
  padding: var(--p-ritmo-campo) var(--p-ritmo-grupo);
}

.tarefas__vazio-filtro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
}

.tarefas__vazio-filtro p {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.tarefas__lateral {
  min-width: 0;
  container: lateral / inline-size;
}

.tarefas__progresso h2 {
  margin: 0;
}

.tarefas__percentual {
  margin: 0;
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-leve);
  font-variant-numeric: lining-nums tabular-nums;
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-sucesso-texto);
}

.tarefas__trilho-progresso {
  height: var(--p-ritmo-campo);
  overflow: hidden;
  background: var(--p-cor-trilho);
  border-radius: var(--p-raio-total);
}

.tarefas__preenchimento {
  display: block;
  height: 100%;
  background: var(--p-cor-sucesso);
  border-radius: var(--p-raio-total);
  transition: inline-size var(--p-duracao-lenta) ease-out;
}

.tarefas__legenda-progresso {
  margin: 0;
}

.tarefas__indicadores {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding-top: var(--p-ritmo-grupo);
  border-top: 1px solid var(--p-cor-divisoria);
}

.tarefas__indicador {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--p-ritmo-grupo);
  padding-block: var(--p-ritmo-campo);
  font-size: var(--p-fonte-tamanho-controle);
}

.tarefas__indicador dt {
  color: var(--p-cor-texto-secundario);
}

.tarefas__indicador dd {
  margin: 0;
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.tarefas__indicador--atraso dt,
.tarefas__indicador--atraso dd {
  color: var(--p-cor-erro-texto);
}

.tarefas__rodape {
  margin: 0;
}

.tarefas__destaque {
  display: flex;
  align-items: baseline;
  gap: var(--p-ritmo-campo);
  margin: 0;
}

.tarefas__destaque-numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  font-variant-numeric: lining-nums tabular-nums;
}

.tarefas__destaque-rotulo {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.tarefas__destaque--atraso .tarefas__destaque-numero {
  color: var(--p-cor-erro-texto);
}

.tarefas__destaque--em-dia {
  align-items: center;
  color: var(--p-cor-sucesso-texto);
}

.tarefas__destaque--em-dia .tarefas__destaque-rotulo {
  color: var(--p-cor-sucesso-texto);
}

.tarefas__voltar {
  align-self: flex-start;
}

@container lateral (min-width: 36rem) {
  .tarefas__progresso {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    column-gap: var(--p-ritmo-bloco);
  }

  .tarefas__progresso > .tarefas__indicadores {
    grid-column: 2;
    grid-row: 1 / span 2;
    padding-top: 0;
    padding-left: var(--p-ritmo-bloco);
    border-top: 0;
    border-left: 1px solid var(--p-cor-divisoria);
  }
}

@container com-lateral (min-width: 52rem) {
  .tarefas__corpo {
    grid-template-columns: minmax(0, 1fr) var(--com-lateral-largura);
  }

  .tarefas__corpo--sem-lateral {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tarefas__preenchimento {
    transition: none;
  }
}
</style>
