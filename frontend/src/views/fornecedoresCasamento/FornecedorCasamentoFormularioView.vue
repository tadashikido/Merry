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
import { useFormulario } from '@/composables/useFormulario'
import { useNotificacao } from '@/composables/useNotificacao'
import { useCasamentosStore, type FalhaCasamento } from '@/stores/casamentos'
import { useFornecedoresStore } from '@/stores/fornecedores'
import { useFornecedoresCasamentoStore } from '@/stores/fornecedoresCasamento'
import { TEXTOS_CASAMENTOS } from '@/textos/casamentos'
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

  notificacao.sucesso(
    edicao.value
      ? TEXTOS_FORNECEDORES_CASAMENTO.toastSalvo
      : TEXTOS_FORNECEDORES_CASAMENTO.toastAdicionado(resultado.valor.fornecedor.nomeEmpresa),
  )
  await roteador.replace({ name: 'casamento-fornecedores', params: { id: props.id } })
}

function cancelar() {
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
    <CabecalhoPagina
      :titulo="titulo"
      :descricao="nomes || undefined"
    >
      <template #trilha>
        <RouterLink :to="{ name: 'casamentos' }">
          {{ TEXTOS_CASAMENTOS.listaTitulo }}
        </RouterLink>
        <span aria-hidden="true"> / </span>
        <RouterLink :to="{ name: 'casamento-fornecedores', params: { id } }">
          {{ TEXTOS_FORNECEDORES_CASAMENTO.titulo }}
        </RouterLink>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{{ titulo }}</span>
      </template>
    </CabecalhoPagina>

    <div class="formulario-vinculo__area">
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

      <template v-else>
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
          class="formulario-vinculo"
          novalidate
          data-teste="formulario-vinculo"
          @submit.prevent="enviar"
        >
          <CampoFormulario
            v-if="!edicao"
            v-slot="{ id: idEntrada, invalido, descritoPor }"
            :rotulo="TEXTOS_FORNECEDORES_CASAMENTO.campoFornecedor"
            :id-campo="idCampo('fornecedorId')"
            obrigatorio
            :erro="formulario.erros.fornecedorId"
          >
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
              @change="formulario.validarCampo('fornecedorId')"
            />
            <RouterLink
              :to="{ name: 'fornecedor-novo' }"
              class="formulario-vinculo__link"
              data-teste="cadastrar-na-base"
            >
              {{ TEXTOS_FORNECEDORES_CASAMENTO.linkCadastrar }}
            </RouterLink>
            <p
              v-if="fornecedorEscolhido"
              class="formulario-vinculo__apoio"
              data-teste="fornecedor-escolhido"
            >
              {{ ROTULOS_CATEGORIA_FORNECEDOR[fornecedorEscolhido.categoria] }}
            </p>
          </CampoFormulario>

          <div
            v-else-if="vinculo"
            class="formulario-vinculo__fixo"
            data-teste="fornecedor-fixo"
          >
            <span class="formulario-vinculo__rotulo">{{ TEXTOS_FORNECEDORES_CASAMENTO.campoFornecedor }}</span>
            <span class="formulario-vinculo__empresa">{{ vinculo.fornecedor.nomeEmpresa }}</span>
            <span class="formulario-vinculo__apoio">{{ ROTULOS_CATEGORIA_FORNECEDOR[vinculo.fornecedor.categoria] }}</span>
          </div>

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
              @blur="formulario.validarCampo('servico')"
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
                @change="formulario.validarCampo('valorContratado')"
              />
            </div>
          </CampoFormulario>

          <div class="formulario-vinculo__linha">
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
                @blur="formulario.validarCampo('valorOrcado')"
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
                @blur="formulario.validarCampo('valorContratado')"
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
              @blur="formulario.validarCampo('notasInternas')"
            />
          </CampoFormulario>

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
        </form>

        <AnexoContrato
          v-if="edicao && vinculo"
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
        <p
          v-else-if="!edicao"
          class="formulario-vinculo__apoio"
          data-teste="contrato-depois"
        >
          {{ TEXTOS_CONTRATO.antesDeSalvar }}
        </p>
      </template>
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
.formulario-vinculo__area {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
  max-width: var(--p-dimensao-largura-leitura);
}

.formulario-vinculo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-6);
}

.formulario-vinculo__linha {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--p-espaco-6);
}

.formulario-vinculo__trilho {
  max-width: 100%;
  overflow-x: auto;
}

.formulario-vinculo__fixo {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.formulario-vinculo__rotulo {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
}

.formulario-vinculo__empresa {
  font-size: var(--p-fonte-tamanho-titulo);
  color: var(--p-cor-texto);
}

.formulario-vinculo__apoio {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.formulario-vinculo__link {
  align-self: flex-start;
  font-size: var(--p-fonte-tamanho-apoio);
}

.formulario-vinculo__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.formulario-vinculo__acoes :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

@media (min-width: 640px) {
  .formulario-vinculo__linha {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .formulario-vinculo__acoes {
    flex-direction: row;
  }
}
</style>
