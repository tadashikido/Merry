<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import BadgeStatus from '@/componentes/base/BadgeStatus.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import ListaNaoCopiado from '@/componentes/base/ListaNaoCopiado.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import NomesAnfitrioes from '@/componentes/base/NomesAnfitrioes.vue'
import OpcaoCopia from '@/componentes/base/OpcaoCopia.vue'
import OrientacaoAcesso from '@/componentes/base/OrientacaoAcesso.vue'
import LateralFormularioEvento from '@/componentes/eventos/LateralFormularioEvento.vue'
import ResumoDuplicacaoEvento from '@/componentes/eventos/ResumoDuplicacaoEvento.vue'
import { useAlteracoesNaoSalvas } from '@/composables/useAlteracoesNaoSalvas'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import type { FalhaEvento } from '@/stores/eventos'
import { useDuplicacaoEventoStore } from '@/stores/duplicacaoEvento'
import { TEXTOS_EVENTOS } from '@/textos/eventos'
import { TEXTOS_DUPLICACAO_EVENTO } from '@/textos/duplicacaoEvento'
import { ROTULOS_ACOES } from '@/textos/rotulos'
import type { EventoResumoDto } from '@/tipos/eventos'
import type { DuplicarEventoRequest, PreviaDuplicacaoDto } from '@/tipos/duplicacaoEvento'
import { focarElemento } from '@/utilitarios/foco'
import { formatarDataCalendarioCurta, formatarNomesAnfitrioes } from '@/utilitarios/formatacao'
import { LIMITES_EVENTO, dataEvento, horarioEvento, nomeAnfitrioes, textoOpcional } from '@/utilitarios/validacaoEvento'
import { obrigatorio } from '@/utilitarios/validacao'
import { aceitaSegundoNome, vocabularioDoTipo, type VocabularioTipoEvento } from '@/textos/tiposEvento'
import type { TipoEvento } from '@/tipos/eventos'

const props = defineProps<{ origem?: string }>()

const ESPERA_PREVIA_MS = 300
const PADRAO_ID = /^[0-9a-fA-F-]{36}$/
const TIPO_SEM_ORIGEM: TipoEvento = 'Comemoracao'
const CAMPOS = ['nomePrimeiraPessoa', 'nomeSegundaPessoa', 'data', 'horario', 'localCerimonia', 'localRecepcao'] as const
type Campo = (typeof CAMPOS)[number]

const store = useDuplicacaoEventoStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const origemId = ref<string | null>(props.origem && PADRAO_ID.test(props.origem) ? props.origem : null)
const origemEscolhida = ref<string | null>(null)
const erroOrigem = ref<string | null>(null)
const origemVeioDaRota = ref(origemId.value !== null)

const origens = ref<EventoResumoDto[] | null>(null)
const carregandoOrigens = ref(false)
const falhaOrigens = ref(false)

const previa = ref<PreviaDuplicacaoDto | null>(null)
const carregandoPrevia = ref(false)
const falhaPrevia = ref<FalhaEvento | null>(null)
let consultaPrevia = 0
let temporizadorPrevia: ReturnType<typeof setTimeout> | null = null

const copiarTarefas = ref(true)
const copiarFornecedores = ref(true)
const copiarCronograma = ref(true)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const bloqueadoPorPermissao = ref(false)

const formulario = useFormulario(
  {
    nomePrimeiraPessoa: '',
    nomeSegundaPessoa: '',
    data: '',
    horario: '',
    localCerimonia: '',
    localRecepcao: '',
  },
  {
    nomePrimeiraPessoa: [obrigatorio, nomeAnfitrioes],
    nomeSegundaPessoa: [regraSegundoNomeObrigatorio, regraSegundoNomeTamanho],
    data: [obrigatorio, dataEvento],
    horario: [horarioEvento],
    localCerimonia: [textoOpcional(LIMITES_EVENTO.local)],
    localRecepcao: [textoOpcional(LIMITES_EVENTO.local)],
  },
)
const { liberarSaida } = useAlteracoesNaoSalvas(formulario.temAlteracoes)

const idCampo = (campo: Campo | 'origem' | 'copiarTarefas' | 'copiarFornecedores' | 'copiarCronograma') => `duplicacao-${campo}`

const opcoesOrigem = computed(() =>
  (origens.value ?? []).map((evento) => ({
    valor: evento.id,
    rotulo: TEXTOS_DUPLICACAO_EVENTO.opcaoOrigem(
      formatarNomesAnfitrioes(evento.nomePrimeiraPessoa, evento.nomeSegundaPessoa),
      vocabularioDoTipo(evento.tipo).rotulo,
      formatarDataCalendarioCurta(evento.data),
      evento.arquivado,
    ),
  })),
)

const origemDaPrevia = computed(() => (previa.value && previa.value.origem.id === origemId.value ? previa.value.origem : null))
const nomesOrigem = computed(() =>
  origemDaPrevia.value ? formatarNomesAnfitrioes(origemDaPrevia.value.nomePrimeiraPessoa, origemDaPrevia.value.nomeSegundaPessoa) : '',
)

const tipoOrigem = computed<TipoEvento>(
  () => origemDaPrevia.value?.tipo ?? origens.value?.find((evento) => evento.id === origemId.value)?.tipo ?? TIPO_SEM_ORIGEM,
)
const vocabulario = computed<VocabularioTipoEvento>(() => vocabularioDoTipo(tipoOrigem.value))
const temSegundoNome = computed<boolean>(() => aceitaSegundoNome(tipoOrigem.value))

function regraSegundoNomeObrigatorio(valor: unknown): string | null {
  return vocabulario.value.homenageados.segundoObrigatorio ? obrigatorio(valor) : null
}

function regraSegundoNomeTamanho(valor: unknown): string | null {
  return temSegundoNome.value ? nomeAnfitrioes(valor) : null
}

watch(tipoOrigem, () => formulario.limparErro('nomeSegundaPessoa'))

const falhaBloqueante = computed(() => {
  const falha = falhaPrevia.value
  if (!falha || origemDaPrevia.value) {
    return null
  }
  return falha
})

const dataValida = computed(() => {
  const data = formulario.valores.data.trim()
  return data !== '' && dataEvento(data) === null ? data : null
})

const quantidadeTarefas = computed(() => (origemDaPrevia.value && !carregandoPrevia.value ? previa.value?.tarefas ?? null : null))
const quantidadeFornecedores = computed(() =>
  origemDaPrevia.value && !carregandoPrevia.value ? previa.value?.fornecedores ?? null : null,
)
const quantidadeCronograma = computed(() =>
  origemDaPrevia.value && !carregandoPrevia.value ? previa.value?.itensCronograma ?? null : null,
)
const semCronograma = computed(() => origemDaPrevia.value !== null && (previa.value?.itensCronograma ?? 0) === 0)
const levaCronograma = computed(() => copiarCronograma.value && !semCronograma.value)
const detalheCronograma = computed(() =>
  semCronograma.value
    ? TEXTOS_DUPLICACAO_EVENTO.opcaoCronogramaVazia
    : TEXTOS_DUPLICACAO_EVENTO.opcaoCronogramaDetalhe(vocabulario.value.referencia.relativoAoMomento),
)
const complementoCronograma = computed(() =>
  !semCronograma.value && copiarCronograma.value && !copiarFornecedores.value
    ? TEXTOS_DUPLICACAO_EVENTO.cronogramaSemFornecedores
    : null,
)
const semTarefas = computed(() => origemDaPrevia.value !== null && previa.value?.tarefas === 0)
const semFornecedores = computed(() => origemDaPrevia.value !== null && previa.value?.fornecedores === 0)

const levaTarefas = computed(() => copiarTarefas.value && !semTarefas.value)
const levaFornecedores = computed(() => copiarFornecedores.value && !semFornecedores.value)

const detalheTarefas = computed(() =>
  semTarefas.value
    ? TEXTOS_DUPLICACAO_EVENTO.opcaoTarefasVazia
    : TEXTOS_DUPLICACAO_EVENTO.opcaoTarefasDetalhe(previa.value?.tarefasDoChecklist ?? 0),
)
const complementoTarefas = computed(() => {
  const canceladas = previa.value?.tarefasCanceladasIgnoradas ?? 0
  return canceladas > 0 ? TEXTOS_DUPLICACAO_EVENTO.tarefasCanceladas(canceladas) : null
})
const detalheFornecedores = computed(() =>
  semFornecedores.value ? TEXTOS_DUPLICACAO_EVENTO.opcaoFornecedoresVazia : TEXTOS_DUPLICACAO_EVENTO.opcaoFornecedoresDetalhe,
)
const complementoFornecedores = computed(() => {
  const ignorados = previa.value?.fornecedoresIgnorados ?? 0
  return ignorados > 0 ? TEXTOS_DUPLICACAO_EVENTO.fornecedoresIgnorados(ignorados) : null
})

const avisoAtrasadas = computed(() => {
  if (!origemDaPrevia.value || !levaTarefas.value) {
    return null
  }
  if (!dataValida.value) {
    return TEXTOS_DUPLICACAO_EVENTO.semData
  }
  const atrasadas = previa.value?.tarefasNascemAtrasadas ?? 0
  return atrasadas > 0 ? TEXTOS_DUPLICACAO_EVENTO.nascemAtrasadas(atrasadas) : null
})

const previaDoResumo = computed(() => (origemDaPrevia.value && !carregandoPrevia.value ? previa.value : null))
const modulosLevados = computed(() => ({
  tarefas: levaTarefas.value,
  fornecedores: levaFornecedores.value,
  cronograma: levaCronograma.value,
}))

const resumoAnunciado = computed(() => {
  const atual = previa.value
  if (!origemDaPrevia.value || !atual || carregandoPrevia.value) {
    return ''
  }
  const resumo = TEXTOS_DUPLICACAO_EVENTO.resumoPrevia(
    levaTarefas.value ? atual.tarefas : 0,
    levaFornecedores.value ? atual.fornecedores : 0,
    levaCronograma.value ? atual.itensCronograma ?? 0 : 0,
  )
  const atrasadas = levaTarefas.value && dataValida.value && atual.tarefasNascemAtrasadas > 0
    ? ` ${TEXTOS_DUPLICACAO_EVENTO.nascemAtrasadas(atual.tarefasNascemAtrasadas)}`
    : ''
  return `${resumo}${atrasadas}`
})

async function carregarPrevia() {
  const id = origemId.value
  if (!id) {
    return
  }
  const consulta = ++consultaPrevia
  carregandoPrevia.value = true
  const resultado = await store.previa(id, dataValida.value)
  if (consulta !== consultaPrevia) {
    return
  }
  carregandoPrevia.value = false
  if (resultado.ok) {
    const primeiraCarga = previa.value === null
    previa.value = resultado.valor
    falhaPrevia.value = null
    if (primeiraCarga) {
      await focarElemento(idCampo('nomePrimeiraPessoa'))
    }
    return
  }
  falhaPrevia.value = resultado.falha
}

function agendarPrevia() {
  if (temporizadorPrevia) {
    clearTimeout(temporizadorPrevia)
  }
  temporizadorPrevia = setTimeout(() => {
    temporizadorPrevia = null
    void carregarPrevia()
  }, ESPERA_PREVIA_MS)
}

async function carregarOrigens() {
  carregandoOrigens.value = true
  falhaOrigens.value = false
  const resultado = await store.listarOrigens()
  carregandoOrigens.value = false
  if (resultado.ok) {
    origens.value = resultado.valor
    return
  }
  falhaOrigens.value = true
}

watch(dataValida, () => {
  if (origemId.value) {
    agendarPrevia()
  }
})

watch(origemEscolhida, (id) => {
  if (!id) {
    return
  }
  erroOrigem.value = null
  origemId.value = id
  void roteador.replace({ name: 'evento-duplicar', query: { origem: id } })
})

watch(
  origemId,
  (id) => {
    previa.value = null
    falhaPrevia.value = null
    if (id) {
      void carregarPrevia()
    }
  },
  { immediate: true },
)

function trocarOrigem() {
  origemId.value = null
  origemEscolhida.value = null
  if (!origens.value) {
    void carregarOrigens()
  }
  void focarElemento(idCampo('origem'))
}

onMounted(async () => {
  if (!origemId.value) {
    await carregarOrigens()
    await focarElemento(idCampo('origem'))
  }
})

onBeforeUnmount(() => {
  if (temporizadorPrevia) {
    clearTimeout(temporizadorPrevia)
  }
  consultaPrevia++
})

function textoOuNulo(valor: string): string | null {
  const texto = valor.trim()
  return texto === '' ? null : texto
}

function montarRequest(): DuplicarEventoRequest {
  const valores = formulario.valores
  return {
    nomePrimeiraPessoa: valores.nomePrimeiraPessoa.trim(),
    nomeSegundaPessoa: temSegundoNome.value ? textoOuNulo(valores.nomeSegundaPessoa) : null,
    data: valores.data,
    horario: textoOuNulo(valores.horario),
    localCerimonia: textoOuNulo(valores.localCerimonia),
    localRecepcao: textoOuNulo(valores.localRecepcao),
    copiarTarefas: levaTarefas.value,
    copiarFornecedores: levaFornecedores.value,
    copiarCronograma: levaCronograma.value,
  }
}

async function enviar() {
  mensagemErro.value = null
  const id = origemId.value
  const formularioValido = formulario.validar()
  if (!id) {
    erroOrigem.value = TEXTOS_DUPLICACAO_EVENTO.origemObrigatoria
    await focarElemento(idCampo('origem'))
    return
  }
  if (!formularioValido) {
    const campo = formulario.primeiroCampoInvalido.value
    if (campo) {
      await focarElemento(idCampo(campo))
    }
    return
  }

  enviando.value = true
  const resultado = await store.duplicar(id, montarRequest())
  enviando.value = false

  if (resultado.ok) {
    liberarSaida()
    notificacao.sucesso(
      TEXTOS_DUPLICACAO_EVENTO.sucesso(
        resultado.valor.tarefasCopiadas,
        resultado.valor.fornecedoresCopiados,
        resultado.valor.itensCronogramaCopiados ?? 0,
      ),
    )
    await roteador.replace({ name: 'evento', params: { id: resultado.valor.evento.id } })
    return
  }

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
    mensagemErro.value = TEXTOS_DUPLICACAO_EVENTO.semPermissao
    return
  }
  if (falha.tipo === 'naoEncontrado') {
    mensagemErro.value = TEXTOS_EVENTOS.naoEncontradoTitulo
    return
  }
  if (falha.tipo === 'regra' && falha.mensagem) {
    mensagemErro.value = falha.mensagem
    return
  }
  notificacao.erro(falha.tipo === 'conexao' && falha.mensagem ? falha.mensagem : undefined)
}

function cancelar() {
  liberarSaida()
  if (origemVeioDaRota.value && origemId.value) {
    void roteador.push({ name: 'evento', params: { id: origemId.value } })
    return
  }
  void roteador.push({ name: 'eventos' })
}
</script>

<template>
  <LayoutPainelUsuario>
    <div class="duplicar com-lateral">
      <div class="pagina-formulario duplicar__pagina com-lateral__pagina com-lateral__pagina--ativa">
        <CabecalhoPagina
          :titulo="TEXTOS_DUPLICACAO_EVENTO.titulo"
          :descricao="TEXTOS_DUPLICACAO_EVENTO.descricao"
        />

        <div class="pilha pilha--cartao">
          <template v-if="falhaBloqueante">
            <EstadoErro
              v-if="falhaBloqueante.tipo === 'naoEncontrado'"
              :titulo="TEXTOS_EVENTOS.naoEncontradoTitulo"
              :mensagem="TEXTOS_EVENTOS.naoEncontradoTexto"
              :pode-tentar-novamente="false"
            />
            <EstadoErro
              v-else-if="falhaBloqueante.tipo === 'semPermissao'"
              variante="semPermissao"
              :titulo="TEXTOS_EVENTOS.erroCarregarUmTitulo"
              :mensagem="TEXTOS_DUPLICACAO_EVENTO.semPermissao"
              :pode-tentar-novamente="false"
            />
            <EstadoErro
              v-else
              :titulo="TEXTOS_EVENTOS.erroCarregarUmTitulo"
              :mensagem="TEXTOS_EVENTOS.erroCarregarTexto"
              @tentar-novamente="carregarPrevia"
            />
            <RouterLink
              class="duplicar__voltar"
              :to="{ name: 'eventos' }"
              data-teste="voltar-eventos"
            >
              {{ TEXTOS_EVENTOS.voltarLista }}
            </RouterLink>
          </template>

          <EstadoCarregando
            v-else-if="origemId && !origemDaPrevia"
            variante="formulario"
            :linhas="4"
          />

          <EstadoCarregando
            v-else-if="!origemId && carregandoOrigens && !origens"
            variante="formulario"
            :linhas="2"
          />

          <EstadoErro
            v-else-if="!origemId && falhaOrigens"
            :titulo="TEXTOS_DUPLICACAO_EVENTO.erroOrigensTitulo"
            :mensagem="TEXTOS_EVENTOS.erroCarregarTexto"
            @tentar-novamente="carregarOrigens"
          />

          <EstadoVazio
            v-else-if="!origemId && origens && origens.length === 0"
            :titulo="TEXTOS_DUPLICACAO_EVENTO.vazioTitulo"
            :descricao="TEXTOS_DUPLICACAO_EVENTO.vazioTexto"
            icone="evento"
          >
            <template #acao>
              <Button
                :label="TEXTOS_EVENTOS.novoEvento"
                icon="ie ie-mais"
                data-teste="vazio-novo-evento"
                @click="roteador.push({ name: 'evento-novo' })"
              />
            </template>
          </EstadoVazio>

          <div
            v-else
            class="duplicar__corpo com-lateral__corpo"
          >
            <div class="duplicar__principal com-lateral__principal pilha pilha--cartao">
              <MensagemFormulario
                v-if="mensagemErro"
                :mensagem="mensagemErro"
                data-teste="erro-formulario"
              />

              <form
                class="pilha pilha--bloco"
                novalidate
                data-teste="formulario-duplicacao"
                @submit.prevent="enviar"
              >
                <div
                  v-if="origemDaPrevia"
                  class="duplicar__origem cartao"
                  data-teste="resumo-origem"
                >
                  <p class="duplicar__origem-texto">
                    <span class="duplicar__origem-rotulo texto-rotulo">{{ TEXTOS_DUPLICACAO_EVENTO.origemRotulo }}</span>
                    <NomesAnfitrioes
                      :primeiro="origemDaPrevia.nomePrimeiraPessoa"
                      :segundo="origemDaPrevia.nomeSegundaPessoa"
                      tamanho="cartao"
                    />
                  </p>
                  <p class="duplicar__origem-detalhes">
                    <span data-teste="tipo-origem">{{ vocabulario.rotulo }}</span>
                    <span class="numeros-tabulares">{{ formatarDataCalendarioCurta(origemDaPrevia.data) }}</span>
                    <BadgeStatus
                      v-if="origemDaPrevia.arquivado"
                      :texto="TEXTOS_EVENTOS.statusArquivado"
                      icone="arquivar"
                    />
                  </p>
                  <p
                    class="duplicar__herdado"
                    data-teste="tipo-herdado"
                  >
                    {{ TEXTOS_DUPLICACAO_EVENTO.tipoHerdado(vocabulario.referencia.indefinido) }}
                  </p>
                  <Button
                    v-if="!origemVeioDaRota"
                    class="duplicar__trocar"
                    :label="TEXTOS_DUPLICACAO_EVENTO.trocarOrigem"
                    :aria-label="TEXTOS_DUPLICACAO_EVENTO.trocarOrigemAcessivel"
                    severity="secondary"
                    text
                    size="small"
                    :disabled="enviando"
                    data-teste="trocar-origem"
                    @click="trocarOrigem"
                  />
                </div>

                <CampoFormulario
                  v-else
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_DUPLICACAO_EVENTO.seletorOrigem"
                  :id-campo="idCampo('origem')"
                  :dica="TEXTOS_DUPLICACAO_EVENTO.seletorOrigemDica"
                  obrigatorio
                  :erro="erroOrigem"
                >
                  <Select
                    v-model="origemEscolhida"
                    :input-id="idEntrada"
                    :options="opcoesOrigem"
                    option-label="rotulo"
                    option-value="valor"
                    filter
                    :placeholder="TEXTOS_DUPLICACAO_EVENTO.seletorPlaceholder"
                    :invalid="invalido"
                    :aria-describedby="descritoPor"
                    :loading="carregandoOrigens"
                    data-teste="campo-origem"
                  />
                </CampoFormulario>

                <fieldset class="duplicar__grupo pilha pilha--grupo">
                  <legend class="duplicar__legenda texto-rotulo">
                    {{ vocabulario.homenageados.grupo }}
                  </legend>
                  <div class="duplicar__colunas">
                    <CampoFormulario
                      v-slot="{ id: idEntrada, invalido, descritoPor }"
                      :rotulo="vocabulario.homenageados.primeiro"
                      :id-campo="idCampo('nomePrimeiraPessoa')"
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

                <fieldset class="duplicar__grupo pilha pilha--grupo">
                  <legend class="duplicar__legenda texto-rotulo">
                    {{ TEXTOS_EVENTOS.grupoQuando }}
                  </legend>
                  <div class="duplicar__colunas">
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
                </fieldset>

                <fieldset class="duplicar__grupo pilha pilha--grupo">
                  <legend class="duplicar__legenda texto-rotulo">
                    {{ TEXTOS_EVENTOS.grupoOnde }}
                  </legend>
                  <div class="duplicar__colunas">
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

                <div
                  class="duplicar__reaproveitamento"
                  :class="{ 'duplicar__reaproveitamento--par': Boolean(origemDaPrevia) }"
                  data-teste="reaproveitamento"
                >
                  <fieldset
                    class="duplicar__grupo pilha pilha--grupo"
                    :disabled="!origemDaPrevia || enviando"
                  >
                    <legend class="duplicar__legenda texto-rotulo">
                      {{ TEXTOS_DUPLICACAO_EVENTO.grupoLevar }}
                    </legend>
                    <ul
                      class="duplicar__opcoes"
                      data-teste="opcoes-copia"
                    >
                      <OpcaoCopia
                        v-model="copiarTarefas"
                        :id-campo="idCampo('copiarTarefas')"
                        :titulo="TEXTOS_DUPLICACAO_EVENTO.opcaoTarefasTitulo"
                        :descricao="detalheTarefas"
                        :complemento="complementoTarefas"
                        :quantidade="quantidadeTarefas"
                        :rotulo-quantidade="TEXTOS_DUPLICACAO_EVENTO.quantidadeTarefas(quantidadeTarefas ?? 0)"
                        :desabilitado="semTarefas"
                        data-teste="opcao-tarefas"
                      />
                      <OpcaoCopia
                        v-model="copiarFornecedores"
                        :id-campo="idCampo('copiarFornecedores')"
                        :titulo="TEXTOS_DUPLICACAO_EVENTO.opcaoFornecedoresTitulo"
                        :descricao="detalheFornecedores"
                        :complemento="complementoFornecedores"
                        :quantidade="quantidadeFornecedores"
                        :rotulo-quantidade="TEXTOS_DUPLICACAO_EVENTO.quantidadeFornecedores(quantidadeFornecedores ?? 0)"
                        :desabilitado="semFornecedores"
                        data-teste="opcao-fornecedores"
                      />
                      <OpcaoCopia
                        v-model="copiarCronograma"
                        :id-campo="idCampo('copiarCronograma')"
                        :titulo="TEXTOS_DUPLICACAO_EVENTO.opcaoCronogramaTitulo"
                        :descricao="detalheCronograma"
                        :complemento="complementoCronograma"
                        :quantidade="quantidadeCronograma"
                        :rotulo-quantidade="TEXTOS_DUPLICACAO_EVENTO.quantidadeItensCronograma(quantidadeCronograma ?? 0)"
                        :desabilitado="semCronograma"
                        data-teste="opcao-cronograma"
                      />
                    </ul>
                    <p
                      v-if="avisoAtrasadas"
                      class="duplicar__aviso"
                      :class="{ 'duplicar__aviso--alerta': Boolean(dataValida) }"
                      data-teste="aviso-previa"
                    >
                      {{ avisoAtrasadas }}
                    </p>
                    <MensagemFormulario
                      v-if="falhaPrevia && origemDaPrevia"
                      variante="alerta"
                      :mensagem="TEXTOS_DUPLICACAO_EVENTO.erroPrevia"
                      data-teste="erro-previa"
                    >
                      <Button
                        :label="TEXTOS_DUPLICACAO_EVENTO.tentarDeNovo"
                        severity="secondary"
                        text
                        size="small"
                        @click="carregarPrevia"
                      />
                    </MensagemFormulario>
                    <p
                      class="somente-leitor-tela"
                      aria-live="polite"
                      data-teste="resumo-previa"
                    >
                      {{ resumoAnunciado }}
                    </p>
                  </fieldset>

                  <ListaNaoCopiado
                    v-if="origemDaPrevia"
                    :titulo="TEXTOS_DUPLICACAO_EVENTO.ficaCom(nomesOrigem)"
                    :itens="TEXTOS_DUPLICACAO_EVENTO.ficaItens"
                    id-titulo="duplicacao-fica-com"
                    class="duplicar__fica"
                  />
                </div>

                <div class="duplicar__acoes">
                  <Button
                    type="submit"
                    :label="TEXTOS_DUPLICACAO_EVENTO.acaoCriar"
                    :loading="enviando"
                    :aria-busy="enviando"
                    :disabled="bloqueadoPorPermissao"
                    data-teste="criar-evento"
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
            </div>

            <div
              class="duplicar__lateral com-lateral__lateral com-lateral__lateral--filete"
              data-teste="lateral-duplicacao"
            >
              <template v-if="origemDaPrevia">
                <ResumoDuplicacaoEvento
                  :tipo="tipoOrigem"
                  :data="dataValida"
                  :previa="previaDoResumo"
                  :leva="modulosLevados"
                />
                <LateralFormularioEvento
                  :tipo="tipoOrigem"
                  :mostrar-modelos="false"
                />
              </template>
              <OrientacaoAcesso
                v-else
                id-titulo="titulo-como-funciona-duplicacao"
                :titulo="TEXTOS_DUPLICACAO_EVENTO.comoFuncionaTitulo"
                :itens="TEXTOS_DUPLICACAO_EVENTO.comoFuncionaItens"
                data-teste="como-funciona-duplicacao"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </LayoutPainelUsuario>
</template>

<style scoped>
.duplicar__principal {
  container: duplicar-campos / inline-size;
  min-width: 0;
}

.duplicar__origem {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--p-ritmo-campo) var(--p-ritmo-grupo);
  align-items: center;
}

.duplicar__origem-texto {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
  min-width: 0;
  margin: 0;
}

.duplicar__origem-detalhes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--p-ritmo-campo);
  grid-column: 1;
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-secundario);
}

.duplicar__herdado {
  grid-column: 1;
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-interface);
  color: var(--p-cor-texto-apoio);
}

.duplicar__trocar {
  grid-column: 2;
  grid-row: 1 / span 3;
}

.duplicar__grupo {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.duplicar__legenda {
  padding: 0;
  margin-bottom: var(--p-ritmo-grupo);
}

.duplicar__colunas {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo) var(--p-ritmo-cartao);
}

.duplicar__reaproveitamento {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-bloco) var(--p-ritmo-cartao);
  align-items: start;
}

.duplicar__opcoes {
  margin: 0;
  padding: 0;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.duplicar__aviso {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.duplicar__aviso--alerta {
  color: var(--p-cor-alerta-texto);
}

.duplicar__voltar {
  align-self: flex-start;
}

.duplicar__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.duplicar__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@container duplicar-campos (min-width: 36rem) {
  .duplicar__colunas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .duplicar__acoes {
    flex-direction: row;
    gap: var(--p-ritmo-grupo);
  }
}

@container duplicar-campos (min-width: 40rem) {
  .duplicar__reaproveitamento--par {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }

  .duplicar__fica {
    padding-inline-start: var(--p-ritmo-cartao);
    border-inline-start: 1px solid var(--p-cor-divisoria);
  }
}
</style>
