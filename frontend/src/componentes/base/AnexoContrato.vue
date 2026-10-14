<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import Button from 'primevue/button'

import EnvioArquivo from './EnvioArquivo.vue'
import { TEXTOS_CONTRATO, TEXTOS_ENVIO_CONTRATO } from '@/textos/fornecedoresCasamento'
import type { ContratoFornecedorDto } from '@/tipos/fornecedoresCasamento'
import { ACEITE_CONTRATO, formatarTamanhoArquivo } from '@/utilitarios/arquivo'
import { formatarData } from '@/utilitarios/formatacao'

const props = withDefaults(
  defineProps<{
    nomeEmpresa: string
    contrato?: ContratoFornecedorDto | null
    editavel?: boolean
    enviando?: boolean
    ocupado?: boolean
    erro?: string | null
  }>(),
  { contrato: null, editavel: true, enviando: false, ocupado: false, erro: null },
)

const emit = defineEmits<{ selecionar: [arquivo: File]; baixar: []; remover: [] }>()

const idTitulo = `anexo-contrato-${useId()}`
const idEnvio = `anexo-contrato-envio-${useId()}`
const substituindo = ref(false)

const mostrarEnvio = computed(() => props.editavel && (!props.contrato || substituindo.value || props.enviando))
const tamanho = computed(() => (props.contrato ? formatarTamanhoArquivo(props.contrato.tamanhoBytes) : ''))

watch(
  () => props.contrato?.enviadoEm,
  () => {
    substituindo.value = false
  },
)

function selecionar(arquivo: File) {
  emit('selecionar', arquivo)
}
</script>

<template>
  <section
    class="anexo-contrato"
    :aria-labelledby="idTitulo"
    :aria-busy="enviando"
    data-teste="anexo-contrato"
  >
    <h2
      :id="idTitulo"
      class="anexo-contrato__titulo"
    >
      {{ TEXTOS_CONTRATO.titulo }}
    </h2>

    <div
      v-if="contrato && !substituindo && !enviando"
      class="anexo-contrato__arquivo"
      data-teste="contrato-anexado"
    >
      <span
        class="anexo-contrato__icone ie ie-documento"
        aria-hidden="true"
      />
      <span class="anexo-contrato__dados">
        <span
          class="anexo-contrato__nome"
          data-teste="contrato-nome"
        >{{ contrato.nomeArquivo }}</span>
        <span class="anexo-contrato__meta numeros-tabulares">
          {{ tamanho }} · {{ TEXTOS_CONTRATO.enviadoEm(formatarData(contrato.enviadoEm)) }}
        </span>
      </span>
      <span class="anexo-contrato__acoes">
        <Button
          :label="TEXTOS_CONTRATO.baixar"
          icon="ie ie-exportar"
          severity="secondary"
          outlined
          :aria-label="TEXTOS_CONTRATO.baixarAria(nomeEmpresa, tamanho)"
          :disabled="ocupado"
          data-teste="baixar-contrato"
          @click="emit('baixar')"
        />
        <template v-if="editavel">
          <Button
            :label="TEXTOS_CONTRATO.substituir"
            icon="ie ie-importar"
            severity="secondary"
            text
            :disabled="ocupado"
            data-teste="substituir-contrato"
            @click="substituindo = true"
          />
          <Button
            :label="TEXTOS_CONTRATO.remover"
            icon="ie ie-excluir"
            severity="danger"
            text
            :disabled="ocupado"
            data-teste="remover-contrato"
            @click="emit('remover')"
          />
        </template>
      </span>
    </div>

    <template v-else-if="mostrarEnvio">
      <EnvioArquivo
        :id="idEnvio"
        :textos="TEXTOS_ENVIO_CONTRATO"
        :aceite="ACEITE_CONTRATO"
        :carregando="enviando"
        :erro="erro"
        :desabilitado="ocupado && !enviando"
        @selecionar="selecionar"
      />
      <Button
        v-if="contrato && substituindo && !enviando"
        :label="TEXTOS_CONTRATO.cancelar"
        severity="secondary"
        text
        class="anexo-contrato__cancelar"
        data-teste="cancelar-substituicao"
        @click="substituindo = false"
      />
    </template>

    <p
      v-if="erro && !mostrarEnvio"
      class="anexo-contrato__erro"
      role="alert"
      data-teste="erro-contrato"
    >
      {{ erro }}
    </p>
  </section>
</template>

<style scoped>
.anexo-contrato {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
}

.anexo-contrato .anexo-contrato__titulo {
  margin: 0;
  font-size: var(--p-fonte-tamanho-titulo);
}

.anexo-contrato__arquivo {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--p-espaco-3);
  align-items: center;
  padding: var(--p-espaco-4);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.anexo-contrato__icone {
  font-size: var(--p-fonte-tamanho-secao);
  color: var(--p-cor-primaria);
}

.anexo-contrato__dados {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  min-width: 0;
}

.anexo-contrato__nome {
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-cor-texto);
  overflow-wrap: anywhere;
}

.anexo-contrato__meta {
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-texto-apoio);
}

.anexo-contrato__acoes {
  display: flex;
  grid-column: 1 / -1;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
}

.anexo-contrato__acoes :deep(.p-button),
.anexo-contrato__cancelar {
  min-height: var(--p-dimensao-alvo-toque);
}

.anexo-contrato__cancelar {
  align-self: flex-start;
}

.anexo-contrato__erro {
  margin: 0;
  font-size: var(--p-fonte-tamanho-apoio);
  color: var(--p-cor-erro-texto);
}

@media (min-width: 640px) {
  .anexo-contrato__arquivo {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .anexo-contrato__acoes {
    grid-column: auto;
  }
}
</style>
