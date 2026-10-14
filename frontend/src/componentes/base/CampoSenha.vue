<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

import { REQUISITOS_SENHA_TEXTOS, ROTULOS_CAMPOS_AUTENTICACAO } from '@/textos/autenticacao'
import { avaliarRequisitosSenha } from '@/utilitarios/validacao'

const props = withDefaults(
  defineProps<{
    id: string
    invalido?: boolean
    descritoPor?: string
    autocomplete?: string
    comRequisitos?: boolean
    obrigatorio?: boolean
  }>(),
  { invalido: false, descritoPor: undefined, autocomplete: 'current-password', comRequisitos: false, obrigatorio: false },
)

const valor = defineModel<string>({ required: true })
const emit = defineEmits<{ blur: [] }>()

const visivel = ref(false)
const idRequisitos = computed(() => `${props.id}-requisitos`)

const requisitos = computed(() => {
  const avaliacao = avaliarRequisitosSenha(valor.value)
  return [
    { chave: 'tamanho', texto: REQUISITOS_SENHA_TEXTOS.tamanho, atendido: avaliacao.tamanho },
    { chave: 'letra', texto: REQUISITOS_SENHA_TEXTOS.letra, atendido: avaliacao.letra },
    { chave: 'numero', texto: REQUISITOS_SENHA_TEXTOS.numero, atendido: avaliacao.numero },
  ]
})

const descricao = computed(() => {
  const ids = [props.descritoPor, props.comRequisitos ? idRequisitos.value : undefined].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
})
</script>

<template>
  <div class="campo-senha">
    <div class="campo-senha__controle">
      <InputText
        :id="id"
        v-model="valor"
        class="campo-senha__entrada"
        :type="visivel ? 'text' : 'password'"
        :invalid="invalido"
        :aria-invalid="invalido"
        :aria-describedby="descricao"
        :aria-required="obrigatorio"
        :autocomplete="autocomplete"
        autocapitalize="off"
        spellcheck="false"
        data-teste="entrada-senha"
        @blur="emit('blur')"
      />
      <Button
        type="button"
        class="campo-senha__alternar"
        :icon="visivel ? 'ie ie-olho-fechado' : 'ie ie-olho'"
        severity="secondary"
        text
        :aria-label="visivel ? ROTULOS_CAMPOS_AUTENTICACAO.ocultarSenha : ROTULOS_CAMPOS_AUTENTICACAO.mostrarSenha"
        :aria-pressed="visivel"
        :aria-controls="id"
        data-teste="alternar-senha"
        @click="visivel = !visivel"
      />
    </div>
    <div
      v-if="comRequisitos"
      :id="idRequisitos"
      class="campo-senha__requisitos"
    >
      <span class="somente-leitor-tela">{{ ROTULOS_CAMPOS_AUTENTICACAO.requisitosSenha }}</span>
      <ul class="campo-senha__lista">
        <li
          v-for="requisito in requisitos"
          :key="requisito.chave"
          class="campo-senha__requisito"
          :class="{ 'campo-senha__requisito--atendido': requisito.atendido }"
          data-teste="requisito-senha"
          :data-atendido="requisito.atendido"
        >
          <span
            :class="requisito.atendido ? 'ie ie-concluido' : 'ie ie-circulo'"
            aria-hidden="true"
          />
          {{ requisito.texto }}
          <span class="somente-leitor-tela">
            ({{ requisito.atendido ? ROTULOS_CAMPOS_AUTENTICACAO.requisitoAtendido : ROTULOS_CAMPOS_AUTENTICACAO.requisitoPendente }})
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.campo-senha {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-2);
}

.campo-senha__controle {
  position: relative;
  display: flex;
}

.campo-senha .campo-senha__entrada {
  width: 100%;
  min-height: var(--p-dimensao-alvo-toque);
  padding-right: var(--p-dimensao-alvo-toque);
}

.campo-senha__alternar {
  position: absolute;
  top: 0;
  right: 0;
  width: var(--p-dimensao-alvo-toque);
  height: var(--p-dimensao-alvo-toque);
}

.campo-senha__lista {
  display: flex;
  flex-direction: column;
  gap: var(--p-espaco-1);
  padding: 0;
  margin: 0;
  list-style: none;
}

.campo-senha__requisito {
  display: flex;
  align-items: center;
  gap: var(--p-espaco-2);
  font-size: var(--p-fonte-tamanho-controle);
  color: var(--p-cor-texto-apoio);
}

.campo-senha__requisito--atendido {
  color: var(--p-cor-sucesso);
}
</style>
