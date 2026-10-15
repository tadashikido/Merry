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
import NomesCasal from '@/componentes/base/NomesCasal.vue'
import OpcaoCopia from '@/componentes/base/OpcaoCopia.vue'
import { useAlteracoesNaoSalvas } from '@/composables/useAlteracoesNaoSalvas'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import type { FalhaCasamento } from '@/stores/casamentos'
import { useDuplicacaoCasamentoStore } from '@/stores/duplicacaoCasamento'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
import { TEXTOS_DUPLICACAO_CASAMENTO } from '@/textos/duplicacaoCasamento'
import { ROTULOS_ACOES } from '@/textos/rotulos'
import type { CasamentoResumoDto } from '@/tipos/casamentos'
import type { DuplicarCasamentoRequest, PreviaDuplicacaoDto } from '@/tipos/duplicacaoCasamento'
import { focarElemento } from '@/utilitarios/foco'
import { formatarDataCalendarioCurta, formatarNomesCasal } from '@/utilitarios/formatacao'
import { LIMITES_CASAMENTO, dataCasamento, horarioCasamento, nomeCasal, textoOpcional } from '@/utilitarios/validacaoCasamento'
import { obrigatorio } from '@/utilitarios/validacao'

const props = defineProps<{ origem?: string }>()

const ESPERA_PREVIA_MS = 300
const PADRAO_ID = /^[0-9a-fA-F-]{36}$/
const CAMPOS = ['nomePrimeiraPessoa', 'nomeSegundaPessoa', 'data', 'horario', 'localCerimonia', 'localRecepcao'] as const
type Campo = (typeof CAMPOS)[number]

const store = useDuplicacaoCasamentoStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const origemId = ref<string | null>(props.origem && PADRAO_ID.test(props.origem) ? props.origem : null)
const origemEscolhida = ref<string | null>(null)
const erroOrigem = ref<string | null>(null)
const origemVeioDaRota = ref(origemId.value !== null)

const origens = ref<CasamentoResumoDto[] | null>(null)
const carregandoOrigens = ref(false)
const falhaOrigens = ref(false)

const previa = ref<PreviaDuplicacaoDto | null>(null)
const carregandoPrevia = ref(false)
const falhaPrevia = ref<FalhaCasamento | null>(null)
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
    nomePrimeiraPessoa: [obrigatorio, nomeCasal],
    nomeSegundaPessoa: [obrigatorio, nomeCasal],
    data: [obrigatorio, dataCasamento],
    horario: [horarioCasamento],
    localCerimonia: [textoOpcional(LIMITES_CASAMENTO.local)],
    localRecepcao: [textoOpcional(LIMITES_CASAMENTO.local)],
  },
)
const { liberarSaida } = useAlteracoesNaoSalvas(formulario.temAlteracoes)

const idCampo = (campo: Campo | 'origem' | 'copiarTarefas' | 'copiarFornecedores' | 'copiarCronograma') => `duplicacao-${campo}`

const opcoesOrigem = computed(() =>
  (origens.value ?? []).map((casamento) => ({
    valor: casamento.id,
    rotulo: TEXTOS_DUPLICACAO_CASAMENTO.opcaoOrigem(
      formatarNomesCasal(casamento.nomePrimeiraPessoa, casamento.nomeSegundaPessoa),
      formatarDataCalendarioCurta(casamento.data),
      casamento.arquivado,
    ),
  })),
)

const origemDaPrevia = computed(() => (previa.value && previa.value.origem.id === origemId.value ? previa.value.origem : null))
const nomesOrigem = computed(() =>
  origemDaPrevia.value ? formatarNomesCasal(origemDaPrevia.value.nomePrimeiraPessoa, origemDaPrevia.value.nomeSegundaPessoa) : '',
)

const falhaBloqueante = computed(() => {
  const falha = falhaPrevia.value
  if (!falha || origemDaPrevia.value) {
    return null
  }
  return falha
})

const dataValida = computed(() => {
  const data = formulario.valores.data.trim()
  return data !== '' && dataCasamento(data) === null ? data : null
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
  semCronograma.value ? TEXTOS_DUPLICACAO_CASAMENTO.opcaoCronogramaVazia : TEXTOS_DUPLICACAO_CASAMENTO.opcaoCronogramaDetalhe,
)
const complementoCronograma = computed(() =>
  !semCronograma.value && copiarCronograma.value && !copiarFornecedores.value
    ? TEXTOS_DUPLICACAO_CASAMENTO.cronogramaSemFornecedores
    : null,
)
const semTarefas = computed(() => origemDaPrevia.value !== null && previa.value?.tarefas === 0)
const semFornecedores = computed(() => origemDaPrevia.value !== null && previa.value?.fornecedores === 0)

const levaTarefas = computed(() => copiarTarefas.value && !semTarefas.value)
const levaFornecedores = computed(() => copiarFornecedores.value && !semFornecedores.value)

const detalheTarefas = computed(() =>
  semTarefas.value
    ? TEXTOS_DUPLICACAO_CASAMENTO.opcaoTarefasVazia
    : TEXTOS_DUPLICACAO_CASAMENTO.opcaoTarefasDetalhe(previa.value?.tarefasDoChecklist ?? 0),
)
const complementoTarefas = computed(() => {
  const canceladas = previa.value?.tarefasCanceladasIgnoradas ?? 0
  return canceladas > 0 ? TEXTOS_DUPLICACAO_CASAMENTO.tarefasCanceladas(canceladas) : null
})
const detalheFornecedores = computed(() =>
  semFornecedores.value ? TEXTOS_DUPLICACAO_CASAMENTO.opcaoFornecedoresVazia : TEXTOS_DUPLICACAO_CASAMENTO.opcaoFornecedoresDetalhe,
)
const complementoFornecedores = computed(() => {
  const ignorados = previa.value?.fornecedoresIgnorados ?? 0
  return ignorados > 0 ? TEXTOS_DUPLICACAO_CASAMENTO.fornecedoresIgnorados(ignorados) : null
})

const avisoAtrasadas = computed(() => {
  if (!origemDaPrevia.value || !levaTarefas.value) {
    return null
  }
  if (!dataValida.value) {
    return TEXTOS_DUPLICACAO_CASAMENTO.semData
  }
  const atrasadas = previa.value?.tarefasNascemAtrasadas ?? 0
  return atrasadas > 0 ? TEXTOS_DUPLICACAO_CASAMENTO.nascemAtrasadas(atrasadas) : null
})

const resumoAnunciado = computed(() => {
  const atual = previa.value
  if (!origemDaPrevia.value || !atual || carregandoPrevia.value) {
    return ''
  }
  const resumo = TEXTOS_DUPLICACAO_CASAMENTO.resumoPrevia(
    levaTarefas.value ? atual.tarefas : 0,
    levaFornecedores.value ? atual.fornecedores : 0,
    levaCronograma.value ? atual.itensCronograma ?? 0 : 0,
  )
  const atrasadas = levaTarefas.value && dataValida.value && atual.tarefasNascemAtrasadas > 0
    ? ` ${TEXTOS_DUPLICACAO_CASAMENTO.nascemAtrasadas(atual.tarefasNascemAtrasadas)}`
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
  void roteador.replace({ name: 'casamento-duplicar', query: { origem: id } })
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

function montarRequest(): DuplicarCasamentoRequest {
  const valores = formulario.valores
  return {
    nomePrimeiraPessoa: valores.nomePrimeiraPessoa.trim(),
    nomeSegundaPessoa: valores.nomeSegundaPessoa.trim(),
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
    erroOrigem.value = TEXTOS_DUPLICACAO_CASAMENTO.origemObrigatoria
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
      TEXTOS_DUPLICACAO_CASAMENTO.sucesso(
        resultado.valor.tarefasCopiadas,
        resultado.valor.fornecedoresCopiados,
        resultado.valor.itensCronogramaCopiados ?? 0,
      ),
    )
    await roteador.replace({ name: 'casamento', params: { id: resultado.valor.casamento.id } })
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
    mensagemErro.value = TEXTOS_DUPLICACAO_CASAMENTO.semPermissao
    return
  }
  if (falha.tipo === 'naoEncontrado') {
    mensagemErro.value = TEXTOS_CASAMENTOS.naoEncontradoTitulo
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
    void roteador.push({ name: 'casamento', params: { id: origemId.value } })
    return
  }
  void roteador.push({ name: 'casamentos' })
}
</script>

<template>
  <LayoutPainelUsuario>
    <div class="pagina-formulario">
      <CabecalhoPagina
        :titulo="TEXTOS_DUPLICACAO_CASAMENTO.titulo"
        :descricao="TEXTOS_DUPLICACAO_CASAMENTO.descricao"
      >
        <template #trilha>
          <RouterLink :to="{ name: 'casamentos' }">
            {{ TEXTOS_CASAMENTOS.listaTitulo }}
          </RouterLink>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{{ TEXTOS_DUPLICACAO_CASAMENTO.titulo }}</span>
        </template>
      </CabecalhoPagina>

      <div class="pilha pilha--cartao">
        <template v-if="falhaBloqueante">
          <EstadoErro
            v-if="falhaBloqueante.tipo === 'naoEncontrado'"
            :titulo="TEXTOS_CASAMENTOS.naoEncontradoTitulo"
            :mensagem="TEXTOS_CASAMENTOS.naoEncontradoTexto"
            :pode-tentar-novamente="false"
          />
          <EstadoErro
            v-else-if="falhaBloqueante.tipo === 'semPermissao'"
            variante="semPermissao"
            :titulo="TEXTOS_CASAMENTOS.erroCarregarUmTitulo"
            :mensagem="TEXTOS_DUPLICACAO_CASAMENTO.semPermissao"
            :pode-tentar-novamente="false"
          />
          <EstadoErro
            v-else
            :titulo="TEXTOS_CASAMENTOS.erroCarregarUmTitulo"
            :mensagem="TEXTOS_CASAMENTOS.erroCarregarTexto"
            @tentar-novamente="carregarPrevia"
          />
          <RouterLink
            class="duplicar__voltar"
            :to="{ name: 'casamentos' }"
            data-teste="voltar-casamentos"
          >
            {{ TEXTOS_CASAMENTOS.voltarLista }}
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
          :titulo="TEXTOS_DUPLICACAO_CASAMENTO.erroOrigensTitulo"
          :mensagem="TEXTOS_CASAMENTOS.erroCarregarTexto"
          @tentar-novamente="carregarOrigens"
        />

        <EstadoVazio
          v-else-if="!origemId && origens && origens.length === 0"
          :titulo="TEXTOS_DUPLICACAO_CASAMENTO.vazioTitulo"
          :descricao="TEXTOS_DUPLICACAO_CASAMENTO.vazioTexto"
          icone="casamento"
        >
          <template #acao>
            <Button
              :label="TEXTOS_CASAMENTOS.novoCasamento"
              icon="ie ie-mais"
              data-teste="vazio-novo-casamento"
              @click="roteador.push({ name: 'casamento-novo' })"
            />
          </template>
        </EstadoVazio>

        <template v-else>
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
                <span class="duplicar__origem-rotulo texto-rotulo">{{ TEXTOS_DUPLICACAO_CASAMENTO.origemRotulo }}</span>
                <NomesCasal
                  :primeiro="origemDaPrevia.nomePrimeiraPessoa"
                  :segundo="origemDaPrevia.nomeSegundaPessoa"
                  tamanho="cartao"
                />
              </p>
              <p class="duplicar__origem-detalhes">
                <span class="numeros-tabulares">{{ formatarDataCalendarioCurta(origemDaPrevia.data) }}</span>
                <BadgeStatus
                  v-if="origemDaPrevia.arquivado"
                  :texto="TEXTOS_CASAMENTOS.statusArquivado"
                  icone="arquivar"
                />
              </p>
              <Button
                v-if="!origemVeioDaRota"
                class="duplicar__trocar"
                :label="TEXTOS_DUPLICACAO_CASAMENTO.trocarOrigem"
                :aria-label="TEXTOS_DUPLICACAO_CASAMENTO.trocarOrigemAcessivel"
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
              :rotulo="TEXTOS_DUPLICACAO_CASAMENTO.seletorOrigem"
              :id-campo="idCampo('origem')"
              :dica="TEXTOS_DUPLICACAO_CASAMENTO.seletorOrigemDica"
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
                :placeholder="TEXTOS_DUPLICACAO_CASAMENTO.seletorPlaceholder"
                :invalid="invalido"
                :aria-describedby="descritoPor"
                :loading="carregandoOrigens"
                data-teste="campo-origem"
              />
            </CampoFormulario>

            <fieldset class="duplicar__grupo pilha pilha--grupo">
              <legend class="duplicar__legenda texto-rotulo">
                {{ TEXTOS_DUPLICACAO_CASAMENTO.grupoNovoCasal }}
              </legend>
              <div class="duplicar__colunas">
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

            <fieldset class="duplicar__grupo pilha pilha--grupo">
              <legend class="duplicar__legenda texto-rotulo">
                {{ TEXTOS_CASAMENTOS.grupoQuando }}
              </legend>
              <div class="duplicar__colunas">
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
            </fieldset>

            <fieldset class="duplicar__grupo pilha pilha--grupo">
              <legend class="duplicar__legenda texto-rotulo">
                {{ TEXTOS_CASAMENTOS.grupoOnde }}
              </legend>
              <div class="duplicar__colunas">
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
                  {{ TEXTOS_DUPLICACAO_CASAMENTO.grupoLevar }}
                </legend>
                <ul
                  class="duplicar__opcoes"
                  data-teste="opcoes-copia"
                >
                  <OpcaoCopia
                    v-model="copiarTarefas"
                    :id-campo="idCampo('copiarTarefas')"
                    :titulo="TEXTOS_DUPLICACAO_CASAMENTO.opcaoTarefasTitulo"
                    :descricao="detalheTarefas"
                    :complemento="complementoTarefas"
                    :quantidade="quantidadeTarefas"
                    :rotulo-quantidade="TEXTOS_DUPLICACAO_CASAMENTO.quantidadeTarefas(quantidadeTarefas ?? 0)"
                    :desabilitado="semTarefas"
                    data-teste="opcao-tarefas"
                  />
                  <OpcaoCopia
                    v-model="copiarFornecedores"
                    :id-campo="idCampo('copiarFornecedores')"
                    :titulo="TEXTOS_DUPLICACAO_CASAMENTO.opcaoFornecedoresTitulo"
                    :descricao="detalheFornecedores"
                    :complemento="complementoFornecedores"
                    :quantidade="quantidadeFornecedores"
                    :rotulo-quantidade="TEXTOS_DUPLICACAO_CASAMENTO.quantidadeFornecedores(quantidadeFornecedores ?? 0)"
                    :desabilitado="semFornecedores"
                    data-teste="opcao-fornecedores"
                  />
                  <OpcaoCopia
                    v-model="copiarCronograma"
                    :id-campo="idCampo('copiarCronograma')"
                    :titulo="TEXTOS_DUPLICACAO_CASAMENTO.opcaoCronogramaTitulo"
                    :descricao="detalheCronograma"
                    :complemento="complementoCronograma"
                    :quantidade="quantidadeCronograma"
                    :rotulo-quantidade="TEXTOS_DUPLICACAO_CASAMENTO.quantidadeItensCronograma(quantidadeCronograma ?? 0)"
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
                  :mensagem="TEXTOS_DUPLICACAO_CASAMENTO.erroPrevia"
                  data-teste="erro-previa"
                >
                  <Button
                    :label="TEXTOS_DUPLICACAO_CASAMENTO.tentarDeNovo"
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
                :titulo="TEXTOS_DUPLICACAO_CASAMENTO.ficaCom(nomesOrigem)"
                :itens="TEXTOS_DUPLICACAO_CASAMENTO.ficaItens"
                id-titulo="duplicacao-fica-com"
                class="duplicar__fica"
              />
            </div>

            <div class="duplicar__acoes">
              <Button
                type="submit"
                :label="TEXTOS_DUPLICACAO_CASAMENTO.acaoCriar"
                :loading="enviando"
                :aria-busy="enviando"
                :disabled="bloqueadoPorPermissao"
                data-teste="criar-casamento"
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
  </LayoutPainelUsuario>
</template>

<style scoped>
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

.duplicar__trocar {
  grid-column: 2;
  grid-row: 1 / span 2;
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

@media (min-width: 640px) {
  .duplicar__colunas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .duplicar__acoes {
    flex-direction: row;
    gap: var(--p-ritmo-grupo);
  }
}

@media (min-width: 1024px) {
  .duplicar__reaproveitamento--par {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }

  .duplicar__fica {
    padding-inline-start: var(--p-ritmo-cartao);
    border-inline-start: 1px solid var(--p-cor-divisoria);
  }
}
</style>
