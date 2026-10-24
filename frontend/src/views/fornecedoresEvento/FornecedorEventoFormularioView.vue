<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Textarea from 'primevue/textarea'

import LayoutPainelUsuario from '@/layouts/LayoutPainelUsuario.vue'
import AnexoContrato from '@/componentes/base/AnexoContrato.vue'
import CabecalhoPagina from '@/componentes/base/CabecalhoPagina.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import DialogoConfirmacao from '@/componentes/base/DialogoConfirmacao.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoErro from '@/componentes/base/EstadoErro.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import ContratacaoFornecedoresEvento from '@/componentes/fornecedoresEvento/ContratacaoFornecedoresEvento.vue'
import HistoricoFornecedorEvento from '@/componentes/fornecedoresEvento/HistoricoFornecedorEvento.vue'
import { useAlteracoesNaoSalvas } from '@/composables/useAlteracoesNaoSalvas'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { useEventosStore, type FalhaEvento } from '@/stores/eventos'
import { useFornecedoresStore } from '@/stores/fornecedores'
import { useFornecedoresEventoStore } from '@/stores/fornecedoresEvento'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import {
  ROTULOS_STATUS_FORNECEDOR_EVENTO,
  TEXTOS_CONTRATO,
  TEXTOS_FORNECEDORES_EVENTO,
} from '@/textos/fornecedoresEvento'
import { ehTipoEvento, vocabularioOuNeutro } from '@/textos/tiposEvento'
import { CATEGORIAS_FORNECEDOR } from '@/tipos/fornecedores'
import {
  STATUS_FORNECEDOR_EVENTO,
  type AtualizarFornecedorEventoRequest,
  type FornecedorEventoDto,
  type StatusFornecedorEvento,
} from '@/tipos/fornecedoresEvento'
import { verificarArquivoPdf } from '@/utilitarios/arquivo'
import { focarElemento } from '@/utilitarios/foco'
import { formatarNomesAnfitrioes } from '@/utilitarios/formatacao'
import {
  LIMITES_VINCULO,
  fornecedoresDisponiveis,
  regraFornecedor,
  regraValor,
  regraValorContratado,
  situacaoEssencialDaCategoria,
} from '@/utilitarios/fornecedoresEvento'
import { tamanhoMaximo } from '@/utilitarios/validacao'

const CAMPOS = ['fornecedorId', 'servico', 'status', 'valorOrcado', 'valorContratado', 'notasInternas'] as const
type Campo = (typeof CAMPOS)[number]

const props = defineProps<{ id: string; vinculoId?: string }>()

const eventos = useEventosStore()
const base = useFornecedoresStore()
const store = useFornecedoresEventoStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const edicao = computed(() => Boolean(props.vinculoId))
const carregandoVinculo = ref(false)
const falhaVinculo = ref<FalhaEvento | null>(null)
const vinculo = ref<FornecedorEventoDto | null>(null)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const enviandoContrato = ref(false)
const erroContrato = ref<string | null>(null)
const confirmandoRemocaoContrato = ref(false)
const removendoContrato = ref(false)

let statusAtual = (): StatusFornecedorEvento => 'Cotacao'

const formulario = useFormulario(
  {
    fornecedorId: '',
    servico: '',
    status: 'Cotacao' as StatusFornecedorEvento,
    valorOrcado: null as number | null,
    valorContratado: null as number | null,
    notasInternas: '',
  },
  {
    fornecedorId: [(valor) => (edicao.value ? null : regraFornecedor(valor))],
    servico: [tamanhoMaximo(LIMITES_VINCULO.servicoMaximo)],
    valorOrcado: [regraValor],
    valorContratado: [regraValorContratado(() => statusAtual())],
    notasInternas: [tamanhoMaximo(LIMITES_VINCULO.notasMaximo)],
  },
)
const { liberarSaida } = useAlteracoesNaoSalvas(formulario.temAlteracoes)

statusAtual = () => formulario.valores.status

const idCampo = (campo: Campo) => `vinculo-${campo}`

const evento = computed(() => (eventos.atual?.id === props.id ? eventos.atual : null))
const nomes = computed(() =>
  evento.value ? formatarNomesAnfitrioes(evento.value.nomePrimeiraPessoa, evento.value.nomeSegundaPessoa) : '',
)
const arquivado = computed(() => evento.value?.arquivado === true)
const titulo = computed(() =>
  edicao.value ? TEXTOS_FORNECEDORES_EVENTO.tituloEditar : TEXTOS_FORNECEDORES_EVENTO.tituloNovo,
)
const rotuloSalvar = computed(() =>
  edicao.value ? TEXTOS_FORNECEDORES_EVENTO.salvar : TEXTOS_FORNECEDORES_EVENTO.salvarNovo,
)
const opcoesStatus = STATUS_FORNECEDOR_EVENTO.map((valor) => ({ valor, rotulo: ROTULOS_STATUS_FORNECEDOR_EVENTO[valor] }))

const disponiveis = computed(() =>
  fornecedoresDisponiveis(base.lista ?? [], store.eventoId === props.id ? (store.lista?.vinculos ?? []) : []),
)
const gruposFornecedores = computed(() =>
  CATEGORIAS_FORNECEDOR.map((categoria) => ({
    rotulo: ROTULOS_CATEGORIA_FORNECEDOR[categoria],
    itens: disponiveis.value
      .filter((fornecedor) => fornecedor.categoria === categoria)
      .map((fornecedor) => ({
        valor: fornecedor.id,
        rotulo: fornecedor.responsavel ? `${fornecedor.nomeEmpresa} (${fornecedor.responsavel})` : fornecedor.nomeEmpresa,
      })),
  })).filter((grupo) => grupo.itens.length > 0),
)
const fornecedorEscolhido = computed(() => (base.lista ?? []).find((item) => item.id === formulario.valores.fornecedorId) ?? null)
const tipoConhecido = computed(() => (evento.value && ehTipoEvento(evento.value.tipo) ? evento.value.tipo : null))
const vinculosDoEvento = computed(() => (store.eventoId === props.id ? (store.lista?.vinculos ?? null) : null))
const mostrarContratacao = computed(() => !edicao.value && tipoConhecido.value !== null && vinculosDoEvento.value !== null)
const legendaEscolhido = computed(() => {
  const escolhido = fornecedorEscolhido.value
  if (!escolhido) {
    return null
  }
  const rotulo = ROTULOS_CATEGORIA_FORNECEDOR[escolhido.categoria]
  if (tipoConhecido.value === null || vinculosDoEvento.value === null) {
    return rotulo
  }
  const situacao = situacaoEssencialDaCategoria(
    vinculosDoEvento.value,
    vocabularioOuNeutro(tipoConhecido.value).fornecedoresEssenciais,
    escolhido.categoria,
  )
  return situacao
    ? TEXTOS_FORNECEDORES_EVENTO.categoriaComSituacao(rotulo, TEXTOS_FORNECEDORES_EVENTO.categoriaEssencial[situacao])
    : rotulo
})
const fornecedorDoHistorico = computed(() =>
  edicao.value ? (vinculo.value?.fornecedor.id ?? null) : formulario.valores.fornecedorId || null,
)
const participacoesDoFornecedor = computed(() =>
  fornecedorDoHistorico.value && base.participacoesDe === fornecedorDoHistorico.value ? base.participacoes : null,
)
const falhaHistorico = computed(
  () => fornecedorDoHistorico.value !== null && base.participacoesDe === fornecedorDoHistorico.value && base.falhaParticipacoes !== null,
)
const comLateral = computed(() => !carregandoVinculo.value && !falhaVinculo.value && (!edicao.value || vinculo.value !== null))

function carregarHistorico() {
  if (fornecedorDoHistorico.value) {
    void base.carregarParticipacoes(fornecedorDoHistorico.value)
  }
}

watch(fornecedorDoHistorico, carregarHistorico)

const semDisponiveisTexto = computed(() =>
  (base.lista ?? []).some((fornecedor) => !fornecedor.arquivado)
    ? TEXTOS_FORNECEDORES_EVENTO.semDisponiveis
    : TEXTOS_FORNECEDORES_EVENTO.semFornecedoresBase,
)

function preencher(dados: FornecedorEventoDto) {
  vinculo.value = dados
  Object.assign(formulario.valores, {
    fornecedorId: dados.fornecedor.id,
    servico: dados.servico ?? '',
    status: dados.status,
    valorOrcado: dados.valorOrcado,
    valorContratado: dados.valorContratado,
    notasInternas: dados.notasInternas ?? '',
  })
  formulario.fixarEstadoInicial()
}

async function carregarVinculo() {
  if (!props.vinculoId) {
    return
  }
  carregandoVinculo.value = true
  falhaVinculo.value = null
  const resultado = await store.obter(props.id, props.vinculoId)
  carregandoVinculo.value = false
  if (resultado.ok) {
    preencher(resultado.valor)
    return
  }
  falhaVinculo.value = resultado.falha
}

onMounted(async () => {
  void eventos.obter(props.id)
  if (edicao.value) {
    await carregarVinculo()
    if (!falhaVinculo.value) {
      await focarElemento(idCampo('servico'))
    }
    return
  }
  await Promise.all([base.carregar(), store.eventoId === props.id && store.lista ? Promise.resolve() : store.carregar(props.id)])
  await focarElemento(idCampo('fornecedorId'))
})

function textoOuNulo(valor: string): string | null {
  const texto = valor.trim()
  return texto === '' ? null : texto
}

function montarDados(): AtualizarFornecedorEventoRequest {
  const valores = formulario.valores
  return {
    servico: textoOuNulo(valores.servico),
    valorOrcado: valores.valorOrcado ?? null,
    valorContratado: valores.valorContratado ?? null,
    status: valores.status,
    notasInternas: textoOuNulo(valores.notasInternas),
  }
}

function tratarFalha(falha: FalhaEvento) {
  const camposComErro = CAMPOS.filter((campo) => falha.errosCampos[campo])
  for (const campo of camposComErro) {
    formulario.erros[campo] = falha.errosCampos[campo]
  }
  const primeiro = camposComErro[0]
  if (primeiro) {
    void focarElemento(idCampo(primeiro))
    return
  }
  if (falha.tipo === 'semPermissao') {
    mensagemErro.value = TEXTOS_FORNECEDORES_EVENTO.semPermissao
    return
  }
  if (falha.tipo === 'conflito') {
    mensagemErro.value = TEXTOS_FORNECEDORES_EVENTO.erroConflito
    return
  }
  if (falha.tipo === 'regra' && falha.mensagem) {
    mensagemErro.value = falha.mensagem
    return
  }
  if (falha.tipo === 'naoEncontrado') {
    mensagemErro.value = TEXTOS_FORNECEDORES_EVENTO.vinculoNaoEncontradoTexto
    return
  }
  mensagemErro.value = TEXTOS_FORNECEDORES_EVENTO.erroSalvar
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
  const dados = montarDados()
  const resultado = props.vinculoId
    ? await store.atualizar(props.id, props.vinculoId, dados)
    : await store.vincular(props.id, { ...dados, fornecedorId: formulario.valores.fornecedorId })
  enviando.value = false

  if (!resultado.ok) {
    tratarFalha(resultado.falha)
    return
  }

  liberarSaida()
  notificacao.sucesso(
    edicao.value
      ? TEXTOS_FORNECEDORES_EVENTO.toastSalvo
      : TEXTOS_FORNECEDORES_EVENTO.toastAdicionado(resultado.valor.fornecedor.nomeEmpresa),
  )
  await roteador.replace({ name: 'evento-fornecedores', params: { id: props.id } })
}

function cancelar() {
  liberarSaida()
  void roteador.push({ name: 'evento-fornecedores', params: { id: props.id } })
}

function mensagemProblemaArquivo(problema: 'vazio' | 'tamanho' | 'formato'): string {
  if (problema === 'vazio') {
    return TEXTOS_CONTRATO.erroVazio
  }
  return problema === 'tamanho' ? TEXTOS_CONTRATO.erroTamanho : TEXTOS_CONTRATO.erroFormato
}

async function enviarContrato(arquivo: File) {
  const atual = vinculo.value
  if (!atual || !props.vinculoId) {
    return
  }
  erroContrato.value = null
  const problema = await verificarArquivoPdf(arquivo)
  if (problema) {
    erroContrato.value = mensagemProblemaArquivo(problema)
    return
  }
  const substituicao = atual.contrato !== null
  enviandoContrato.value = true
  const resultado = await store.enviarContrato(props.id, props.vinculoId, arquivo)
  enviandoContrato.value = false
  if (!resultado.ok) {
    erroContrato.value =
      resultado.falha.tipo === 'regra' && resultado.falha.mensagem ? resultado.falha.mensagem : TEXTOS_CONTRATO.erroEnviar
    return
  }
  vinculo.value = resultado.valor
  notificacao.sucesso(substituicao ? TEXTOS_CONTRATO.toastSubstituido : TEXTOS_CONTRATO.toastAnexado)
}

async function baixarContrato() {
  if (!vinculo.value) {
    return
  }
  const resultado = await store.baixarContrato(props.id, vinculo.value)
  if (!resultado.ok) {
    notificacao.erro(TEXTOS_CONTRATO.erroBaixar)
  }
}

function alterarVisibilidadeRemocao(visivel: boolean) {
  if (!visivel && !removendoContrato.value) {
    confirmandoRemocaoContrato.value = false
  }
}

async function removerContrato() {
  if (!props.vinculoId) {
    return
  }
  removendoContrato.value = true
  const resultado = await store.removerContrato(props.id, props.vinculoId)
  removendoContrato.value = false
  confirmandoRemocaoContrato.value = false
  if (!resultado.ok) {
    notificacao.erro(
      resultado.falha.tipo === 'regra' && resultado.falha.mensagem ? resultado.falha.mensagem : TEXTOS_CONTRATO.erroRemover,
    )
    return
  }
  vinculo.value = resultado.valor
  notificacao.sucesso(TEXTOS_CONTRATO.toastRemovido)
}
</script>

<template>
  <LayoutPainelUsuario>
    <div class="formulario-vinculo com-lateral">
      <div
        class="pagina-formulario formulario-vinculo__pagina com-lateral__pagina"
        :class="{ 'com-lateral__pagina--ativa': comLateral }"
      >
        <CabecalhoPagina
          :titulo="titulo"
          :descricao="nomes || undefined"
        />

        <EstadoCarregando
          v-if="carregandoVinculo"
          variante="formulario"
          :linhas="5"
        />

        <EstadoErro
          v-else-if="falhaVinculo?.tipo === 'naoEncontrado'"
          :titulo="TEXTOS_FORNECEDORES_EVENTO.vinculoNaoEncontradoTitulo"
          :mensagem="TEXTOS_FORNECEDORES_EVENTO.vinculoNaoEncontradoTexto"
          :pode-tentar-novamente="false"
        />

        <EstadoErro
          v-else-if="falhaVinculo"
          :titulo="TEXTOS_FORNECEDORES_EVENTO.erroTitulo"
          :mensagem="falhaVinculo.tipo === 'semPermissao' ? TEXTOS_FORNECEDORES_EVENTO.semAcesso : TEXTOS_FORNECEDORES_EVENTO.erroTexto"
          :pode-tentar-novamente="falhaVinculo.tipo !== 'semPermissao'"
          :variante="falhaVinculo.tipo === 'semPermissao' ? 'semPermissao' : 'erro'"
          @tentar-novamente="carregarVinculo"
        />

        <div
          v-else
          class="formulario-vinculo__corpo com-lateral__corpo"
        >
          <div class="formulario-vinculo__principal com-lateral__principal pilha pilha--cartao">
            <MensagemFormulario
              v-if="arquivado"
              variante="alerta"
              :mensagem="TEXTOS_FORNECEDORES_EVENTO.arquivado"
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
              data-teste="formulario-vinculo"
              @submit.prevent="enviar"
            >
              <fieldset
                class="formulario-vinculo__grupo pilha pilha--grupo"
                data-teste="grupo-fornecedor"
              >
                <legend class="formulario-vinculo__legenda texto-rotulo">
                  {{ TEXTOS_FORNECEDORES_EVENTO.grupoFornecedor }}
                </legend>

                <CampoFormulario
                  v-if="!edicao"
                  :rotulo="TEXTOS_FORNECEDORES_EVENTO.campoFornecedor"
                  :id-campo="idCampo('fornecedorId')"
                  obrigatorio
                  :erro="formulario.erros.fornecedorId"
                >
                  <template #acao-rotulo>
                    <RouterLink
                      :to="{ name: 'fornecedor-novo' }"
                      class="formulario-vinculo__link"
                      data-teste="cadastrar-na-base"
                    >
                      {{ TEXTOS_FORNECEDORES_EVENTO.linkCadastrar }}
                    </RouterLink>
                  </template>
                  <template #default="{ id: idEntrada, invalido, descritoPor }">
                    <p
                      v-if="base.carregandoLista && !base.lista"
                      class="formulario-vinculo__apoio"
                    >
                      {{ TEXTOS_FORNECEDORES_EVENTO.carregandoFornecedores }}
                    </p>
                    <p
                      v-else-if="base.falhaLista"
                      class="formulario-vinculo__apoio"
                      data-teste="erro-base"
                    >
                      {{ TEXTOS_FORNECEDORES_EVENTO.erroFornecedores }}
                    </p>
                    <p
                      v-else-if="gruposFornecedores.length === 0"
                      class="formulario-vinculo__apoio"
                      data-teste="sem-disponiveis"
                    >
                      {{ semDisponiveisTexto }}
                    </p>
                    <Select
                      v-else
                      v-model="formulario.valores.fornecedorId"
                      :input-id="idEntrada"
                      :options="gruposFornecedores"
                      option-label="rotulo"
                      option-value="valor"
                      option-group-label="rotulo"
                      option-group-children="itens"
                      filter
                      :placeholder="TEXTOS_FORNECEDORES_EVENTO.placeholderFornecedor"
                      :invalid="invalido"
                      :aria-describedby="descritoPor"
                      :disabled="enviando"
                      data-teste="campo-fornecedor"
                      @change="formulario.validarAoSair('fornecedorId')"
                    />
                    <p
                      v-if="legendaEscolhido"
                      class="texto-legenda"
                      data-teste="fornecedor-escolhido"
                    >
                      {{ legendaEscolhido }}
                    </p>
                  </template>
                </CampoFormulario>

                <div
                  v-else-if="vinculo"
                  class="formulario-vinculo__fixo pilha pilha--campo"
                  data-teste="fornecedor-fixo"
                >
                  <span class="formulario-vinculo__empresa">{{ vinculo.fornecedor.nomeEmpresa }}</span>
                  <span class="texto-legenda">{{ ROTULOS_CATEGORIA_FORNECEDOR[vinculo.fornecedor.categoria] }}</span>
                </div>
              </fieldset>

              <fieldset
                class="formulario-vinculo__grupo pilha pilha--grupo"
                data-teste="grupo-contratacao"
              >
                <legend class="formulario-vinculo__legenda texto-rotulo">
                  {{ TEXTOS_FORNECEDORES_EVENTO.grupoContratacao }}
                </legend>

                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_FORNECEDORES_EVENTO.campoServico"
                  :id-campo="idCampo('servico')"
                  :erro="formulario.erros.servico"
                >
                  <InputText
                    :id="idEntrada"
                    v-model="formulario.valores.servico"
                    autocomplete="off"
                    :maxlength="LIMITES_VINCULO.servicoMaximo"
                    :placeholder="TEXTOS_FORNECEDORES_EVENTO.placeholderServico"
                    :invalid="invalido"
                    :aria-invalid="invalido"
                    :aria-describedby="descritoPor"
                    :readonly="enviando"
                    data-teste="campo-servico"
                    @update:model-value="formulario.revalidarAoDigitar('servico')"
                    @blur="formulario.validarAoSair('servico')"
                  />
                </CampoFormulario>

                <CampoFormulario
                  v-slot="{ id: idEntrada, descritoPor }"
                  :rotulo="TEXTOS_FORNECEDORES_EVENTO.campoStatus"
                  :id-campo="idCampo('status')"
                  obrigatorio
                  :erro="formulario.erros.status"
                >
                  <div class="formulario-vinculo__trilho">
                    <SelectButton
                      :id="idEntrada"
                      v-model="formulario.valores.status"
                      :options="opcoesStatus"
                      option-label="rotulo"
                      option-value="valor"
                      :allow-empty="false"
                      :aria-label="TEXTOS_FORNECEDORES_EVENTO.campoStatus"
                      :aria-describedby="descritoPor"
                      :disabled="enviando"
                      data-teste="campo-status"
                      @change="formulario.validarAoSair('valorContratado')"
                    />
                  </div>
                </CampoFormulario>

                <div class="formulario-vinculo__colunas">
                  <CampoFormulario
                    v-slot="{ id: idEntrada, invalido, descritoPor }"
                    :rotulo="TEXTOS_FORNECEDORES_EVENTO.campoOrcado"
                    :id-campo="idCampo('valorOrcado')"
                    :erro="formulario.erros.valorOrcado"
                  >
                    <InputNumber
                      v-model="formulario.valores.valorOrcado"
                      :input-id="idEntrada"
                      mode="currency"
                      currency="BRL"
                      locale="pt-BR"
                      :min="0"
                      :max="LIMITES_VINCULO.valorMaximo"
                      :allow-empty="true"
                      :invalid="invalido"
                      :aria-invalid="invalido"
                      :aria-describedby="descritoPor"
                      :readonly="enviando"
                      data-teste="campo-orcado"
                      @update:model-value="formulario.revalidarAoDigitar('valorOrcado')"
                      @blur="formulario.validarAoSair('valorOrcado')"
                    />
                  </CampoFormulario>

                  <CampoFormulario
                    v-slot="{ id: idEntrada, invalido, descritoPor }"
                    :rotulo="TEXTOS_FORNECEDORES_EVENTO.campoContratado"
                    :id-campo="idCampo('valorContratado')"
                    :obrigatorio="formulario.valores.status === 'Contratado'"
                    :dica="TEXTOS_FORNECEDORES_EVENTO.ajudaContratado"
                    :erro="formulario.erros.valorContratado"
                  >
                    <InputNumber
                      v-model="formulario.valores.valorContratado"
                      :input-id="idEntrada"
                      mode="currency"
                      currency="BRL"
                      locale="pt-BR"
                      :min="0"
                      :max="LIMITES_VINCULO.valorMaximo"
                      :allow-empty="true"
                      :aria-required="formulario.valores.status === 'Contratado'"
                      :invalid="invalido"
                      :aria-invalid="invalido"
                      :aria-describedby="descritoPor"
                      :readonly="enviando"
                      data-teste="campo-contratado"
                      @update:model-value="formulario.revalidarAoDigitar('valorContratado')"
                      @blur="formulario.validarAoSair('valorContratado')"
                    />
                  </CampoFormulario>
                </div>

                <CampoFormulario
                  v-slot="{ id: idEntrada, invalido, descritoPor }"
                  :rotulo="TEXTOS_FORNECEDORES_EVENTO.campoNotas"
                  :id-campo="idCampo('notasInternas')"
                  :dica="TEXTOS_FORNECEDORES_EVENTO.ajudaNotas(formulario.valores.notasInternas.length, LIMITES_VINCULO.notasMaximo)"
                  :erro="formulario.erros.notasInternas"
                >
                  <Textarea
                    :id="idEntrada"
                    v-model="formulario.valores.notasInternas"
                    rows="3"
                    auto-resize
                    :maxlength="LIMITES_VINCULO.notasMaximo"
                    :invalid="invalido"
                    :aria-invalid="invalido"
                    :aria-describedby="descritoPor"
                    :readonly="enviando"
                    data-teste="campo-notas"
                    @update:model-value="formulario.revalidarAoDigitar('notasInternas')"
                    @blur="formulario.validarAoSair('notasInternas')"
                  />
                </CampoFormulario>
              </fieldset>

              <div class="pilha pilha--grupo">
                <div class="formulario-vinculo__acoes">
                  <Button
                    type="submit"
                    :label="rotuloSalvar"
                    :loading="enviando"
                    :aria-busy="enviando"
                    :disabled="arquivado"
                    data-teste="salvar-vinculo"
                  />
                  <Button
                    type="button"
                    :label="TEXTOS_FORNECEDORES_EVENTO.cancelar"
                    severity="secondary"
                    text
                    :disabled="enviando"
                    data-teste="cancelar"
                    @click="cancelar"
                  />
                </div>
                <p
                  v-if="!edicao"
                  class="texto-legenda"
                  data-teste="contrato-depois"
                >
                  {{ TEXTOS_CONTRATO.antesDeSalvar }}
                </p>
              </div>
            </form>
          </div>

          <div
            v-if="comLateral"
            class="formulario-vinculo__lateral com-lateral__lateral com-lateral__lateral--filete"
            data-teste="lateral-vinculo"
          >
            <aside
              v-if="edicao && vinculo"
              :aria-label="TEXTOS_FORNECEDORES_EVENTO.lateralContrato"
              data-teste="lateral-contrato"
            >
              <AnexoContrato
                :nome-empresa="vinculo.fornecedor.nomeEmpresa"
                :contrato="vinculo.contrato"
                :editavel="!arquivado"
                :enviando="enviandoContrato"
                :ocupado="enviandoContrato || removendoContrato || enviando"
                :erro="erroContrato"
                @selecionar="enviarContrato"
                @baixar="baixarContrato"
                @remover="confirmandoRemocaoContrato = true"
              />
            </aside>

            <HistoricoFornecedorEvento
              :evento-atual-id="id"
              :escolhido="fornecedorDoHistorico !== null"
              :participacoes="participacoesDoFornecedor"
              :falha="falhaHistorico"
              @tentar-novamente="carregarHistorico"
            />

            <ContratacaoFornecedoresEvento
              v-if="mostrarContratacao && tipoConhecido && vinculosDoEvento"
              :vinculos="vinculosDoEvento"
              :tipo="tipoConhecido"
              :titulo="TEXTOS_FORNECEDORES_EVENTO.essenciaisPara(vocabularioOuNeutro(tipoConhecido).referencia.artigo)"
            />
          </div>
        </div>
      </div>
    </div>

    <DialogoConfirmacao
      :visivel="confirmandoRemocaoContrato"
      :titulo="vinculo ? TEXTOS_CONTRATO.confirmarRemoverTitulo(vinculo.fornecedor.nomeEmpresa) : ''"
      :mensagem="TEXTOS_CONTRATO.confirmarRemoverTexto"
      :rotulo-confirmar="TEXTOS_CONTRATO.remover"
      :rotulo-cancelar="TEXTOS_CONTRATO.cancelar"
      :executando="removendoContrato"
      perigoso
      @update:visivel="alterarVisibilidadeRemocao"
      @confirmar="removerContrato"
    />
  </LayoutPainelUsuario>
</template>

<style scoped>
.formulario-vinculo__principal {
  container: formulario-vinculo-campos / inline-size;
  min-width: 0;
}

.formulario-vinculo__grupo {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.formulario-vinculo__legenda {
  padding: 0;
  margin-bottom: var(--p-ritmo-grupo);
}

.formulario-vinculo__colunas {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-ritmo-grupo) var(--p-ritmo-cartao);
}

.formulario-vinculo__trilho {
  max-width: 100%;
  overflow-x: auto;
}

.formulario-vinculo__empresa {
  font-family: var(--p-fonte-display);
  font-size: var(--p-fonte-tamanho-secao);
  font-weight: var(--p-fonte-peso-leve);
  line-height: var(--p-fonte-entrelinha-titulo);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.formulario-vinculo__apoio {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.formulario-vinculo__link {
  font-size: var(--p-fonte-tamanho-apoio);
}

.formulario-vinculo__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-ritmo-campo);
}

.formulario-vinculo__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@container formulario-vinculo-campos (min-width: 36rem) {
  .formulario-vinculo__colunas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .formulario-vinculo__acoes {
    flex-direction: row;
    gap: var(--p-ritmo-grupo);
  }
}
</style>
