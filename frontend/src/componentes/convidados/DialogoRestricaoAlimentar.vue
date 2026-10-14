<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'

import CaixaConsentimento from '@/componentes/base/CaixaConsentimento.vue'
import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import SeletorRestricaoAlimentar from '@/componentes/base/SeletorRestricaoAlimentar.vue'
import { breakpoints } from '@/design/tokens'
import { TEXTOS_DADOS_SENSIVEIS } from '@/textos/dadosSensiveis'
import type { PessoaSelecionavel, RestricaoPessoaFormulario, SalvarRestricaoAlimentarRequest } from '@/tipos/dadosSensiveis'
import { conteudoRestricao, restricaoVazia, temConteudo, validarRestricao } from '@/utilitarios/dadosSensiveis'

const props = withDefaults(
  defineProps<{
    visivel: boolean
    pessoas: PessoaSelecionavel[]
    pessoaFixa?: PessoaSelecionavel | null
    inicial?: RestricaoPessoaFormulario | null
    executando?: boolean
    mensagemErro?: string | null
  }>(),
  { pessoaFixa: null, inicial: null, executando: false, mensagemErro: null },
)

const emit = defineEmits<{
  'update:visivel': [valor: boolean]
  salvar: [pessoa: PessoaSelecionavel, request: SalvarRestricaoAlimentarRequest]
}>()

const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: 'calc(100vw - 2rem)' }

const pessoaEscolhida = ref<string | null>(null)
const restricao = ref<RestricaoPessoaFormulario>(restricaoVazia())
const consentimentoObtido = ref(false)
const erroPessoa = ref<string | null>(null)
const erroRestricao = ref<string | null>(null)
const erroConsentimento = ref<string | null>(null)
const caixa = ref<InstanceType<typeof CaixaConsentimento> | null>(null)

const titulo = computed(() =>
  props.pessoaFixa ? TEXTOS_DADOS_SENSIVEIS.tituloEditar(props.pessoaFixa.nome) : TEXTOS_DADOS_SENSIVEIS.tituloRegistrar,
)

const pessoaAtual = computed(
  () => props.pessoaFixa ?? props.pessoas.find((pessoa) => pessoa.convidadoId === pessoaEscolhida.value) ?? null,
)

const aberto = computed({
  get: () => props.visivel,
  set: (valor: boolean) => {
    if (!valor && !props.executando) {
      emit('update:visivel', false)
    }
  },
})

watch(
  () => props.visivel,
  (visivel) => {
    if (visivel) {
      pessoaEscolhida.value = null
      restricao.value = props.inicial ? { ...props.inicial, situacao: 'informar' } : { ...restricaoVazia(), situacao: 'informar' }
      consentimentoObtido.value = false
      erroPessoa.value = null
      erroRestricao.value = null
      erroConsentimento.value = null
    }
  },
  { immediate: true },
)

watch(pessoaEscolhida, () => {
  erroPessoa.value = null
})

watch(consentimentoObtido, (marcado) => {
  if (marcado) {
    erroConsentimento.value = null
  }
})

function alterarRestricao(valor: RestricaoPessoaFormulario) {
  restricao.value = valor
  erroRestricao.value = null
}

function salvar() {
  const pessoa = pessoaAtual.value
  erroPessoa.value = pessoa ? null : TEXTOS_DADOS_SENSIVEIS.erroSemPessoa
  erroRestricao.value = temConteudo(restricao.value) ? validarRestricao(restricao.value) : TEXTOS_DADOS_SENSIVEIS.erroSemConteudo
  erroConsentimento.value = consentimentoObtido.value ? null : TEXTOS_DADOS_SENSIVEIS.erroConsentimentoObtido

  if (!pessoa) {
    document.getElementById('restricao-pessoa')?.focus()
    return
  }
  if (erroRestricao.value) {
    document.getElementById('restricao-dialogo-outra')?.focus()
    return
  }
  if (erroConsentimento.value) {
    caixa.value?.focar()
    return
  }

  emit('salvar', pessoa, { ...conteudoRestricao(restricao.value), consentimentoObtido: true })
}
</script>

<template>
  <Dialog
    v-model:visible="aberto"
    class="dialogo-restricao"
    modal
    :header="titulo"
    :closable="!executando"
    :close-on-escape="!executando"
    :draggable="false"
    :style="{ width: '36rem' }"
    :breakpoints="pontosQuebra"
    data-teste="dialogo-restricao"
  >
    <form
      class="dialogo-restricao__formulario"
      novalidate
      @submit.prevent="salvar"
    >
      <CampoFormulario
        v-if="!pessoaFixa"
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_DADOS_SENSIVEIS.pessoa"
        id-campo="restricao-pessoa"
        obrigatorio
        :erro="erroPessoa"
      >
        <Select
          v-model="pessoaEscolhida"
          :input-id="idEntrada"
          :options="pessoas"
          option-label="nome"
          option-value="convidadoId"
          filter
          :placeholder="TEXTOS_DADOS_SENSIVEIS.placeholderPessoa"
          :empty-message="TEXTOS_DADOS_SENSIVEIS.semPessoas"
          :invalid="invalido"
          :aria-describedby="descritoPor"
          :disabled="executando"
          data-teste="restricao-pessoa"
        />
      </CampoFormulario>

      <SeletorRestricaoAlimentar
        :model-value="restricao"
        :nome="pessoaAtual?.nome ?? TEXTOS_DADOS_SENSIVEIS.pessoa"
        variante="painel"
        id-base="restricao-dialogo"
        :erro="erroRestricao"
        :desabilitado="executando"
        @update:model-value="alterarRestricao"
      />

      <CaixaConsentimento
        ref="caixa"
        v-model="consentimentoObtido"
        id-campo="restricao-consentimento-obtido"
        :texto="TEXTOS_DADOS_SENSIVEIS.consentimentoObtido"
        :erro="erroConsentimento"
        :desabilitado="executando"
      />

      <MensagemFormulario
        v-if="mensagemErro"
        :mensagem="mensagemErro"
        data-teste="restricao-dialogo-erro"
      />
    </form>

    <template #footer>
      <Button
        :label="TEXTOS_DADOS_SENSIVEIS.cancelar"
        severity="secondary"
        outlined
        :disabled="executando"
        data-teste="restricao-cancelar"
        @click="aberto = false"
      />
      <Button
        :label="TEXTOS_DADOS_SENSIVEIS.salvar"
        :loading="executando"
        data-teste="restricao-salvar"
        @click="salvar"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.dialogo-restricao__formulario {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-5);
}
</style>
