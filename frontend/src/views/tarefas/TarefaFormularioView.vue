<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import CalendarioPrazoTarefa from '@/componentes/tarefas/CalendarioPrazoTarefa.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useAlteracoesNaoSalvas } from '@/composables/useAlteracoesNaoSalvas'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { useEventosStore, type FalhaEvento } from '@/stores/eventos'
import { useTarefasStore } from '@/stores/tarefas'
import {
  ROTULOS_CATEGORIA_TAREFA,
  ROTULOS_RESPONSAVEL_TAREFA,
  ROTULOS_STATUS_TAREFA,
  TEXTOS_TAREFAS,
} from '@/textos/tarefas'
import { vocabularioOuNeutro } from '@/textos/tiposEvento'
import {
  CATEGORIAS_TAREFA,
  RESPONSAVEIS_TAREFA,
  STATUS_TAREFA,
  type CategoriaTarefa,
  type ResponsavelTarefa,
  type SalvarTarefaRequest,
  type StatusTarefa,
  type TarefaDto,
} from '@/tipos/tarefas'
import { focarElemento } from '@/utilitarios/foco'
import { formatarNomesAnfitrioes } from '@/utilitarios/formatacao'
import { descreverPrazoNoEvento, posicaoPrazoNoEvento } from '@/utilitarios/prazoTarefaEvento'
import { LIMITES_TAREFA, descricaoTarefa, prazoTarefa, tituloTarefa } from '@/utilitarios/tarefas'
import { obrigatorio } from '@/utilitarios/validacao'

const CAMPOS = ['titulo', 'responsavel', 'prazo', 'categoria', 'descricao'] as const
type Campo = (typeof CAMPOS)[number]

const props = defineProps<{ id: string; tarefaId?: string }>()

const eventos = useEventosStore()
const store = useTarefasStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const edicao = computed(() => Boolean(props.tarefaId))
const carregandoTarefa = ref(false)
const falhaTarefa = ref<FalhaEvento | null>(null)
const original = ref<TarefaDto | null>(null)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const status = ref<StatusTarefa>('AFazer')

const formulario = useFormulario(
  {
    titulo: '',
    responsavel: 'Assessoria' as ResponsavelTarefa,
    prazo: '',
    categoria: 'Geral' as CategoriaTarefa,
    descricao: '',
  },
  {
    titulo: [obrigatorio, tituloTarefa],
    prazo: [prazoTarefa],
    descricao: [descricaoTarefa],
  },
  { estadoAdicional: () => status.value },
)
const { liberarSaida } = useAlteracoesNaoSalvas(formulario.temAlteracoes)

const idCampo = (campo: Campo | 'status') => `tarefa-${campo}`

const evento = computed(() => (eventos.atual?.id === props.id ? eventos.atual : null))
const nomes = computed(() =>
  evento.value ? formatarNomesAnfitrioes(evento.value.nomePrimeiraPessoa, evento.value.nomeSegundaPessoa) : '',
)
const arquivado = computed(() => evento.value?.arquivado === true)
const titulo = computed(() => (edicao.value ? TEXTOS_TAREFAS.formEditar : TEXTOS_TAREFAS.formNova))
const prazoValido = computed(() => (prazoTarefa(formulario.valores.prazo) === null ? formulario.valores.prazo : ''))
const dicaPrazo = computed(() => {
  const atual = evento.value
  const posicao = atual ? posicaoPrazoNoEvento(prazoValido.value, atual) : null
  return atual && posicao
    ? descreverPrazoNoEvento(posicao, vocabularioOuNeutro(atual.tipo))
    : TEXTOS_TAREFAS.campoPrazoDica
})
const mostrarCalendario = computed(() => evento.value !== null && !carregandoTarefa.value && !falhaTarefa.value)
const rotuloSalvar = computed(() => (edicao.value ? TEXTOS_TAREFAS.salvar : TEXTOS_TAREFAS.criar))

const opcoesResponsavel = RESPONSAVEIS_TAREFA.map((valor) => ({ valor, rotulo: ROTULOS_RESPONSAVEL_TAREFA[valor] }))
const opcoesCategoria = CATEGORIAS_TAREFA.map((valor) => ({ valor, rotulo: ROTULOS_CATEGORIA_TAREFA[valor] }))
const opcoesStatus = STATUS_TAREFA.map((valor) => ({ valor, rotulo: ROTULOS_STATUS_TAREFA[valor] }))

function preencher(tarefa: TarefaDto) {
  original.value = tarefa
  status.value = tarefa.status
  Object.assign(formulario.valores, {
    titulo: tarefa.titulo,
    responsavel: tarefa.responsavel,
    prazo: tarefa.prazo ?? '',
    categoria: tarefa.categoria,
    descricao: tarefa.descricao ?? '',
  })
  formulario.fixarEstadoInicial()
}

async function carregarTarefa() {
  if (!props.tarefaId) {
    return
  }
  carregandoTarefa.value = true
  falhaTarefa.value = null
  const resultado = await store.obter(props.id, props.tarefaId)
  carregandoTarefa.value = false
  if (resultado.ok) {
    preencher(resultado.valor)
    return
  }
  falhaTarefa.value = resultado.falha
}

onMounted(async () => {
  void eventos.obter(props.id)
  await carregarTarefa()
  if (!falhaTarefa.value) {
    await focarElemento(idCampo('titulo'))
  }
})

function textoOuNulo(valor: string): string | null {
  const texto = valor.trim()
  return texto === '' ? null : texto
}

function montarRequest(): SalvarTarefaRequest {
  const valores = formulario.valores
  return {
    titulo: valores.titulo.trim(),
    descricao: textoOuNulo(valores.descricao),
    responsavel: valores.responsavel,
    categoria: valores.categoria,
    prazo: textoOuNulo(valores.prazo),
  }
}

function tratarFalha(falha: FalhaEvento): boolean {
  const camposComErro = CAMPOS.filter((campo) => falha.errosCampos[campo])
  for (const campo of camposComErro) {
    formulario.erros[campo] = falha.errosCampos[campo]
  }
  const primeiro = camposComErro[0]
  if (primeiro) {
    void focarElemento(idCampo(primeiro))
    return true
  }
  if (falha.tipo === 'semPermissao') {
    mensagemErro.value = TEXTOS_TAREFAS.semPermissao
    return true
  }
  if (falha.tipo === 'regra' && falha.mensagem) {
    mensagemErro.value = falha.mensagem
    return true
  }
  if (falha.tipo === 'naoEncontrado') {
    mensagemErro.value = TEXTOS_TAREFAS.tarefaNaoEncontradaTexto
    return true
  }
  mensagemErro.value = TEXTOS_TAREFAS.erroSalvar
  return false
}

async function enviar() {
  mensagemErro.value = null
  if (!formulario.validar()) {
    const campo = formulario.primeiroCampoInvalido.value
    if (campo) {
      await focarElemento(idCampo(campo))
    }
    return
  }

  enviando.value = true
  const request = montarRequest()
  const resultado = props.tarefaId
    ? await store.atualizar(props.id, props.tarefaId, request)
    : await store.criar(props.id, request)

  if (!resultado.ok) {
    enviando.value = false
    tratarFalha(resultado.falha)
    return
  }

  if (props.tarefaId && original.value && status.value !== resultado.valor.status) {
    const mudanca = await store.alterarStatus(props.id, props.tarefaId, status.value)
    if (!mudanca.ok) {
      enviando.value = false
      tratarFalha(mudanca.falha)
      return
    }
  }

  enviando.value = false
  liberarSaida()
  notificacao.sucesso(edicao.value ? TEXTOS_TAREFAS.toastSalva : TEXTOS_TAREFAS.toastCriada)
  await roteador.replace({ name: 'evento-tarefas', params: { id: props.id } })
}

function cancelar() {
  liberarSaida()
  void roteador.push({ name: 'evento-tarefas', params: { id: props.id } })
}
</script>

<template>
  <LayoutPainelUsuario>
    <div class="formulario-tarefa">
      <div
        class="pagina-formulario formulario-tarefa__pagina"
        :class="{ 'formulario-tarefa__pagina--com-lateral': mostrarCalendario }"
      >
        <CabecalhoPagina
          :titulo="titulo"
          :descricao="nomes || undefined"
        />

        <div class="formulario-tarefa__corpo">
          <div class="formulario-tarefa__principal pilha pilha--cartao">
            <EstadoCarregando
              v-if="carregandoTarefa"
              variante="formulario"
              :linhas="4"
            />

            <EstadoErro
              v-else-if="falhaTarefa?.tipo === 'naoEncontrado'"
              :titulo="TEXTOS_TAREFAS.tarefaNaoEncontradaTitulo"
              :mensagem="TEXTOS_TAREFAS.tarefaNaoEncontradaTexto"
              :pode-tentar-novamente="false"
            />

            <EstadoErro
              v-else-if="falhaTarefa"
              :titulo="TEXTOS_TAREFAS.erroTitulo"
              :mensagem="falhaTarefa.tipo === 'semPermissao' ? TEXTOS_TAREFAS.semAcesso : TEXTOS_TAREFAS.erroTexto"
              :pode-tentar-novamente="falhaTarefa.tipo !== 'semPermissao'"
              :variante="falhaTarefa.tipo === 'semPermissao' ? 'semPermissao' : 'erro'"
              @tentar-novamente="carregarTarefa"
            />

            <template v-else>
              <MensagemFormulario
                v-if="arquivado"
                variante="alerta"
                :mensagem="TEXTOS_TAREFAS.arquivado"
                data-teste="aviso-arquivado"
              />
              <MensagemFormulario
                v-if="mensagemErro"
                :mensagem="mensagemErro"
                data-teste="erro-formulario"
              />

              <form
                class="pilha pilha--bloco"
                novalidate
                data-teste="formulario-tarefa"
                @submit.prevent="enviar"
              >
                <fieldset
                  class="formulario-tarefa__grupo pilha pilha--grupo"
                  data-teste="grupo-tarefa"
                >
                  <legend class="formulario-tarefa__legenda texto-rotulo">
                    {{ TEXTOS_TAREFAS.grupoTarefa }}
                  </legend>
                  <CampoFormulario
                    v-slot="{ id: idEntrada, invalido, descritoPor }"
                    :rotulo="TEXTOS_TAREFAS.campoTitulo"
                    :id-campo="idCampo('titulo')"
                    obrigatorio
                    :erro="formulario.erros.titulo"
                  >
                    <InputText
                      :id="idEntrada"
                      v-model="formulario.valores.titulo"
                      autocomplete="off"
                      :maxlength="LIMITES_TAREFA.tituloMaximo"
                      :placeholder="TEXTOS_TAREFAS.campoTituloPlaceholder"
                      aria-required="true"
                      :invalid="invalido"
                      :aria-invalid="invalido"
                      :aria-describedby="descritoPor"
                      :readonly="enviando"
                      data-teste="campo-titulo"
                      @update:model-value="formulario.revalidarAoDigitar('titulo')"
                      @blur="formulario.validarAoSair('titulo')"
                    />
                  </CampoFormulario>

                  <CampoFormulario
                    v-slot="{ id: idEntrada, invalido, descritoPor }"
                    :rotulo="TEXTOS_TAREFAS.campoDescricao"
                    :id-campo="idCampo('descricao')"
                    :dica="TEXTOS_TAREFAS.campoDescricaoDica(formulario.valores.descricao.length, LIMITES_TAREFA.descricaoMaximo)"
                    :erro="formulario.erros.descricao"
                  >
                    <Textarea
                      :id="idEntrada"
                      v-model="formulario.valores.descricao"
                      rows="4"
                      auto-resize
                      :maxlength="LIMITES_TAREFA.descricaoMaximo"
                      :invalid="invalido"
                      :aria-invalid="invalido"
                      :aria-describedby="descritoPor"
                      :readonly="enviando"
                      data-teste="campo-descricao"
                      @update:model-value="formulario.revalidarAoDigitar('descricao')"
                      @blur="formulario.validarAoSair('descricao')"
                    />
                  </CampoFormulario>
                </fieldset>

                <fieldset
                  class="formulario-tarefa__grupo pilha pilha--grupo"
                  data-teste="grupo-organizacao"
                >
                  <legend class="formulario-tarefa__legenda texto-rotulo">
                    {{ TEXTOS_TAREFAS.grupoOrganizacao }}
                  </legend>
                  <CampoFormulario
                    v-slot="{ id: idEntrada, descritoPor }"
                    :rotulo="TEXTOS_TAREFAS.campoResponsavel"
                    :id-campo="idCampo('responsavel')"
                    :dica="TEXTOS_TAREFAS.campoResponsavelDica"
                    :erro="formulario.erros.responsavel"
                  >
                    <SelectButton
                      :id="idEntrada"
                      v-model="formulario.valores.responsavel"
                      :options="opcoesResponsavel"
                      option-label="rotulo"
                      option-value="valor"
                      :allow-empty="false"
                      :aria-label="TEXTOS_TAREFAS.campoResponsavel"
                      :aria-describedby="descritoPor"
                      :disabled="enviando"
                      data-teste="campo-responsavel"
                    />
                  </CampoFormulario>

                  <div class="formulario-tarefa__colunas">
                    <CampoFormulario
                      v-slot="{ id: idEntrada, invalido, descritoPor }"
                      :rotulo="TEXTOS_TAREFAS.campoPrazo"
                      :id-campo="idCampo('prazo')"
                      :dica="dicaPrazo"
                      :erro="formulario.erros.prazo"
                    >
                      <InputText
                        :id="idEntrada"
                        v-model="formulario.valores.prazo"
                        type="date"
                        :min="LIMITES_TAREFA.prazoMinimo"
                        :max="LIMITES_TAREFA.prazoMaximo"
                        :invalid="invalido"
                        :aria-invalid="invalido"
                        :aria-describedby="descritoPor"
                        :readonly="enviando"
                        data-teste="campo-prazo"
                        @update:model-value="formulario.revalidarAoDigitar('prazo')"
                        @blur="formulario.validarAoSair('prazo')"
                      />
                    </CampoFormulario>

                    <CampoFormulario
                      v-slot="{ id: idEntrada, descritoPor }"
                      :rotulo="TEXTOS_TAREFAS.campoCategoria"
                      :id-campo="idCampo('categoria')"
                      :erro="formulario.erros.categoria"
                    >
                      <Select
                        v-model="formulario.valores.categoria"
                        :input-id="idEntrada"
                        :options="opcoesCategoria"
                        option-label="rotulo"
                        option-value="valor"
                        :aria-describedby="descritoPor"
                        :disabled="enviando"
                        data-teste="campo-categoria"
                      />
                    </CampoFormulario>
                  </div>

                  <CampoFormulario
                    v-if="edicao"
                    v-slot="{ id: idEntrada }"
                    :rotulo="TEXTOS_TAREFAS.campoSituacao"
                    :id-campo="idCampo('status')"
                  >
                    <div class="formulario-tarefa__trilho">
                      <SelectButton
                        :id="idEntrada"
                        v-model="status"
                        :options="opcoesStatus"
                        option-label="rotulo"
                        option-value="valor"
                        :allow-empty="false"
                        :aria-label="TEXTOS_TAREFAS.campoSituacao"
                        :disabled="enviando"
                        data-teste="campo-status"
                      />
                    </div>
                  </CampoFormulario>
                </fieldset>

                <div class="formulario-tarefa__acoes">
                  <Button
                    type="submit"
                    :label="rotuloSalvar"
                    :loading="enviando"
                    :aria-busy="enviando"
                    :disabled="arquivado"
                    data-teste="salvar-tarefa"
                  />
                  <Button
                    type="button"
                    :label="TEXTOS_TAREFAS.cancelar"
                    severity="secondary"
                    text
                    :disabled="enviando"
                    data-teste="cancelar"
                    @click="cancelar"
                  />
                </div>
              </form>
            </template>
          </div>

          <CalendarioPrazoTarefa
            v-if="mostrarCalendario && evento"
            class="formulario-tarefa__lateral"
            :evento="evento"
            :prazo="prazoValido"
            :gerada-de-modelo="original?.geradaDeModelo === true"
          />
        </div>
      </div>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.formulario-tarefa {
  container: formulario-tarefa / inline-size;
}

.formulario-tarefa__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'principal'
    'lateral';
  gap: var(--p-ritmo-bloco);
}

.formulario-tarefa__principal {
  container: formulario-tarefa-campos / inline-size;
  grid-area: principal;
  min-width: 0;
}

.formulario-tarefa__lateral {
  grid-area: lateral;
  padding-top: var(--p-ritmo-bloco);
  border-top: 1px solid var(--p-cor-borda);
}

.formulario-tarefa__grupo {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.formulario-tarefa__legenda {
  padding: 0;
  margin-bottom: var(--p-ritmo-grupo);
}

.formulario-tarefa__colunas {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo) var(--p-ritmo-cartao);
}

.formulario-tarefa__trilho {
  max-width: 100%;
  overflow-x: auto;
}

.formulario-tarefa__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.formulario-tarefa__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@container formulario-tarefa-campos (min-width: 36rem) {
  .formulario-tarefa__colunas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .formulario-tarefa__acoes {
    flex-direction: row;
    gap: var(--p-ritmo-grupo);
  }
}

@container formulario-tarefa (min-width: 64rem) {
  .formulario-tarefa__pagina--com-lateral {
    max-width: calc(var(--p-dimensao-largura-formulario) + var(--p-dimensao-largura-autenticacao) + var(--p-ritmo-bloco));
  }

  .formulario-tarefa__pagina--com-lateral .formulario-tarefa__corpo {
    grid-template-columns: minmax(0, var(--p-dimensao-largura-formulario)) minmax(var(--p-dimensao-largura-gaveta), 1fr);
    grid-template-areas: 'principal lateral';
    align-items: start;
  }

  .formulario-tarefa__lateral {
    padding-top: 0;
    padding-inline-start: var(--p-ritmo-bloco);
    border-top: 0;
    border-inline-start: 1px solid var(--p-cor-borda);
  }
}
</style>
