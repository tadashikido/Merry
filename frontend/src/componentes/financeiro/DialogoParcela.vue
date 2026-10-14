<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'

import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { useFormulario } from '@/composables/useFormulario'
import { breakpoints } from '@/design/tokens'
import { useFinanceiroStore } from '@/stores/financeiro'
import { TEXTOS_PARCELA } from '@/textos/financeiro'
import type { FornecedorFinanceiroDto, ParcelaDto } from '@/tipos/financeiro'
import { deCentavos, paraCentavos } from '@/utilitarios/centavos'
import {
  LIMITES_PARCELA,
  regraObservacao,
  regraValorParcela,
  regraVencimento,
  saldoAParcelarCentavos,
} from '@/utilitarios/financeiro'
import { formatarMoeda } from '@/utilitarios/formatacao'

const props = withDefaults(
  defineProps<{
    visivel: boolean
    casamentoId: string
    fornecedores: FornecedorFinanceiroDto[]
    vinculoId?: string | null
    parcela?: ParcelaDto | null
  }>(),
  { vinculoId: null, parcela: null },
)

const emit = defineEmits<{ 'update:visivel': [valor: boolean]; salvo: [mensagem: string] }>()

const store = useFinanceiroStore()
const executando = ref(false)
const mensagem = ref<string | null>(null)
const vinculoEscolhido = ref<string | null>(null)
const erroFornecedor = ref<string | null>(null)
const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: 'calc(100vw - 2rem)' }

const formulario = useFormulario(
  { valor: null as number | null, vencimento: '', observacao: '' },
  { valor: [regraValorParcela], vencimento: [regraVencimento], observacao: [regraObservacao] },
)

const edicao = computed(() => props.parcela !== null)
const contratados = computed(() => props.fornecedores.filter((fornecedor) => fornecedor.status === 'Contratado'))
const vinculoAtual = computed(() => props.parcela?.fornecedorCasamentoId ?? props.vinculoId ?? vinculoEscolhido.value)
const fornecedor = computed(() => contratados.value.find((item) => item.fornecedorCasamentoId === vinculoAtual.value) ?? null)
const escolherFornecedor = computed(() => !edicao.value && props.vinculoId === null)
const opcoes = computed(() =>
  contratados.value.map((item) => ({ valor: item.fornecedorCasamentoId, rotulo: item.nomeEmpresa })),
)

const saldoCentavos = computed(() => {
  if (!fornecedor.value) {
    return 0
  }
  return saldoAParcelarCentavos(fornecedor.value.valorContratado, fornecedor.value.parcelas, props.parcela?.id)
})

const apoioSaldo = computed(() => {
  if (!fornecedor.value) {
    return null
  }
  const contratado = paraCentavos(fornecedor.value.valorContratado)
  return TEXTOS_PARCELA.apoioSaldo(
    formatarMoeda(deCentavos(contratado)),
    formatarMoeda(deCentavos(contratado - saldoCentavos.value)),
    formatarMoeda(deCentavos(Math.max(saldoCentavos.value, 0))),
  )
})

const aberto = computed({
  get: () => props.visivel,
  set: (valor: boolean) => {
    if (!valor && !executando.value) {
      emit('update:visivel', false)
    }
  },
})

watch(
  () => props.visivel,
  (visivel) => {
    if (!visivel) {
      return
    }
    formulario.redefinir()
    mensagem.value = null
    erroFornecedor.value = null
    vinculoEscolhido.value = null
    if (props.parcela) {
      formulario.valores.valor = props.parcela.valor
      formulario.valores.vencimento = props.parcela.vencimento
      formulario.valores.observacao = props.parcela.observacao ?? ''
    }
  },
  { immediate: true },
)

function validarSoma(): boolean {
  const valor = formulario.valores.valor
  if (valor === null || !fornecedor.value) {
    return true
  }
  const excedente = paraCentavos(valor) - saldoCentavos.value
  if (excedente > 0) {
    formulario.erros.valor = TEXTOS_PARCELA.erroSomaExcede(formatarMoeda(deCentavos(excedente)))
    return false
  }
  return true
}

async function salvar() {
  mensagem.value = null
  erroFornecedor.value = vinculoAtual.value ? null : TEXTOS_PARCELA.erroFornecedor
  const valido = formulario.validar()
  if (!valido || erroFornecedor.value || !validarSoma() || !vinculoAtual.value || !fornecedor.value) {
    return
  }
  const dados = {
    valor: deCentavos(paraCentavos(formulario.valores.valor)),
    vencimento: formulario.valores.vencimento,
    observacao: formulario.valores.observacao.trim() || null,
  }
  executando.value = true
  const resultado = props.parcela
    ? await store.atualizarParcela(props.casamentoId, vinculoAtual.value, props.parcela.id, dados)
    : await store.criarParcela(props.casamentoId, vinculoAtual.value, dados)
  executando.value = false

  if (!resultado.ok) {
    const campos = resultado.falha.errosCampos
    for (const campo of ['valor', 'vencimento', 'observacao'] as const) {
      if (campos[campo]) {
        formulario.erros[campo] = campos[campo]
      }
    }
    if (resultado.falha.tipo === 'conflito') {
      mensagem.value = TEXTOS_PARCELA.erroConcorrencia
    } else if (!campos.valor && !campos.vencimento && !campos.observacao) {
      mensagem.value = resultado.falha.mensagem ?? TEXTOS_PARCELA.erroSalvar
    }
    return
  }
  emit('salvo', props.parcela ? TEXTOS_PARCELA.sucessoSalva : TEXTOS_PARCELA.sucessoCriada(fornecedor.value.nomeEmpresa))
  emit('update:visivel', false)
}
</script>

<template>
  <Dialog
    v-model:visible="aberto"
    class="dialogo-parcela"
    modal
    :header="edicao ? TEXTOS_PARCELA.tituloEdicao : TEXTOS_PARCELA.tituloNova"
    :closable="!executando"
    :close-on-escape="!executando"
    :draggable="false"
    :style="{ width: '30rem' }"
    :breakpoints="pontosQuebra"
    data-teste="dialogo-parcela"
  >
    <form
      class="dialogo-parcela__formulario"
      novalidate
      @submit.prevent="salvar"
    >
      <CampoFormulario
        v-if="escolherFornecedor"
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_PARCELA.campoFornecedor"
        id-campo="parcela-fornecedor"
        obrigatorio
        :erro="erroFornecedor"
      >
        <Select
          v-model="vinculoEscolhido"
          :input-id="idEntrada"
          :options="opcoes"
          option-label="rotulo"
          option-value="valor"
          :placeholder="TEXTOS_PARCELA.campoFornecedorPlaceholder"
          :invalid="invalido"
          :aria-describedby="descritoPor"
          :disabled="executando"
          data-teste="campo-fornecedor-parcela"
        />
      </CampoFormulario>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_PARCELA.campoValor"
        id-campo="parcela-valor"
        obrigatorio
        :erro="formulario.erros.valor"
      >
        <InputNumber
          v-model="formulario.valores.valor"
          :input-id="idEntrada"
          mode="currency"
          currency="BRL"
          locale="pt-BR"
          :min="0"
          :max="deCentavos(LIMITES_PARCELA.valorMaximoCentavos)"
          :allow-empty="true"
          aria-required="true"
          :invalid="invalido"
          :aria-invalid="invalido"
          :aria-describedby="descritoPor"
          :readonly="executando"
          data-teste="campo-valor-parcela"
          @blur="formulario.validarCampo('valor')"
        />
      </CampoFormulario>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_PARCELA.campoVencimento"
        id-campo="parcela-vencimento"
        obrigatorio
        :dica="edicao ? TEXTOS_PARCELA.dicaNumeracao : undefined"
        :erro="formulario.erros.vencimento"
      >
        <InputText
          :id="idEntrada"
          v-model="formulario.valores.vencimento"
          type="date"
          :min="LIMITES_PARCELA.dataMinima"
          :max="LIMITES_PARCELA.dataMaxima"
          aria-required="true"
          :invalid="invalido"
          :aria-invalid="invalido"
          :aria-describedby="descritoPor"
          :readonly="executando"
          data-teste="campo-vencimento-parcela"
          @blur="formulario.validarCampo('vencimento')"
        />
      </CampoFormulario>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_PARCELA.campoObservacao"
        id-campo="parcela-observacao"
        :dica="TEXTOS_PARCELA.dicaObservacao"
        :erro="formulario.erros.observacao"
      >
        <InputText
          :id="idEntrada"
          v-model="formulario.valores.observacao"
          :maxlength="LIMITES_PARCELA.observacaoMaximo"
          :invalid="invalido"
          :aria-invalid="invalido"
          :aria-describedby="descritoPor"
          :readonly="executando"
          data-teste="campo-observacao-parcela"
          @blur="formulario.validarCampo('observacao')"
        />
      </CampoFormulario>

      <p
        v-if="apoioSaldo"
        class="dialogo-parcela__saldo numeros-tabulares"
        aria-live="polite"
        data-teste="apoio-saldo"
      >
        {{ apoioSaldo }}
      </p>

      <MensagemFormulario
        v-if="mensagem"
        :mensagem="mensagem"
        data-teste="mensagem-parcela"
      />
    </form>

    <template #footer>
      <Button
        :label="TEXTOS_PARCELA.cancelar"
        severity="secondary"
        text
        :disabled="executando"
        data-teste="cancelar-parcela"
        @click="aberto = false"
      />
      <Button
        :label="edicao ? TEXTOS_PARCELA.salvarEdicao : TEXTOS_PARCELA.salvarNova"
        :loading="executando"
        data-teste="salvar-parcela"
        @click="salvar"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.dialogo-parcela__formulario {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.dialogo-parcela__saldo {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}
</style>
