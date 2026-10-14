<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'

import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import MensagemFormulario from '@/componentes/base/MensagemFormulario.vue'
import { breakpoints } from '@/design/tokens'
import { useFornecedoresCasamentoStore } from '@/stores/fornecedoresCasamento'
import { TEXTOS_FORNECEDORES_CASAMENTO, TEXTOS_HISTORICO_FORNECEDOR } from '@/textos/fornecedoresCasamento'
import type { CasamentoResumoDto } from '@/tipos/casamentos'
import type { ResultadoImportacaoFornecedoresDto } from '@/tipos/fornecedoresCasamento'
import { formatarDataCalendarioCurta, formatarNomesCasal } from '@/utilitarios/formatacao'

const props = defineProps<{ visivel: boolean; casamentoId: string }>()

const emit = defineEmits<{
  'update:visivel': [valor: boolean]
  importado: [resultado: ResultadoImportacaoFornecedoresDto]
}>()

const store = useFornecedoresCasamentoStore()

const casamentos = ref<CasamentoResumoDto[] | null>(null)
const carregando = ref(false)
const erroCarregar = ref(false)
const origem = ref<string | null>(null)
const erroOrigem = ref<string | null>(null)
const mensagem = ref<{ variante: 'erro' | 'alerta'; texto: string } | null>(null)
const executando = ref(false)

const pontosQuebra = { [`${breakpoints.tablet - 1}px`]: 'calc(100vw - 2rem)' }

const opcoes = computed(() =>
  (casamentos.value ?? []).map((casamento) => ({
    valor: casamento.id,
    rotulo: TEXTOS_FORNECEDORES_CASAMENTO.opcaoCasamento(
      formatarNomesCasal(casamento.nomePrimeiraPessoa, casamento.nomeSegundaPessoa),
      formatarDataCalendarioCurta(casamento.data),
      casamento.arquivado,
    ),
  })),
)

const aberto = computed({
  get: () => props.visivel,
  set: (valor: boolean) => {
    if (!valor && !executando.value) {
      emit('update:visivel', false)
    }
  },
})

async function carregarCasamentos() {
  carregando.value = true
  erroCarregar.value = false
  const resultado = await store.listarCasamentosOrigem(props.casamentoId)
  carregando.value = false
  if (resultado.ok) {
    casamentos.value = resultado.valor
    return
  }
  erroCarregar.value = true
}

watch(
  () => props.visivel,
  (visivel) => {
    if (!visivel) {
      return
    }
    origem.value = null
    erroOrigem.value = null
    mensagem.value = null
    void carregarCasamentos()
  },
  { immediate: true },
)

async function importar() {
  mensagem.value = null
  if (!origem.value) {
    erroOrigem.value = TEXTOS_FORNECEDORES_CASAMENTO.importarOrigemObrigatoria
    return
  }
  erroOrigem.value = null
  executando.value = true
  const resultado = await store.importar(props.casamentoId, origem.value)
  executando.value = false

  if (!resultado.ok) {
    mensagem.value = {
      variante: 'erro',
      texto: resultado.falha.tipo === 'regra' && resultado.falha.mensagem ? resultado.falha.mensagem : TEXTOS_FORNECEDORES_CASAMENTO.importarErro,
    }
    return
  }

  if (resultado.valor.importados === 0) {
    mensagem.value = { variante: 'alerta', texto: TEXTOS_FORNECEDORES_CASAMENTO.importarNenhum }
    return
  }

  emit('importado', resultado.valor)
  emit('update:visivel', false)
}
</script>

<template>
  <Dialog
    v-model:visible="aberto"
    class="dialogo-importar"
    modal
    :header="TEXTOS_FORNECEDORES_CASAMENTO.importarTitulo"
    :closable="!executando"
    :close-on-escape="!executando"
    :draggable="false"
    :style="{ width: '32rem' }"
    :breakpoints="pontosQuebra"
    data-teste="dialogo-importar"
  >
    <form
      class="dialogo-importar__formulario"
      novalidate
      @submit.prevent="importar"
    >
      <p class="dialogo-importar__explicacao">
        {{ TEXTOS_FORNECEDORES_CASAMENTO.importarExplicacao }}
      </p>

      <EstadoCarregando
        v-if="carregando"
        variante="formulario"
        :linhas="1"
      />

      <MensagemFormulario
        v-else-if="erroCarregar"
        :mensagem="TEXTOS_FORNECEDORES_CASAMENTO.importarErroCasamentos"
        data-teste="erro-casamentos-origem"
      >
        <Button
          :label="TEXTOS_HISTORICO_FORNECEDOR.tentarNovamente"
          severity="secondary"
          text
          size="small"
          @click="carregarCasamentos"
        />
      </MensagemFormulario>

      <p
        v-else-if="opcoes.length === 0"
        class="dialogo-importar__explicacao"
        data-teste="sem-casamentos-origem"
      >
        {{ TEXTOS_FORNECEDORES_CASAMENTO.importarSemCasamentos }}
      </p>

      <CampoFormulario
        v-else
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="TEXTOS_FORNECEDORES_CASAMENTO.importarCampo"
        id-campo="importar-origem"
        obrigatorio
        :erro="erroOrigem ?? undefined"
      >
        <Select
          v-model="origem"
          :input-id="idEntrada"
          :options="opcoes"
          option-label="rotulo"
          option-value="valor"
          filter
          :placeholder="TEXTOS_FORNECEDORES_CASAMENTO.importarPlaceholder"
          :invalid="invalido"
          :aria-describedby="descritoPor"
          :disabled="executando"
          data-teste="campo-origem"
        />
      </CampoFormulario>

      <MensagemFormulario
        v-if="mensagem"
        :variante="mensagem.variante"
        :mensagem="mensagem.texto"
        data-teste="mensagem-importar"
      />
    </form>

    <template #footer>
      <Button
        :label="TEXTOS_FORNECEDORES_CASAMENTO.cancelar"
        severity="secondary"
        text
        :disabled="executando"
        data-teste="cancelar-importar"
        @click="aberto = false"
      />
      <Button
        :label="TEXTOS_FORNECEDORES_CASAMENTO.importarBotao"
        icon="ie ie-importar"
        :loading="executando"
        :disabled="carregando || opcoes.length === 0"
        data-teste="confirmar-importar"
        @click="importar"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.dialogo-importar__formulario {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
}

.dialogo-importar__explicacao {
  margin: 0;
  font-size: var(--p-fonte-tamanho-controle);
  line-height: var(--p-fonte-entrelinha-corpo);
  color: var(--p-cor-texto-secundario);
}
</style>
