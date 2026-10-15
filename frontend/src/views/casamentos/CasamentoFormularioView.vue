<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { useCasamentosStore } from '@/stores/casamentos'
import { useChecklistStore } from '@/stores/checklist'
import { useCronogramaStore } from '@/stores/cronograma'
import { TEXTOS_CHECKLIST } from '@/textos/checklist'
import { TEXTOS_RECALCULO_HORARIOS } from '@/textos/modelosCronograma'
import { MENSAGENS_PADRAO } from '@/textos/mensagens'
import { ROTULOS_ACOES } from '@/textos/rotulos'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import { TEXTOS_DUPLICACAO_CASAMENTO } from '@/textos/duplicacaoCasamento'
import type { CasamentoDto, SalvarCasamentoRequest } from '@/tipos/casamentos'
import { focarElemento } from '@/utilitarios/foco'
import { formatarDataCalendario, formatarNomesCasal } from '@/utilitarios/formatacao'
import { dataLimitePadrao } from '@/utilitarios/rsvp'
import {
  LIMITES_CASAMENTO,
  convidadosEstimados,
  dataCasamento,
  dataLimiteRsvp,
  horarioCasamento,
  nomeCasal,
  textoOpcional,
} from '@/utilitarios/validacaoCasamento'
import { obrigatorio } from '@/utilitarios/validacao'

const props = defineProps<{ id?: string }>()

const checklist = useChecklistStore()
const dialogoRecalculo = ref(false)
const recalculando = ref(false)
const tarefasRecalculo = ref(0)
const dataRecalculo = ref('')
const cronograma = useCronogramaStore()
const dialogoRecalculoHorarios = ref(false)
const recalculandoHorarios = ref(false)
const itensRecalculoHorarios = ref(0)
const horarioRecalculo = ref('')
const horarioPendente = ref(false)

const CAMPOS = [
  'nomePrimeiraPessoa',
  'nomeSegundaPessoa',
  'data',
  'horario',
  'dataLimiteRsvp',
  'localCerimonia',
  'localRecepcao',
  'convidadosEstimados',
  'observacoes',
] as const
type Campo = (typeof CAMPOS)[number]

const store = useCasamentosStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const edicao = computed(() => Boolean(props.id))
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const bloqueadoPorPermissao = ref(false)

const formulario = useFormulario(
  {
    nomePrimeiraPessoa: '',
    nomeSegundaPessoa: '',
    data: '',
    horario: '',
    dataLimiteRsvp: '',
    localCerimonia: '',
    localRecepcao: '',
    convidadosEstimados: '',
    observacoes: '',
  },
  {
    nomePrimeiraPessoa: [obrigatorio, nomeCasal],
    nomeSegundaPessoa: [obrigatorio, nomeCasal],
    data: [obrigatorio, dataCasamento],
    horario: [horarioCasamento],
    dataLimiteRsvp: [dataLimiteRsvp((): string => formulario.valores.data)],
    localCerimonia: [textoOpcional(LIMITES_CASAMENTO.local)],
    localRecepcao: [textoOpcional(LIMITES_CASAMENTO.local)],
    convidadosEstimados: [convidadosEstimados],
    observacoes: [textoOpcional(LIMITES_CASAMENTO.observacoes)],
  },
)

const idCampo = (campo: Campo) => `casamento-${campo}`

const casamentoEditado = computed(() => (edicao.value && store.atual?.id === props.id ? store.atual : null))
const carregandoEdicao = computed(() => edicao.value && store.carregandoAtual)
const falhaEdicao = computed(() => (edicao.value ? store.falhaAtual : null))
const arquivado = computed(() => casamentoEditado.value?.arquivado === true)

const titulo = computed(() => (edicao.value ? TEXTOS_CASAMENTOS.tituloEdicao : TEXTOS_CASAMENTOS.tituloNovo))
const descricao = computed(() => {
  const casamento = casamentoEditado.value
  if (casamento) {
    return formatarNomesCasal(casamento.nomePrimeiraPessoa, casamento.nomeSegundaPessoa)
  }
  return edicao.value ? undefined : TEXTOS_CASAMENTOS.descricaoNovo
})
const rotuloSalvar = computed(() => (edicao.value ? TEXTOS_CASAMENTOS.salvarEdicao : TEXTOS_CASAMENTOS.salvarNovo))
const quantidadeObservacoes = computed(() => formulario.valores.observacoes.length)
const dicaDataLimite = computed(() => {
  const padrao = dataLimitePadrao(formulario.valores.data)
  return TEXTOS_CASAMENTOS.dataLimiteRsvpDica(padrao ? formatarDataCalendario(padrao) : null)
})

function preencher(casamento: CasamentoDto) {
  Object.assign(formulario.valores, {
    nomePrimeiraPessoa: casamento.nomePrimeiraPessoa,
    nomeSegundaPessoa: casamento.nomeSegundaPessoa,
    data: casamento.data,
    horario: casamento.horario ?? '',
    dataLimiteRsvp: casamento.dataLimiteRsvp ?? '',
    localCerimonia: casamento.localCerimonia ?? '',
    localRecepcao: casamento.localRecepcao ?? '',
    convidadosEstimados: casamento.convidadosEstimados === null ? '' : String(casamento.convidadosEstimados),
    observacoes: casamento.observacoes ?? '',
  })
}

watch(
  casamentoEditado,
  (casamento) => {
    if (casamento) {
      preencher(casamento)
    }
  },
  { immediate: true },
)

function carregar() {
  if (props.id) {
    void store.obter(props.id)
  }
}

onMounted(async () => {
  if (props.id) {
    await store.obter(props.id)
  }
  if (!edicao.value || casamentoEditado.value) {
    await focarElemento(idCampo('nomePrimeiraPessoa'))
  }
})

function textoOuNulo(valor: string): string | null {
  const texto = valor.trim()
  return texto === '' ? null : texto
}

function montarRequest(): SalvarCasamentoRequest {
  const valores = formulario.valores
  const convidados = valores.convidadosEstimados.trim()
  return {
    nomePrimeiraPessoa: valores.nomePrimeiraPessoa.trim(),
    nomeSegundaPessoa: valores.nomeSegundaPessoa.trim(),
    data: valores.data,
    horario: textoOuNulo(valores.horario),
    dataLimiteRsvp: textoOuNulo(valores.dataLimiteRsvp),
    localCerimonia: textoOuNulo(valores.localCerimonia),
    localRecepcao: textoOuNulo(valores.localRecepcao),
    convidadosEstimados: convidados === '' ? null : Number(convidados),
    observacoes: textoOuNulo(valores.observacoes),
  }
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
  const dataAnterior = casamentoEditado.value?.data ?? null
  const horarioAnterior = casamentoEditado.value ? (casamentoEditado.value.horario ?? null) : undefined
  const resultado = props.id ? await store.atualizar(props.id, request) : await store.criar(request)

  if (resultado.ok) {
    notificacao.sucesso(edicao.value ? MENSAGENS_PADRAO.salvoComSucesso : TEXTOS_CASAMENTOS.criado)
    const horarioMudou =
      edicao.value && horarioAnterior !== undefined && resultado.valor.horario !== null && horarioAnterior !== resultado.valor.horario
    if (edicao.value && dataAnterior !== null && dataAnterior !== resultado.valor.data && (await oferecerRecalculo(resultado.valor.id))) {
      horarioPendente.value = horarioMudou
      enviando.value = false
      return
    }
    if (horarioMudou && (await oferecerRecalculoHorarios(resultado.valor.id, resultado.valor.horario))) {
      enviando.value = false
      return
    }
    enviando.value = false
    await roteador.replace({ name: 'casamento', params: { id: resultado.valor.id } })
    return
  }
  enviando.value = false

  const { falha } = resultado
  const camposComErro = CAMPOS.filter((campo) => falha.errosCampos[campo])
  for (const campo of camposComErro) {
    formulario.erros[campo] = falha.errosCampos[campo]
  }
  const primeiro = camposComErro[0]
  if (primeiro) {
    await focarElemento(idCampo(primeiro))
    return
  }

  if (falha.tipo === 'semPermissao') {
    bloqueadoPorPermissao.value = true
    mensagemErro.value = TEXTOS_CASAMENTOS.semPermissao
    return
  }

  if (falha.tipo === 'regra' && falha.mensagem) {
    mensagemErro.value = falha.mensagem
    return
  }

  if (falha.tipo === 'naoEncontrado') {
    mensagemErro.value = TEXTOS_CASAMENTOS.naoEncontradoTitulo
    return
  }

  notificacao.erro(falha.tipo === 'conexao' && falha.mensagem ? falha.mensagem : undefined)
}

async function oferecerRecalculo(id: string): Promise<boolean> {
  if (casamentoSemChecklist(id)) {
    return false
  }
  const consulta = await checklist.consultarRecalculo(id)
  if (!consulta.ok || consulta.valor.tarefas === 0) {
    return false
  }
  tarefasRecalculo.value = consulta.valor.tarefas
  dataRecalculo.value = formatarDataCalendario(formulario.valores.data)
  dialogoRecalculo.value = true
  return true
}

function casamentoSemChecklist(id: string): boolean {
  return store.atual?.id === id && store.atual.percentualChecklist === null
}

async function concluirRecalculo(recalcularPrazos: boolean) {
  const id = props.id
  if (!id) {
    return
  }
  if (recalcularPrazos) {
    recalculando.value = true
    const resultado = await checklist.recalcular(id)
    recalculando.value = false
    if (resultado.ok) {
      notificacao.sucesso(TEXTOS_CHECKLIST.toastRecalculado(resultado.valor.tarefas))
    } else {
      notificacao.erro(
        resultado.falha.tipo === 'regra' && resultado.falha.mensagem ? resultado.falha.mensagem : TEXTOS_CHECKLIST.erroRecalcular,
      )
    }
  }
  dialogoRecalculo.value = false
  if (horarioPendente.value) {
    horarioPendente.value = false
    if (await oferecerRecalculoHorarios(id, store.atual?.id === id ? store.atual.horario : null)) {
      return
    }
  }
  await roteador.replace({ name: 'casamento', params: { id } })
}

async function oferecerRecalculoHorarios(id: string, horario: string | null): Promise<boolean> {
  if (!horario) {
    return false
  }
  const consulta = await cronograma.consultarRecalculo(id)
  if (!consulta.ok || consulta.valor.itens === 0) {
    return false
  }
  itensRecalculoHorarios.value = consulta.valor.itens
  horarioRecalculo.value = horario
  dialogoRecalculoHorarios.value = true
  return true
}

async function concluirRecalculoHorarios(recalcular: boolean) {
  const id = props.id
  if (!id) {
    return
  }
  if (recalcular) {
    recalculandoHorarios.value = true
    const resultado = await cronograma.recalcular(id)
    recalculandoHorarios.value = false
    if (resultado.ok) {
      notificacao.sucesso(TEXTOS_RECALCULO_HORARIOS.toast(resultado.valor.itens))
    } else {
      notificacao.erro(
        resultado.falha.tipo === 'regra' && resultado.falha.mensagem ? resultado.falha.mensagem : TEXTOS_RECALCULO_HORARIOS.erro,
      )
    }
  }
  dialogoRecalculoHorarios.value = false
  await roteador.replace({ name: 'casamento', params: { id } })
}

function cancelar() {
  if (props.id) {
    void roteador.push({ name: 'casamento', params: { id: props.id } })
    return
  }
  void roteador.push({ name: 'casamentos' })
}
</script>

<template>
  <LayoutPainelUsuario>
    <div class="pagina-formulario">
      <CabecalhoPagina
        :titulo="titulo"
        :descricao="descricao"
      />

      <div class="pilha pilha--cartao">
        <EstadoCarregando
          v-if="carregandoEdicao && !casamentoEditado"
          variante="formulario"
          :linhas="4"
        />

        <EstadoErro
          v-else-if="falhaEdicao?.tipo === 'naoEncontrado'"
          :titulo="TEXTOS_CASAMENTOS.naoEncontradoTitulo"
          :mensagem="TEXTOS_CASAMENTOS.naoEncontradoTexto"
          :pode-tentar-novamente="false"
        />

        <EstadoErro
          v-else-if="falhaEdicao"
          :titulo="TEXTOS_CASAMENTOS.erroCarregarUmTitulo"
          :mensagem="falhaEdicao.tipo === 'semPermissao' ? TEXTOS_CASAMENTOS.semAcesso : TEXTOS_CASAMENTOS.erroCarregarTexto"
          :pode-tentar-novamente="falhaEdicao.tipo !== 'semPermissao'"
          @tentar-novamente="carregar"
        />

        <template v-else>
          <p
            v-if="!edicao"
            class="formulario-casamento__alternativa"
          >
            <RouterLink
              :to="{ name: 'casamento-duplicar' }"
              data-teste="a-partir-de-outro"
            >
              <span
                class="ie ie-copiar"
                aria-hidden="true"
              />
              {{ TEXTOS_DUPLICACAO_CASAMENTO.acaoAPartirDeOutro }}
            </RouterLink>
          </p>
          <MensagemFormulario
            v-if="arquivado"
            variante="informacao"
            :mensagem="TEXTOS_CASAMENTOS.avisoArquivado"
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
            data-teste="formulario-casamento"
            @submit.prevent="enviar"
          >
            <fieldset class="formulario-casamento__grupo pilha pilha--grupo">
              <legend class="formulario-casamento__legenda texto-rotulo">
                {{ TEXTOS_CASAMENTOS.grupoCasal }}
              </legend>
              <div class="formulario-casamento__colunas">
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_CASAMENTOS.nomePrimeiraPessoa"
                  :id-campo="idCampo('nomePrimeiraPessoa')"
                  obrigatorio
                  :erro="formulario.erros.nomePrimeiraPessoa"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.nomePrimeiraPessoa"
                    autocomplete="off"
                    :maxlength="LIMITES_CASAMENTO.nomeMaximo"
                    aria-required="true"
                    :invalid="invalido"
                    :aria-invalid="invalido"
                    :aria-describedby="descritoPor"
                    :readonly="enviando"
                    @update:model-value="formulario.revalidarAoDigitar('nomePrimeiraPessoa')"
                    @blur="formulario.validarAoSair('nomePrimeiraPessoa')"
                  />
                </CampoFormulario>
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_CASAMENTOS.nomeSegundaPessoa"
                  :id-campo="idCampo('nomeSegundaPessoa')"
                  obrigatorio
                  :erro="formulario.erros.nomeSegundaPessoa"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.nomeSegundaPessoa"
                    autocomplete="off"
                    :maxlength="LIMITES_CASAMENTO.nomeMaximo"
                    aria-required="true"
                    :invalid="invalido"
                    :aria-invalid="invalido"
                    :aria-describedby="descritoPor"
                    :readonly="enviando"
                    @update:model-value="formulario.revalidarAoDigitar('nomeSegundaPessoa')"
                    @blur="formulario.validarAoSair('nomeSegundaPessoa')"
                  />
                </CampoFormulario>
              </div>
            </fieldset>

            <fieldset class="formulario-casamento__grupo pilha pilha--grupo">
              <legend class="formulario-casamento__legenda texto-rotulo">
                {{ TEXTOS_CASAMENTOS.grupoQuando }}
              </legend>
              <div class="formulario-casamento__colunas">
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_CASAMENTOS.data"
                  :id-campo="idCampo('data')"
                  obrigatorio
                  :erro="formulario.erros.data"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.data"
                    type="date"
                    :min="LIMITES_CASAMENTO.dataMinima"
                    :max="LIMITES_CASAMENTO.dataMaxima"
                    aria-required="true"
                    :invalid="invalido"
                    :aria-invalid="invalido"
                    :aria-describedby="descritoPor"
                    :readonly="enviando"
                    @update:model-value="formulario.revalidarAoDigitar('data')"
                    @blur="formulario.validarAoSair('data')"
                  />
                </CampoFormulario>
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_CASAMENTOS.horario"
                  :id-campo="idCampo('horario')"
                  :dica="TEXTOS_CASAMENTOS.horarioDica"
                  :erro="formulario.erros.horario"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.horario"
                    type="time"
                    step="60"
                    :invalid="invalido"
                    :aria-invalid="invalido"
                    :aria-describedby="descritoPor"
                    :readonly="enviando"
                    @update:model-value="formulario.revalidarAoDigitar('horario')"
                    @blur="formulario.validarAoSair('horario')"
                  />
                </CampoFormulario>
              </div>
              <div class="formulario-casamento__colunas">
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_CASAMENTOS.dataLimiteRsvp"
                  :id-campo="idCampo('dataLimiteRsvp')"
                  :dica="dicaDataLimite"
                  :erro="formulario.erros.dataLimiteRsvp"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.dataLimiteRsvp"
                    type="date"
                    :min="LIMITES_CASAMENTO.dataMinima"
                    :max="formulario.valores.data || LIMITES_CASAMENTO.dataMaxima"
                    :invalid="invalido"
                    :aria-invalid="invalido"
                    :aria-describedby="descritoPor"
                    :readonly="enviando"
                    data-teste="campo-data-limite-rsvp"
                    @update:model-value="formulario.revalidarAoDigitar('dataLimiteRsvp')"
                    @blur="formulario.validarAoSair('dataLimiteRsvp')"
                  />
                </CampoFormulario>
              </div>
            </fieldset>

            <fieldset class="formulario-casamento__grupo pilha pilha--grupo">
              <legend class="formulario-casamento__legenda texto-rotulo">
                {{ TEXTOS_CASAMENTOS.grupoOnde }}
              </legend>
              <div class="formulario-casamento__colunas">
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_CASAMENTOS.localCerimonia"
                  :id-campo="idCampo('localCerimonia')"
                  :erro="formulario.erros.localCerimonia"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.localCerimonia"
                    :maxlength="LIMITES_CASAMENTO.local"
                    :invalid="invalido"
                    :aria-invalid="invalido"
                    :aria-describedby="descritoPor"
                    :readonly="enviando"
                    @update:model-value="formulario.revalidarAoDigitar('localCerimonia')"
                    @blur="formulario.validarAoSair('localCerimonia')"
                  />
                </CampoFormulario>
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_CASAMENTOS.localRecepcao"
                  :id-campo="idCampo('localRecepcao')"
                  :dica="TEXTOS_CASAMENTOS.localRecepcaoDica"
                  :erro="formulario.erros.localRecepcao"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.localRecepcao"
                    :maxlength="LIMITES_CASAMENTO.local"
                    :invalid="invalido"
                    :aria-invalid="invalido"
                    :aria-describedby="descritoPor"
                    :readonly="enviando"
                    @update:model-value="formulario.revalidarAoDigitar('localRecepcao')"
                    @blur="formulario.validarAoSair('localRecepcao')"
                  />
                </CampoFormulario>
              </div>
            </fieldset>

            <fieldset class="formulario-casamento__grupo pilha pilha--grupo">
              <legend class="formulario-casamento__legenda texto-rotulo">
                {{ TEXTOS_CASAMENTOS.grupoPlanejamento }}
              </legend>
              <div class="formulario-casamento__colunas">
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_CASAMENTOS.convidados"
                  :id-campo="idCampo('convidadosEstimados')"
                  :dica="TEXTOS_CASAMENTOS.convidadosDica"
                  :erro="formulario.erros.convidadosEstimados"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.convidadosEstimados"
                    inputmode="numeric"
                    maxlength="4"
                    :invalid="invalido"
                    :aria-invalid="invalido"
                    :aria-describedby="descritoPor"
                    :readonly="enviando"
                    @update:model-value="formulario.revalidarAoDigitar('convidadosEstimados')"
                    @blur="formulario.validarAoSair('convidadosEstimados')"
                  />
                </CampoFormulario>
              </div>
              <CampoFormulario
                v-slot="{ id: idEntrada, invalido, descritoPor }"
                :rotulo="TEXTOS_CASAMENTOS.observacoes"
                :id-campo="idCampo('observacoes')"
                :dica="TEXTOS_CASAMENTOS.contadorObservacoes(quantidadeObservacoes, LIMITES_CASAMENTO.observacoes)"
                :erro="formulario.erros.observacoes"
              >
                <Textarea
                  :id="idEntrada"
                  v-model="formulario.valores.observacoes"
                  rows="4"
                  auto-resize
                  :maxlength="LIMITES_CASAMENTO.observacoes"
                  :invalid="invalido"
                  :aria-invalid="invalido"
                  :aria-describedby="descritoPor"
                  :readonly="enviando"
                  @update:model-value="formulario.revalidarAoDigitar('observacoes')"
                  @blur="formulario.validarAoSair('observacoes')"
                />
              </CampoFormulario>
            </fieldset>

            <div class="formulario-casamento__acoes">
              <Button
                type="submit"
                :label="rotuloSalvar"
                :loading="enviando"
                :aria-busy="enviando"
                :disabled="arquivado || bloqueadoPorPermissao"
                data-teste="salvar-casamento"
              />
              <Button
                type="button"
                :label="ROTULOS_ACOES.cancelar"
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
    </div>

    <DialogoConfirmacao
      :visivel="dialogoRecalculo"
      :titulo="TEXTOS_CHECKLIST.recalculoTitulo"
      :mensagem="TEXTOS_CHECKLIST.recalculoTexto(dataRecalculo, tarefasRecalculo)"
      :rotulo-confirmar="TEXTOS_CHECKLIST.recalcular"
      :rotulo-cancelar="TEXTOS_CHECKLIST.manterPrazos"
      :executando="recalculando"
      data-teste="dialogo-recalculo"
      @confirmar="concluirRecalculo(true)"
      @cancelar="concluirRecalculo(false)"
    />

    <DialogoConfirmacao
      :visivel="dialogoRecalculoHorarios"
      :titulo="TEXTOS_RECALCULO_HORARIOS.titulo"
      :mensagem="TEXTOS_RECALCULO_HORARIOS.texto(itensRecalculoHorarios, horarioRecalculo)"
      :rotulo-confirmar="TEXTOS_RECALCULO_HORARIOS.recalcular"
      :rotulo-cancelar="TEXTOS_RECALCULO_HORARIOS.manter"
      :executando="recalculandoHorarios"
      data-teste="dialogo-recalculo-horarios"
      @confirmar="concluirRecalculoHorarios(true)"
      @cancelar="concluirRecalculoHorarios(false)"
    />
  </LayoutPainelUsuario>
</template>

<style scoped>
.formulario-casamento__alternativa {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
}

.formulario-casamento__alternativa a {
  display: inline-flex;
  align-items: center;
  gap: var(--p-ritmo-campo);
  min-height: var(--p-dimensao-alvo-toque);
}

.formulario-casamento__grupo {
  margin: 0;
  padding: 0;
  border: 0;
}

.formulario-casamento__legenda {
  padding: 0;
  margin-bottom: var(--p-ritmo-grupo);
}

.formulario-casamento__colunas {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo) var(--p-ritmo-cartao);
}

.formulario-casamento__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.formulario-casamento__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@media (min-width: 640px) {
  .formulario-casamento__colunas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .formulario-casamento__acoes {
    flex-direction: row;
    gap: var(--p-ritmo-grupo);
  }
}
</style>
