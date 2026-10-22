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
import EscolhaTipoEvento from '@/componentes/eventos/EscolhaTipoEvento.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useAlteracoesNaoSalvas } from '@/composables/useAlteracoesNaoSalvas'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { useEventosStore } from '@/stores/eventos'
import { useChecklistStore } from '@/stores/checklist'
import { useCronogramaStore } from '@/stores/cronograma'
import { TEXTOS_CHECKLIST } from '@/textos/checklist'
import { TEXTOS_RECALCULO_HORARIOS } from '@/textos/modelosCronograma'
import { MENSAGENS_PADRAO } from '@/textos/mensagens'
import { ROTULOS_ACOES } from '@/textos/rotulos'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import { TEXTOS_DUPLICACAO_EVENTO } from '@/textos/duplicacaoEvento'
import { aceitaSegundoNome, vocabularioDoTipo, type VocabularioTipoEvento } from '@/textos/tiposEvento'
import type { EventoDto, SalvarEventoRequest, TipoEvento } from '@/tipos/eventos'
import { focarElemento } from '@/utilitarios/foco'
import { formatarDataCalendario, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'
import { dataLimitePadrao } from '@/utilitarios/rsvp'
import {
  LIMITES_EVENTO,
  convidadosEstimados,
  dataEvento,
  dataLimiteRsvp,
  horarioEvento,
  nomeAnfitrioes,
  textoOpcional,
} from '@/utilitarios/validacaoEvento'
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
  'tipo',
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

const store = useEventosStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const edicao = computed(() => Boolean(props.id))
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const bloqueadoPorPermissao = ref(false)

const formulario = useFormulario(
  {
    tipo: 'Casamento' as TipoEvento,
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
    nomePrimeiraPessoa: [obrigatorio, nomeAnfitrioes],
    nomeSegundaPessoa: [regraSegundoNomeObrigatorio, regraSegundoNomeTamanho],
    data: [obrigatorio, dataEvento],
    horario: [horarioEvento],
    dataLimiteRsvp: [dataLimiteRsvp((): string => formulario.valores.data)],
    localCerimonia: [textoOpcional(LIMITES_EVENTO.local)],
    localRecepcao: [textoOpcional(LIMITES_EVENTO.local)],
    convidadosEstimados: [convidadosEstimados],
    observacoes: [textoOpcional(LIMITES_EVENTO.observacoes)],
  },
)
const { liberarSaida } = useAlteracoesNaoSalvas(formulario.temAlteracoes)

const idCampo = (campo: Campo) => `evento-${campo}`
const idFoco = (campo: Campo) => (campo === 'tipo' ? `${idCampo('tipo')}-${formulario.valores.tipo}` : idCampo(campo))

const vocabulario = computed<VocabularioTipoEvento>(() => vocabularioDoTipo(formulario.valores.tipo))
const temSegundoNome = computed<boolean>(() => aceitaSegundoNome(formulario.valores.tipo))

function regraSegundoNomeObrigatorio(valor: unknown): string | null {
  return vocabulario.value.homenageados.segundoObrigatorio ? obrigatorio(valor) : null
}

function regraSegundoNomeTamanho(valor: unknown): string | null {
  return temSegundoNome.value ? nomeAnfitrioes(valor) : null
}

watch(
  () => formulario.valores.tipo,
  () => formulario.limparErro('nomeSegundaPessoa'),
)

const eventoEditado = computed(() => (edicao.value && store.atual?.id === props.id ? store.atual : null))
const carregandoEdicao = computed(() => edicao.value && store.carregandoAtual)
const falhaEdicao = computed(() => (edicao.value ? store.falhaAtual : null))
const arquivado = computed(() => eventoEditado.value?.arquivado === true)

const titulo = computed(() => (edicao.value ? TEXTOS_EVENTOS.tituloEdicao : TEXTOS_EVENTOS.tituloNovo))
const descricao = computed(() => {
  const evento = eventoEditado.value
  if (evento) {
    return formatarNomesAnfitrioes(evento.nomePrimeiraPessoa, evento.nomeSegundaPessoa)
  }
  return edicao.value ? undefined : TEXTOS_EVENTOS.descricaoNovo
})
const rotuloSalvar = computed(() => (edicao.value ? TEXTOS_EVENTOS.salvarEdicao : TEXTOS_EVENTOS.salvarNovo))
const quantidadeObservacoes = computed(() => formulario.valores.observacoes.length)
const dicaDataLimite = computed(() => {
  const padrao = dataLimitePadrao(formulario.valores.data)
  return TEXTOS_EVENTOS.dataLimiteRsvpDica(padrao ? formatarDataCalendario(padrao) : null)
})

function preencher(evento: EventoDto) {
  Object.assign(formulario.valores, {
    tipo: evento.tipo,
    nomePrimeiraPessoa: evento.nomePrimeiraPessoa,
    nomeSegundaPessoa: evento.nomeSegundaPessoa ?? '',
    data: evento.data,
    horario: evento.horario ?? '',
    dataLimiteRsvp: evento.dataLimiteRsvp ?? '',
    localCerimonia: evento.localCerimonia ?? '',
    localRecepcao: evento.localRecepcao ?? '',
    convidadosEstimados: evento.convidadosEstimados === null ? '' : String(evento.convidadosEstimados),
    observacoes: evento.observacoes ?? '',
  })
  formulario.fixarEstadoInicial()
}

watch(
  eventoEditado,
  (evento) => {
    if (evento) {
      preencher(evento)
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
  if (!edicao.value) {
    await focarElemento(idFoco('tipo'))
  } else if (eventoEditado.value) {
    await focarElemento(idCampo('nomePrimeiraPessoa'))
  }
})

function textoOuNulo(valor: string): string | null {
  const texto = valor.trim()
  return texto === '' ? null : texto
}

function montarRequest(): SalvarEventoRequest {
  const valores = formulario.valores
  const convidados = valores.convidadosEstimados.trim()
  return {
    tipo: valores.tipo,
    nomePrimeiraPessoa: valores.nomePrimeiraPessoa.trim(),
    nomeSegundaPessoa: temSegundoNome.value ? textoOuNulo(valores.nomeSegundaPessoa) : null,
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
      await focarElemento(idFoco(campo))
    }
    return
  }

  enviando.value = true
  const request = montarRequest()
  const dataAnterior = eventoEditado.value?.data ?? null
  const horarioAnterior = eventoEditado.value ? (eventoEditado.value.horario ?? null) : undefined
  const resultado = props.id ? await store.atualizar(props.id, request) : await store.criar(request)

  if (resultado.ok) {
    liberarSaida()
    notificacao.sucesso(edicao.value ? MENSAGENS_PADRAO.salvoComSucesso : TEXTOS_EVENTOS.criado)
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
    await roteador.replace({ name: 'evento', params: { id: resultado.valor.id } })
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
    await focarElemento(idFoco(primeiro))
    return
  }

  if (falha.tipo === 'semPermissao') {
    bloqueadoPorPermissao.value = true
    mensagemErro.value = TEXTOS_EVENTOS.semPermissao
    return
  }

  if (falha.tipo === 'regra' && falha.mensagem) {
    mensagemErro.value = falha.mensagem
    return
  }

  if (falha.tipo === 'naoEncontrado') {
    mensagemErro.value = TEXTOS_EVENTOS.naoEncontradoTitulo
    return
  }

  notificacao.erro(falha.tipo === 'conexao' && falha.mensagem ? falha.mensagem : undefined)
}

async function oferecerRecalculo(id: string): Promise<boolean> {
  if (eventoSemChecklist(id)) {
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

function eventoSemChecklist(id: string): boolean {
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
  await roteador.replace({ name: 'evento', params: { id } })
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
  await roteador.replace({ name: 'evento', params: { id } })
}

function cancelar() {
  liberarSaida()
  if (props.id) {
    void roteador.push({ name: 'evento', params: { id: props.id } })
    return
  }
  void roteador.push({ name: 'eventos' })
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
          v-if="carregandoEdicao && !eventoEditado"
          variante="formulario"
          :linhas="4"
        />

        <EstadoErro
          v-else-if="falhaEdicao?.tipo === 'naoEncontrado'"
          :titulo="TEXTOS_EVENTOS.naoEncontradoTitulo"
          :mensagem="TEXTOS_EVENTOS.naoEncontradoTexto"
          :pode-tentar-novamente="false"
        />

        <EstadoErro
          v-else-if="falhaEdicao"
          :titulo="TEXTOS_EVENTOS.erroCarregarUmTitulo"
          :mensagem="falhaEdicao.tipo === 'semPermissao' ? TEXTOS_EVENTOS.semAcesso : TEXTOS_EVENTOS.erroCarregarTexto"
          :pode-tentar-novamente="falhaEdicao.tipo !== 'semPermissao'"
          @tentar-novamente="carregar"
        />

        <template v-else>
          <p
            v-if="!edicao"
            class="formulario-evento__alternativa"
          >
            <RouterLink
              :to="{ name: 'evento-duplicar' }"
              data-teste="a-partir-de-outro"
            >
              <span
                class="ie ie-copiar"
                aria-hidden="true"
              />
              {{ TEXTOS_DUPLICACAO_EVENTO.acaoAPartirDeOutro }}
            </RouterLink>
          </p>
          <MensagemFormulario
            v-if="arquivado"
            variante="informacao"
            :mensagem="TEXTOS_EVENTOS.avisoArquivado"
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
            data-teste="formulario-evento"
            @submit.prevent="enviar"
          >
            <EscolhaTipoEvento
              v-model="formulario.valores.tipo"
              :id-campo="idCampo('tipo')"
              :desabilitado="enviando"
              :erro="formulario.erros.tipo"
            />

            <fieldset class="formulario-evento__grupo pilha pilha--grupo">
              <legend
                class="formulario-evento__legenda texto-rotulo"
                data-teste="legenda-homenageados"
              >
                {{ vocabulario.homenageados.grupo }}
              </legend>
              <div class="formulario-evento__colunas">
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="vocabulario.homenageados.primeiro"
                  :id-campo="idCampo('nomePrimeiraPessoa')"
                  :dica="vocabulario.homenageados.dicaPrimeiro ?? undefined"
                  obrigatorio
                  :erro="formulario.erros.nomePrimeiraPessoa"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.nomePrimeiraPessoa"
                    autocomplete="off"
                    :maxlength="LIMITES_EVENTO.nomeMaximo"
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
                  v-if="temSegundoNome"
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="vocabulario.homenageados.segundo ?? ''"
                  :id-campo="idCampo('nomeSegundaPessoa')"
                  :obrigatorio="vocabulario.homenageados.segundoObrigatorio"
                  :erro="formulario.erros.nomeSegundaPessoa"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.nomeSegundaPessoa"
                    autocomplete="off"
                    :maxlength="LIMITES_EVENTO.nomeMaximo"
                    :aria-required="vocabulario.homenageados.segundoObrigatorio"
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

            <fieldset class="formulario-evento__grupo pilha pilha--grupo">
              <legend class="formulario-evento__legenda texto-rotulo">
                {{ TEXTOS_EVENTOS.grupoQuando }}
              </legend>
              <div class="formulario-evento__colunas">
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_EVENTOS.data"
                  :id-campo="idCampo('data')"
                  obrigatorio
                  :erro="formulario.erros.data"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.data"
                    type="date"
                    :min="LIMITES_EVENTO.dataMinima"
                    :max="LIMITES_EVENTO.dataMaxima"
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
                  :rotulo="vocabulario.horario"
                  :id-campo="idCampo('horario')"
                  :dica="TEXTOS_EVENTOS.horarioDica"
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
              <div class="formulario-evento__colunas">
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_EVENTOS.dataLimiteRsvp"
                  :id-campo="idCampo('dataLimiteRsvp')"
                  :dica="dicaDataLimite"
                  :erro="formulario.erros.dataLimiteRsvp"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.dataLimiteRsvp"
                    type="date"
                    :min="LIMITES_EVENTO.dataMinima"
                    :max="formulario.valores.data || LIMITES_EVENTO.dataMaxima"
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

            <fieldset class="formulario-evento__grupo pilha pilha--grupo">
              <legend class="formulario-evento__legenda texto-rotulo">
                {{ TEXTOS_EVENTOS.grupoOnde }}
              </legend>
              <div class="formulario-evento__colunas">
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="vocabulario.locais.campoPrincipal"
                  :id-campo="idCampo('localCerimonia')"
                  :erro="formulario.erros.localCerimonia"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.localCerimonia"
                    :maxlength="LIMITES_EVENTO.local"
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
                  :rotulo="vocabulario.locais.campoSecundario"
                  :id-campo="idCampo('localRecepcao')"
                  :dica="vocabulario.locais.dicaSecundario"
                  :erro="formulario.erros.localRecepcao"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.localRecepcao"
                    :maxlength="LIMITES_EVENTO.local"
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

            <fieldset class="formulario-evento__grupo pilha pilha--grupo">
              <legend class="formulario-evento__legenda texto-rotulo">
                {{ TEXTOS_EVENTOS.grupoPlanejamento }}
              </legend>
              <div class="formulario-evento__colunas">
                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_EVENTOS.convidados"
                  :id-campo="idCampo('convidadosEstimados')"
                  :dica="TEXTOS_EVENTOS.convidadosDica"
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
                :rotulo="TEXTOS_EVENTOS.observacoes"
                :id-campo="idCampo('observacoes')"
                :dica="TEXTOS_EVENTOS.contadorObservacoes(quantidadeObservacoes, LIMITES_EVENTO.observacoes)"
                :erro="formulario.erros.observacoes"
              >
                <Textarea
                  :id="idEntrada"
                  v-model="formulario.valores.observacoes"
                  rows="4"
                  auto-resize
                  :maxlength="LIMITES_EVENTO.observacoes"
                  :invalid="invalido"
                  :aria-invalid="invalido"
                  :aria-describedby="descritoPor"
                  :readonly="enviando"
                  @update:model-value="formulario.revalidarAoDigitar('observacoes')"
                  @blur="formulario.validarAoSair('observacoes')"
                />
              </CampoFormulario>
            </fieldset>

            <div class="formulario-evento__acoes">
              <Button
                type="submit"
                :label="rotuloSalvar"
                :loading="enviando"
                :aria-busy="enviando"
                :disabled="arquivado || bloqueadoPorPermissao"
                data-teste="salvar-evento"
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
.formulario-evento__alternativa {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
}

.formulario-evento__alternativa a {
  display: inline-flex;
  align-items: center;
  gap: var(--p-ritmo-campo);
  min-height: var(--p-dimensao-alvo-toque);
}

.formulario-evento__grupo {
  margin: 0;
  padding: 0;
  border: 0;
}

.formulario-evento__legenda {
  padding: 0;
  margin-bottom: var(--p-ritmo-grupo);
}

.formulario-evento__colunas {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo) var(--p-ritmo-cartao);
}

.formulario-evento__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.formulario-evento__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@media (min-width: 640px) {
  .formulario-evento__colunas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .formulario-evento__acoes {
    flex-direction: row;
    gap: var(--p-ritmo-grupo);
  }
}
</style>
