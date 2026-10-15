<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Select from 'primevue/select'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import ItemTarefa from '@/componentes/base/ItemTarefa.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import MenuAcoes from '@/componentes/base/MenuAcoes.vue'
import ProgressoChecklist from '@/componentes/base/ProgressoChecklist.vue'
import ReguaMarcos from '@/componentes/base/ReguaMarcos.vue'
import type { ItemMenuAcoes, MarcoRegua } from '@/componentes/base/tipos'
import { useNotificacao } from '@/composables/useNotificacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useChecklistStore } from '@/stores/checklist'
import { useModelosChecklistStore } from '@/stores/modelosChecklist'
import { COMPLEMENTO_MARCO_CHECKLIST, ROTULOS_MARCO_CHECKLIST, TEXTOS_CHECKLIST } from '@/textos/checklist'
import { ROTULOS_STATUS_TAREFA, TEXTOS_TAREFAS } from '@/textos/tarefas'
import type { AplicacaoModeloChecklistDto } from '@/tipos/checklist'
import type { StatusTarefa, TarefaDto } from '@/tipos/tarefas'
import { agruparPorMarco, diasAntesDoCasamento } from '@/utilitarios/checklist'
import { formatarDataCalendarioComDiaSemana, formatarNomesCasal } from '@/utilitarios/formatacao'
import { badgeTarefa, metadadosTarefa, tarefaAberta } from '@/utilitarios/tarefas'

const props = defineProps<{ id: string }>()

const casamentos = useCasamentosStore()
const store = useChecklistStore()
const modelos = useModelosChecklistStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const modeloSelecionado = ref<string | null>(null)
const previa = ref<AplicacaoModeloChecklistDto | null>(null)
const carregandoPrevia = ref(false)
const erroPrevia = ref(false)
const aplicando = ref(false)
const erroAplicacao = ref<string | null>(null)
const painelAberto = ref(false)
const tarefaEmAndamento = ref<string | null>(null)
const dialogoRecalculo = ref(false)
const recalculando = ref(false)

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const dados = computed(() => (store.casamentoId === props.id ? store.dados : null))
const falha = computed(() => (store.casamentoId === props.id ? store.falha : null))
const arquivado = computed(() => dados.value?.casamentoArquivado ?? casamento.value?.arquivado ?? false)
const semChecklist = computed(() => dados.value !== null && dados.value.tarefas.length === 0)
const mostrarPainel = computed(() => !arquivado.value && (semChecklist.value || painelAberto.value))
const descricao = computed(() =>
  casamento.value ? `${nomes.value}, ${formatarDataCalendarioComDiaSemana(casamento.value.data)}` : undefined,
)

const opcoesModelos = computed(() =>
  (modelos.lista ?? []).map((modelo) => ({ valor: modelo.id, rotulo: modelo.nome })),
)

const grupos = computed(() => {
  const atual = dados.value
  if (!atual) {
    return []
  }
  return agruparPorMarco(atual.tarefas, (tarefa) => diasAntesDoCasamento(atual.dataCasamento, tarefa.prazo))
})

const marcos = computed<MarcoRegua[]>(() =>
  grupos.value.map((grupo) => {
    const concluidas = grupo.itens.filter((tarefa) => tarefa.status === 'Concluida').length
    const encerradas = grupo.itens.filter((tarefa) => !tarefaAberta(tarefa.status)).length
    return {
      chave: grupo.marco,
      rotulo: ROTULOS_MARCO_CHECKLIST[grupo.marco],
      complemento: COMPLEMENTO_MARCO_CHECKLIST[grupo.marco],
      detalhe: TEXTOS_CHECKLIST.progresso(concluidas, grupo.itens.length),
      concluido: encerradas === grupo.itens.length && concluidas > 0,
    }
  }),
)

const mensagemPrevia = computed<string[]>(() => {
  const atual = previa.value
  if (!atual) {
    return []
  }
  if (atual.excedeLimite) {
    return []
  }
  if (atual.tarefasCriadas === 0) {
    return [TEXTOS_CHECKLIST.previaNada]
  }
  const linhas = [TEXTOS_CHECKLIST.previaCriar(atual.tarefasCriadas)]
  if (atual.jaAplicadas > 0) {
    linhas.push(TEXTOS_CHECKLIST.previaExistentes(atual.jaAplicadas))
  }
  if (atual.nascemAtrasadas > 0) {
    linhas.push(TEXTOS_CHECKLIST.previaAtrasadas(atual.nascemAtrasadas))
  }
  return linhas
})

const podeAplicar = computed(
  () =>
    Boolean(modeloSelecionado.value) &&
    previa.value !== null &&
    !previa.value.excedeLimite &&
    previa.value.tarefasCriadas > 0 &&
    !carregandoPrevia.value,
)

const acoesTarefa: ItemMenuAcoes[] = [{ chave: 'editar', rotulo: TEXTOS_TAREFAS.acaoEditar, icone: 'ie ie-editar' }]

watch(
  () => props.id,
  (id) => {
    painelAberto.value = false
    previa.value = null
    void casamentos.obter(id)
    void store.carregar(id)
    void modelos.listar()
  },
  { immediate: true },
)

watch(
  () => modelos.lista,
  (lista) => {
    if (!lista || lista.length === 0) {
      modeloSelecionado.value = null
      return
    }
    if (!modeloSelecionado.value || !lista.some((modelo) => modelo.id === modeloSelecionado.value)) {
      modeloSelecionado.value = (lista.find((modelo) => modelo.sugerido) ?? lista[0])?.id ?? null
    }
  },
  { immediate: true },
)

watch(
  [modeloSelecionado, mostrarPainel],
  () => {
    void atualizarPrevia()
  },
  { immediate: true },
)

watch(
  nomes,
  (valor) => {
    if (valor) {
      document.title = TEXTOS_CHECKLIST.tituloDocumento(valor)
    }
  },
  { immediate: true },
)

async function atualizarPrevia() {
  const modeloId = modeloSelecionado.value
  if (!modeloId || !mostrarPainel.value) {
    previa.value = null
    return
  }
  carregandoPrevia.value = true
  erroPrevia.value = false
  erroAplicacao.value = null
  const resultado = await store.previa(props.id, modeloId)
  if (modeloSelecionado.value !== modeloId) {
    return
  }
  carregandoPrevia.value = false
  if (resultado.ok) {
    previa.value = resultado.valor
  } else {
    previa.value = null
    erroPrevia.value = true
  }
}

async function aplicar() {
  const modeloId = modeloSelecionado.value
  if (!modeloId || !podeAplicar.value) {
    return
  }
  aplicando.value = true
  erroAplicacao.value = null
  const resultado = await store.aplicar(props.id, modeloId)
  aplicando.value = false

  if (!resultado.ok) {
    if (resultado.falha.tipo === 'conflito') {
      notificacao.erro(TEXTOS_CHECKLIST.conflito)
      void store.carregar(props.id)
      void atualizarPrevia()
      return
    }
    erroAplicacao.value =
      resultado.falha.tipo === 'regra' && resultado.falha.mensagem ? resultado.falha.mensagem : TEXTOS_CHECKLIST.erroAplicar
    return
  }

  const { tarefasCriadas, nascemAtrasadas } = resultado.valor
  notificacao.sucesso(
    nascemAtrasadas > 0
      ? TEXTOS_CHECKLIST.toastAplicadoAtrasadas(tarefasCriadas, nascemAtrasadas)
      : TEXTOS_CHECKLIST.toastAplicado(tarefasCriadas),
  )
  painelAberto.value = false
}

function tarefasDoMarco(chave: string): TarefaDto[] {
  return grupos.value.find((grupo) => grupo.marco === chave)?.itens ?? []
}

function rotuloAlternar(tarefa: TarefaDto): string {
  if (tarefa.status === 'Cancelada' || arquivado.value) {
    return TEXTOS_TAREFAS.somenteLeituraAria(tarefa.titulo, ROTULOS_STATUS_TAREFA[tarefa.status])
  }
  return tarefa.status === 'Concluida' ? TEXTOS_TAREFAS.reabrirAria(tarefa.titulo) : TEXTOS_TAREFAS.concluirAria(tarefa.titulo)
}

async function mudarStatus(tarefa: TarefaDto, status: StatusTarefa) {
  const anterior = tarefa.status
  tarefaEmAndamento.value = tarefa.id
  const resultado = await store.alterarStatus(props.id, tarefa.id, status)
  tarefaEmAndamento.value = null

  if (!resultado.ok) {
    notificacao.erro(
      resultado.falha.tipo === 'regra' && resultado.falha.mensagem ? resultado.falha.mensagem : TEXTOS_TAREFAS.erroAlterar,
    )
    if (resultado.falha.tipo === 'naoEncontrado') {
      void store.carregar(props.id)
    }
    return
  }

  if (status !== 'Concluida') {
    notificacao.sucesso(TEXTOS_TAREFAS.toastReaberta)
    return
  }

  notificacao.sucesso(TEXTOS_TAREFAS.toastConcluida, {
    desfazer: async () => {
      const volta = await store.alterarStatus(props.id, tarefa.id, anterior)
      if (volta.ok) {
        notificacao.sucesso(TEXTOS_TAREFAS.toastReaberta)
      } else {
        notificacao.erro(TEXTOS_TAREFAS.erroAlterar)
      }
    },
  })
}

function alternar(tarefa: TarefaDto) {
  if (arquivado.value || tarefa.status === 'Cancelada' || tarefaEmAndamento.value) {
    return
  }
  void mudarStatus(tarefa, tarefa.status === 'Concluida' ? 'AFazer' : 'Concluida')
}

function executarAcao(tarefa: TarefaDto) {
  void roteador.push({ name: 'tarefa-editar', params: { id: props.id, tarefaId: tarefa.id } })
}

async function recalcular() {
  recalculando.value = true
  const resultado = await store.recalcular(props.id)
  recalculando.value = false
  dialogoRecalculo.value = false
  if (!resultado.ok) {
    notificacao.erro(
      resultado.falha.tipo === 'regra' && resultado.falha.mensagem ? resultado.falha.mensagem : TEXTOS_CHECKLIST.erroRecalcular,
    )
    return
  }
  notificacao.sucesso(TEXTOS_CHECKLIST.toastRecalculado(resultado.valor.tarefas))
}
</script>

<template>
  <LayoutPainelUsuario>
    <template v-if="falha?.tipo === 'naoEncontrado'">
      <EstadoErro
        :titulo="TEXTOS_TAREFAS.naoEncontradoTitulo"
        :mensagem="TEXTOS_TAREFAS.naoEncontradoTexto"
        :pode-tentar-novamente="false"
      />
      <RouterLink
        class="checklist__voltar"
        :to="{ name: 'casamentos' }"
        data-teste="voltar"
      >
        {{ TEXTOS_TAREFAS.voltarCasamentos }}
      </RouterLink>
    </template>

    <template v-else>
      <CabecalhoPagina
        :titulo="TEXTOS_CHECKLIST.titulo"
        :descricao="descricao"
      >
        <template
          v-if="dados && !semChecklist && !arquivado && !painelAberto"
          #acoes
        >
          <Button
            :label="TEXTOS_CHECKLIST.aplicarOutroTitulo"
            icon="ie ie-mais"
            severity="secondary"
            outlined
            :aria-expanded="painelAberto"
            aria-controls="painel-aplicar-modelo"
            data-teste="abrir-aplicar"
            @click="painelAberto = true"
          />
        </template>
      </CabecalhoPagina>

      <div class="checklist">
        <EstadoCarregando
          v-if="store.carregando && !dados"
          variante="lista"
          :linhas="5"
        />

        <EstadoErro
          v-else-if="falha?.tipo === 'semPermissao'"
          :titulo="TEXTOS_CHECKLIST.erroTitulo"
          :mensagem="TEXTOS_CHECKLIST.semAcesso"
          :pode-tentar-novamente="false"
          variante="semPermissao"
        />

        <EstadoErro
          v-else-if="falha"
          :titulo="TEXTOS_CHECKLIST.erroTitulo"
          :mensagem="TEXTOS_CHECKLIST.erroTexto"
          @tentar-novamente="store.carregar(id)"
        />

        <template v-else-if="dados">
          <section
            class="checklist__progresso"
            :aria-label="TEXTOS_CHECKLIST.progressoRotulo"
          >
            <ProgressoChecklist
              :percentual="dados.progresso.percentual"
              :concluidas="dados.progresso.concluidas"
              :consideradas="dados.progresso.consideradas"
              :canceladas="dados.progresso.canceladas"
            />
          </section>

          <MensagemFormulario
            v-if="arquivado"
            variante="alerta"
            :mensagem="TEXTOS_CHECKLIST.arquivado"
            data-teste="aviso-arquivado"
          />

          <MensagemFormulario
            v-else-if="dados.prazosDesatualizados > 0"
            variante="alerta"
            :mensagem="TEXTOS_CHECKLIST.prazosDesatualizados(dados.prazosDesatualizados)"
            data-teste="aviso-prazos"
          >
            <Button
              :label="TEXTOS_CHECKLIST.recalcular"
              severity="secondary"
              outlined
              size="small"
              data-teste="recalcular-prazos"
              @click="dialogoRecalculo = true"
            />
          </MensagemFormulario>

          <EstadoVazio
            v-if="semChecklist"
            icone="concluido"
            :titulo="TEXTOS_CHECKLIST.vazioTitulo"
            :descricao="TEXTOS_CHECKLIST.vazioTexto"
          />

          <section
            v-if="mostrarPainel"
            id="painel-aplicar-modelo"
            class="checklist__aplicar"
            aria-labelledby="titulo-aplicar-modelo"
            data-teste="painel-aplicar"
          >
            <h2
              id="titulo-aplicar-modelo"
              class="checklist__titulo-aplicar"
            >
              {{ semChecklist ? TEXTOS_CHECKLIST.aplicarTitulo : TEXTOS_CHECKLIST.aplicarOutroTitulo }}
            </h2>

            <p
              v-if="modelos.lista && modelos.lista.length === 0"
              class="checklist__sem-modelos"
              data-teste="sem-modelos"
            >
              {{ TEXTOS_CHECKLIST.semModelos }}
              <RouterLink :to="{ name: 'modelos-checklist' }">
                {{ TEXTOS_CHECKLIST.irParaModelos }}
              </RouterLink>
            </p>

            <template v-else>
              <div class="checklist__campo">
                <label
                  for="checklist-modelo"
                  class="checklist__rotulo"
                >{{ TEXTOS_CHECKLIST.campoModelo }}</label>
                <Select
                  v-model="modeloSelecionado"
                  input-id="checklist-modelo"
                  :options="opcoesModelos"
                  option-label="rotulo"
                  option-value="valor"
                  :loading="modelos.carregandoLista"
                  :disabled="aplicando"
                  data-teste="campo-modelo"
                />
              </div>

              <div
                class="checklist__previa"
                aria-live="polite"
                data-teste="previa-aplicacao"
              >
                <p v-if="carregandoPrevia">
                  {{ TEXTOS_CHECKLIST.previaCarregando }}
                </p>
                <p v-else-if="erroPrevia">
                  {{ TEXTOS_CHECKLIST.previaErro }}
                </p>
                <MensagemFormulario
                  v-else-if="previa?.excedeLimite"
                  :mensagem="TEXTOS_CHECKLIST.previaLimite(previa.tarefasNoCasamento, previa.tarefasCriadas)"
                  data-teste="previa-limite"
                />
                <template v-else>
                  <p
                    v-for="linha in mensagemPrevia"
                    :key="linha"
                  >
                    {{ linha }}
                  </p>
                </template>
              </div>

              <MensagemFormulario
                v-if="erroAplicacao"
                :mensagem="erroAplicacao"
                data-teste="erro-aplicacao"
              />

              <div class="checklist__acoes-aplicar">
                <Button
                  :label="TEXTOS_CHECKLIST.aplicar"
                  :loading="aplicando"
                  :disabled="!podeAplicar"
                  data-teste="aplicar-modelo"
                  @click="aplicar"
                />
                <Button
                  v-if="!semChecklist"
                  :label="TEXTOS_TAREFAS.cancelar"
                  severity="secondary"
                  text
                  :disabled="aplicando"
                  data-teste="fechar-aplicar"
                  @click="painelAberto = false"
                />
              </div>
            </template>
          </section>

          <div
            v-if="!semChecklist"
            class="checklist__painel"
          >
            <ReguaMarcos
              :marcos="marcos"
              :rotulo="TEXTOS_CHECKLIST.regua"
            >
              <template #marco="{ marco, idTitulo }">
                <ul
                  class="checklist__lista"
                  :aria-labelledby="idTitulo"
                >
                  <ItemTarefa
                    v-for="tarefa in tarefasDoMarco(marco.chave)"
                    :key="tarefa.id"
                    :titulo="tarefa.titulo"
                    :metadados="metadadosTarefa(tarefa, false)"
                    :badge="badgeTarefa(tarefa)"
                    :concluida="tarefa.status === 'Concluida'"
                    :cancelada="tarefa.status === 'Cancelada'"
                    :pode-alternar="!arquivado"
                    :alternando="tarefaEmAndamento === tarefa.id"
                    :rotulo-alternar="rotuloAlternar(tarefa)"
                    @alternar="alternar(tarefa)"
                  >
                    <template
                      v-if="!arquivado"
                      #acoes
                    >
                      <MenuAcoes
                        :itens="acoesTarefa"
                        :rotulo="TEXTOS_TAREFAS.maisAcoes"
                        :rotulo-acessivel="TEXTOS_TAREFAS.maisAcoesAria(tarefa.titulo)"
                        :desabilitado="tarefaEmAndamento !== null"
                        somente-icone
                        @selecionar="executarAcao(tarefa)"
                      />
                    </template>
                  </ItemTarefa>
                </ul>
              </template>
            </ReguaMarcos>
          </div>

          <RouterLink
            v-if="!semChecklist"
            class="checklist__ver-tarefas"
            :to="{ name: 'casamento-tarefas', params: { id } }"
            data-teste="ver-tarefas"
          >
            {{ TEXTOS_CHECKLIST.verTarefas }}
          </RouterLink>
        </template>
      </div>

      <DialogoConfirmacao
        v-model:visivel="dialogoRecalculo"
        :titulo="TEXTOS_CHECKLIST.recalculoTitulo"
        :mensagem="TEXTOS_CHECKLIST.recalculoTextoSemData(dados?.prazosDesatualizados ?? 0)"
        :rotulo-confirmar="TEXTOS_CHECKLIST.recalcular"
        :rotulo-cancelar="TEXTOS_CHECKLIST.manterPrazos"
        :executando="recalculando"
        @confirmar="recalcular"
      />
    </template>
  </LayoutPainelUsuario>
</template>

<style scoped>
.checklist {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-5);
  max-width: var(--p-dimensao-largura-leitura);
}

.checklist__progresso,
.checklist__aplicar,
.checklist__painel {
  padding: var(--p-espaco-5) var(--p-espaco-4);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.checklist__aplicar {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.checklist__titulo-aplicar {
  margin: 0;
  font-family: var(--p-fonte-interface);
  font-size: var(--p-fonte-tamanho-titulo);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.checklist__campo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
  max-width: 24rem;
}

.checklist__rotulo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.checklist__previa {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-height: var(--p-espaco-6);
}

.checklist__previa p,
.checklist__sem-modelos {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.checklist__acoes-aplicar {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.checklist__acoes-aplicar :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

.checklist__lista {
  margin: 0;
  padding: 0;
}

.checklist__ver-tarefas {
  align-self: flex-start;
  font-size: var(--p-fonte-tamanho-controle);
}

.checklist__voltar {
  display: inline-block;
  margin-top: var(--p-espaco-4);
}

@media (min-width: 640px) {
  .checklist__progresso,
  .checklist__aplicar,
  .checklist__painel {
    padding: var(--p-espaco-6);
  }

  .checklist__acoes-aplicar {
    flex-direction: row;
  }
}
</style>
