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
import type { ItemMenuAcoes } from '@/componentes/base/tipos'
import { useConfirmarExclusao } from '@/composables/useConfirmarExclusao'
import { useNotificacao } from '@/composables/useNotificacao'
import { useAutenticacaoStore } from '@/stores/autenticacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useTarefasStore } from '@/stores/tarefas'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import {
  ROTULOS_CATEGORIA_TAREFA,
  ROTULOS_RESPONSAVEL_TAREFA,
  ROTULOS_SITUACAO_FILTRO_TAREFA,
  ROTULOS_STATUS_TAREFA,
  TEXTOS_TAREFAS,
} from '@/textos/tarefas'
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
import { formatarDataCalendarioComDiaSemana, formatarNomesCasal, formatarNumero } from '@/utilitarios/formatacao'
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

const SITUACOES_CASAL: SituacaoFiltroTarefa[] = ['abertas', 'concluidas', 'todas']

const props = defineProps<{ id: string }>()

const autenticacao = useAutenticacaoStore()
const casamentos = useCasamentosStore()
const store = useTarefasStore()
const rota = useRoute()
const roteador = useRouter()
const notificacao = useNotificacao()
const { confirmarExclusao } = useConfirmarExclusao()

const situacao = ref<SituacaoFiltroTarefa>('abertas')
const responsavel = ref<FiltroResponsavelTarefa>('Todos')
const categoria = ref<FiltroCategoriaTarefa>('Todas')
const tarefaEmAndamento = ref<string | null>(null)

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const lista = computed(() => (store.casamentoId === props.id ? store.lista : null))
const falha = computed(() => (store.casamentoId === props.id ? store.falha : null))
const visaoDoCasal = computed(() => autenticacao.ehCasal || lista.value?.somenteDoCasal === true)
const arquivado = computed(() => lista.value?.casamentoArquivado ?? casamento.value?.arquivado ?? false)
const podeGerenciar = computed(() => !visaoDoCasal.value && !arquivado.value)
const resumo = computed(() => lista.value?.resumo ?? null)

const titulo = computed(() => (visaoDoCasal.value ? TEXTOS_TAREFAS.tituloCasal : TEXTOS_TAREFAS.titulo))
const detalhes = computed(() => {
  if (!resumo.value) {
    return null
  }
  return visaoDoCasal.value
    ? TEXTOS_TAREFAS.resumoCasal(resumo.value.abertas)
    : TEXTOS_TAREFAS.resumo(resumo.value.abertas, resumo.value.concluidas)
})
const descricao = computed(() =>
  casamento.value ? `${nomes.value}, ${formatarDataCalendarioComDiaSemana(casamento.value.data)}` : undefined,
)

const situacoesDisponiveis = computed(() => (visaoDoCasal.value ? SITUACOES_CASAL : [...SITUACOES_FILTRO_TAREFA]))
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
    responsavel: visaoDoCasal.value ? 'Todos' : responsavel.value,
    categoria: visaoDoCasal.value ? 'Todas' : categoria.value,
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
    void casamentos.obter(id)
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
    return visaoDoCasal.value ? TEXTOS_TAREFAS.toastConcluidaCasal : TEXTOS_TAREFAS.toastConcluida
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
    <template v-if="falha?.tipo === 'naoEncontrado'">
      <EstadoErro
        :titulo="visaoDoCasal ? TEXTOS_TAREFAS.naoEncontradoCasalTitulo : TEXTOS_TAREFAS.naoEncontradoTitulo"
        :mensagem="TEXTOS_TAREFAS.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="tarefas__voltar"
        :to="autenticacao.casamentoDoCasal ? { name: 'casamento', params: { id: autenticacao.casamentoDoCasal } } : { name: 'casamentos' }"
        data-teste="voltar"
      >
        {{ autenticacao.casamentoDoCasal ? TEXTOS_TAREFAS.voltarNossoCasamento : TEXTOS_TAREFAS.voltarCasamentos }}
      </RouterLink>
    </template>

    <template v-else>
      <CabecalhoPagina
        :titulo="titulo"
        :descricao="descricao"
      >
        <template #trilha>
          <template v-if="!autenticacao.ehCasal">
            <RouterLink :to="{ name: 'casamentos' }">
              {{ TEXTOS_CASAMENTOS.listaTitulo }}
            </RouterLink>
            <span aria-hidden="true"> / </span>
          </template>
          <RouterLink :to="{ name: 'casamento', params: { id } }">
            {{ nomes || TEXTOS_CASAMENTOS.listaTitulo }}
          </RouterLink>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{{ TEXTOS_TAREFAS.titulo }}</span>
        </template>
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

      <div class="tarefas">
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

        <EstadoVazio
          v-else-if="semTarefas"
          icone="checklist"
          :titulo="visaoDoCasal ? TEXTOS_TAREFAS.vazioCasalTitulo : TEXTOS_TAREFAS.vazioTitulo"
          :descricao="visaoDoCasal ? TEXTOS_TAREFAS.vazioCasalTexto : TEXTOS_TAREFAS.vazioTexto"
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

        <template v-else-if="lista">
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
              v-if="!visaoDoCasal"
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
            class="tarefas__vazio-filtro"
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
            v-else
            class="tarefas__painel"
          >
            <template v-if="grupos">
              <section
                v-for="grupo in grupos"
                :key="grupo.horizonte"
                class="tarefas__grupo"
                :aria-labelledby="`grupo-${grupo.horizonte}`"
                :data-teste="`grupo-${grupo.horizonte}`"
              >
                <h2
                  :id="`grupo-${grupo.horizonte}`"
                  class="tarefas__titulo-grupo"
                  :class="{ 'tarefas__titulo-grupo--atraso': grupo.horizonte === 'atrasadas' }"
                >
                  {{ grupo.rotulo }}
                </h2>
                <ul
                  class="tarefas__lista"
                  :aria-labelledby="`grupo-${grupo.horizonte}`"
                >
                  <ItemTarefa
                    v-for="tarefa in grupo.tarefas"
                    :key="tarefa.id"
                    :titulo="tarefa.titulo"
                    :metadados="metadadosTarefa(tarefa, visaoDoCasal)"
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
            </template>
            <ul
              v-else
              class="tarefas__lista"
              :aria-label="TEXTOS_TAREFAS.listaRotulo"
            >
              <ItemTarefa
                v-for="tarefa in tarefasFiltradas"
                :key="tarefa.id"
                :titulo="tarefa.titulo"
                :metadados="metadadosTarefa(tarefa, visaoDoCasal)"
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

          <p
            v-if="visaoDoCasal"
            class="tarefas__rodape"
          >
            {{ TEXTOS_TAREFAS.rodapeCasal }}
          </p>
        </template>
      </div>
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.tarefas {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-5);
  max-width: var(--p-dimensao-largura-leitura);
}

.tarefas__filtros {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
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
  gap: var(--p-espaco-3);
}

.tarefas__painel {
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
  background: var(--p-cor-superficie);
}

.tarefas__grupo + .tarefas__grupo {
  border-top: 1px solid var(--p-cor-borda);
}

.tarefas__titulo-grupo {
  margin: 0;
  padding: var(--p-espaco-4) var(--p-espaco-4) var(--p-espaco-1);
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-apoio);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto-secundario);
}

.tarefas__titulo-grupo--atraso {
  color: var(--p-cor-erro-texto);
}

.tarefas__lista {
  margin: 0;
  padding: 0 var(--p-espaco-2);
}

.tarefas__destaque {
  display: flex;
  align-items: baseline;
  gap: var(--p-espaco-2);
  margin: 0;
}

.tarefas__destaque-numero {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-pagina);
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
  color: var(--p-cor-primaria);
}

.tarefas__vazio-filtro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-espaco-2);
  padding: var(--p-espaco-6) var(--p-espaco-4);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
  background: var(--p-cor-superficie);
  color: var(--p-cor-texto-apoio);
}

.tarefas__vazio-filtro p,
.tarefas__rodape {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.tarefas__voltar {
  display: inline-block;
  margin-top: var(--p-espaco-4);
}
</style>
