<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

import EstadoCarregando from '@/componentes/base/EstadoCarregando.vue'
import EstadoVazio from '@/componentes/base/EstadoVazio.vue'
import ResumoContagem from '@/componentes/base/ResumoContagem.vue'
import { useConvidadosStore } from '@/stores/convidados'
import { TEXTOS_CONFIRMACOES } from '@/textos/confirmacoes'
import { TEXTOS_CONVIDADOS } from '@/textos/convidados'
import { ROTULOS_ACOES } from '@/textos/rotulos'
import { complementoResumoConvidados, itensResumoConvidados } from '@/utilitarios/resumoConvidados'

const props = defineProps<{ eventoId: string; arquivado: boolean; convidadosEstimados: number | null }>()

const store = useConvidadosStore()
const roteador = useRouter()

const totais = computed(() => (store.eventoIdTotais === props.eventoId ? store.totais : null))
const falha = computed(() => (store.eventoIdTotais === props.eventoId ? store.falhaTotais : null))
const oculto = computed(() => falha.value?.tipo === 'semPermissao')

watch(
  () => props.eventoId,
  (id) => {
    void store.carregarTotais(id)
  },
  { immediate: true },
)

function gerenciar() {
  void roteador.push({ name: 'evento-convidados', params: { id: props.eventoId } })
}

function abrirConfirmacoes() {
  void roteador.push({ name: 'painel-confirmacoes', params: { id: props.eventoId } })
}

function adicionar() {
  void roteador.push({ name: 'convite-novo', params: { id: props.eventoId } })
}
</script>

<template>
  <section
    v-if="!oculto"
    class="bloco-convidados"
    aria-labelledby="titulo-bloco-convidados"
    data-teste="bloco-convidados"
  >
    <div class="bloco-convidados__cabecalho">
      <h2
        id="titulo-bloco-convidados"
        class="bloco-convidados__titulo"
      >
        {{ TEXTOS_CONVIDADOS.blocoTitulo }}
      </h2>
      <div
        v-if="totais && totais.convites > 0"
        class="bloco-convidados__acoes"
      >
        <Button
          :label="TEXTOS_CONFIRMACOES.acaoAbrir"
          icon="ie ie-confirmacoes"
          severity="secondary"
          text
          data-teste="abrir-confirmacoes"
          @click="abrirConfirmacoes"
        />
        <Button
          :label="TEXTOS_CONVIDADOS.gerenciar"
          icon="ie ie-convidados"
          severity="secondary"
          outlined
          data-teste="gerenciar-convidados"
          @click="gerenciar"
        />
      </div>
    </div>

    <EstadoCarregando
      v-if="store.carregandoTotais && !totais"
      variante="cartao"
      :linhas="1"
    />

    <div
      v-else-if="falha"
      class="bloco-convidados__erro"
      role="alert"
      data-teste="erro-bloco-convidados"
    >
      <p>{{ TEXTOS_CONVIDADOS.erroCarregar }}</p>
      <Button
        :label="ROTULOS_ACOES.tentarNovamente"
        severity="secondary"
        text
        @click="store.carregarTotais(eventoId)"
      />
    </div>

    <div
      v-else-if="totais && totais.convites === 0"
      class="bloco-convidados__vazio"
    >
      <EstadoVazio
        :titulo="TEXTOS_CONVIDADOS.blocoVazioTitulo"
        :descricao="TEXTOS_CONVIDADOS.blocoVazioTexto"
        icone="convidados"
      >
        <template #acao>
          <Button
            v-if="!arquivado"
            :label="TEXTOS_CONVIDADOS.adicionarConvite"
            icon="ie ie-mais"
            severity="secondary"
            outlined
            data-teste="adicionar-convite-bloco"
            @click="adicionar"
          />
          <Button
            v-else
            :label="TEXTOS_CONVIDADOS.gerenciar"
            severity="secondary"
            text
            @click="gerenciar"
          />
        </template>
      </EstadoVazio>
    </div>

    <ResumoContagem
      v-else-if="totais"
      :itens="itensResumoConvidados(totais)"
      :rotulo="TEXTOS_CONVIDADOS.resumoRotulo"
    >
      <template #rodape>
        {{ complementoResumoConvidados(totais, convidadosEstimados) }}
      </template>
    </ResumoContagem>
  </section>
</template>

<style scoped>
.bloco-convidados {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-3);
}

.bloco-convidados__cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-espaco-3);
}

.bloco-convidados__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
}

.bloco-convidados__titulo {
  font-size: var(--p-fonte-tamanho-secao);
}

.bloco-convidados__cabecalho :deep(.p-button) {
  min-height: var(--p-dimensao-alvo-toque);
}

.bloco-convidados__vazio {
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-radius: var(--p-raio-painel);
}

.bloco-convidados__vazio :deep(.estado-vazio) {
  padding: var(--p-espaco-8) var(--p-espaco-4);
}

.bloco-convidados__erro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--p-espaco-2);
  padding: var(--p-espaco-3) var(--p-espaco-4);
  color: var(--p-cor-texto);
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda);
  border-left: 4px solid var(--p-cor-erro);
  border-radius: var(--p-raio-painel);
}
</style>
