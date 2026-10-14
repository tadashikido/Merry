<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'

import CampoFormulario from '@/componentes/base/CampoFormulario.vue'
import {
  ROTULOS_TIPO_RESTRICAO,
  TAMANHO_MAXIMO_NECESSIDADE_ESPECIAL,
  TAMANHO_MAXIMO_OUTRA_RESTRICAO,
  TEXTOS_DADOS_SENSIVEIS,
} from '@/textos/dadosSensiveis'
import {
  TIPOS_RESTRICAO_ALIMENTAR,
  type RestricaoPessoaFormulario,
  type TipoRestricaoAlimentar,
} from '@/tipos/dadosSensiveis'
import { alternarTipo, temConteudo } from '@/utilitarios/dadosSensiveis'

const props = withDefaults(
  defineProps<{
    nome: string
    possuiRegistro?: boolean
    desabilitado?: boolean
    variante?: 'publico' | 'painel'
    erro?: string | null
    idBase?: string
  }>(),
  { possuiRegistro: false, desabilitado: false, variante: 'publico', erro: null, idBase: undefined },
)

const restricao = defineModel<RestricaoPessoaFormulario>({ required: true })

const prefixo = useId()
const base = computed(() => props.idBase ?? `${prefixo}-restricao`)
const idBloco = computed(() => `${base.value}-bloco`)
const idErro = computed(() => `${base.value}-erro`)
const aberto = ref(temConteudo(restricao.value))

const painel = computed(() => props.variante === 'painel')
const mostrarRegistro = computed(() => !painel.value && props.possuiRegistro && restricao.value.situacao === 'manter')
const marcadaParaRemover = computed(() => !painel.value && restricao.value.situacao === 'remover')
const mostrarCampos = computed(() => painel.value || (!mostrarRegistro.value && !marcadaParaRemover.value && aberto.value))
const mostrarAbrir = computed(() => !painel.value && !mostrarRegistro.value && !marcadaParaRemover.value)
const tamanhoOutra = computed(() => restricao.value.outraRestricao.length)
const tamanhoNecessidade = computed(() => restricao.value.necessidadeEspecial.length)

function atualizar(parcial: Partial<RestricaoPessoaFormulario>) {
  restricao.value = { ...restricao.value, ...parcial, situacao: 'informar' }
}

function alternar(tipo: TipoRestricaoAlimentar) {
  atualizar({ tipos: alternarTipo(restricao.value.tipos, tipo) })
}

function alternarAbertura() {
  aberto.value = !aberto.value
}

function informarDeNovo() {
  restricao.value = { situacao: 'informar', tipos: [], outraRestricao: '', necessidadeEspecial: '' }
  aberto.value = true
}

function marcarRemocao() {
  restricao.value = { situacao: 'remover', tipos: [], outraRestricao: '', necessidadeEspecial: '' }
}

function desfazerRemocao() {
  restricao.value = { situacao: 'manter', tipos: [], outraRestricao: '', necessidadeEspecial: '' }
}
</script>

<template>
  <div
    class="seletor-restricao"
    :class="{ 'seletor-restricao--painel': painel, 'seletor-restricao--invalido': Boolean(erro) }"
    data-teste="seletor-restricao"
  >
    <div
      v-if="mostrarRegistro"
      class="seletor-restricao__registro"
      data-teste="restricao-registrada"
    >
      <p class="seletor-restricao__selo">
        <span
          class="ie ie-concluido"
          aria-hidden="true"
        />
        <span>{{ TEXTOS_DADOS_SENSIVEIS.registrada }}</span>
      </p>
      <p class="seletor-restricao__nota">
        {{ TEXTOS_DADOS_SENSIVEIS.naoExibimos }}
      </p>
      <div class="seletor-restricao__acoes">
        <Button
          type="button"
          :label="TEXTOS_DADOS_SENSIVEIS.informarDeNovo"
          text
          :disabled="desabilitado"
          data-teste="restricao-informar-de-novo"
          @click="informarDeNovo"
        />
        <Button
          type="button"
          :label="TEXTOS_DADOS_SENSIVEIS.remover"
          text
          severity="secondary"
          :disabled="desabilitado"
          data-teste="restricao-remover"
          @click="marcarRemocao"
        />
      </div>
    </div>

    <div
      v-else-if="marcadaParaRemover"
      class="seletor-restricao__registro"
      data-teste="restricao-sera-removida"
    >
      <p
        class="seletor-restricao__nota"
        role="status"
      >
        {{ TEXTOS_DADOS_SENSIVEIS.seraRemovida }}
      </p>
      <div class="seletor-restricao__acoes">
        <Button
          type="button"
          :label="TEXTOS_DADOS_SENSIVEIS.desfazer"
          text
          :disabled="desabilitado"
          data-teste="restricao-desfazer"
          @click="desfazerRemocao"
        />
      </div>
    </div>

    <button
      v-if="mostrarAbrir"
      type="button"
      class="seletor-restricao__abrir"
      :aria-expanded="aberto"
      :aria-controls="idBloco"
      :disabled="desabilitado"
      data-teste="restricao-abrir"
      @click="alternarAbertura"
    >
      <span
        :class="['seletor-restricao__seta', 'ie', aberto ? 'ie-seta-baixo' : 'ie-seta-direita']"
        aria-hidden="true"
      />
      <span>{{ TEXTOS_DADOS_SENSIVEIS.abrirRestricao }}</span>
    </button>

    <div
      v-if="mostrarCampos"
      :id="idBloco"
      class="seletor-restricao__bloco"
      data-teste="restricao-bloco"
    >
      <fieldset
        class="seletor-restricao__grupo"
        :aria-describedby="erro ? idErro : undefined"
      >
        <legend class="seletor-restricao__legenda">
          <span aria-hidden="true">{{ TEXTOS_DADOS_SENSIVEIS.legendaVisivel }}</span>
          <span class="somente-leitor-tela">{{ TEXTOS_DADOS_SENSIVEIS.legendaRestricoes(nome) }}</span>
        </legend>
        <div class="seletor-restricao__etiquetas">
          <button
            v-for="tipo in TIPOS_RESTRICAO_ALIMENTAR"
            :key="tipo"
            type="button"
            class="seletor-restricao__etiqueta"
            :class="{ 'seletor-restricao__etiqueta--marcada': restricao.tipos.includes(tipo) }"
            :aria-pressed="restricao.tipos.includes(tipo)"
            :disabled="desabilitado"
            :data-teste="`restricao-tipo-${tipo}`"
            @click="alternar(tipo)"
          >
            <span
              class="seletor-restricao__marca ie ie-concluir"
              aria-hidden="true"
            />
            <span>{{ ROTULOS_TIPO_RESTRICAO[tipo] }}</span>
          </button>
        </div>
      </fieldset>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido, descritoPor }"
        :rotulo="`${TEXTOS_DADOS_SENSIVEIS.outraRestricao} ${TEXTOS_DADOS_SENSIVEIS.opcional}`"
        :id-campo="`${base}-outra`"
        :dica="TEXTOS_DADOS_SENSIVEIS.contador(tamanhoOutra, TAMANHO_MAXIMO_OUTRA_RESTRICAO)"
      >
        <InputText
          :id="idEntrada"
          :model-value="restricao.outraRestricao"
          :placeholder="TEXTOS_DADOS_SENSIVEIS.placeholderOutra"
          :maxlength="TAMANHO_MAXIMO_OUTRA_RESTRICAO"
          autocomplete="off"
          :disabled="desabilitado"
          :invalid="invalido"
          :aria-describedby="descritoPor"
          data-teste="restricao-outra"
          @update:model-value="atualizar({ outraRestricao: $event ?? '' })"
        />
      </CampoFormulario>

      <CampoFormulario
        v-slot="{ id: idEntrada, invalido }"
        :rotulo="`${TEXTOS_DADOS_SENSIVEIS.necessidadeEspecial} ${TEXTOS_DADOS_SENSIVEIS.opcional}`"
        :id-campo="`${base}-necessidade`"
        :dica="TEXTOS_DADOS_SENSIVEIS.dicaNecessidade"
      >
        <Textarea
          :id="idEntrada"
          :model-value="restricao.necessidadeEspecial"
          :maxlength="TAMANHO_MAXIMO_NECESSIDADE_ESPECIAL"
          rows="2"
          auto-resize
          :disabled="desabilitado"
          :invalid="invalido"
          :aria-describedby="`${base}-necessidade-dica ${base}-necessidade-contador`"
          data-teste="restricao-necessidade"
          @update:model-value="atualizar({ necessidadeEspecial: $event ?? '' })"
        />
        <span
          :id="`${base}-necessidade-contador`"
          class="seletor-restricao__contador"
        >{{ TEXTOS_DADOS_SENSIVEIS.contador(tamanhoNecessidade, TAMANHO_MAXIMO_NECESSIDADE_ESPECIAL) }}</span>
      </CampoFormulario>
    </div>

    <p
      v-if="erro"
      :id="idErro"
      class="seletor-restricao__erro"
      data-teste="restricao-erro"
    >
      {{ erro }}
    </p>
  </div>
</template>

<style scoped>
.seletor-restricao {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.seletor-restricao__abrir {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-2);
  align-self: flex-start;
  min-height: var(--p-dimensao-alvo-toque-movel);
  padding: 0;
  font: inherit;
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-primaria);
  text-align: left;
  cursor: pointer;
  background: none;
  border: 0;
}

.seletor-restricao__abrir:hover span:last-child {
  text-decoration: underline;
}

.seletor-restricao__abrir:focus-visible,
.seletor-restricao__etiqueta:focus-visible {
  outline: var(--p-focus-ring-width) var(--p-focus-ring-style) var(--p-focus-ring-color);
  outline-offset: var(--p-focus-ring-offset);
}

.seletor-restricao__abrir:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.seletor-restricao__seta {
  font-size: var(--p-fonte-tamanho-rotulo);
}

.seletor-restricao__bloco {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-4);
  padding-left: var(--p-espaco-4);
  border-left: 2px solid var(--p-cor-borda);
}

.seletor-restricao--painel .seletor-restricao__bloco {
  padding-left: 0;
  border-left: 0;
}

.seletor-restricao__grupo {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.seletor-restricao__legenda {
  margin-bottom: var(--p-espaco-2);
  padding: 0;
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
}

.seletor-restricao__etiquetas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
}

.seletor-restricao__etiqueta {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-1);
  min-height: var(--p-dimensao-alvo-toque-movel);
  padding: 0 var(--p-espaco-3);
  font: inherit;
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto);
  cursor: pointer;
  background: var(--p-cor-superficie);
  border: 1px solid var(--p-cor-borda-campo);
  border-radius: var(--p-raio-total);
  transition:
    background-color var(--p-duracao-rapida),
    border-color var(--p-duracao-rapida);
}

.seletor-restricao__etiqueta:hover {
  border-color: var(--p-cor-primaria);
}

.seletor-restricao__etiqueta:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.seletor-restricao__marca {
  display: none;
  font-size: var(--p-fonte-tamanho-rotulo);
}

.seletor-restricao__etiqueta--marcada {
  font-weight: var(--p-fonte-peso-seminegrito);
  color: var(--p-primary-800);
  background: var(--p-primary-100);
  border-color: var(--p-cor-primaria);
}

.seletor-restricao__etiqueta--marcada .seletor-restricao__marca {
  display: inline;
}

.seletor-restricao__registro {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
}

.seletor-restricao__selo {
  display: inline-flex;
  align-items: center;
  gap: var(--p-espaco-2);
  align-self: flex-start;
  padding: var(--p-espaco-1) var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-controle);
  font-weight: var(--p-fonte-peso-medio);
  color: var(--p-cor-texto);
  background: var(--p-cor-informacao-suave);
  border-radius: var(--p-raio-tag);
}

.seletor-restricao__selo .pi {
  color: var(--p-cor-informacao);
}

.seletor-restricao__nota,
.seletor-restricao__contador {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.seletor-restricao__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--p-espaco-2);
}

.layout-publico__folha .seletor-restricao__acoes :deep(.p-button) {
  width: auto;
  min-height: var(--p-dimensao-alvo-toque-movel);
}

.seletor-restricao__erro {
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-erro);
}

@media (prefers-reduced-motion: reduce) {
  .seletor-restricao__etiqueta {
    transition: none;
  }
}
</style>
