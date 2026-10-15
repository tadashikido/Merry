<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
import { useAlteracoesNaoSalvas } from '@/composables/useAlteracoesNaoSalvas'
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { useCasamentosStore, type FalhaCasamento } from '@/stores/casamentos'
import { useFornecedoresStore } from '@/stores/fornecedores'
import { useFornecedoresCasamentoStore } from '@/stores/fornecedoresCasamento'
import { ROTULOS_CATEGORIA_FORNECEDOR } from '@/textos/fornecedores'
import {
  ROTULOS_STATUS_FORNECEDOR_CASAMENTO,
  TEXTOS_CONTRATO,
  TEXTOS_FORNECEDORES_CASAMENTO,
} from '@/textos/fornecedoresCasamento'
import { CATEGORIAS_FORNECEDOR } from '@/tipos/fornecedores'
import {
  STATUS_FORNECEDOR_CASAMENTO,
  type AtualizarFornecedorCasamentoRequest,
  type FornecedorCasamentoDto,
  type StatusFornecedorCasamento,
} from '@/tipos/fornecedoresCasamento'
import { verificarArquivoPdf } from '@/utilitarios/arquivo'
import { focarElemento } from '@/utilitarios/foco'
import { formatarNomesCasal } from '@/utilitarios/formatacao'
import {
  LIMITES_VINCULO,
  fornecedoresDisponiveis,
  regraFornecedor,
  regraValor,
  regraValorContratado,
} from '@/utilitarios/fornecedoresCasamento'
import { tamanhoMaximo } from '@/utilitarios/validacao'

const CAMPOS = ['fornecedorId', 'servico', 'status', 'valorOrcado', 'valorContratado', 'notasInternas'] as const
type Campo = (typeof CAMPOS)[number]

const props = defineProps<{ id: string; vinculoId?: string }>()

const casamentos = useCasamentosStore()
const base = useFornecedoresStore()
const store = useFornecedoresCasamentoStore()
const roteador = useRouter()
const notificacao = useNotificacao()

const edicao = computed(() => Boolean(props.vinculoId))
const carregandoVinculo = ref(false)
const falhaVinculo = ref<FalhaCasamento | null>(null)
const vinculo = ref<FornecedorCasamentoDto | null>(null)
const enviando = ref(false)
const mensagemErro = ref<string | null>(null)
const enviandoContrato = ref(false)
const erroContrato = ref<string | null>(null)
const confirmandoRemocaoContrato = ref(false)
const removendoContrato = ref(false)

let statusAtual = (): StatusFornecedorCasamento => 'Cotacao'

const formulario = useFormulario(
  {
    fornecedorId: '',
    servico: '',
    status: 'Cotacao' as StatusFornecedorCasamento,
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

const casamento = computed(() => (casamentos.atual?.id === props.id ? casamentos.atual : null))
const nomes = computed(() =>
  casamento.value ? formatarNomesCasal(casamento.value.nomePrimeiraPessoa, casamento.value.nomeSegundaPessoa) : '',
)
const arquivado = computed(() => casamento.value?.arquivado === true)
const titulo = computed(() =>
  edicao.value ? TEXTOS_FORNECEDORES_CASAMENTO.tituloEditar : TEXTOS_FORNECEDORES_CASAMENTO.tituloNovo,
)
const rotuloSalvar = computed(() =>
  edicao.value ? TEXTOS_FORNECEDORES_CASAMENTO.salvar : TEXTOS_FORNECEDORES_CASAMENTO.salvarNovo,
)
const opcoesStatus = STATUS_FORNECEDOR_CASAMENTO.map((valor) => ({ valor, rotulo: ROTULOS_STATUS_FORNECEDOR_CASAMENTO[valor] }))

const disponiveis = computed(() =>
  fornecedoresDisponiveis(base.lista ?? [], store.casamentoId === props.id ? (store.lista?.vinculos ?? []) : []),
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
const semDisponiveisTexto = computed(() =>
  (base.lista ?? []).some((fornecedor) => !fornecedor.arquivado)
    ? TEXTOS_FORNECEDORES_CASAMENTO.semDisponiveis
    : TEXTOS_FORNECEDORES_CASAMENTO.semFornecedoresBase,
)

function preencher(dados: FornecedorCasamentoDto) {
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
  void casamentos.obter(props.id)
  if (edicao.value) {
    await carregarVinculo()
    if (!falhaVinculo.value) {
      await focarElemento(idCampo('servico'))
    }
    return
  }
  await Promise.all([base.carregar(), store.casamentoId === props.id && store.lista ? Promise.resolve() : store.carregar(props.id)])
  await focarElemento(idCampo('fornecedorId'))
})

function textoOuNulo(valor: string): string | null {
  const texto = valor.trim()
  return texto === '' ? null : texto
}

function montarDados(): AtualizarFornecedorCasamentoRequest {
  const valores = formulario.valores
  return {
    servico: textoOuNulo(valores.servico),
    valorOrcado: valores.valorOrcado ?? null,
    valorContratado: valores.valorContratado ?? null,
    status: valores.status,
    notasInternas: textoOuNulo(valores.notasInternas),
  }
}

function tratarFalha(falha: FalhaCasamento) {
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
    mensagemErro.value = TEXTOS_FORNECEDORES_CASAMENTO.semPermissao
    return
  }
  if (falha.tipo === 'conflito') {
    mensagemErro.value = TEXTOS_FORNECEDORES_CASAMENTO.erroConflito
    return
  }
  if (falha.tipo === 'regra' && falha.mensagem) {
    mensagemErro.value = falha.mensagem
    return
  }
  if (falha.tipo === 'naoEncontrado') {
    mensagemErro.value = TEXTOS_FORNECEDORES_CASAMENTO.vinculoNaoEncontradoTexto
    return
  }
  mensagemErro.value = TEXTOS_FORNECEDORES_CASAMENTO.erroSalvar
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
      ? TEXTOS_FORNECEDORES_CASAMENTO.toastSalvo
      : TEXTOS_FORNECEDORES_CASAMENTO.toastAdicionado(resultado.valor.fornecedor.nomeEmpresa),
  )
  await roteador.replace({ name: 'casamento-fornecedores', params: { id: props.id } })
}

function cancelar() {
  liberarSaida()
  void roteador.push({ name: 'casamento-fornecedores', params: { id: props.id } })
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
    <div
      class="formulario-vinculo"
      :class="{ 'pagina-formulario': !edicao }"
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
        :titulo="TEXTOS_FORNECEDORES_CASAMENTO.vinculoNaoEncontradoTitulo"
        :mensagem="TEXTOS_FORNECEDORES_CASAMENTO.vinculoNaoEncontradoTexto"
        :pode-tentar-novamente="false"
      />

      <EstadoErro
        v-else-if="falhaVinculo"
        :titulo="TEXTOS_FORNECEDORES_CASAMENTO.erroTitulo"
        :mensagem="falhaVinculo.tipo === 'semPermissao' ? TEXTOS_FORNECEDORES_CASAMENTO.semAcesso : TEXTOS_FORNECEDORES_CASAMENTO.erroTexto"
        :pode-tentar-novamente="falhaVinculo.tipo !== 'semPermissao'"
        :variante="falhaVinculo.tipo === 'semPermissao' ? 'semPermissao' : 'erro'"
        @tentar-novamente="carregarVinculo"
      />

      <div
        v-else
        class="formulario-vinculo__corpo"
      >
        <div class="formulario-vinculo__principal pilha pilha--cartao">
          <MensagemFormulario
            v-if="arquivado"
            variante="alerta"
            :mensagem="TEXTOS_FORNECEDORES_CASAMENTO.arquivado"
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
                {{ TEXTOS_FORNECEDORES_CASAMENTO.grupoFornecedor }}
              </legend>

              <CampoFormulario
                v-if="!edicao"
                :rotulo="TEXTOS_FORNECEDORES_CASAMENTO.campoFornecedor"
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
                    {{ TEXTOS_FORNECEDORES_CASAMENTO.linkCadastrar }}
                  </RouterLink>
                </template>
                <template #default="{ id: idEntrada, invalido, descritoPor }">
                  <p
                    v-if="base.carregandoLista && !base.lista"
                    class="formulario-vinculo__apoio"
                  >
                    {{ TEXTOS_FORNECEDORES_CASAMENTO.carregandoFornecedores }}
                  </p>
                  <p
                    v-else-if="base.falhaLista"
                    class="formulario-vinculo__apoio"
                    data-teste="erro-base"
                  >
                    {{ TEXTOS_FORNECEDORES_CASAMENTO.erroFornecedores }}
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
                    :placeholder="TEXTOS_FORNECEDORES_CASAMENTO.placeholderFornecedor"
                    :invalid="invalido"
                    :aria-describedby="descritoPor"
                    :disabled="enviando"
                    data-teste="campo-fornecedor"
                    @change="formulario.validarAoSair('fornecedorId')"
                  />
                  <p
                    v-if="fornecedorEscolhido"
                    class="texto-legenda"
                    data-teste="fornecedor-escolhido"
                  >
                    {{ ROTULOS_CATEGORIA_FORNECEDOR[fornecedorEscolhido.categoria] }}
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
                {{ TEXTOS_FORNECEDORES_CASAMENTO.grupoContratacao }}
              </legend>

              <CampoFormulario
                v-slot="{ id: idEntrada, invalido, descritoPor }"
                :rotulo="TEXTOS_FORNECEDORES_CASAMENTO.campoServico"
                :id-campo="idCampo('servico')"
                :erro="formulario.erros.servico"
              >
                <InputText
                  :id="idEntrada"
                  v-model="formulario.valores.servico"
                  autocomplete="off"
                  :maxlength="LIMITES_VINCULO.servicoMaximo"
                  :placeholder="TEXTOS_FORNECEDORES_CASAMENTO.placeholderServico"
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
                :rotulo="TEXTOS_FORNECEDORES_CASAMENTO.campoStatus"
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
                    :aria-label="TEXTOS_FORNECEDORES_CASAMENTO.campoStatus"
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
                  :rotulo="TEXTOS_FORNECEDORES_CASAMENTO.campoOrcado"
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
                  :rotulo="TEXTOS_FORNECEDORES_CASAMENTO.campoContratado"
                  :id-campo="idCampo('valorContratado')"
                  :obrigatorio="formulario.valores.status === 'Contratado'"
                  :dica="TEXTOS_FORNECEDORES_CASAMENTO.ajudaContratado"
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
                :rotulo="TEXTOS_FORNECEDORES_CASAMENTO.campoNotas"
                :id-campo="idCampo('notasInternas')"
                :dica="TEXTOS_FORNECEDORES_CASAMENTO.ajudaNotas(formulario.valores.notasInternas.length, LIMITES_VINCULO.notasMaximo)"
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
                  :label="TEXTOS_FORNECEDORES_CASAMENTO.cancelar"
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

        <aside
          v-if="edicao && vinculo"
          class="formulario-vinculo__lateral"
          :aria-label="TEXTOS_FORNECEDORES_CASAMENTO.lateralContrato"
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
.formulario-vinculo {
  container: formulario-vinculo / inline-size;
}

.formulario-vinculo__corpo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'principal'
    'lateral';
  gap: var(--p-ritmo-bloco);
}

.formulario-vinculo__principal {
  grid-area: principal;
  min-width: 0;
}

.formulario-vinculo__lateral {
  grid-area: lateral;
  min-width: 0;
  padding-top: var(--p-ritmo-bloco);
  border-top: 1px solid var(--p-cor-borda);
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

@media (min-width: 640px) {
  .formulario-vinculo__colunas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .formulario-vinculo__acoes {
    flex-direction: row;
    gap: var(--p-ritmo-grupo);
  }
}

@container formulario-vinculo (min-width: 64rem) {
  .formulario-vinculo__corpo {
    grid-template-columns: minmax(0, var(--p-dimensao-largura-formulario)) minmax(20rem, 28rem);
    grid-template-areas: 'principal lateral';
    align-items: start;
  }

  .formulario-vinculo__lateral {
    align-self: stretch;
    padding-top: 0;
    padding-inline-start: var(--p-ritmo-bloco);
    border-top: 0;
    border-inline-start: 1px solid var(--p-cor-borda);
  }
}
</style>
