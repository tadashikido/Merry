<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'

import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import EnvioArquivo from '@/componentes/base/EnvioArquivo.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { breakpoints } from '@/design/tokens'
import { useFinanceiroStore } from '@/stores/financeiro'
import { TEXTOS_COMPROVANTE, TEXTOS_ENVIO_COMPROVANTE, TEXTOS_PAGAMENTO, TEXTOS_PARCELA } from '@/textos/financeiro'
import type { ParcelaDto, ResultadoPagamento } from '@/tipos/financeiro'
import { ACEITE_COMPROVANTE, verificarArquivoComprovante, type ProblemaArquivo } from '@/utilitarios/arquivo'
import { LIMITES_PARCELA, regraDataPagamento } from '@/utilitarios/financeiro'
import { formatarDataCalendarioCurta, formatarMoeda } from '@/utilitarios/formatacao'

const props = defineProps<{
  visivel: boolean
  casamentoId: string
  parcela: ParcelaDto | null
  nomeEmpresa: string
  hoje: string
}>()

const emit = defineEmits<{ 'update:visivel': [valor: boolean]; pago: [resultado: ResultadoPagamento] }>()

const store = useFinanceiroStore()
const executando = ref(false)
const pagaEm = ref('')
const erroData = ref<string | null>(null)
const arquivo = ref<File | null>(null)
const erroArquivo = ref<string | null>(null)
const mensagem = ref<string | null>(null)
const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: 'calc(100vw - 2rem)' }
const regraData = regraDataPagamento(() => props.hoje)

const MENSAGENS_ARQUIVO: Record<ProblemaArquivo, string> = {
  vazio: TEXTOS_COMPROVANTE.erroVazio,
  tamanho: TEXTOS_COMPROVANTE.erroTamanho,
  formato: TEXTOS_COMPROVANTE.erroFormato,
}

const resumo = computed(() =>
  props.parcela
    ? TEXTOS_PAGAMENTO.resumo(
        props.nomeEmpresa,
        props.parcela.numero,
        props.parcela.totalParcelas,
        formatarMoeda(props.parcela.valor),
        formatarDataCalendarioCurta(props.parcela.vencimento),
      )
    : '',
)

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
    pagaEm.value = props.parcela?.pagaEm ?? props.hoje
    erroData.value = null
    arquivo.value = null
    erroArquivo.value = null
    mensagem.value = null
  },
  { immediate: true },
)

async function selecionar(escolhido: File) {
  const problema = await verificarArquivoComprovante(escolhido)
  if (problema) {
    arquivo.value = null
    erroArquivo.value = MENSAGENS_ARQUIVO[problema]
    return
  }
  erroArquivo.value = null
  arquivo.value = escolhido
}

async function confirmar() {
  mensagem.value = null
  erroData.value = regraData(pagaEm.value)
  if (erroData.value || !props.parcela) {
    return
  }
  executando.value = true
  const parcela = props.parcela
  const resultado = await store.registrarPagamento(props.casamentoId, parcela.fornecedorCasamentoId, parcela.id, {
    pagaEm: pagaEm.value,
  })
  if (!resultado.ok) {
    executando.value = false
    if (resultado.falha.errosCampos.pagaEm) {
      erroData.value = resultado.falha.errosCampos.pagaEm
      return
    }
    mensagem.value =
      resultado.falha.tipo === 'conflito' ? TEXTOS_PARCELA.erroConcorrencia : (resultado.falha.mensagem ?? TEXTOS_PARCELA.erroPagamento)
    return
  }
  let comprovanteFalhou = false
  if (arquivo.value) {
    const envio = await store.enviarComprovante(props.casamentoId, parcela.fornecedorCasamentoId, parcela.id, arquivo.value)
    comprovanteFalhou = !envio.ok
  }
  executando.value = false
  emit('pago', { parcela: resultado.valor, comprovanteFalhou })
  emit('update:visivel', false)
}
</script>

<template>
  <Dialog
    v-model:visible="aberto"
    class="dialogo-pagamento"
    modal
    :header="TEXTOS_PAGAMENTO.titulo"
    :closable="!executando"
    :close-on-escape="!executando"
    :draggable="false"
    :style="{ width: '30rem' }"
    :breakpoints="pontosQuebra"
    data-teste="dialogo-pagamento"
  >
    <form
      class="dialogo-pagamento__formulario"
      novalidate
      @submit.prevent="confirmar"
    >
      <p
        class="dialogo-pagamento__resumo numeros-tabulares"
        data-teste="resumo-pagamento"
      >
        {{ resumo }}
      </p>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_PAGAMENTO.campoData"
        id-campo="pagamento-data"
        obrigatorio
        :erro="erroData"
      >
        <InputText
          :id="idEntrada"
          v-model="pagaEm"
          type="date"
          :min="LIMITES_PARCELA.dataMinima"
          :max="hoje"
          aria-required="true"
          :invalid="invalido"
          :aria-invalid="invalido"
          :aria-describedby="descritoPor"
          :readonly="executando"
          data-teste="campo-data-pagamento"
          @blur="erroData = regraData(pagaEm)"
        />
      </CampoFormulario>

      <EnvioArquivo
        id="pagamento-comprovante"
        :textos="TEXTOS_ENVIO_COMPROVANTE"
        :aceite="ACEITE_COMPROVANTE"
        :arquivo="arquivo"
        :erro="erroArquivo"
        :desabilitado="executando"
        @selecionar="selecionar"
      />
      <p class="dialogo-pagamento__nota">
        {{ TEXTOS_PAGAMENTO.comprovanteOpcional }}
      </p>

      <MensagemFormulario
        v-if="mensagem"
        :mensagem="mensagem"
        data-teste="mensagem-pagamento"
      />
    </form>

    <template #footer>
      <Button
        :label="TEXTOS_PARCELA.cancelar"
        severity="secondary"
        text
        :disabled="executando"
        data-teste="cancelar-pagamento"
        @click="aberto = false"
      />
      <Button
        :label="TEXTOS_PAGAMENTO.confirmar"
        icon="ie ie-concluir"
        :loading="executando"
        data-teste="confirmar-pagamento"
        @click="confirmar"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.dialogo-pagamento__formulario {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.dialogo-pagamento__resumo {
  margin: 0;
  padding: var(--p-espaco-3) var(--p-espaco-4);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  background: var(--p-cor-superficie-sutil);
  border: 1px solid var(--p-cor-divisoria);
  border-radius: var(--p-raio-controle);
}

.dialogo-pagamento__nota {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}
</style>
